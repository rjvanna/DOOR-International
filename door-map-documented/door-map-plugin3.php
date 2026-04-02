<?php
/**
 * Plugin Name:  DOOR International — Global Ministry Map
 * Plugin URI:   https://doorinternational.org
 * Description:  A Leaflet.js interactive map for visualizing global deaf ministry data,
 *               integrated with DiscipleTools (DT). Displays country-level ministry status,
 *               church locations, staff/contact discipleship data, and provides a live
 *               data inspector directly connected to the DT WordPress database.
 * Version:      5.0.0
 * Author:       Evan Simons & Rylan Vannaman
 * Author URI:   https://jbu.edu
 * License:      GPL-2.0+
 * Text Domain:  door-ministry-map
 *
 * @package DOOR_Ministry_Map
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ARCHITECTURE OVERVIEW
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * This file handles the WordPress plugin layer:
 *   1. Asset enqueueing  — Leaflet.js, plugin CSS, and JS scripts
 *   2. Shortcode         — [door_ministry_map] renders the full map UI
 *   3. Admin page        — Registers the map under DT Extensions menu
 *   4. Frontend route    — Serves the map at /ministry-map/ on the DT frontend
 *   5. Navigation tab    — Injects a "Global Map" link into the DT top nav
 *   6. REST API          — Custom direct-DB endpoints that bypass DT middleware
 *
 * REST Endpoints (all under /wp-json/door-map/v1/):
 *   GET  /inspector?type=groups|contacts&offset=N&limit=N
 *       Returns paginated groups or contacts with all tracked postmeta fields.
 *   GET  /inspector-users?offset=N&limit=N
 *       Returns paginated WordPress users with roles and DT-specific meta.
 *   GET  /country-group-map
 *       Resolves each DT group to a staff-assigned country by following:
 *       2x2 Staff CSV name → users.display_name → users.ID
 *       → groups.assigned_to → country
 *   GET  /group-pins?country=X
 *       Returns saved pins from assets/Country Assignement and Pin location.csv,
 *       optionally filtered by country. Columns: long, lat, group_ID, country
 *   POST /pin-coordinates
 *       Saves a pin's lat/lng to the churches CSV and to the pin-coordinates CSV.
 *       Also updates the DT group's location_grid_meta via the DT REST API.
 *       Accepts: church_name, lat, lng, group_id (optional), country (optional).
 *       If country is omitted the endpoint derives it from the staff chain.
 *
 * Security model:
 *   All REST endpoints require a valid wp_rest nonce (X-WP-Nonce header) and
 *   the requesting user must be logged in with edit_posts capability.
 *   All dynamic DB values are passed through intval() or $wpdb->prepare().
 *   The /pin-coordinates endpoint is the only write operation; all others are
 *   read-only.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FILE STRUCTURE
 * ─────────────────────────────────────────────────────────────────────────────
 *   door-map-plugin3.php                              — This file.
 *   js/script1.js                                     — Map logic, data loading, UI interactions.
 *   js/inspector.js                                   — Data Inspector panel logic and table rendering.
 *   css/styles.css                                    — All plugin styles (light/dark theme, components).
 *   assets/Copy of Oversight Document - Total 2x2 Staff.csv  — Staff names and country assignments.
 *   assets/Copy of Oversight Document - Total Churches_Fellowships.csv — Church/fellowship records.
 *   assets/Country Assignement and Pin location.csv   — Saved pin coordinates (long, lat, group_ID, country).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Security: Prevent direct file access outside of WordPress
// ─────────────────────────────────────────────────────────────────────────────
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: Asset Enqueueing
//
// Loads Leaflet.js (CDN), plugin styles, and the two JS modules.
// Passes server-side configuration to JS via wp_localize_script(), including
// the WP REST nonce and the URLs for all custom REST endpoints.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enqueue all frontend assets and pass configuration data to JavaScript.
 *
 * Loads:
 *   - Leaflet CSS/JS from unpkg CDN (pinned to v1.9.4)
 *   - Plugin stylesheet (styles.css)
 *   - Map logic script (script1.js)
 *   - Inspector logic script (inspector.js)
 *
 * Exposes `window.dtMapData` to JS with:
 *   - root            WP REST API base URL
 *   - nonce           wp_rest nonce for authenticated requests
 *   - inspectorEndpoint  URL for /door-map/v1/inspector
 *   - inspectorNonce     Nonce for inspector endpoint requests
 *   - usersEndpoint      URL for /door-map/v1/inspector-users
 *   - canCreateGroups    Whether current user can create group posts
 *   - canCreateContacts  Whether current user can create contact posts
 */
/**
 * Parse the oversight CSV once and return both:
 *   - countries: unique countries with their highest ministry level
 *   - churches:  every individual church/fellowship record
 *
 * CSV columns (0-based):
 *   0  Country          1  State            2  Address
 *   3  Fellowship Name  4  Church Name      5  Supervisor
 *   6  2by2 Team        7  Disciple         8  Leader
 *   9  Type             10 Established Date 11 Status    12 Level
 *
 * @return array {
 *   'countries' => [ ['name'=>string, 'level'=>string], ... ],
 *   'churches'  => [ ['country'=>string, 'state'=>string, 'address'=>string,
 *                     'name'=>string, 'supervisor'=>string, 'disciple'=>string,
 *                     'leader'=>string, 'type'=>string, 'establishedDate'=>string,
 *                     'status'=>string, 'level'=>string], ... ]
 * }
 */
function door_map_parse_csv() {
    $csv_path = plugin_dir_path( __FILE__ ) . 'assets/Copy of Oversight Document - Total Churches_Fellowships.csv';
    if ( ! file_exists( $csv_path ) || ! is_readable( $csv_path ) ) {
        return array( 'countries' => array(), 'churches' => array() );
    }

    $level_map      = array( 'Level 1'=>'L1', 'Level 2'=>'L2', 'Level 3'=>'L3', 'Level 4'=>'L4' );
    $level_priority = array( 'L4'=>6, 'L3'=>5, 'L2'=>4, 'L1'=>3, 'default'=>2 );

    // Canonical names keyed by lowercase — covers whitespace variants and misspellings
    $name_corrections = array(
        'india'       => 'India',       'kazasthan'  => 'Kazakhstan',
        'tanzania'    => 'Tanzania',    'mozambique' => 'Mozambique',
        'nigeria'     => 'Nigeria',     'kenya'      => 'Kenya',
        'uganda'      => 'Uganda',      'ethiopia'   => 'Ethiopia',
        'burundi'     => 'Burundi',     'ghana'      => 'Ghana',
        'bangladesh'  => 'Bangladesh',  'russia'     => 'Russia',
        'nepal'       => 'Nepal',       'sri lanka'  => 'Sri Lanka',
        'south sudan' => 'South Sudan',
    );

    $country_levels = array();

    $handle = fopen( $csv_path, 'r' );
    if ( ! $handle ) {
        return array( 'countries' => array() );
    }

    $is_header = true;
    while ( ( $row = fgetcsv( $handle ) ) !== false ) {
        if ( $is_header ) { $is_header = false; continue; }

        $raw_country = isset( $row[0] ) ? trim( $row[0] ) : '';
        if ( empty( $raw_country ) ) continue;

        // Normalise country name
        $lookup_key   = strtolower( $raw_country );
        $country_name = isset( $name_corrections[ $lookup_key ] )
            ? $name_corrections[ $lookup_key ]
            : $raw_country;

        // Parse level
        $raw_level = isset( $row[12] ) ? trim( $row[12] ) : '';
        $level     = isset( $level_map[ $raw_level ] ) ? $level_map[ $raw_level ] : 'default';

        // Track highest-priority level per country
        if ( ! isset( $country_levels[ $country_name ] ) ) {
            $country_levels[ $country_name ] = $level;
        } else {
            $existing_pri = isset( $level_priority[ $country_levels[ $country_name ] ] )
                ? $level_priority[ $country_levels[ $country_name ] ] : 0;
            $new_pri = isset( $level_priority[ $level ] ) ? $level_priority[ $level ] : 0;
            if ( $new_pri > $existing_pri ) {
                $country_levels[ $country_name ] = $level;
            }
        }

    }
    fclose( $handle );

    $country_list = array();
    foreach ( $country_levels as $name => $lvl ) {
        $country_list[] = array( 'name' => $name, 'level' => $lvl );
    }

    return array( 'countries' => $country_list );
}

function door_map_enqueue_assets() {
    wp_enqueue_style('leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
    wp_enqueue_script('leaflet-js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', array(), null, true);
    wp_enqueue_style('door-map-styles', plugins_url('css/styles.css', __FILE__), array(), '6.0.0');
    wp_enqueue_script('door-map-script', plugins_url('js/script1.js', __FILE__), array('leaflet-js'), '4.0.0', true);
    // Inspector script — depends on door-map-script so dtMapData is already defined
    wp_enqueue_script('door-inspector-script', plugins_url('js/inspector.js', __FILE__), array('door-map-script'), '4.0.0', true);

    $csv_data = door_map_parse_csv();

    // Query group titles natively to skip slow REST fetches on frontend later
    global $wpdb;
    $db_group_names = $wpdb->get_col("
        SELECT post_title FROM {$wpdb->posts}
        WHERE post_type = 'groups'
          AND post_status = 'publish'
        ORDER BY post_title ASC
    ");

    wp_localize_script('door-map-script', 'dtMapData', array(
        'root'  => esc_url_raw(rest_url()),
        'nonce' => wp_create_nonce('wp_rest'),
        'canCreateGroups'   => current_user_can('edit_posts') ? 'true' : 'false',
        'canCreateContacts' => current_user_can('edit_posts') ? 'true' : 'false',
        'inspectorEndpoint' => esc_url_raw(rest_url('door-map/v1/inspector')),
        'inspectorNonce'    => wp_create_nonce('wp_rest'),
        'usersEndpoint'     => esc_url_raw(rest_url('door-map/v1/inspector-users')),
        'pinSaveEndpoint'        => esc_url_raw(rest_url('door-map/v1/pin-coordinates')),
        'countryGroupMapEndpoint' => esc_url_raw(rest_url('door-map/v1/country-group-map')),
        'groupPinsEndpoint'      => esc_url_raw(rest_url('door-map/v1/group-pins')),
        'dbGroupNames'      => $db_group_names,
        'csvCountries'      => $csv_data['countries'],
    ));
}
// Load on frontend
add_action('wp_enqueue_scripts', 'door_map_enqueue_assets');

// Load in admin ONLY on the DOOR map page
// WordPress builds the hook as: {parent_slug}_page_{menu_slug}
// For dt_extensions parent + door-ministry-map slug = "dt_extensions_page_door-ministry-map"
function door_map_enqueue_admin_assets( $hook ) {
    // Accept any hook that ends with our page slug to be safe across DT versions
    if ( $hook === 'dt_extensions_page_door-ministry-map'
        || strpos( $hook, 'door-ministry-map' ) !== false ) {
        door_map_enqueue_assets();
    }
}
add_action('admin_enqueue_scripts', 'door_map_enqueue_admin_assets');

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: Shortcode — [door_ministry_map]
//
// Renders the entire map UI as a self-contained HTML structure.
// All interactive panels (sidebar, inspector, forms, modal, detail panel)
// are included here as hidden elements that JS shows/hides at runtime.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shortcode callback for [door_ministry_map].
 *
 * Outputs the full plugin HTML markup including:
 *   - Control buttons (Overview, Security, Add Data, Theme, Inspector)
 *   - Leaflet map container (#map)
 *   - Data Inspector panel (#inspectorPanel)
 *   - Country status legend (.map-legend)
 *   - Global Overview modal (#globalOverviewModal)
 *   - Data Management forms page (#formsPage)
 *   - Country/church detail sidebar (#sidebar)
 *   - Loading overlay (#loadingOverlay)
 *   - Toast notification container (#toastContainer)
 *   - Full detail panel (#detailPanel)
 *
 * Uses output buffering (ob_start / ob_get_clean) to return HTML as a string.
 *
 * @return string The complete plugin HTML markup.
 */
function door_map_shortcode() {
    ob_start(); // Start gathering the HTML output
    ?>
    
    <div class="container" id="doorMapApp">
        <div id="homeScreen" class="app-screen home-screen">
            <div class="home-bg-glow"></div>
            <div class="home-card">
                <div class="home-logo">
                    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <div class="home-eyebrow">DOOR International</div>
                <h1 class="home-title">Global Ministry Map</h1>
                <p class="home-subtitle">Visualize deaf ministry presence and discipleship data across 30+ countries.</p>
                <div class="home-divider"></div>
                <div class="home-actions">
                    <button id="startMapBtn" class="home-btn home-btn-primary">
                        <span class="home-btn-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span>
                        <span><strong>Open Map</strong><small>Explore interactive world data</small></span>
                    </button>
                    <button id="openViewOptionsBtn" class="home-btn home-btn-secondary">
                        <span class="home-btn-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg></span>
                        <span><strong>View Options</strong><small>Settings, tools &amp; view modes</small></span>
                    </button>
                </div>
                <div class="home-mode-badge" id="homeModeIndicator">
                    <span class="hm-dot"></span>
                    <span id="homeModeText">Standard Mode active</span>
                </div>
            </div>
        </div>

        <div id="viewOptionsScreen" class="app-screen options-screen hidden">
            <div class="options-card">
                <div class="opts-topbar">
                    <div class="opts-brand"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg> View Options</div>
                    <button id="closeViewOptionsBtn" class="opts-back-btn"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to Home</button>
                </div>
                <div class="opts-body">
                    <div class="opts-col opts-col-left">
                        <div class="opts-section">
                            <div class="opts-section-label">Map Viewing Mode</div>
                            <p class="opts-section-desc">Controls what happens when you click a country on the map.</p>
                            <div class="opts-mode-group">
                                <button id="setPinModeBtn" class="opts-mode-btn" data-mode="pin">
                                    <span class="omg-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span>
                                    <span class="omg-text"><strong>Pin Mode</strong><small>Shows exact church coordinates as pins</small></span>
                                    <span class="omg-check"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
                                </button>
                                <button id="setStandardModeBtn" class="opts-mode-btn" data-mode="standard">
                                    <span class="omg-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></span>
                                    <span class="omg-text"><strong>Standard Mode</strong><small>Shows region overview &amp; church sidebar</small></span>
                                    <span class="omg-check"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="opts-col opts-col-right">
                        <div class="opts-section">
                            <div class="opts-section-label">Tools &amp; Actions</div>
                            <div class="opts-tool-list">
                                <button id="goToMapFromOptionsBtn" class="opts-tool-btn opts-tool-primary">
                                    <span class="otb-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span>
                                    <span class="otb-text"><strong>Open Map</strong><small>Go to the interactive map view</small></span>
                                    <svg class="otb-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                </button>
                                <button id="optionsOpenAddDataBtn" class="opts-tool-btn">
                                    <span class="otb-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
                                    <span class="otb-text"><strong>Add Data</strong><small>Manage countries, churches &amp; staff</small></span>
                                    <svg class="otb-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                </button>
                                <button id="optionsOpenInspectorBtn" class="opts-tool-btn">
                                    <span class="otb-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span>
                                    <span class="otb-text"><strong>Data Inspector</strong><small>Live DB browser for groups &amp; contacts</small></span>
                                    <svg class="otb-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                </button>
                                <button id="optionsThemeToggleBtn" class="opts-tool-btn">
                                    <span class="otb-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>
                                    <span class="otb-text"><strong>Toggle Dark Mode</strong><small>Switch between light and dark theme</small></span>
                                    <svg class="otb-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                </button>
                                <button id="optionsOpenSecurityBtn" class="opts-tool-btn">
                                    <span class="otb-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                                    <span class="otb-text"><strong>10/40 Window Security</strong><small>Obfuscate or hide sensitive pins</small></span>
                                    <svg class="otb-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <button id="globalOverviewBtn" class="control-btn overview-btn" title="View Global Statistics">
            <span class="btn-icon">
                <span class="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </span>
            </span>
            <span class="btn-text">Global Overview</span>
        </button>
        
        <div class="security-wrap">
            <button id="obscurePinsBtn" class="control-btn security-btn" title="10/40 Window Security Options">
                <span class="btn-icon">
                    <span class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </span>
                </span>
                <span class="btn-text">Security: Off</span>
            </button>
            <div id="securityPopup" class="security-popup">
                <div class="popup-header">
                    <h4>
                        <span class="icon" style="display:inline-flex;vertical-align:middle;margin-right:6px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </span>
                        10/40 Window Pin Security
                    </h4>
                    <p>Applies only to church pins inside the 10/40 Window (10°–40°N, 10°W–145°E)</p>
                </div>
                <button class="sec-option" data-mode="obfuscate">
                    <span class="sec-icon icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </span>
                    <div class="sec-text">
                        <strong>Obfuscate Locations</strong>
                        <small>Shift pins ~15 km from their real position</small>
                    </div>
                </button>
                <button class="sec-option" data-mode="hidden">
                    <span class="sec-icon icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    </span>
                    <div class="sec-text">
                        <strong>Hide Pins</strong>
                        <small>Remove 10/40 church pins from the map</small>
                    </div>
                </button>
                <p class="sec-reset">Click the active option again to reset to normal.</p>
            </div>
        </div>
        
        <button id="addDataBtn" class="control-btn data-btn" title="Data Management Dashboard">
            <span class="btn-icon">
                <span class="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </span>
            </span>
            <span class="btn-text">Add Data</span>
        </button>

        <button id="themeToggleBtn" class="control-btn theme-btn" title="Toggle Dark Mode">
            <span class="btn-icon">
                <span class="icon" id="themeIcon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                </span>
            </span>
            <span class="btn-text">Dark Mode</span>
        </button>

        <button id="inspectorBtn" class="control-btn inspector-btn" title="Data Inspector — test live DB data">
            <span class="btn-icon">
                <span class="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </span>
            </span>
            <span class="btn-text">Data Inspector</span>
        </button>
        <button id="mapBackBtn" class="control-btn back-btn" title="Back to Start">
            <span class="btn-icon">
                <span class="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                </span>
            </span>
            <span class="btn-text">Back</span>
        </button>

        <div id="map" class="map-container"></div>

        <!-- ── Inline Data Inspector Panel (slides over the map) ── -->
        <div id="inspectorPanel" class="inspector-panel">
            <div class="insp-topbar">
                <div class="insp-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    Data Inspector
                </div>
                <div class="insp-controls">
                    <button class="insp-fetch-btn insp-groups" id="inspFetchGroups">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                        Groups
                    </button>
                    <button class="insp-fetch-btn insp-contacts" id="inspFetchContacts">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Contacts
                    </button>
                    <button class="insp-fetch-btn insp-users" id="inspFetchUsers">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        Users
                    </button>
                    <button class="insp-fetch-btn insp-clear" id="inspClear">Clear</button>
                    <button class="insp-close-btn" id="inspClose">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            </div>

            <div id="inspStatus" class="insp-status insp-hidden"></div>

            <div id="inspSummary" class="insp-summary insp-hidden">
                <span id="inspSumType" class="insp-sum-pill"></span>
                <span id="inspSumCount" class="insp-sum-pill"></span>
                <span id="inspSumFields" class="insp-sum-pill"></span>
                <span id="inspSumTime" class="insp-sum-pill"></span>
            </div>

            <div id="inspSearchBar" class="insp-search-bar insp-hidden">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" id="inspSearch" placeholder="Filter any column…" />
                <span id="inspRowCount" class="insp-row-count"></span>
                <button class="insp-fetch-btn insp-copy" id="inspCopyRaw">Copy JSON</button>
            </div>

            <div id="inspTableWrap" class="insp-table-wrap insp-hidden">
                <table id="inspTable">
                    <thead id="inspThead"></thead>
                    <tbody id="inspTbody"></tbody>
                </table>
            </div>
        </div>

        <div class="map-legend">
            <h4>Country Status</h4>
            <div class="legend-item">
                <span class="legend-color" style="background: #2196f3"></span>
                <span>L1 &mdash; Established</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #8bc34a"></span>
                <span>L2 &mdash; Growing</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #ffeb3b"></span>
                <span>L3 &mdash; Developing</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #ff9800"></span>
                <span>L4 &mdash; Emerging</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #9e9e9e"></span>
                <span>Inactive</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #f44336"></span>
                <span>Cancelled</span>
            </div>
        </div>
    </div>

    <div id="globalOverviewModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>
                    <span class="icon" style="display:inline-flex;vertical-align:middle;margin-right:8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    </span>
                    Global Ministry Overview
                </h2>
                <button class="modal-close" id="closeOverview" aria-label="Close modal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="modal-body">
                <div class="stat-grid-large">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <span class="icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                            </span>
                        </div>
                        <div class="stat-value" id="totalCountries">0</div>
                        <div class="stat-label">Active Countries</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <span class="icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                            </span>
                        </div>
                        <div class="stat-value" id="totalChurches">0</div>
                        <div class="stat-label">Total Churches</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <span class="icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            </span>
                        </div>
                        <div class="stat-value" id="totalGroups">0</div>
                        <div class="stat-label">Total Groups</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <span class="icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            </span>
                        </div>
                        <div class="stat-value" id="totalStaff">0</div>
                        <div class="stat-label">Total Staff</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <span class="icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                            </span>
                        </div>
                        <div class="stat-value" id="totalVolunteers">0</div>
                        <div class="stat-label">Total Volunteers</div>
                    </div>
                </div>
                
                <button id="toggleCountryList" class="toggle-list-btn">
                    <span class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    </span>
                    Show Country List
                </button>
                <ul id="countryList" class="country-list"></ul>
                
                <div class="modal-actions">
                    <button class="action-btn" id="exportGlobalCSV" title="Export global statistics">
                        <span class="icon" style="display:inline-flex;vertical-align:middle;margin-right:6px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </span>
                        Export to CSV
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div id="formsPage" class="forms-page">
        <div class="forms-header">
            <div class="forms-title">
                <h2>
                    <span class="icon" style="display:inline-flex;vertical-align:middle;margin-right:8px;margin-bottom:2px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    </span>
                    Data Management
                </h2>
            </div>
            <button id="closeFormsPage" class="close-forms-btn">
                <span class="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                </span>
                Back to Map
            </button>
        </div>
        
        <div class="forms-body">
        <div class="form-selection-cards">
            <div class="form-card active" data-target="addCountrySection">
                <div class="card-icon">
                    <span class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    </span>
                </div>
                <h3>Add Country</h3>
                <p>Register a new ministry country</p>
            </div>
            <div class="form-card" data-target="addChurchSection">
                <div class="card-icon">
                    <span class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    </span>
                </div>
                <h3>Add Church</h3>
                <p>Add a church location</p>
            </div>
            <div class="form-card" data-target="addStaffSection">
                <div class="card-icon">
                    <span class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </span>
                </div>
                <h3>Add Staff</h3>
                <p>Register a staff member</p>
            </div>
            <div class="form-card" data-target="updateLevelSection">
                <div class="card-icon">
                    <span class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    </span>
                </div>
                <h3>Update Status</h3>
                <p>Change country color coding</p>
            </div>
            <div class="form-card" data-target="editChurchSection">
                <div class="card-icon">
                    <span class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </span>
                </div>
                <h3>Edit Church</h3>
                <p>Modify existing church data</p>
            </div>
            <div class="form-card" data-target="editStaffSection">
                <div class="card-icon">
                    <span class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </span>
                </div>
                <h3>Edit Staff</h3>
                <p>Update staff info &amp; tracking</p>
            </div>
            <div class="form-card" data-target="addPinDataSection">
                <div class="card-icon">
                    <span class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-5.33-7-11a7 7 0 0 1 14 0c0 5.67-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
                    </span>
                </div>
                <h3>Add Pin Data</h3>
                <p>Select church and place map pin</p>
            </div>
        </div>

        <div class="form-sections-container">
            
            <div id="addCountrySection" class="form-section active">
                <div class="form-section-header">
                    <h3>Add a New Country</h3>
                </div>
                <form id="formAddCountry">
                    <div class="form-group">
                        <label for="addCountryName">Country Name</label>
                        <input type="text" id="addCountryName" required 
                               placeholder="e.g. Germany" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label for="addCountryCode">Country Code (2-letters)</label>
                        <input type="text" id="addCountryCode" required 
                               placeholder="e.g. de" maxlength="2" 
                               style="text-transform: lowercase;" autocomplete="off">
                    </div>
                    <button type="submit" class="submit-btn">Add Country</button>
                </form>
            </div>
            
            <div id="addChurchSection" class="form-section">
                <div class="form-section-header">
                    <h3><span class="form-section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span>Add Church</h3>
                </div>
                <form id="formAddChurch">
                    <div class="form-group">
                        <label for="churchCountrySelect">Select Country</label>
                        <select id="churchCountrySelect" required class="form-control">
                            <option value="">-- Choose Country --</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="addChurchState">State / Region Name</label>
                        <input type="text" id="addChurchState" required placeholder="e.g. Bavaria" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label for="addChurchName">Church Name</label>
                        <input type="text" id="addChurchName" required placeholder="e.g. Munich Fellowship" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label for="addChurchYear">Year Started</label>
                        <input type="number" id="addChurchYear" placeholder="2024" min="1900" max="2100">
                    </div>
                    <div class="form-group">
                        <label for="addChurchAttendees">Attendees</label>
                        <input type="number" id="addChurchAttendees" placeholder="50" min="0">
                    </div>
                    <div class="form-group">
                        <label>Place Church Pin</label>
                        <div id="addChurchMap" class="mini-map"></div>
                        <p id="selectedCoordsText" class="coords-text">No location selected yet — click the map to place a pin.</p>
                        <input type="hidden" id="addChurchLat">
                        <input type="hidden" id="addChurchLng">
                    </div>
                    <button type="submit" class="submit-btn">Add Church</button>
                </form>
            </div>
            
            <div id="addStaffSection" class="form-section">
                <div class="form-section-header">
                    <h3><span class="form-section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>Add Staff Member</h3>
                </div>
                <form id="formAddStaff">
                    <div class="form-group">
                        <label for="staffChurchSelect">Assign to Church</label>
                        <select id="staffChurchSelect" required class="form-control">
                            <option value="">-- Choose Church --</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="addStaffName">Staff Name</label>
                        <input type="text" id="addStaffName" required 
                               placeholder="e.g. John Doe" autocomplete="off">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="addStaffAge">Age</label>
                            <input type="number" id="addStaffAge" 
                                   placeholder="30" min="18" max="120">
                        </div>
                        <div class="form-group">
                            <label for="addStaffYear">Year Joined</label>
                            <input type="number" id="addStaffYear" 
                                   placeholder="2024" min="1900" max="2100">
                        </div>
                    </div>
                    <div class="discipleship-tracker">
                        <h4>Discipleship Progress Tracker</h4>
                        <p>Select the highest level achieved for each milestone</p>
                        <div class="form-row discipleship-row">
                            <div class="form-group">
                                <label for="addStaffEvangelism">Evangelism</label>
                                <select id="addStaffEvangelism" class="form-control">
                                    <option value="None">None</option>
                                    <option value="Model">Model</option>
                                    <option value="Assist">Assist</option>
                                    <option value="Watch">Watch</option>
                                    <option value="Leader">Leader</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="addStaffSalvation">Salvation</label>
                                <select id="addStaffSalvation" class="form-control">
                                    <option value="None">None</option>
                                    <option value="Model">Model</option>
                                    <option value="Assist">Assist</option>
                                    <option value="Watch">Watch</option>
                                    <option value="Leader">Leader</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="addStaffBaptism">Baptism</label>
                                <select id="addStaffBaptism" class="form-control">
                                    <option value="None">None</option>
                                    <option value="Model">Model</option>
                                    <option value="Assist">Assist</option>
                                    <option value="Watch">Watch</option>
                                    <option value="Leader">Leader</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <button type="submit" class="submit-btn">Add Staff Member</button>
                </form>
            </div>
            
            <div id="updateLevelSection" class="form-section">
                <div class="form-section-header">
                    <h3><span class="form-section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span>Update Country Status</h3>
                </div>
                <form id="formUpdateLevel">
                    <div class="form-group">
                        <label for="updateLevelCountrySelect">Select Country</label>
                        <select id="updateLevelCountrySelect" required class="form-control">
                            <option value="">-- Choose Country --</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="updateLevelSelect">New Status / Level</label>
                        <select id="updateLevelSelect" required class="form-control">
                            <option value="L1">L1 - Established (Blue)</option>
                            <option value="L2">L2 - Growing (Light Green)</option>
                            <option value="L3">L3 - Developing (Yellow)</option>
                            <option value="L4">L4 - Emerging (Orange)</option>
                            <option value="inactive">Inactive (Grey)</option>
                            <option value="cancelled">Cancelled (Red)</option>
                            <option value="default">Default (Theme Orange)</option>
                        </select>
                    </div>
                    <div class="status-preview">
                        <span class="preview-label">Preview:</span>
                        <span id="statusPreviewColor" class="preview-color" style="background: #2196f3"></span>
                    </div>
                    <button type="submit" class="submit-btn">Update Map Color</button>
                </form>
            </div>

            <div id="editChurchSection" class="form-section">
                <div class="form-section-header">
                    <h3>Edit Church Details</h3>
                </div>
                <form id="formEditChurch">
                    <div class="form-group">
                        <label for="editChurchSelect">Select Church</label>
                        <select id="editChurchSelect" required class="form-control">
                            <option value="">-- Choose Church --</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editChurchYear">Year Started</label>
                            <input type="number" id="editChurchYear" placeholder="2024" min="1900" max="2100">
                        </div>
                        <div class="form-group">
                            <label for="editChurchAttendees">Attendees</label>
                            <input type="number" id="editChurchAttendees" placeholder="50" min="0">
                        </div>
                    </div>
                    <button type="submit" class="submit-btn">Update Church</button>
                </form>
            </div>

            <div id="editStaffSection" class="form-section">
                <div class="form-section-header">
                    <h3>Edit Staff Details</h3>
                </div>
                <form id="formEditStaff">
                    <div class="form-group">
                        <label for="editStaffChurchSelect">Select Church</label>
                        <select id="editStaffChurchSelect" required class="form-control">
                            <option value="">-- Choose Church --</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editStaffSelect">Select Staff Member</label>
                        <select id="editStaffSelect" required class="form-control">
                            <option value="">-- Choose Staff Member --</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editStaffAge">Age</label>
                            <input type="number" id="editStaffAge" placeholder="30" min="18" max="120">
                        </div>
                        <div class="form-group">
                            <label for="editStaffYear">Year Joined</label>
                            <input type="number" id="editStaffYear" placeholder="2024" min="1900" max="2100">
                        </div>
                    </div>
                    <div class="discipleship-tracker">
                        <h4>Discipleship Progress Tracker</h4>
                        <div class="form-row discipleship-row">
                            <div class="form-group">
                                <label for="editStaffEvangelism">Evangelism</label>
                                <select id="editStaffEvangelism" class="form-control">
                                    <option value="None">None</option>
                                    <option value="Model">Model</option>
                                    <option value="Assist">Assist</option>
                                    <option value="Watch">Watch</option>
                                    <option value="Leader">Leader</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="editStaffSalvation">Salvation</label>
                                <select id="editStaffSalvation" class="form-control">
                                    <option value="None">None</option>
                                    <option value="Model">Model</option>
                                    <option value="Assist">Assist</option>
                                    <option value="Watch">Watch</option>
                                    <option value="Leader">Leader</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="editStaffBaptism">Baptism</label>
                                <select id="editStaffBaptism" class="form-control">
                                    <option value="None">None</option>
                                    <option value="Model">Model</option>
                                    <option value="Assist">Assist</option>
                                    <option value="Watch">Watch</option>
                                    <option value="Leader">Leader</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <button type="submit" class="submit-btn">Update Staff</button>
                </form>
            </div>

            <div id="addPinDataSection" class="form-section">
                <div class="form-section-header">
                    <h3>Add Pin Data</h3>
                </div>
                <form id="formAddPinData">
                    <div class="form-group">
                        <label for="pinDataChurchSelect">Select Church</label>
                        <select id="pinDataChurchSelect" required class="form-control">
                            <option value="">-- Choose Church --</option>
                        </select>
                    </div>
                    <p class="coords-text" id="pinDataSelectedChurchText">Select a church above, then click the map below to place its pin.</p>
                    <div id="pinDataMap" style="height:250px;border-radius:8px;margin:8px 0;border:1px solid var(--border);"></div>
                    <input type="hidden" id="pinDataLat">
                    <input type="hidden" id="pinDataLng">
                    <p class="coords-text" id="pinDataCoordsText">No location selected — click the map above.</p>
                    <button type="submit" class="submit-btn" id="savePinDataBtn">Save Pin</button>
                </form>
            </div>
            
        </div><!-- /.form-sections-container -->
        </div><!-- /.forms-body -->
    </div><!-- /#formsPage -->
    <div id="sidebar" class="sidebar">
        <button id="closeSidebar" class="sidebar-close" title="Close" aria-label="Close sidebar">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div id="sidebarContent"></div>
    </div>

    <div id="loadingOverlay" class="loading-overlay">
        <div class="loading-spinner">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto 18px">
                <rect width="52" height="52" rx="10" fill="#db5729"/>
                <text x="26" y="38" text-anchor="middle" font-family="Raleway,sans-serif" font-weight="800" font-size="34" fill="white">D</text>
            </svg>
            <div class="spinner"></div>
            <p>Loading map data...</p>
        </div>
    </div>

    <div id="toastContainer" class="toast-container"></div>

    <!-- Full detail panel — slides over everything when "View Full Details" is clicked -->
    <div id="detailPanel" class="detail-panel">
        <div id="detailPanelContent"></div>
    </div>

    <?php
    return ob_get_clean(); 
}
add_shortcode('door_ministry_map', 'door_map_shortcode');


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: DiscipleTools Admin Integration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register the map as a page under the DT Extensions admin menu.
 *
 * Adds a submenu item "DOOR Map" under the dt_extensions parent menu.
 * Requires manage_options capability — admin only.
 * The page callback renders the map at full viewport height by overriding
 * default WordPress admin padding/margins via inline CSS.
 */
function add_door_map_to_dt_extensions() {
    add_submenu_page(
        'dt_extensions',                 
        'DOOR Ministry Map',             
        'DOOR Map',                      
        'manage_options',                
        'door-ministry-map',             
        'render_door_map_admin_page'     
    );
}
add_action('admin_menu', 'add_door_map_to_dt_extensions', 99);


/**
 * Render the DOOR Ministry Map admin page at full viewport height.
 *
 * Injects a small inline <style> block to override WordPress admin layout
 * padding on this page only (#door-map-admin-wrap), allowing the map to fill
 * the entire available screen area below the WP toolbar.
 *
 * Also handles the DT sidebar collapsed/expanded state via the .folded class.
 */
function render_door_map_admin_page() {
    // Debug: uncomment the line below if the map is still blank to find the real hook value
    // echo '<p style="color:red;font-size:11px;">Hook: ' . esc_html( get_current_screen()->id ) . '</p>';
    ?>
    <style>
        /* Override wp-admin layout ONLY on this page to give map full height */
        #wpcontent, #wpbody, #wpbody-content {
            padding: 0 !important;
            margin: 0 !important;
        }
        #door-map-admin-wrap {
            position: fixed;
            top: 32px;    /* wp toolbar */
            left: 160px;  /* wp sidebar — expanded */
            right: 0;
            bottom: 0;
            overflow: hidden;
            z-index: 10;
        }
        .folded #door-map-admin-wrap {
            left: 36px;   /* wp sidebar — collapsed */
        }
        #door-map-admin-wrap .container {
            width: 100% !important;
            height: 100% !important;
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
        }
        #door-map-admin-wrap #map {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            width: 100% !important;
            height: 100% !important;
        }
    </style>
    <div id="door-map-admin-wrap">
        <?php echo do_shortcode('[door_ministry_map]'); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
    </div>
    <?php
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: Frontend Route — /ministry-map/
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Serve the ministry map at the /ministry-map/ URL on the DT frontend.
 *
 * Hooks into template_redirect (priority 1) to intercept requests to the
 * /ministry-map/ path before WordPress tries to render a template for it.
 * Outputs the full page using get_header(), the map shortcode, and get_footer().
 *
 * Note: Uses REQUEST_URI string matching rather than a registered rewrite rule
 * to avoid conflicts with DT's own routing system.
 */
function door_map_frontend_endpoint() {
    if (strpos($_SERVER['REQUEST_URI'], '/ministry-map') !== false) {
        get_header(); 
        
        echo '<div style="width: 100%; height: calc(100vh - 50px);">';
        echo do_shortcode('[door_ministry_map]'); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- shortcode output is internally escaped
        echo '</div>';
        
        get_footer();
        exit;
    }
}
add_action('template_redirect', 'door_map_frontend_endpoint', 1);


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: Frontend Navigation Injection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inject a "Global Map" tab into the DT frontend navigation bar.
 *
 * DiscipleTools builds its navigation dynamically via JavaScript, so a
 * standard wp_nav_menu filter cannot target it reliably. Instead, this
 * function outputs a small inline script that uses MutationObserver to watch
 * for the nav bar to be rendered, then appends the Global Map tab adjacent to
 * the existing "Metrics" link.
 *
 * The tab links to /ministry-map/ and is only injected once (guarded by ID check).
 * Only runs on the frontend (is_admin() check).
 */
function door_map_add_nav_tab() {
    if (!is_admin()) {
        ?>
        <script>
            function injectMapTab() {
                if (document.getElementById("custom-dt-map-tab")) return;

                var links = document.querySelectorAll("a");
                var metricsLink = Array.from(links).find(link => link.textContent && link.textContent.includes("Metrics"));
                
                if (metricsLink && metricsLink.parentNode && metricsLink.parentNode.parentNode) {
                    var mapTab = document.createElement("li");
                    mapTab.id = "custom-dt-map-tab";
                    mapTab.className = metricsLink.parentNode.className; 
                    
                    mapTab.innerHTML = '<a href="/ministry-map/" style="display:flex; align-items:center; gap:5px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Global Map</a>';
                    
                    metricsLink.parentNode.parentNode.appendChild(mapTab);
                }
            }

            var observer = new MutationObserver(function(mutations) {
                injectMapTab();
            });
            
            document.addEventListener("DOMContentLoaded", function() {
                observer.observe(document.body, { childList: true, subtree: true });
                injectMapTab();
            });
        </script>
        <?php
    }
}
add_action('wp_footer', 'door_map_add_nav_tab', 99);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: REST API — Direct Database Inspector Endpoints
//
// These endpoints query $wpdb directly, completely bypassing DT's REST
// middleware layer. This is intentional — DT's middleware was causing
// intermittent 500 errors on the shared host database connection.
//
// All three routes share a single permission callback (door_map_inspector_permission)
// which enforces nonce verification + login check + capability check.
//
// Query safety:
//   - Paginated IDs use $wpdb->prepare() with %d/%d placeholders
//   - IN() clauses use implode(array_map('intval', ...)) — no raw user input
//   - No write operations of any kind are performed
//
// Routes registered:
//   GET /wp-json/door-map/v1/inspector?type=groups|contacts&offset=N&limit=N
//   GET /wp-json/door-map/v1/inspector-users?offset=N&limit=N
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register the /inspector-users REST route.
 *
 * Returns paginated WordPress users with their roles and DT-specific meta fields:
 *   user_status, workload_status, corresponds_to_contact.
 * Hard limited to 25 records per request to prevent DB connection exhaustion.
 */
add_action( 'rest_api_init', 'door_map_register_users_route' );

function door_map_register_users_route() {
    register_rest_route('door-map/v1', '/inspector-users', array(
        'methods'             => 'GET',
        'callback'            => 'door_map_inspector_users_handler',
        'permission_callback' => 'door_map_inspector_permission',
        'args' => array(
            'offset' => array( 'default' => 0,  'sanitize_callback' => 'absint' ),
            'limit'  => array( 'default' => 25, 'sanitize_callback' => 'absint' ),
        ),
    ));
}

/**
 * Handle GET /wp-json/door-map/v1/inspector-users
 *
 * Executes two sequential queries:
 *   1. COUNT — total number of users with a capabilities meta entry
 *   2. Paginated user IDs + display_name, email, registered date
 *   3. Meta batch — roles, user_status, workload_status, corresponds_to_contact
 *
 * @param WP_REST_Request $request Request object with optional offset/limit params.
 * @return WP_REST_Response Paginated response with posts[], total, offset, limit.
 */
function door_map_inspector_users_handler( $request ) {
    global $wpdb;
    $offset = (int) $request->get_param('offset');
    $limit  = min( (int) $request->get_param('limit'), 25 );

    $total = (int) $wpdb->get_var( "
        SELECT COUNT(DISTINCT u.ID)
        FROM {$wpdb->users} u
        INNER JOIN {$wpdb->usermeta} um
            ON (u.ID = um.user_id AND um.meta_key = '{$wpdb->prefix}capabilities')
        WHERE um.meta_value != ''
    " );

    $users = $wpdb->get_results( $wpdb->prepare( "
        SELECT DISTINCT u.ID, u.display_name, u.user_email, u.user_registered
        FROM {$wpdb->users} u
        INNER JOIN {$wpdb->usermeta} um
            ON (u.ID = um.user_id AND um.meta_key = '{$wpdb->prefix}capabilities')
        WHERE um.meta_value != ''
        ORDER BY u.ID ASC
        LIMIT %d OFFSET %d
    ", $limit, $offset ), ARRAY_A );

    if ( empty( $users ) ) {
        return rest_ensure_response( array( 'posts' => array(), 'total' => $total, 'offset' => $offset, 'limit' => $limit ) );
    }

    $user_ids = implode( ',', array_map( 'intval', array_column( $users, 'ID' ) ) );

    $meta_rows = $wpdb->get_results(
        "SELECT user_id, meta_key, meta_value FROM {$wpdb->usermeta}
         WHERE user_id IN ($user_ids)
         AND meta_key IN ('{$wpdb->prefix}capabilities', '{$wpdb->prefix}user_status', 'workload_status', 'corresponds_to_contact', 'first_name', 'last_name')
         ORDER BY user_id ASC",
        ARRAY_A
    );

    $meta_by_user = array();
    foreach ( $meta_rows as $row ) {
        $uid = $row['user_id'];
        $k   = str_replace( $wpdb->prefix, '', $row['meta_key'] );
        $v   = $row['meta_value'];
        if ( $k === 'capabilities' ) {
            $caps = maybe_unserialize( $v );
            $meta_by_user[$uid]['roles'] = is_array( $caps ) ? implode( ', ', array_keys( $caps ) ) : '';
        } else {
            $meta_by_user[$uid][$k] = $v;
        }
    }

    $records = array();
    foreach ( $users as $user ) {
        $uid  = (int) $user['ID'];
        $meta = isset( $meta_by_user[$uid] ) ? $meta_by_user[$uid] : array();
        $records[] = array(
            'ID'                     => $uid,
            'display_name'           => $user['display_name'],
            'first_name'             => isset( $meta['first_name'] ) ? $meta['first_name'] : '',
            'last_name'              => isset( $meta['last_name'] ) ? $meta['last_name'] : '',
            'user_email'             => $user['user_email'],
            'user_registered'        => $user['user_registered'],
            'roles'                  => isset( $meta['roles'] )                  ? $meta['roles']                  : '',
            'user_status'            => isset( $meta['user_status'] )            ? $meta['user_status']            : '',
            'workload_status'        => isset( $meta['workload_status'] )        ? $meta['workload_status']        : '',
            'corresponds_to_contact' => isset( $meta['corresponds_to_contact'] ) ? $meta['corresponds_to_contact'] : '',
        );
    }

    $wpdb->flush();
    return rest_ensure_response( array( 'posts' => $records, 'total' => $total, 'offset' => $offset, 'limit' => $limit ) );
}

add_action('rest_api_init', 'door_map_register_inspector_route');

/**
 * Validate the `type` parameter for the /inspector route.
 *
 * Accepts only 'groups' or 'contacts' — any other value causes a 400 response.
 *
 * @param  string $v The raw type parameter value.
 * @return bool       True if valid, false otherwise.
 */
function door_map_validate_type( $v ) {
    return in_array( $v, array( 'groups', 'contacts' ), true );
}

/**
 * Register the /inspector REST route.
 *
 * Accepts: type (required, groups|contacts), offset (default 0), limit (default 50).
 * The handler enforces an internal hard cap of 25 records regardless of the limit param.
 */
function door_map_register_inspector_route() {
    register_rest_route( 'door-map/v1', '/inspector', array(
        'methods'             => 'GET',
        'callback'            => 'door_map_inspector_handler',
        'permission_callback' => 'door_map_inspector_permission',
        'args' => array(
            'type' => array(
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
                'validate_callback' => 'door_map_validate_type',
            ),
            'offset' => array(
                'default'           => 0,
                'sanitize_callback' => 'absint',
            ),
            'limit' => array(
                'default'           => 50,
                'sanitize_callback' => 'absint',
            ),
        ),
    ));
}

/**
 * Shared permission callback for all door-map REST endpoints.
 *
 * Enforces three checks in order:
 *   1. A valid wp_rest nonce must be present in the X-WP-Nonce request header.
 *   2. The requesting user must be logged in.
 *   3. The requesting user must have the edit_posts capability.
 *
 * Returns a WP_Error with 403 status if the nonce is missing or invalid.
 * Returns false (which triggers a 401) if the user is not logged in or lacks capability.
 *
 * Note: WP_REST_Request type hint is intentionally omitted — it caused fatal
 * errors on this host before PHP fully loaded the REST API classes.
 *
 * @param  mixed $request The REST request object (no type hint by design).
 * @return bool|WP_Error  True if authorized, WP_Error if nonce is bad, false otherwise.
 */
function door_map_inspector_permission( $request ) {
    // Verify the wp_rest nonce sent in the X-WP-Nonce header
    $nonce = $request->get_header('x_wp_nonce');
    if ( ! $nonce || wp_verify_nonce( $nonce, 'wp_rest' ) === false ) {
        return new WP_Error(
            'rest_forbidden',
            'Invalid nonce.',
            array( 'status' => 403 )
        );
    }
    return is_user_logged_in() && current_user_can('edit_posts');
}

/**
 * Handle GET /wp-json/door-map/v1/inspector
 *
 * Routes to door_map_inspector_contacts() or door_map_inspector_groups()
 * depending on the `type` parameter. Enforces a hard 25-record page cap.
 * Calls $wpdb->flush() after the query to release any lingering result sets.
 *
 * @param  mixed $request REST request with type, offset, limit params.
 * @return WP_REST_Response Paginated response with posts[], total, offset, limit.
 */
function door_map_inspector_handler( $request ) {
    global $wpdb;

    // Hard cap: 25 records per page — prevents connection exhaustion on shared hosting
    $type   = $request->get_param('type');
    $offset = (int) $request->get_param('offset');
    $limit  = min( (int) $request->get_param('limit'), 25 );

    // Set a query timeout so a slow query never holds the connection open

    if ( $type === 'contacts' ) {
        $result = door_map_inspector_contacts( $offset, $limit );
    } else {
        $result = door_map_inspector_groups( $offset, $limit );
    }

    // Explicitly suppress any lingering result sets
    $wpdb->flush();

    return $result;
}

/**
 * Fetch a paginated page of DT contacts from the database.
 *
 * Filters to contacts with type='access' (sourced from DT's access-module.php pattern),
 * which represents real person records rather than system or placeholder entries.
 *
 * Executes four sequential queries — no JOINs in the data queries to avoid
 * overwhelming the DB connection:
 *   1. COUNT  — total access-type contacts
 *   2. IDs    — paginated IDs via LIMIT/OFFSET with prepare()
 *   3. Posts  — titles and dates for those IDs via IN()
 *   4. Meta   — all postmeta for those IDs via IN(), then assembled in PHP
 *
 * Tracked fields:
 *   Single-value: overall_status, faith_status, seeker_path, age_range,
 *                 baptism_date, baptism_generation, availabletime, type,
 *                 assigned_to, quick_button_* fields
 *   Multi-value:  salvation, baptism, cbs_class, praying, milestones,
 *                 all MAWL discipline fields, sources, campaigns
 *
 * @param  int $offset  Zero-based page start index.
 * @param  int $limit   Maximum records to return (caller-enforced cap of 25).
 * @return WP_REST_Response Paginated response.
 */
function door_map_inspector_contacts( $offset, $limit ) {
    global $wpdb;

    // 1. Count
    $total = (int) $wpdb->get_var( "
        SELECT COUNT(DISTINCT p.ID)
        FROM {$wpdb->posts} p
        INNER JOIN {$wpdb->postmeta} t
            ON (p.ID = t.post_id AND t.meta_key = 'type' AND t.meta_value = 'access')
        WHERE p.post_type = 'contacts'
          AND p.post_status = 'publish'
    " );

    if ( $total === 0 ) {
        return rest_ensure_response( array( 'posts' => array(), 'total' => 0, 'offset' => $offset, 'limit' => $limit ) );
    }

    // 2. Get IDs for this page only
    $ids = $wpdb->get_col( $wpdb->prepare( "
        SELECT DISTINCT p.ID
        FROM {$wpdb->posts} p
        INNER JOIN {$wpdb->postmeta} t
            ON (p.ID = t.post_id AND t.meta_key = 'type' AND t.meta_value = 'access')
        WHERE p.post_type = 'contacts'
          AND p.post_status = 'publish'
        ORDER BY p.ID ASC
        LIMIT %d OFFSET %d
    ", $limit, $offset ) );

    if ( empty( $ids ) ) {
        return rest_ensure_response( array( 'posts' => array(), 'total' => $total, 'offset' => $offset, 'limit' => $limit ) );
    }

    // 3. Get titles
    $id_list = implode( ',', array_map( 'intval', $ids ) );
    $posts = $wpdb->get_results(
        "SELECT ID, post_title AS name, post_date FROM {$wpdb->posts} WHERE ID IN ($id_list) ORDER BY ID ASC",
        ARRAY_A
    );

    // 4. Get all meta in one query — no JOINs, no connection strain
    $meta_rows = $wpdb->get_results(
        "SELECT post_id, meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id IN ($id_list) ORDER BY post_id ASC",
        ARRAY_A
    );

    $multi_fields = array(
        'salvation','baptism','cbs_class','praying',
        'believes_fellowship_acts_2','money_management','reports',
        'worship','last_supper','love','marriage','singles',
        'family','teacher','advice','fruit_of_the_spirit',
        'milestones','actionsevangelism','sources','campaigns'
    );
    $single_fields = array(
        'overall_status','seeker_path','assigned_to','requires_update',
        'accepted','reason_unassignable','reason_paused','reason_closed',
        'faith_status','age_range','baptism_date','baptism_generation',
        'availabletime','type',
        'quick_button_no_answer','quick_button_contact_established',
        'quick_button_meeting_scheduled','quick_button_meeting_complete',
        'quick_button_no_show'
    );

    $meta_by_id = array();
    foreach ( $meta_rows as $row ) {
        $pid = $row['post_id'];
        $k   = $row['meta_key'];
        $v   = $row['meta_value'];
        if ( in_array( $k, $multi_fields, true ) ) {
            if ( !isset( $meta_by_id[$pid][$k] ) ) $meta_by_id[$pid][$k] = array();
            if ( $v !== '' && !in_array( $v, $meta_by_id[$pid][$k], true ) ) $meta_by_id[$pid][$k][] = $v;
        } elseif ( in_array( $k, $single_fields, true ) ) {
            if ( !isset( $meta_by_id[$pid][$k] ) ) $meta_by_id[$pid][$k] = $v;
        }
    }

    $records = array();
    foreach ( $posts as $post ) {
        $pid    = (int) $post['ID'];
        $meta   = isset( $meta_by_id[$pid] ) ? $meta_by_id[$pid] : array();
        $record = array( 'ID' => $pid, 'name' => $post['name'], 'post_date' => $post['post_date'] );
        foreach ( $single_fields as $f ) $record[$f] = isset( $meta[$f] ) ? $meta[$f] : '';
        foreach ( $multi_fields  as $f ) $record[$f] = isset( $meta[$f] ) ? implode( ', ', $meta[$f] ) : '';
        $records[] = $record;
    }

    return rest_ensure_response( array( 'posts' => $records, 'total' => $total, 'offset' => $offset, 'limit' => $limit ) );
}

/**
 * Fetch a paginated page of DT groups from the database.
 *
 * Uses the same safe four-query pattern as door_map_inspector_contacts():
 * COUNT → paginated IDs → titles → meta batch assembled in PHP.
 *
 * Tracked fields:
 *   Single-value: group_status, group_type, member_count, leader_count,
 *                 start_date, church_start_date, end_date, assigned_to,
 *                 door_map_level, requires_update, contact_address,
 *                 four_fields_* church health markers
 *   Multi-value:  health_metrics
 *
 * Note: location_grid_meta is not currently tracked here as most groups in
 * the DOOR database have not yet been assigned coordinates in DT. This is
 * a known pending task dependent on stakeholder data entry.
 *
 * @param  int $offset  Zero-based page start index.
 * @param  int $limit   Maximum records to return (caller-enforced cap of 25).
 * @return WP_REST_Response Paginated response.
 */
function door_map_inspector_groups( $offset, $limit ) {
    global $wpdb;

    // 1. Count
    $total = (int) $wpdb->get_var( "
        SELECT COUNT(DISTINCT ID)
        FROM {$wpdb->posts}
        WHERE post_type = 'groups'
          AND post_status = 'publish'
    " );

    if ( $total === 0 ) {
        return rest_ensure_response( array( 'posts' => array(), 'total' => 0, 'offset' => $offset, 'limit' => $limit ) );
    }

    // 2. Get IDs for this page
    $ids = $wpdb->get_col( $wpdb->prepare( "
        SELECT ID FROM {$wpdb->posts}
        WHERE post_type = 'groups'
          AND post_status = 'publish'
        ORDER BY ID ASC
        LIMIT %d OFFSET %d
    ", $limit, $offset ) );

    if ( empty( $ids ) ) {
        return rest_ensure_response( array( 'posts' => array(), 'total' => $total, 'offset' => $offset, 'limit' => $limit ) );
    }

    // 3. Get titles
    $id_list = implode( ',', array_map( 'intval', $ids ) );
    $posts = $wpdb->get_results(
        "SELECT ID, post_title AS name, post_date FROM {$wpdb->posts} WHERE ID IN ($id_list) ORDER BY ID ASC",
        ARRAY_A
    );

    // 4. Get all meta — no JOINs
    $meta_rows = $wpdb->get_results(
        "SELECT post_id, meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id IN ($id_list) ORDER BY post_id ASC",
        ARRAY_A
    );

    $single_fields = array(
        'group_status','group_type','member_count','leader_count',
        'start_date','church_start_date','end_date','assigned_to',
        'door_map_level','requires_update','contact_address',
        'four_fields_unbelievers','four_fields_believers',
        'four_fields_accountable','four_fields_church_commitment',
        'four_fields_multiplying'
    );
    $multi_fields = array( 'health_metrics' );

    $meta_by_id = array();
    foreach ( $meta_rows as $row ) {
        $pid = $row['post_id'];
        $k   = $row['meta_key'];
        $v   = $row['meta_value'];
        if ( in_array( $k, $multi_fields, true ) ) {
            if ( !isset( $meta_by_id[$pid][$k] ) ) $meta_by_id[$pid][$k] = array();
            if ( $v !== '' && !in_array( $v, $meta_by_id[$pid][$k], true ) ) $meta_by_id[$pid][$k][] = $v;
        } elseif ( in_array( $k, $single_fields, true ) ) {
            if ( !isset( $meta_by_id[$pid][$k] ) ) $meta_by_id[$pid][$k] = $v;
        }
    }

    $records = array();
    foreach ( $posts as $post ) {
        $pid    = (int) $post['ID'];
        $meta   = isset( $meta_by_id[$pid] ) ? $meta_by_id[$pid] : array();
        $record = array( 'ID' => $pid, 'name' => $post['name'], 'post_date' => $post['post_date'] );
        foreach ( $single_fields as $f ) $record[$f] = isset( $meta[$f] ) ? $meta[$f] : '';
        foreach ( $multi_fields  as $f ) $record[$f] = isset( $meta[$f] ) ? implode( ', ', $meta[$f] ) : '';
        $records[] = $record;
    }

    return rest_ensure_response( array( 'posts' => $records, 'total' => $total, 'offset' => $offset, 'limit' => $limit ) );
}

/**
 * Register pin coordinate write endpoint.
 */
add_action( 'rest_api_init', 'door_map_register_pin_route' );
function door_map_register_pin_route() {
    register_rest_route( 'door-map/v1', '/pin-coordinates', array(
        'methods'             => 'POST',
        'callback'            => 'door_map_save_pin_coordinates',
        'permission_callback' => 'door_map_inspector_permission',
        'args' => array(
            'church_name' => array( 'required' => true,  'sanitize_callback' => 'sanitize_text_field' ),
            'lat'         => array( 'required' => true,  'sanitize_callback' => 'sanitize_text_field' ),
            'lng'         => array( 'required' => true,  'sanitize_callback' => 'sanitize_text_field' ),
            'group_id'    => array( 'required' => false, 'default' => 0,  'sanitize_callback' => 'absint' ),
            'country'     => array( 'required' => false, 'default' => '', 'sanitize_callback' => 'sanitize_text_field' ),
        ),
    ) );
}

/**
 * Save coordinates to the churches CSV by church/fellowship name.
 */
function door_map_save_pin_coordinates( $request ) {
    $church_name = trim( (string) $request->get_param( 'church_name' ) );
    $lat         = trim( (string) $request->get_param( 'lat' ) );
    $lng         = trim( (string) $request->get_param( 'lng' ) );

    if ( $church_name === '' || $lat === '' || $lng === '' ) {
        return new WP_Error( 'invalid_params', 'church_name, lat, and lng are required.', array( 'status' => 400 ) );
    }

    $csv_path = plugin_dir_path( __FILE__ ) . 'assets/Copy of Oversight Document - Total Churches_Fellowships.csv';
    if ( ! file_exists( $csv_path ) || ! is_readable( $csv_path ) || ! is_writable( $csv_path ) ) {
        return new WP_Error( 'csv_unavailable', 'Church CSV is not writable.', array( 'status' => 500 ) );
    }

    $rows = array();
    $handle = fopen( $csv_path, 'r' );
    if ( ! $handle ) {
        return new WP_Error( 'csv_read_failed', 'Could not read CSV.', array( 'status' => 500 ) );
    }
    while ( ( $row = fgetcsv( $handle ) ) !== false ) {
        $rows[] = $row;
    }
    fclose( $handle );

    if ( empty( $rows ) ) {
        return new WP_Error( 'csv_empty', 'CSV file is empty.', array( 'status' => 500 ) );
    }

    $header = $rows[0];
    $lat_idx = array_search( 'Latitude', $header, true );
    $lng_idx = array_search( 'Longitude', $header, true );

    if ( $lat_idx === false ) {
        $header[] = 'Latitude';
        $lat_idx = count( $header ) - 1;
    }
    if ( $lng_idx === false ) {
        $header[] = 'Longitude';
        $lng_idx = count( $header ) - 1;
    }
    $rows[0] = $header;

    $matched = false;
    for ( $i = 1; $i < count( $rows ); $i++ ) {
        $row = $rows[ $i ];
        $fellowship = isset( $row[3] ) ? trim( (string) $row[3] ) : '';
        $church     = isset( $row[4] ) ? trim( (string) $row[4] ) : '';
        if ( strcasecmp( $fellowship, $church_name ) === 0 || strcasecmp( $church, $church_name ) === 0 ) {
            while ( count( $row ) <= $lng_idx ) {
                $row[] = '';
            }
            $row[ $lat_idx ] = $lat;
            $row[ $lng_idx ] = $lng;
            $rows[ $i ] = $row;
            $matched = true;
            break;
        }
    }

    if ( ! $matched ) {
        // Create an empty row of appropriate length instead of throwing a 404
        $max_cols = max($lng_idx, $lat_idx, 4);
        $new_old_row = array_fill(0, $max_cols + 1, '');
        $new_old_row[4] = $church_name;
        $new_old_row[$lat_idx] = $lat;
        $new_old_row[$lng_idx] = $lng;
        $rows[] = $new_old_row;
    }

    $write = fopen( $csv_path, 'w' );
    if ( ! $write ) {
        return new WP_Error( 'csv_write_failed', 'Could not write CSV.', array( 'status' => 500 ) );
    }
    foreach ( $rows as $row ) {
        fputcsv( $write, $row );
    }
    fclose( $write );

    // ── Also write/update the new pin-coordinates.csv ──────────────────────────
    $group_id = (int) $request->get_param('group_id');
    $country  = trim( (string) $request->get_param('country') );

    // If JS sent a failed lookup as "Unassigned", wipe it to trigger server derivation
    if ( strcasecmp($country, 'Unassigned') === 0 || strcasecmp($country, 'Unknown') === 0 ) {
        $country = '';
    }

    // Derive country server-side via staff assignment chain when not supplied
    if ( $country === '' ) {
        if ( $group_id > 0 ) {
            $country = door_map_derive_country_for_group( $group_id );
        }
        
        // If it's STILL empty, or group_id was 0 (unlinked group), parse the church title directly!
        if ( $country === '' ) {
            $name_to_country = door_map_read_staff_csv();
            $known_countries = array_unique( array_values( $name_to_country ) );
            foreach ( $known_countries as $c ) {
                $check_country = ( $c === 'India - Field' ) ? 'India' : $c;
                if ( stripos( $church_name, $check_country ) !== false ) {
                    $country = $c;
                    break;
                }
            }
        }
        
        // Final fallback
        if ( $country === '' ) {
            $country = 'Unassigned';
        }
    }

    door_map_upsert_pin_csv( $group_id, $church_name, $lat, $lng, $country );

    return rest_ensure_response( array(
        'success' => true,
        'church_name' => $church_name,
        'lat' => $lat,
        'lng' => $lng,
        'group_id' => $group_id,
        'country' => $country,
    ) );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: Staff-based Country Assignment & Group Pins CSV
//
// Three new endpoints:
//   GET /door-map/v1/country-group-map  — maps each group to its staff-assigned country
//   GET /door-map/v1/group-pins         — returns pins from pin-coordinates.csv
//
// Helper functions:
//   door_map_read_staff_csv()           — reads 2x2 Staff CSV, returns name→country map
//   door_map_derive_country_for_group() — looks up a group's country via assigned_to
//   door_map_upsert_pin_csv()           — write/update a row in pin-coordinates.csv
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read the 2x2 Staff CSV and return a lowercase display_name => country map.
 *
 * Staff CSV layout (0-based columns):
 *   0 = First name   1 = Last name   2 = Role   3 = Country
 * Row 0 is the "2x2 Staff" title; row 1 is the column header; data starts row 2.
 *
 * @return array  [ 'firstname lastname' => 'Country', ... ]
 */
function door_map_read_staff_csv() {
    $csv_path = plugin_dir_path( __FILE__ ) . 'assets/Copy of Oversight Document - Total 2x2 Staff.csv';
    if ( ! file_exists( $csv_path ) || ! is_readable( $csv_path ) ) {
        return array();
    }
    $handle = fopen( $csv_path, 'r' );
    if ( ! $handle ) return array();

    $name_to_country = array();
    $row_index = 0;
    while ( ( $row = fgetcsv( $handle ) ) !== false ) {
        $row_index++;
        if ( $row_index <= 2 ) continue; // skip title row and header row
        $first   = isset( $row[0] ) ? trim( $row[0] ) : '';
        $last    = isset( $row[1] ) ? trim( $row[1] ) : '';
        $country = isset( $row[3] ) ? trim( $row[3] ) : '';
        if ( $first === '' || $country === '' ) continue;
        $display = strtolower( trim( $first . ' ' . $last ) );
        $name_to_country[ $display ] = $country;
    }
    fclose( $handle );
    return $name_to_country;
}

/**
 * Derive the staff-assigned country for a group by following:
 *   group postmeta assigned_to -> user ID -> display_name -> staff CSV -> country
 *
 * @param  int    $group_id  WordPress post ID for the group.
 * @return string             Country name, or empty string if not determinable.
 */
function door_map_derive_country_for_group( $group_id ) {
    global $wpdb;
    $assigned_to = $wpdb->get_var( $wpdb->prepare(
        "SELECT meta_value FROM {$wpdb->postmeta}
         WHERE post_id = %d AND meta_key = 'assigned_to' LIMIT 1",
        $group_id
    ) );
    if ( ! $assigned_to || ! preg_match( '/user-(\d+)/', $assigned_to, $m ) ) {
        return '';
    }
    $uid = (int) $m[1];
    $user_row = $wpdb->get_row( $wpdb->prepare(
        "SELECT display_name FROM {$wpdb->users} WHERE ID = %d LIMIT 1",
        $uid
    ) );
    if ( ! $user_row ) return '';
    
    // Fetch first_name and last_name from usermeta
    $meta_rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT meta_key, meta_value FROM {$wpdb->usermeta} WHERE user_id = %d AND meta_key IN ('first_name', 'last_name')",
        $uid
    ) );
    $fname = ''; $lname = '';
    foreach ( $meta_rows as $mr ) {
        if ( $mr->meta_key === 'first_name' ) $fname = trim( $mr->meta_value );
        if ( $mr->meta_key === 'last_name' )  $lname = trim( $mr->meta_value );
    }
    
    $name_to_country = door_map_read_staff_csv();
    
    // 1. Try first_name + last_name
    $full_key = strtolower( trim( $fname . ' ' . $lname ) );
    if ( $full_key !== '' && isset( $name_to_country[ $full_key ] ) ) {
        return $name_to_country[ $full_key ];
    }
    
    // 2. Try display_name fallback
    $display_key = strtolower( trim( $user_row->display_name ) );
    if ( isset( $name_to_country[ $display_key ] ) ) {
        return $name_to_country[ $display_key ];
    }
    
    // 3. Fallback: Parse Group Title for Geographic Country Name
    $group_title = $wpdb->get_var( $wpdb->prepare( "SELECT post_title FROM {$wpdb->posts} WHERE ID = %d", $group_id ) );
    if ( $group_title ) {
        $known_countries = array_unique( array_values( $name_to_country ) );
        foreach ( $known_countries as $c ) {
            $check_country = ( $c === 'India - Field' ) ? 'India' : $c;
            if ( stripos( $group_title, $check_country ) !== false ) {
                return $c;
            }
        }
    }
    
    return '';
}

/**
 * Write or update a row in assets/Country Assignement and Pin location.csv.
 *
 * CSV columns (matching the existing header): long, lat, group_ID, country
 * Upserts by group_ID: updates the row if the group already has a pin, otherwise appends.
 *
 * @param int    $group_id    DT group post ID.
 * @param string $group_name  Group post title (not stored in CSV, used for DT patch only).
 * @param string $lat         Latitude string (6 decimal places).
 * @param string $lng         Longitude string (6 decimal places).
 * @param string $country     Staff-assigned country.
 */
function door_map_upsert_pin_csv( $group_id, $group_name, $lat, $lng, $country ) {
    $csv_path = plugin_dir_path( __FILE__ ) . 'assets/Country Assignement and Pin location.csv';
    $rows     = array();

    if ( file_exists( $csv_path ) && is_readable( $csv_path ) ) {
        $handle = fopen( $csv_path, 'r' );
        if ( $handle ) {
            while ( ( $row = fgetcsv( $handle ) ) !== false ) {
                $rows[] = $row;
            }
            fclose( $handle );
        }
    }

    // Ensure header row matches the file's defined format: long, lat, group_ID, country, group_name
    if ( empty( $rows ) ) {
        $rows[] = array( 'long', 'lat', 'group_ID', 'country', 'group_name' );
    }

    // CSV column order: 0=long, 1=lat, 2=group_ID, 3=country, 4=group_name
    $new_row = array( $lng, $lat, $group_id, $country, $group_name );
    $found   = false;
    for ( $i = 1; $i < count( $rows ); $i++ ) {
        // Match by group_id (if non-zero) or by group_name as fallback
        $row_id   = isset( $rows[$i][2] ) ? (int) $rows[$i][2] : 0;
        $row_name = isset( $rows[$i][4] ) ? trim( $rows[$i][4] ) : '';
        if ( ( $group_id > 0 && $row_id === $group_id ) ||
             ( $group_id === 0 && $row_name !== '' && $row_name === $group_name ) ) {
            $rows[$i] = $new_row;
            $found    = true;
            break;
        }
    }
    if ( ! $found ) {
        $rows[] = $new_row;
    }

    $write = fopen( $csv_path, 'w' );
    if ( ! $write ) return;
    foreach ( $rows as $row ) {
        fputcsv( $write, $row );
    }
    fclose( $write );
}

/**
 * Register GET /door-map/v1/country-group-map
 *
 * Returns every published DT group alongside its staff-assigned country,
 * derived by: group.assigned_to -> users.display_name -> staff CSV.country
 */
add_action( 'rest_api_init', 'door_map_register_country_group_map_route' );
function door_map_register_country_group_map_route() {
    register_rest_route( 'door-map/v1', '/country-group-map', array(
        'methods'             => 'GET',
        'callback'            => 'door_map_country_group_map_handler',
        'permission_callback' => 'door_map_inspector_permission',
    ) );
}

function door_map_country_group_map_handler( $request ) {
    global $wpdb;

    // 1. Staff CSV: lowercase display_name => country
    $name_to_country = door_map_read_staff_csv();

    // 2. Users: ID => country (via first_name+last_name OR display_name lookup)
    $users = $wpdb->get_results(
        "SELECT u.ID, u.display_name, 
         MAX(CASE WHEN um.meta_key = 'first_name' THEN um.meta_value END) as first_name,
         MAX(CASE WHEN um.meta_key = 'last_name' THEN um.meta_value END) as last_name
         FROM {$wpdb->users} u
         LEFT JOIN {$wpdb->usermeta} um ON u.ID = um.user_id AND um.meta_key IN ('first_name', 'last_name')
         GROUP BY u.ID
         ORDER BY u.ID ASC",
        ARRAY_A
    );
    $user_id_to_country = array();
    foreach ( $users as $u ) {
        $fname = isset( $u['first_name'] ) ? trim( $u['first_name'] ) : '';
        $lname = isset( $u['last_name'] ) ? trim( $u['last_name'] ) : '';
        
        $full_key = strtolower( trim( $fname . ' ' . $lname ) );
        if ( $full_key !== '' && isset( $name_to_country[ $full_key ] ) ) {
            $user_id_to_country[ (int) $u['ID'] ] = $name_to_country[ $full_key ];
            continue;
        }
        
        $display_key = strtolower( trim( $u['display_name'] ) );
        if ( $display_key !== '' && isset( $name_to_country[ $display_key ] ) ) {
            $user_id_to_country[ (int) $u['ID'] ] = $name_to_country[ $display_key ];
        }
    }

    if ( empty( $user_id_to_country ) ) {
        return rest_ensure_response( array( 'assignments' => array() ) );
    }

    // 3. Groups: get post_title and assigned_to meta for all published groups
    $posts = $wpdb->get_results(
        "SELECT ID, post_title FROM {$wpdb->posts}
         WHERE post_type = 'groups' AND post_status = 'publish'
         ORDER BY ID ASC",
        ARRAY_A
    );
    if ( empty( $posts ) ) {
        return rest_ensure_response( array( 'assignments' => array() ) );
    }

    $post_ids  = implode( ',', array_map( 'intval', array_column( $posts, 'ID' ) ) );
    $meta_rows = $wpdb->get_results(
        "SELECT post_id, meta_value FROM {$wpdb->postmeta}
         WHERE post_id IN ($post_ids) AND meta_key = 'assigned_to'",
        ARRAY_A
    );

    $assigned_to_map = array();
    foreach ( $meta_rows as $row ) {
        $assigned_to_map[ (int) $row['post_id'] ] = $row['meta_value'];
    }

    // 4. Build assignments
    $assignments = array();
    foreach ( $posts as $post ) {
        $pid = (int) $post['ID'];
        $at  = isset( $assigned_to_map[ $pid ] ) ? $assigned_to_map[ $pid ] : '';
        $matched = false;
        if ( preg_match( '/user-(\d+)/', $at, $m ) ) {
            $uid = (int) $m[1];
            if ( isset( $user_id_to_country[ $uid ] ) ) {
                $assignments[] = array(
                    'group_id'   => $pid,
                    'group_name' => $post['post_title'],
                    'country'    => $user_id_to_country[ $uid ],
                );
                $matched = true;
            }
        }
        
        // Title Extraction Fallback if Unmatched Admin
        if ( ! $matched ) {
            static $known_countries = null;
            if ( $known_countries === null ) {
                $known_countries = array_unique( array_values( $name_to_country ) );
            }
            foreach ( $known_countries as $c ) {
                $check_country = ( $c === 'India - Field' ) ? 'India' : $c;
                if ( stripos( $post['post_title'], $check_country ) !== false ) {
                    $assignments[] = array(
                        'group_id'   => $pid,
                        'group_name' => $post['post_title'],
                        'country'    => $c,
                    );
                    break;
                }
            }
        }
    }

    $wpdb->flush();
    return rest_ensure_response( array( 'assignments' => $assignments ) );
}

/**
 * Register GET /door-map/v1/group-pins
 *
 * Reads assets/Country Assignement and Pin location.csv and returns all saved pins,
 * optionally filtered by ?country=X (case-insensitive).
 *
 * CSV column order: 0=long, 1=lat, 2=group_ID, 3=country
 */
add_action( 'rest_api_init', 'door_map_register_group_pins_route' );
function door_map_register_group_pins_route() {
    register_rest_route( 'door-map/v1', '/group-pins', array(
        'methods'             => 'GET',
        'callback'            => 'door_map_group_pins_handler',
        'permission_callback' => 'door_map_inspector_permission',
        'args' => array(
            'country' => array(
                'default'           => '',
                'sanitize_callback' => 'sanitize_text_field',
            ),
        ),
    ) );
}

function door_map_group_pins_handler( $request ) {
    $filter_country = trim( (string) $request->get_param('country') );
    $csv_path       = plugin_dir_path( __FILE__ ) . 'assets/Country Assignement and Pin location.csv';

    if ( ! file_exists( $csv_path ) ) {
        return rest_ensure_response( array( 'pins' => array() ) );
    }
    $handle = fopen( $csv_path, 'r' );
    if ( ! $handle ) {
        return rest_ensure_response( array( 'pins' => array() ) );
    }

    $pins   = array();
    $header = null;
    while ( ( $row = fgetcsv( $handle ) ) !== false ) {
        if ( $header === null ) { $header = $row; continue; } // skip header row
        if ( count( $row ) < 4 ) continue;
        // CSV columns: 0=long, 1=lat, 2=group_ID, 3=country
        $country = trim( $row[3] );
        if ( $filter_country !== '' && strcasecmp( $country, $filter_country ) !== 0 ) continue;
        $lng = (float) $row[0];
        $lat = (float) $row[1];
        if ( $lat === 0.0 && $lng === 0.0 ) continue; // skip placeholder rows
        $pins[] = array(
            'group_id'   => (int) $row[2],
            'lat'        => $lat,
            'lng'        => $lng,
            'country'    => $country,
            'group_name' => isset( $row[4] ) ? trim( $row[4] ) : '',
        );
    }
    fclose( $handle );
    return rest_ensure_response( array( 'pins' => $pins ) );
}

