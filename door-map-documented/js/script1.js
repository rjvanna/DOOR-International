/**
 * @file script1.js
 * @description
 *   Core map logic for the DOOR International Global Ministry Map plugin.
 *
 *   Responsibilities:
 *     - Initialising and configuring the Leaflet.js map
 *     - Loading GeoJSON country/state boundaries and rendering filled shapes
 *     - Fetching live ministry data from DT REST API and the custom
 *       door-map/v1 inspector endpoints
 *     - Rendering church pins with optional 10/40 Window security modes
 *       (normal, obfuscated, hidden)
 *     - Building and populating the country, state, and church sidebar panels
 *     - Managing the full-screen detail panel for individual church/staff data
 *     - Handling the Global Overview modal and country statistics dashboard
 *     - Powering the Data Management forms (Add/Edit Country, Church, Staff)
 *     - Geocoding address strings via Nominatim (OpenStreetMap) as a fallback
 *       when lat/lng coordinates are absent
 *     - Light/dark theme persistence via localStorage
 *
 *   Data flow:
 *     loadLiveData() → doorMapFetchAll() → REST endpoint
 *     → normalise flat DB records → build country/region/church hierarchy
 *     → renderGlobalDashboard() + showAllCountries()
 *
 *   External dependencies:
 *     - Leaflet.js v1.9.4 (loaded by PHP via wp_enqueue_script)
 *     - World GeoJSON  https://github.com/johan/world.geo.json
 *     - US States JSON https://github.com/PublicaMundi/MappingAPI
 *     - India States   https://github.com/geohacker/india
 *     - Nominatim API  https://nominatim.openstreetmap.org (geocoding fallback)
 *     - CartoCDN tiles (dark mode basemap)
 *
 *   @version 5.0.0
 *   @authors Evan Simons, Rylan Vannaman
 */
'use strict';

// ============================================================================
// SECTION 1 — Configuration & Global State
//
// All tunable constants and module-level state variables are declared here.
// Keeping globals explicit at the top makes dependency relationships clear
// and avoids accidental implicit globals throughout the file.
// ============================================================================

const CONFIG = {
    map: {
        initialView: [20, 10], initialZoom: 3, minZoom: 2, maxZoom: 12,
        maxBounds: [[-90, -180], [90, 180]]
    },
    sensitiveWindow: { latMin: 10, latMax: 40, lngMin: -10, lngMax: 145 },
    obfuscationDistance: 0.27
};

const LEVEL_COLORS = {
    L1: '#2196f3', L2: '#8bc34a', L3: '#ffeb3b',
    L4: '#ff9800', inactive: '#9e9e9e', cancelled: '#f44336', default: '#db5729'
};

const DISC_LEVEL_ORDER  = ['milestone_model','milestone_assist','milestone_watch','milestone_leader'];
const DISC_LEVEL_LABELS = { milestone_model:'Model', milestone_assist:'Assist', milestone_watch:'Watch', milestone_leader:'Leader' };
const DISC_DISPLAY      = ['None','Model','Assist','Watch','Leader'];
const DT_STATUS_TO_LEVEL = { active: 'default', inactive: 'inactive' };

const HEALTH_METRIC_LABELS = {
    church_baptism:'Baptism', church_bible:'Bible Study', church_communion:'Communion',
    church_fellowship:'Fellowship', church_giving:'Giving', church_prayer:'Prayer',
    church_praise:'Praise', church_sharing:'Sharing the Gospel',
    church_leaders:'Leaders', church_commitment:'Church Commitment'
};

const GROUP_TYPE_LABELS = {
    believersfellowship:'Believers Fellowship', group:'Group',
    church:'Church', association:'Association'
};

const GEOJSON_NAME_MAP = {
    'United States':  'United States of America',
    'Tanzania':       'United Republic of Tanzania',
    'Russia':         'Russian Federation',
    'South Sudan':    'South Sudan',
};

const ND = '{NO DATA}';

const DT_API = (() => {
    const src     = window.dtMapData || {};
    const wpBase  = window.wpApiSettings?.root || '/wp-json';
    const wpNonce = window.wpApiSettings?.nonce || '';
    return {
        base:  (src.root  || wpBase).replace(/\/$/, ''),
        nonce: src.nonce  || wpNonce,
        pinSaveEndpoint:          src.pinSaveEndpoint          || '',
        countryGroupMapEndpoint:  src.countryGroupMapEndpoint  || '',
        groupPinsEndpoint:        src.groupPinsEndpoint        || '',
        canCreateGroups:   src.canCreateGroups   !== 'false',
        canCreateContacts: src.canCreateContacts !== 'false'
    };
})();

const liveData = {
    countryStats: {}, stateStats: {},
    churchDetails: {}, staffDetails: {},
    dtGroupIds: {}, dtContactIds: {},
    // groupCountryMap: { group_id (number) => country (string) }
    // populated by loadGroupCountryMap() using the staff assignment chain
    groupCountryMap: {}
};

let countries = [];
let map, lightTiles, darkTiles;
let churchMarkers, stateMarkers, countryMarkers, stateShapeMarkers, persistentPins;
let addChurchMapInstance = null, addChurchMarker = null;
let pinDataMapInstance = null, pinDataMarker = null;
let pinSecurityMode = 'normal';
let currentViewMode = localStorage.getItem('doorMapViewMode') || 'standard';
let worldGeoJSON = null, usGeoJSON = null, indiaGeoJSON = null;
let currentCountry = null, currentStateChurches = null;
let detailPanelChurchName = null;
let mapInitialized = false;
let dataLoaded = false;

// O(1) church name → {country, church} lookup; rebuilt by rebuildChurchLookups()
let churchLookupMap = new Map();
// Reverse of liveData.dtGroupIds (id → name); rebuilt by rebuildChurchLookups()
let idToNameMap = {};
// Cached world-countries GeoJSON layer; null when it needs to be rebuilt
let countriesGeoLayer = null;
// Set to true whenever countries[] or pinSecurityMode changes so showAllCountries() rebuilds the layer
let countriesLayerDirty = true;
let activeScreen = 'home';
let pinPlacementChurchName = null;
let pinPlacementTempMarker = null;
let dbGroupNames = window.dtMapData?.dbGroupNames || [];


// ============================================================================
// SECTION 2 — Utility Functions
//
// Pure helper functions with no side effects. Safe to call from anywhere.
// ============================================================================

/**
 * Make an authenticated request to the WordPress REST API.
 *
 * Automatically attaches the wp_rest nonce from DT_API.nonce.
 * Throws an Error containing the HTTP status and response text on failure.
 *
 * @param  {string}      path    REST path relative to the WP REST root (e.g. '/dt-posts/v2/groups').
 * @param  {string}      method  HTTP method. Defaults to 'GET'.
 * @param  {Object|null} body    Request body for POST/PATCH. Will be JSON-serialised.
 * @returns {Promise<Object>} Parsed JSON response.
 * @throws  {Error} On non-2xx HTTP response.
 */
async function dtFetch(path, method = 'GET', body = null) {
    const res = await fetch(`${DT_API.base}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': DT_API.nonce },
        credentials: 'same-origin',
        body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
        const msg = await res.text().catch(() => res.statusText);
        throw new Error(`DT ${method} ${path} -> ${res.status}: ${msg}`);
    }
    return res.json();
}


/**
 * Fetch all records of a DT post type by paginating the DT REST v2 endpoint.
 *
 * Iterates until the total record count is satisfied or an empty page is returned.
 * Uses 100 records per page to minimise round-trips.
 *
 * @param  {string} postType  DT post type slug (e.g. 'groups', 'contacts').
 * @param  {Object} query     Additional query parameters (e.g. { assigned_to: 'me' }).
 * @returns {Promise<Array>}  All matching post records.
 */
async function dtFetchAll(postType, query = {}) {
    const all = []; let page = 1;
    while (true) {
        const params = new URLSearchParams({ ...query, limit: 100, offset: (page - 1) * 100 });
        const data = await dtFetch(`/dt-posts/v2/${postType}?${params}`);
        if (!data.posts?.length) break;
        all.push(...data.posts);
        if (all.length >= (data.total || all.length)) break;
        page++;
    }
    return all;
}

/**
 * Geocode a plain-text address string using the Nominatim OpenStreetMap API.
 *
 * Used as a fallback when a group record has an address string but no
 * lat/lng coordinates stored in location_grid_meta.
 * Returns null silently on failure to allow the caller to skip the record.
 *
 * @param  {string}            str  Address string (e.g. "Hyderabad, India").
 * @returns {Promise<number[]|null>} [lat, lng] pair, or null if not found.
 */
async function geocodeAddress(str) {
    if (!str) return null;
    try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(str)}`, { headers: { 'Accept-Language': 'en' } });
        const j = await r.json();
        if (j?.[0]) return [parseFloat(j[0].lat), parseFloat(j[0].lon)];
    } catch (e) { console.warn('Geocode failed:', str, e); }
    return null;
}

/**
 * Fetch a GeoJSON file, using sessionStorage as a cache so the same URL is
 * only downloaded once per browser session (avoids slow GitHub raw re-fetches
 * on every page load).
 *
 * @param  {string}          url  Remote GeoJSON URL.
 * @returns {Promise<Object>}      Parsed GeoJSON object.
 */
async function fetchGeoJSON(url) {
    // Try to return cached version first
    const key = 'geojson_' + url;
    try {
        const cached = sessionStorage.getItem(key);
        if (cached) return JSON.parse(cached);
    } catch (e) { /* ignore parse/quota errors */ }

    const r = await fetch(url);
    const d = await r.json();

    // Cache for the rest of the session; silently skip if storage is full
    try { sessionStorage.setItem(key, JSON.stringify(d)); } catch (e) {}
    return d;
}

/**
 * Extract a human-readable address string from a DT record.
 *
 * Checks contact_address, then falls back to location_grid_meta[0].label.
 *
 * @param  {Object} rec  A DT group or contact record.
 * @returns {string}      Address string, or empty string if none found.
 */
function extractAddressString(rec) {
    const a = rec.contact_address;
    if (Array.isArray(a) && a[0]?.value) return a[0].value;
    return null;
}

/**
 * Extract [lat, lng] coordinates from a DT record.
 *
 * Handles both DT REST format (location_grid_meta array of objects with
 * .lat/.lng) and the flat DB format returned by our inspector endpoint
 * (location_grid_meta as a serialised string).
 *
 * @param  {Object}       rec  A DT group or contact record.
 * @returns {number[]|null}     [lat, lng] pair, or null if no valid coords found.
 */
function extractCoords(rec) {
    if (rec.location_grid_meta?.length) {
        const m = rec.location_grid_meta[0];
        if (m.lat && m.lng) return [parseFloat(m.lat), parseFloat(m.lng)];
    }
    if (rec.location_grid?.length) {
        const g = rec.location_grid[0];
        if (g.lat && g.lng) return [parseFloat(g.lat), parseFloat(g.lng)];
    }
    return null;
}

function startAddPinWorkflow(churchName) {
    if (!churchName) return;
    pinPlacementChurchName = churchName;
    const formsPage = document.getElementById('formsPage');
    if (formsPage) formsPage.style.display = 'none';
    switchScreen('map');
    ensureMapReady().then(() => {
        if (!map) return;
        document.getElementById('map').style.cursor = 'crosshair';
        showToast(`Click the map to place a pin for "${churchName}". Press Back to cancel.`, 'info', 5500);
    });
}

function updateModeButtons() {
    // Update old .mode-btn buttons (kept for compatibility)
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === currentViewMode);
    });
    // Update new opts-mode-btn buttons on the options screen
    document.querySelectorAll('.opts-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === currentViewMode);
    });
    // Update home screen badge
    const badgeText = document.getElementById('homeModeText');
    if (badgeText) {
        badgeText.textContent = currentViewMode === 'pin' ? 'Pin Mode active' : 'Standard Mode active';
    }
    const badge = document.getElementById('homeModeIndicator');
    if (badge) {
        badge.classList.toggle('pin-mode', currentViewMode === 'pin');
    }
}

function setViewMode(mode) {
    currentViewMode = mode === 'pin' ? 'pin' : 'standard';
    localStorage.setItem('doorMapViewMode', currentViewMode);
    updateModeButtons();
    // Mode change takes effect on next country click — no re-render needed
}

function switchScreen(target) {
    activeScreen = target;
    const home = document.getElementById('homeScreen');
    const opts = document.getElementById('viewOptionsScreen');
    const app = document.getElementById('doorMapApp');
    if (home) home.classList.toggle('hidden', target !== 'home');
    if (opts) opts.classList.toggle('hidden', target !== 'options');
    if (app) {
        app.classList.toggle('state-home', target === 'home');
        app.classList.toggle('state-options', target === 'options');
        app.classList.toggle('state-map', target === 'map');
    }
}



/**
 * Extract the country name from a DT record.
 *
 * Checks location_grid_meta[0].parent_label chain for a country entry,
 * falling back to contact_address parsing.
 *
 * @param  {Object}      rec  A DT group or contact record.
 * @returns {string|null}      Country name, or null if not determinable.
 */
function extractCountry(rec) {
    const g = rec.location_grid?.[0];
    if (!g) return null;
    return g.country_name || g.admin0_label || g.label?.split(',').pop()?.trim() || null;
}

/**
 * Extract the region/state name from a DT record.
 *
 * @param  {Object}      rec  A DT group or contact record.
 * @returns {string|null}      Region name, or null if not determinable.
 */
function extractRegion(rec) {
    const g = rec.location_grid?.[0];
    if (!g) return null;
    return g.admin1_label || g.label?.split(',')[0]?.trim() || g.label || null;
}

/**
 * Return the highest achieved discipleship level label from an array of milestone keys.
 *
 * Iterates DISC_LEVEL_ORDER (model → assist → watch → leader) and returns
 * the label of the highest level present in the array.
 *
 * @param  {string[]} arr  Array of DT milestone key strings.
 * @returns {string}        Highest level label (e.g. 'Leader'), or 'None'.
 */
function highestDiscLabel(arr) {
    if (!arr?.length) return 'None';
    let maxIdx = -1;
    arr.forEach(v => { const i = DISC_LEVEL_ORDER.indexOf(v); if (i > maxIdx) maxIdx = i; });
    return maxIdx >= 0 ? DISC_LEVEL_LABELS[DISC_LEVEL_ORDER[maxIdx]] : 'None';
}
function discLabelToIndex(label) { return DISC_DISPLAY.indexOf(label); }
function discLabelToDTKeys(label) {
    const m = { Model:'milestone_model', Assist:'milestone_assist', Watch:'milestone_watch', Leader:'milestone_leader' };
    return m[label] ? [m[label]] : [];
}

function nd(v) {
    if (v === null || v === undefined || v === '') return ND;
    if (Array.isArray(v) && v.length === 0) return ND;
    return String(v);
}

/**
 * Escape a string for safe insertion into HTML.
 *
 * Replaces &, <, >, ", and ' with their HTML entity equivalents.
 * Used before any user-derived data is written via innerHTML.
 *
 * @param  {string} text  Raw string to escape.
 * @returns {string}       HTML-safe string.
 */
function escapeHtml(text) {
    if (text == null) return '';
    const d = document.createElement('div');
    d.textContent = String(text);
    return d.innerHTML;
}

/**
 * Determine whether a coordinate pair falls within the 10/40 Window.
 *
 * The 10/40 Window is defined in CONFIG.sensitiveWindow as latitudes 10°–40°N
 * and longitudes 10°W–145°E. Church pins in this region may be subject to
 * security restrictions depending on the current pinSecurityMode.
 *
 * @param  {number[]} coords  [lat, lng] coordinate pair.
 * @returns {boolean}          True if the coords fall within the 10/40 Window.
 */
function isIn1040Window(coords) {
    const [lat, lng] = coords;
    const { latMin, latMax, lngMin, lngMax } = CONFIG.sensitiveWindow;
    return lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax;
}

function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}

/**
 * Return obfuscated coordinates for a church by applying a deterministic
 * random offset derived from the church name.
 *
 * The offset distance is controlled by CONFIG.obfuscationDistance (degrees).
 * The same church name always produces the same offset, so pins don't jump
 * on re-render. Used in 'obfuscate' security mode for 10/40 Window pins.
 *
 * @param  {Object}   church  Church object with a .name string property.
 * @returns {number[]}         [lat, lng] pair shifted by the deterministic offset.
 */
function getObfuscatedCoords(church) {
    const h = hashString(church.name), off = CONFIG.obfuscationDistance;
    return [church.coords[0] + ((h & 0xFF) / 255 - 0.5) * off, church.coords[1] + (((h >> 8) & 0xFF) / 255 - 0.5) * off];
}

function resolveCoords(church) {
    if (!isIn1040Window(church.coords)) return church.coords;
    if (pinSecurityMode === 'hidden')    return null;
    if (pinSecurityMode === 'obfuscate') return getObfuscatedCoords(church);
    return church.coords;
}

/**
 * Rebuild the two fast-lookup structures after countries[] or liveData changes.
 *
 * churchLookupMap  — Map<churchName, {country, church}>  (O(1) name lookup)
 * idToNameMap      — { [group_id]: churchName }           (reverse of dtGroupIds)
 *
 * Call after loadLiveData(), after adding a new church, and after geocoding
 * completes. Also marks the cached country GeoJSON layer as stale.
 */
function rebuildChurchLookups() {
    churchLookupMap.clear();
    for (const country of countries) {
        for (const ch of country.churches) {
            churchLookupMap.set(ch.name, { country, church: ch });
        }
    }
    // Rebuild id→name reverse map used by loadPinsForCountry()
    idToNameMap = {};
    Object.entries(liveData.dtGroupIds).forEach(([name, id]) => { idToNameMap[id] = name; });
    // Mark the cached country layer stale so showAllCountries() rebuilds it
    countriesLayerDirty = true;
}

// O(1) lookup via pre-built Map instead of nested loop over countries[]/churches[]
function getChurchLocationData(churchName) {
    const entry = churchLookupMap.get(churchName);
    if (!entry) return { country: null, state: null };
    let stateName = 'Unknown';
    const states = liveData.stateStats[entry.country.name];
    if (states) for (const [sName, sData] of Object.entries(states)) {
        if (sData.names.includes(churchName)) { stateName = sName; break; }
    }
    return { country: entry.country.name, state: stateName };
}

// O(1) lookup — returns {country, church} or null
function findChurchByName(churchName) {
    return churchLookupMap.get(churchName) || null;
}

async function savePinForChurch(churchName, latlng) {
    let match = findChurchByName(churchName);
    const groupId = liveData.dtGroupIds[churchName];
    const lat = Number(latlng.lat).toFixed(6);
    const lng = Number(latlng.lng).toFixed(6);
    const coords = [parseFloat(lat), parseFloat(lng)];

    // If the church isn't in the in-memory countries array yet, create an entry
    // so the pin can still be saved and will render on the map.
    if (!match) {
        // Determine a country name from the staff-based groupCountryMap, or 'Unassigned'
        const countryName = (groupId && liveData.groupCountryMap[groupId])
            ? liveData.groupCountryMap[groupId]
            : 'Unassigned';
        let countryObj = countries.find(c => c.name === countryName);
        if (!countryObj) {
            countryObj = { name: countryName, coords: coords, countryCode: '', level: 'default', churches: [], sensitive: false };
            countries.push(countryObj);
            liveData.countryStats[countryName] = { churches: 0, groups: 0, staff: 0, volunteers: 0 };
        }
        const newChurch = { name: churchName, coords: coords, address: null };
        countryObj.churches.push(newChurch);
        liveData.countryStats[countryName].churches++;
        liveData.countryStats[countryName].groups++;
        if (!liveData.churchDetails[churchName]) {
            liveData.churchDetails[churchName] = { address: null, groupType: null, groupStatus: 'active', startDate: null, churchStartDate: null, endDate: null, attendees: 0, leaderCount: 0, leaders: [], coaches: [], parentChurch: null, childChurches: [], peerChurches: [], healthMetrics: [] };
        }
        if (!liveData.staffDetails[churchName]) liveData.staffDetails[churchName] = [];
        match = { country: countryObj, church: newChurch };
    }

    try {
        if (groupId) {
            await dtFetch(`/dt-posts/v2/groups/${groupId}`, 'PATCH', {
                location_grid_meta: [{ grid_meta_id: null, lat, lng, level: 'place', label: `${churchName}, ${match.country.name}` }]
            });
        }
        if (DT_API.pinSaveEndpoint) {
            // Resolve staff-assigned country: prefer groupCountryMap, fall back to geographic
            const country = (groupId && liveData.groupCountryMap[groupId])
                ? liveData.groupCountryMap[groupId]
                : match.country.name;
            const res = await fetch(DT_API.pinSaveEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': DT_API.nonce },
                credentials: 'same-origin',
                body: JSON.stringify({ church_name: churchName, lat, lng, group_id: groupId || 0, country })
            });
            if (!res.ok) throw new Error(`CSV save failed (${res.status})`);
        }
        match.church.coords = coords;
        match.country.sensitive = isIn1040Window(coords);
        pinPlacementChurchName = null;
        document.getElementById('map').style.cursor = '';
        showToast(`Pin saved for "${churchName}"`, 'success');
        // Re-render country-level pins if user is viewing a country
        if (currentCountry) renderSpecificChurchPins(currentCountry.churches);
    } catch (err) {
        console.error(err);
        showToast('Failed to save pin coordinates', 'error');
    }
}

/**
 * Display a transient toast notification at the bottom-right of the screen.
 *
 * Creates a .toast element, appends it to #toastContainer, and removes it
 * automatically after the specified duration. The CSS handles the fade-in/out
 * animation.
 *
 * @param {string} msg       Message text to display.
 * @param {string} type      Severity class: 'info' | 'success' | 'warning' | 'error'.
 * @param {number} duration  Display duration in milliseconds. Defaults to 3000.
 */
function showToast(msg, type = 'info', duration = 3000) {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`; t.textContent = msg;
    c.appendChild(t); setTimeout(() => t.remove(), duration);
}


// ============================================================================
// 3. DATA LOADING
// ============================================================================

/**
 * Pre-populate the countries array from the CSV data passed via dtMapData.csvCountries.
 *
 * This runs synchronously at boot so the map shows country shapes as soon as
 * the world GeoJSON finishes loading — before the async DT REST fetch completes.
 * Each CSV country gets an empty churches array; loadLiveData() will later fill
 * in real church data for countries that have DT records.
 *
 * Safe to call multiple times: skips if countries is already populated.
 */
function seedCountriesFromCSV() {
    const csvData = window.dtMapData && window.dtMapData.csvCountries;
    if (!Array.isArray(csvData) || csvData.length === 0) return;
    if (countries.length > 0) return; // real data already loaded, don't overwrite
    csvData.forEach(function(c) {
        countries.push({ name: c.name, coords: [0, 0], countryCode: '', level: c.level, churches: [], sensitive: false });
    });
}

/**
 * Merge any CSV countries that are absent from the DT-loaded countries array.
 *
 * Called at the end of loadLiveData() (both success and error paths) so that
 * countries present in the oversight spreadsheet but not yet in DiscipleTools
 * still appear as coloured shapes on the map.
 *
 * @param {Object} countryMap  The name-keyed map built during loadLiveData().
 */
function mergeCsvCountries(countryMap) {
    const csvData = window.dtMapData && window.dtMapData.csvCountries;
    if (!Array.isArray(csvData)) return;
    csvData.forEach(function(c) {
        if (!countryMap[c.name]) {
            const obj = { name: c.name, coords: [0, 0], countryCode: '', level: c.level, churches: [], sensitive: false };
            countryMap[c.name] = obj;
            countries.push(obj);
        }
    });
}

/**
 * Load all live ministry data from the database and populate the map.
 *
 * This is the main data pipeline entry point. It:
 *   1. Fetches all groups and contacts via doorMapFetchAll()
 *   2. Normalises flat DB records to match DT REST object shape
 *   3. Builds the country → region → church hierarchy in memory
 *   4. Geocodes address-only churches via Nominatim as a fallback
 *   5. Calls renderGlobalDashboard() and showAllCountries() to render the map
 *
 * On failure, shows a toast error and logs to console.
 *
 * @returns {Promise<void>}
 */
async function loadLiveData() {
    showToast('Loading live data from DiscipleTools...', 'info', 4000);
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) { overlay.classList.add('hidden'); setTimeout(() => overlay.remove(), 500); }

    try {
        // Load country map and both DT post types in parallel — cuts total fetch
        // time roughly in half compared to the previous sequential approach.
        loadGroupCountryMap();

        const [groups, staffContacts] = await Promise.all([
            dtFetchAll('groups', {
                fields: [
                    'name','group_status','group_type',
                    'start_date','church_start_date','end_date',
                    'member_count','leader_count','health_metrics',
                    'leaders','coaches','parent_groups','child_groups','peer_groups',
                    'location_grid','location_grid_meta','contact_address','door_map_level'
                ].join(',')
            }),
            dtFetchAll('contacts', {
                fields: [
                    'name','faith_status','age_range',
                    'salvation','baptism','cbs_class','praying',
                    'believes_fellowship_acts_2','money_management',
                    'reports','worship','last_supper','love',
                    'marriage','singles','family','teacher',
                    'advice','fruit_of_the_spirit',
                    'coached_by','coaching','baptized_by',
                    'groups','milestones','baptism_date','availabletime'
                ].join(','),
                'faith_status[]': 'staff'
            })
        ]);

        const staffByGroupId = {};
        staffContacts.forEach(c => {
            liveData.dtContactIds[c.name] = c.ID;
            (c.groups || []).forEach(g => {
                (staffByGroupId[g.ID] = staffByGroupId[g.ID] || []).push(c);
            });
        });

        countries = [];
        const countryMap = {};
        const levelPriority = { L4:6, L3:5, L2:4, L1:3, default:2, inactive:1, cancelled:0 };
        const geocodeQueue = [];

        for (const g of groups) {
            const churchName  = g.name || `Group ${g.ID}`;
            let   coords      = extractCoords(g);
            const addrStr     = extractAddressString(g);
            const countryName = extractCountry(g) || 'Unknown';
            const regionName  = extractRegion(g)  || 'Unknown';
            const level       = g.door_map_level || DT_STATUS_TO_LEVEL[g.group_status] || 'default';

            liveData.dtGroupIds[churchName] = g.ID;

            const startDate       = g.start_date?.timestamp       ? new Date(g.start_date.timestamp * 1000).toLocaleDateString() : null;
            const churchStartDate = g.church_start_date?.timestamp ? new Date(g.church_start_date.timestamp * 1000).toLocaleDateString() : null;
            const endDate         = g.end_date?.timestamp         ? new Date(g.end_date.timestamp * 1000).toLocaleDateString() : null;

            const leaders       = (g.leaders      || []).map(l => l.post_title || l.name || 'Unknown');
            const coaches       = (g.coaches      || []).map(c => c.post_title || c.name || 'Unknown');
            const parentChurch  = g.parent_groups?.length ? (g.parent_groups[0].post_title || g.parent_groups[0].name || null) : null;
            const childChurches = (g.child_groups || []).filter(c => c.ID !== g.ID).map(c => c.post_title || c.name || '');
            const peerChurches  = (g.peer_groups  || []).map(c => c.post_title || c.name || '');
            const groupTypeLabel = GROUP_TYPE_LABELS[g.group_type] || g.group_type || null;
            const healthMetrics  = (g.health_metrics || []).map(k => HEALTH_METRIC_LABELS[k] || k);

            liveData.churchDetails[churchName] = {
                address: addrStr, groupType: groupTypeLabel,
                groupStatus: g.group_status || null,
                startDate, churchStartDate, endDate,
                attendees: g.member_count || 0, leaderCount: g.leader_count || 0,
                leaders, coaches, parentChurch, childChurches, peerChurches, healthMetrics
            };

            const staffList = (staffByGroupId[g.ID] || []).map(c => {
                const disc = {
                    salvation:       highestDiscLabel(c.salvation),
                    baptism:         highestDiscLabel(c.baptism),
                    cbsClass:        highestDiscLabel(c.cbs_class),
                    praying:         highestDiscLabel(c.praying),
                    fellowship:      highestDiscLabel(c.believes_fellowship_acts_2),
                    moneyManagement: highestDiscLabel(c.money_management),
                    reports:         highestDiscLabel(c.reports),
                    worship:         highestDiscLabel(c.worship),
                    lastSupper:      highestDiscLabel(c.last_supper),
                    love:            highestDiscLabel(c.love),
                    marriage:        highestDiscLabel(c.marriage),
                    singles:         highestDiscLabel(c.singles),
                    family:          highestDiscLabel(c.family),
                    teacher:         highestDiscLabel(c.teacher),
                    counseling:      highestDiscLabel(c.advice),
                    fruitOfSpirit:   highestDiscLabel(c.fruit_of_the_spirit)
                };
                const coreIdx = Math.max(discLabelToIndex(disc.salvation), discLabelToIndex(disc.baptism), discLabelToIndex(disc.cbsClass));
                const mentoredBy = c.coached_by?.length ? (c.coached_by[0].post_title || c.coached_by[0].name || null) : null;
                const mentoring  = (c.coaching   || []).map(m => m.post_title || m.name || '');
                const baptizedBy = c.baptized_by?.length ? (c.baptized_by[0].post_title || c.baptized_by[0].name || null) : null;
                const milestones = (c.milestones  || []).map(k => k.replace('milestone_', '').replace(/_/g, ' '));
                const baptismDate = c.baptism_date?.timestamp ? new Date(c.baptism_date.timestamp * 1000).toLocaleDateString() : null;
                return {
                    name: c.name, age: c.age_range || null,
                    mentoredBy, mentoring, baptizedBy,
                    milestones, baptismDate, availability: c.availabletime || null,
                    disc, discipleshipLevel: Math.max(1, coreIdx)
                };
            });

            liveData.staffDetails[churchName] = staffList;

            if (!liveData.countryStats[countryName])
                liveData.countryStats[countryName] = { churches:0, groups:0, staff:0, volunteers:0 };
            liveData.countryStats[countryName].churches++;
            liveData.countryStats[countryName].groups++;
            liveData.countryStats[countryName].staff += staffList.length;

            if (!liveData.stateStats[countryName]) liveData.stateStats[countryName] = {};
            if (!liveData.stateStats[countryName][regionName])
                liveData.stateStats[countryName][regionName] = { coords: coords || [0,0], churches:0, groups:0, staff:0, names:[] };
            liveData.stateStats[countryName][regionName].churches++;
            liveData.stateStats[countryName][regionName].staff += staffList.length;
            liveData.stateStats[countryName][regionName].names.push(churchName);

            if (!countryMap[countryName]) {
                countryMap[countryName] = { name: countryName, coords: coords || [0,0], countryCode: '', level, churches: [], sensitive: coords ? isIn1040Window(coords) : false };
                countries.push(countryMap[countryName]);
            }
            if ((levelPriority[level] || 0) > (levelPriority[countryMap[countryName].level] || 0))
                countryMap[countryName].level = level;

            if (coords) {
                countryMap[countryName].churches.push({ name: churchName, coords, address: addrStr });
            } else if (addrStr) {
                geocodeQueue.push({ churchName, countryName, addrStr, countryObj: countryMap[countryName] });
            }
        }

        mergeCsvCountries(countryMap);
        // Build O(1) lookups and mark the country layer stale before first render
        rebuildChurchLookups();
        renderGlobalDashboard();
        showAllCountries();
        // Render persistent pins now so they appear immediately on successful load
        renderPersistentPins();
        showToast(`Loaded ${groups.length} churches, ${staffContacts.length} staff`, 'success');

        // Geocoding runs in the background so it never blocks the initial render.
        // Nominatim's TOS allows 1 request/second, so requests are staggered by
        // 1.1 s each. Lookups and pins re-render once the queue finishes.
        if (geocodeQueue.length) {
            showToast(`Geocoding ${geocodeQueue.length} address-only churches in background…`, 'info', 5000);
            (async () => {
                for (let i = 0; i < geocodeQueue.length; i++) {
                    if (i > 0) await new Promise(r => setTimeout(r, 1100));
                    const item = geocodeQueue[i];
                    const coords = await geocodeAddress(item.addrStr);
                    if (coords) {
                        item.countryObj.churches.push({ name: item.churchName, coords, address: item.addrStr });
                        const reg = liveData.stateStats[item.countryName];
                        if (reg) for (const sd of Object.values(reg)) {
                            if (sd.names.includes(item.churchName) && String(sd.coords) === '0,0') sd.coords = coords;
                        }
                    }
                }
                // Rebuild lookups to include geocoded churches, then re-render pins
                rebuildChurchLookups();
                renderPersistentPins();
            })();
        }

    } catch (err) {
        console.error('DT API load error:', err);
        showToast('Could not load live data — check connection and permissions', 'error', 7000);
        // Even on error, show all CSV countries so the map is not empty
        const fallbackMap = {};
        countries.forEach(c => { fallbackMap[c.name] = c; });
        mergeCsvCountries(fallbackMap);
        rebuildChurchLookups(); // still build lookups from CSV-seeded data
        renderGlobalDashboard();
        showAllCountries();
        renderPersistentPins();
    }
}


/**
 * Fetch the staff-assignment country map from the PHP endpoint and populate
 * liveData.groupCountryMap  ( group_id => country ).
 *
 * This uses the chain: Staff CSV name -> users.display_name -> users.ID
 *   -> groups.assigned_to -> country
 *
 * Called in parallel with the main DT REST load so it doesn't block render.
 *
 * @returns {Promise<void>}
 */
async function loadGroupCountryMap() {
    if (!DT_API.countryGroupMapEndpoint) return;
    try {
        const res = await fetch(DT_API.countryGroupMapEndpoint, {
            headers: { 'X-WP-Nonce': DT_API.nonce },
            credentials: 'same-origin'
        });
        if (!res.ok) return;
        const data = await res.json();
        (data.assignments || []).forEach(a => {
            liveData.groupCountryMap[a.group_id] = a.country;
        });
    } catch (e) {
        console.warn('loadGroupCountryMap failed:', e);
    }
}

/**
 * Fetch pins for a given country from the Country Assignment and Pin location CSV
 * via the /group-pins REST endpoint.
 *
 * Returns an array of lightweight church objects compatible with
 * renderSpecificChurchPins() and buildChurchSidebar():
 *   { name: string, coords: [lat, lng] }
 *
 * Group names are resolved from liveData.dtGroupIds (inverted map).
 * Groups whose name isn't found in memory are skipped silently.
 *
 * @param  {string}          countryName  Country to filter by.
 * @returns {Promise<Array>}              Array of { name, coords } objects.
 */
async function loadPinsForCountry(countryName) {
    if (!DT_API.groupPinsEndpoint) return [];
    try {
        const url = DT_API.groupPinsEndpoint + '?country=' + encodeURIComponent(countryName);
        const res = await fetch(url, {
            headers: { 'X-WP-Nonce': DT_API.nonce },
            credentials: 'same-origin'
        });
        if (!res.ok) return [];
        const data = await res.json();
        // Use the church name stored in the CSV (group_name field).
        // Fall back to the module-level idToNameMap (built once by rebuildChurchLookups)
        // instead of rebuilding a reverse map on every call.
        return (data.pins || []).map(p => {
            const name = (p.group_name && p.group_name.trim()) ? p.group_name.trim() : (idToNameMap[p.group_id] || null);
            if (!name) return null;
            return { name, coords: [p.lat, p.lng] };
        }).filter(Boolean);
    } catch (e) {
        console.warn('loadPinsForCountry failed:', e);
        return [];
    }
}

// ============================================================================
// 4. MAP INIT & THEME
// ============================================================================

/**
 * Initialise the Leaflet map instance and load GeoJSON boundary data.
 *
 * Sets up:
 *   - Light and dark tile layers (OSM and CartoCDN)
 *   - Map bounds, zoom levels, and initial viewport
 *   - GeoJSON loads for world countries, US states, and India states
 *   - Marker layer groups for country/state/church pins
 *
 * Called once on DOMContentLoaded.
 */
function initMap() {
    map = L.map('map', {
        minZoom: CONFIG.map.minZoom, maxZoom: CONFIG.map.maxZoom,
        zoom: CONFIG.map.initialZoom, dragging: true, scrollWheelZoom: true, zoomControl: false,
        worldCopyJump: false, maxBoundsViscosity: 1.0
    }).setView(CONFIG.map.initialView, CONFIG.map.initialZoom);

    map.setMaxBounds(CONFIG.map.maxBounds);

    lightTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '(c) OpenStreetMap contributors', noWrap: true
    }).addTo(map);

    darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19, attribution: '(c) OpenStreetMap, (c) CartoDB', noWrap: true
    });

    L.control.scale({ position: 'bottomleft' }).addTo(map);
    churchMarkers     = L.layerGroup().addTo(map);
    stateMarkers      = L.layerGroup().addTo(map);
    countryMarkers    = L.layerGroup().addTo(map);
    stateShapeMarkers = L.layerGroup().addTo(map);
    persistentPins    = L.layerGroup().addTo(map);

    map.on('click', e => {
        if (pinPlacementChurchName) {
            if (pinPlacementTempMarker) pinPlacementTempMarker.setLatLng(e.latlng);
            else pinPlacementTempMarker = L.marker(e.latlng).addTo(map);
            savePinForChurch(pinPlacementChurchName, e.latlng);
            return;
        }
        closeSidebar();
        showAllCountries();
    });

    // Load all three GeoJSON boundary files; fetchGeoJSON() caches results in
    // sessionStorage so subsequent page loads are instant instead of re-hitting GitHub.
    fetchGeoJSON('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
        .then(d => { worldGeoJSON = d; showAllCountries(); })
        .catch(err => console.error('World borders load error:', err));

    fetchGeoJSON('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
        .then(d => { usGeoJSON = d; })
        .catch(err => console.error('US states load error:', err));

    // Try the primary India states source; fall back to an alternate gist if it fails.
    fetchGeoJSON('https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson')
        .then(d => { indiaGeoJSON = d; })
        .catch(() =>
            fetchGeoJSON('https://gist.githubusercontent.com/shantanuo/91c13bf8fb851eec70d0/raw/india_state.geojson')
                .then(d => { indiaGeoJSON = d; })
                .catch(err => console.error('India states load error:', err))
        );
}

async function ensureMapReady() {
    if (!mapInitialized) {
        initMap();
        mapInitialized = true;
    }
    if (!dataLoaded) {
        await loadLiveData();
        dataLoaded = true;
    }
    setTimeout(() => map?.invalidateSize(), 120);
}

/**
 * Apply a visual theme to the map and UI.
 *
 * Switches between 'light' and 'dark' modes by toggling the data-theme
 * attribute on the document root, swapping the active Leaflet tile layer,
 * and updating the theme button label. Persists the selection to localStorage.
 *
 * @param {string} mode  Theme to apply: 'light' | 'dark'.
 */
function applyTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        const text = btn.querySelector('.btn-text');
        const icon = btn.querySelector('.btn-icon .icon');
        if (text) text.textContent = mode === 'dark' ? 'Light Mode' : 'Dark Mode';
        if (icon) icon.innerHTML = mode === 'dark'
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
    if (map) {
        if (mode === 'dark') { if (map.hasLayer(lightTiles)) map.removeLayer(lightTiles); darkTiles.addTo(map); }
        else                 { if (map.hasLayer(darkTiles))  map.removeLayer(darkTiles);  lightTiles.addTo(map); }
    }
    if (addChurchMapInstance) {
        addChurchMapInstance.eachLayer(l => { if (l instanceof L.TileLayer) addChurchMapInstance.removeLayer(l); });
        L.tileLayer(mode === 'dark'
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            { attribution: '(c) OpenStreetMap' }
        ).addTo(addChurchMapInstance);
    }
    // Update options screen dark-mode button label
    const optThemeBtn = document.getElementById('optionsThemeToggleBtn');
    if (optThemeBtn) {
        const label = optThemeBtn.querySelector('.otb-text strong') || optThemeBtn.querySelector('strong');
        if (label) label.textContent = mode === 'dark' ? 'Toggle Light Mode' : 'Toggle Dark Mode';
    }
}

function initTheme() { applyTheme(localStorage.getItem('theme') || 'light'); }

/**
 * Create a custom Leaflet DivIcon for church map pins.
 *
 * Returns a circular dot styled according to whether the church is in the
 * 10/40 Window (pulsing amber glow) or not (solid ember orange).
 * Size can be 'normal' or 'large'.
 *
 * @param  {boolean} isSensitive  Whether the pin is inside the 10/40 Window.
 * @param  {string}  size         'normal' or 'large'.
 * @returns {L.DivIcon}            Leaflet icon instance.
 */
function createDotIcon(isSensitive = false, size = 'normal') {
    const sizes = { small:10, normal:14, large:20, country:24 };
    const d = sizes[size] || 14;
    const bg = isSensitive ? 'linear-gradient(135deg,#db5729 0%,#ff9800 100%)' : '#db5729';
    const pulse = isSensitive ? 'pulse-sensitive' : '';
    return L.divIcon({
        html: `<div class="marker-dot ${pulse}" style="background:${bg};width:${d}px;height:${d}px;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [d, d], iconAnchor: [d/2, d/2], className: 'custom-dot'
    });
}


/**
 * Create a styled interactive pin icon for persistent church markers.
 * Renders as a labeled pill-button on the map with a dot + name.
 */
function createChurchPinIcon(churchName, isSensitive) {
    var shortName = churchName.length > 16 ? churchName.substring(0, 14) + '\u2026' : churchName;
    var cls = isSensitive ? 'church-pin-btn pin-sensitive' : 'church-pin-btn';
    return L.divIcon({
        html: '<div class="' + cls + '"><span class="pin-dot"></span><span class="pin-label">' + escapeHtml(shortName) + '</span></div>',
        className: 'church-pin-wrapper',
        iconSize: [140, 30],
        iconAnchor: [14, 15]
    });
}

/**
 * Create a small orange circular button icon for church pins.
 * Replaces the traditional teardrop pin — renders as a solid orange button.
 */
function createOrangePinBtn(isSensitive = false) {
    const cls = isSensitive ? 'orange-pin-btn orange-pin-btn--sensitive' : 'orange-pin-btn';
    return L.divIcon({
        html: `<button class="${cls}" aria-label="View church details"></button>`,
        className: 'orange-pin-wrapper',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
}

// ============================================================================
// 5. SIDEBAR — summary + "View Full Details" button
// ============================================================================

/**
 * Open the right-side detail sidebar with arbitrary HTML content.
 *
 * Sets the innerHTML of #sidebarContent, adds the .open class to trigger
 * the CSS slide-in transition, then calls wireDetailButtons() to attach
 * event listeners to any interactive elements in the new content.
 *
 * @param {string} html  HTML string to inject into the sidebar.
 */
function openSidebar(html) {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('sidebarContent');
    if (!sidebar || !content) return;
    content.innerHTML = html;
    sidebar.classList.add('open');
    setupToggles(content);
    wireDetailButtons(content);
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
}

function setupToggles(container) {
    if (!container) return;
    container.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const el = container.querySelector('#' + btn.dataset.target);
            if (!el) return;
            const hidden = el.style.display === 'none';
            el.style.display = hidden ? 'block' : 'none';
            btn.textContent = (hidden ? '▼ ' : '▶ ') + btn.dataset.label;
        });
    });
}

// Sidebar button clicks are handled by a single delegated listener registered
// once in setupEventListeners(). This function is kept so callers don't break.
function wireDetailButtons(_container) {}

// Sidebar: church quick summary
/**
 * Build the HTML string for the church detail sidebar panel.
 *
 * Displays: church name, address, type, status, attendee/leader counts,
 * health metrics badges, start/end dates, parent/child church relationships,
 * and a staff list with discipleship level badges.
 *
 * @param  {Object} church  Church object from the countries[] hierarchy.
 * @returns {string}         HTML string ready for openSidebar().
 */
function buildChurchSidebar(church) {
    const d     = liveData.churchDetails[church.name] || {};
    const staff  = liveData.staffDetails[church.name]  || [];
    const sensitive = isIn1040Window(church.coords);
    let notice = '';
    if (sensitive && pinSecurityMode === 'obfuscate') notice = `<div class="obscure-notice">Pin location is approximate (10/40 Window)</div>`;
    if (sensitive && pinSecurityMode === 'hidden')    notice = `<div class="obscure-notice">10/40 Window church — pin hidden on map</div>`;

    const row = (label, val) => {
        const isND = val === ND;
        return `<p><span class="label">${escapeHtml(label)}</span><span class="value${isND ? ' no-data-val' : ''}">${escapeHtml(val)}</span></p>`;
    };

    return `
        <div class="sb-header"><h2>${escapeHtml(church.name)}</h2></div>
        ${notice}
        <hr>
        <div class="sb-summary">
            ${row('Type',     nd(d.groupType))}
            ${row('Status',   nd(d.groupStatus))}
            ${row('Address',  nd(d.address))}
            ${row('Started',  nd(d.startDate))}
            ${row('Members',  d.attendees ? String(d.attendees) : ND)}
            ${row('Leaders',  d.leaders?.length ? d.leaders.join(', ') : ND)}
            ${row('Staff',    staff.length ? String(staff.length) : ND)}
            ${row('Parent',   nd(d.parentChurch))}
        </div>
        <hr>
        <button class="expand-detail-btn" data-church="${escapeHtml(church.name)}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:middle;"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            View Full Details
        </button>`;
}

// Sidebar: country summary
/**
 * Build the HTML string for the country summary sidebar panel.
 *
 * Displays: country name, ministry level badge, church count, total staff,
 * and a list of regions with clickable links to drill down to the state view.
 *
 * @param  {Object} country  Country object from the countries[] array.
 * @returns {string}          HTML string ready for openSidebar().
 */
function buildCountrySidebar(country) {
    const stats  = liveData.countryStats[country.name] || { churches:0, groups:0, staff:0, volunteers:0 };
    const states = liveData.stateStats[country.name];
    let html = `<div class="sb-header"><h2>${escapeHtml(country.name)}</h2></div><hr>
        <div class="stat-grid">
          <div class="stat-cell"><span class="stat-num">${stats.churches}</span><span class="stat-lbl">Churches</span></div>
          <div class="stat-cell"><span class="stat-num">${stats.groups}</span><span class="stat-lbl">Groups</span></div>
          <div class="stat-cell"><span class="stat-num">${stats.staff}</span><span class="stat-lbl">Staff</span></div>
          <div class="stat-cell"><span class="stat-num">${stats.volunteers || 0}</span><span class="stat-lbl">Volunteers</span></div>
        </div>`;
    if (states && Object.keys(states).length) {
        html += `<hr><h3 style="margin-top:15px;margin-bottom:10px;font-size:1.05em;">Regional Breakdown</h3><ul class="state-list">`;
        for (const [name, data] of Object.entries(states)) {
            html += `<li style="margin-bottom:12px;"><strong>${escapeHtml(name)}</strong><span style="display:block;margin-bottom:6px;">${data.churches} churches · ${data.staff} staff</span>`;
            data.names.forEach(cName => {
                html += `<button class="church-list-btn" data-church="${escapeHtml(cName)}">${escapeHtml(cName)}</button>`;
            });
            html += `</li>`;
        }
        html += `</ul>`;
    } else {
        html += `<hr><h3 style="margin-top:15px;margin-bottom:10px;">Churches</h3>`;
        country.churches.forEach(ch => {
            html += `<button class="church-list-btn" data-church="${escapeHtml(ch.name)}">${escapeHtml(ch.name)}</button>`;
        });
    }
    return html;
}

// Sidebar: state/region
/**
 * Build the HTML string for the region/state sidebar panel.
 *
 * Displays: region name, church count, staff count, and a list of
 * individual churches within the region with clickable links.
 *
 * @param  {string} stateName  Display name of the region.
 * @param  {Object} stateData  Region data object from liveData.stateStats.
 * @returns {string}            HTML string ready for openSidebar().
 */
function buildStateSidebar(stateName, stateData) {
    let html = `<div class="sb-header"><h2>${escapeHtml(stateName)}</h2></div><hr>`;
    if (stateData) {
        html += `<div class="stat-grid">
          <div class="stat-cell"><span class="stat-num">${stateData.churches}</span><span class="stat-lbl">Churches</span></div>
          <div class="stat-cell"><span class="stat-num">${stateData.groups || 0}</span><span class="stat-lbl">Groups</span></div>
          <div class="stat-cell"><span class="stat-num">${stateData.staff}</span><span class="stat-lbl">Staff</span></div>
        </div><hr>
        <h3 style="margin-top:15px;margin-bottom:10px;">Churches in ${escapeHtml(stateName)}</h3>`;
        stateData.names.forEach(cName => {
            html += `<button class="church-list-btn" data-church="${escapeHtml(cName)}">${escapeHtml(cName)}</button>`;
        });
    } else {
        html += `<p class="no-data">No active ministries in this region yet.</p>`;
    }
    return html;
}


// ============================================================================
// 6. FULL DETAIL PANEL
// ============================================================================

function openDetailPanel(churchName) {
    detailPanelChurchName = churchName;
    const panel   = document.getElementById('detailPanel');
    const content = document.getElementById('detailPanelContent');
    if (!panel || !content) return;
    content.innerHTML = buildDetailPanelHTML(churchName);
    panel.classList.add('open');
    // Wire close button
    content.querySelector('#closeDetailPanel')?.addEventListener('click', closeDetailPanel);
}

function closeDetailPanel() {
    const panel = document.getElementById('detailPanel');
    if (panel) panel.classList.remove('open');
    detailPanelChurchName = null;
    // Stay on the map screen — user drilled into a church from the map
}

function buildDetailPanelHTML(churchName) {
    const d     = liveData.churchDetails[churchName] || {};
    const staff  = liveData.staffDetails[churchName]  || [];

    const row = (label, val) => {
        const isND = val === ND;
        return `<div class="dp-row"><span class="dp-label">${escapeHtml(label)}</span><span class="dp-value${isND ? ' no-data-val' : ''}">${escapeHtml(val)}</span></div>`;
    };

    const discBadge = (label, val) => {
        const safe = ['none','model','assist','watch','leader'];
        const cls  = safe.includes(val?.toLowerCase()) ? val.toLowerCase() : 'none';
        const isND = val === 'None';
        return `<span class="dm-badge dm-${cls}${isND ? ' dm-nodata' : ''}">${escapeHtml(label)}: ${escapeHtml(val)}</span>`;
    };

    const hm = d.healthMetrics?.length ? d.healthMetrics.join(', ') : ND;

    let staffHTML = '';
    if (!staff.length) {
        staffHTML = `<p class="no-data" style="padding:12px 16px 0;">${ND}</p>`;
    } else {
        staff.forEach(s => {
            const pct = Math.round((s.discipleshipLevel / 4) * 100);
            staffHTML += `
            <div class="dp-staff-card">
                <div class="dp-staff-header">
                    <strong>${escapeHtml(s.name)}</strong>
                    <span class="dp-staff-level">Level ${s.discipleshipLevel}/4</span>
                </div>
                <div class="dp-staff-progress"><div class="dp-staff-bar" style="width:${pct}%"></div></div>
                <div class="dp-grid" style="margin-top:10px;">
                    ${row('Age Range',        nd(s.age))}
                    ${row('Mentored By',      nd(s.mentoredBy))}
                    ${row('Mentoring',        s.mentoring?.length ? s.mentoring.join(', ') : ND)}
                    ${row('Baptized By',      nd(s.baptizedBy))}
                    ${row('Baptism Date',     nd(s.baptismDate))}
                    ${row('Availability',     nd(s.availability))}
                    ${row('Faith Milestones', s.milestones?.length ? s.milestones.join(', ') : ND)}
                </div>
                <div class="dp-disc-grid">
                    <div class="dp-disc-title">Discipleship (MAWL)</div>
                    ${discBadge('Salvation',      s.disc.salvation)}
                    ${discBadge('Baptism',        s.disc.baptism)}
                    ${discBadge('CBS Class',      s.disc.cbsClass)}
                    ${discBadge('Praying',        s.disc.praying)}
                    ${discBadge('Fellowship',     s.disc.fellowship)}
                    ${discBadge('Money Mgmt',     s.disc.moneyManagement)}
                    ${discBadge('Reports',        s.disc.reports)}
                    ${discBadge('Worship',        s.disc.worship)}
                    ${discBadge('Last Supper',    s.disc.lastSupper)}
                    ${discBadge('Love',           s.disc.love)}
                    ${discBadge('Marriage',       s.disc.marriage)}
                    ${discBadge('Singles',        s.disc.singles)}
                    ${discBadge('Family',         s.disc.family)}
                    ${discBadge('Teacher',        s.disc.teacher)}
                    ${discBadge('Counseling',     s.disc.counseling)}
                    ${discBadge('Fruit of Spirit',s.disc.fruitOfSpirit)}
                </div>
            </div>`;
        });
    }

    return `
        <div class="dp-inner">
            <div class="dp-topbar">
                <button class="dp-back-btn" id="closeDetailPanel">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                    Back to Map
                </button>
                <h2 class="dp-title">${escapeHtml(churchName)}</h2>
            </div>
            <div class="dp-body">

                <section class="dp-section">
                    <h3 class="dp-section-title">Church Information</h3>
                    <div class="dp-grid">
                        ${row('Type',              nd(d.groupType))}
                        ${row('Status',            nd(d.groupStatus))}
                        ${row('Address',           nd(d.address))}
                        ${row('Start Date',        nd(d.startDate))}
                        ${row('Church Start Date', nd(d.churchStartDate))}
                        ${row('End Date',          nd(d.endDate))}
                        ${row('Members',           d.attendees ? String(d.attendees) : ND)}
                        ${row('Leader Count',      d.leaderCount ? String(d.leaderCount) : ND)}
                        ${row('Leaders',           d.leaders?.length ? d.leaders.join(', ') : ND)}
                        ${row('Coaches / Planters',d.coaches?.length ? d.coaches.join(', ') : ND)}
                        ${row('Parent Church',     nd(d.parentChurch))}
                        ${row('Child Churches',    d.childChurches?.length ? d.childChurches.join(', ') : ND)}
                        ${row('Peer Churches',     d.peerChurches?.length  ? d.peerChurches.join(', ')  : ND)}
                    </div>
                </section>

                <section class="dp-section">
                    <h3 class="dp-section-title">Church Health Metrics</h3>
                    <div class="dp-grid">${row('Active Practices', hm)}</div>
                </section>

                <section class="dp-section">
                    <h3 class="dp-section-title">Staff (${staff.length})</h3>
                    ${staffHTML}
                </section>

            </div>
        </div>`;
}


// ============================================================================
// 7. MAP RENDERING
// ============================================================================

function renderSpecificChurchPins(list) {
    churchMarkers.clearLayers();
    if (!list) return;
    list.forEach(ch => {
        const pos = resolveCoords(ch);
        if (!pos) return;
        const marker = L.marker(pos, { icon: createOrangePinBtn(isIn1040Window(ch.coords)), title: ch.name });
        marker.on('click', e => { L.DomEvent.stopPropagation(e); openSidebar(buildChurchSidebar(ch)); });
        marker.addTo(churchMarkers);
    });
}

/**
 * Render all church pins as persistent interactive buttons on the map.
 * These pins survive sidebar close and world-view re-renders.
 * Each pin is a styled button that loads the church info on click.
 */
function renderPersistentPins() {
    if (!persistentPins) return;
    persistentPins.clearLayers();
    countries.forEach(country => {
        country.churches.forEach(ch => {
            const pos = resolveCoords(ch);
            if (!pos) return;
            const marker = L.marker(pos, {
                icon: createOrangePinBtn(isIn1040Window(ch.coords)),
                title: ch.name,
                zIndexOffset: 100
            });
            marker.on('click', e => {
                L.DomEvent.stopPropagation(e);
                map.setMaxZoom(12);
                map.setView(pos, Math.max(map.getZoom(), 6), { animate: true });
                openSidebar(buildChurchSidebar(ch));
            });
            marker.addTo(persistentPins);
        });
    });
}

function renderStateShapes(geoJsonData, countryData) {
    L.geoJSON(geoJsonData, {
        style: () => ({ color:'#2e7d32', weight:2, fillColor:'#2e7d32', fillOpacity:0.35, className:'state-shape' }),
        onEachFeature: (feature, layer) => {
            layer.on('mouseover', function() { this.setStyle({ fillOpacity:0.65 }); });
            layer.on('mouseout',  function() { this.setStyle({ fillOpacity:0.35 }); });
            layer.on('click', e => {
                L.DomEvent.stopPropagation(e);
                map.setMaxZoom(12);
                map.fitBounds(layer.getBounds(), { padding:[30,30], animate:true });
                stateShapeMarkers.clearLayers();
                const stateName = feature.properties.name || feature.properties.NAME_1 || feature.properties.st_nm || 'Unknown';
                const stateStats = liveData.stateStats[countryData.name];
                let matchedData = null, matchedName = null;
                if (stateStats) for (const [sName, sData] of Object.entries(stateStats)) {
                    if (stateName.toLowerCase().includes(sName.toLowerCase()) || sName.toLowerCase().includes(stateName.toLowerCase())) {
                        matchedData = sData; matchedName = sName; break;
                    }
                }
                // Build the pin list from ALL names in the matched state.
                // countryData.churches only holds churches with pre-resolved coords;
                // churches that lacked coords at load time (e.g. geocoded later, or
                // India churches entered without a location) fall back to a global
                // lookup via findChurchByName so they still appear on the map.
                const toRender = matchedData?.names
                    ? matchedData.names.map(name => {
                        const inCountry = countryData.churches.find(c => c.name === name);
                        if (inCountry) return inCountry;
                        const found = findChurchByName(name);
                        return found ? found.church : null;
                    }).filter(ch => ch && ch.coords)
                    : [];
                currentStateChurches = toRender;
                renderSpecificChurchPins(toRender);
                openSidebar(buildStateSidebar(matchedName || stateName, matchedData));
            });
        }
    }).addTo(stateShapeMarkers);
}

/**
 * Render all country polygons and summary pins on the map.
 *
 * Clears all existing layers, then for each country in the countries[] array:
 *   - Draws a filled GeoJSON polygon in the country's ministry level colour
 *   - Attaches click handlers to open the country sidebar
 *   - Optionally adds a summary marker at the country centroid
 *
 * This is the default "zoomed out" map state. Called on initial load and
 * whenever the user navigates back from a country/region/church view.
 */
function showAllCountries() {
    if (!map) return;
    map.setMaxZoom(2);
    map.setView(CONFIG.map.initialView, CONFIG.map.initialZoom);
    currentCountry = null; currentStateChurches = null;
    countryMarkers.clearLayers(); churchMarkers.clearLayers();
    stateMarkers.clearLayers();   stateShapeMarkers.clearLayers();
    if (!worldGeoJSON) return;

    // Only rebuild the GeoJSON layer when data or security mode has actually changed.
    // On pure navigation (map click → back to world view) the same layer is re-added,
    // avoiding re-parsing 195 country polygons and re-binding all event handlers.
    if (countriesLayerDirty || !countriesGeoLayer) {
        const active = {};
        countries.forEach(c => {
            if (pinSecurityMode === 'hidden' && c.churches.every(ch => isIn1040Window(ch.coords))) return;
            active[GEOJSON_NAME_MAP[c.name] || c.name] = c;
        });

        countriesGeoLayer = L.geoJSON(worldGeoJSON, {
            filter: f => !!active[f.properties.name],
            style: f => {
                const c = active[f.properties.name];
                const col = LEVEL_COLORS[c.level] || LEVEL_COLORS.default;
                return { color: col, weight:2, fillColor: col, fillOpacity:0.45, className:'country-shape' };
            },
            onEachFeature: (feature, layer) => {
                const cData = active[feature.properties.name];
                layer.on('mouseover', function() { this.setStyle({ fillOpacity:0.75, weight:3 }); });
                layer.on('mouseout',  function() { this.setStyle({ fillOpacity:0.45, weight:2 }); });
                layer.on('click', e => {
                L.DomEvent.stopPropagation(e);
                map.setMaxZoom(8);
                countryMarkers.clearLayers();
                map.fitBounds(layer.getBounds(), { padding:[20,20], animate:true });
                currentCountry = cData;
                if (currentViewMode === 'pin') {
                    openSidebar(buildCountrySidebar(cData));
                    // Load pins from Country Assignment CSV filtered by staff-assigned country,
                    // then fall back to DT location-based pins if the CSV has none yet.
                    loadPinsForCountry(cData.name).then(csvPins => {
                        if (csvPins.length > 0) {
                            renderSpecificChurchPins(csvPins);
                        } else {
                            renderSpecificChurchPins(cData.churches);
                        }
                    });
                    return;
                }
                openSidebar(buildCountrySidebar(cData));
                churchMarkers.clearLayers();
                if (cData.name === 'United States' && usGeoJSON)  renderStateShapes(usGeoJSON, cData);
                else if (cData.name === 'India' && indiaGeoJSON)  renderStateShapes(indiaGeoJSON, cData);
                else {
                    stateMarkers.clearLayers();
                    const states = liveData.stateStats[cData.name];
                    if (states) Object.entries(states).forEach(([name, data]) => {
                        const m = L.marker(data.coords || cData.coords, { icon: createDotIcon(cData.sensitive||false, 'normal'), title: name });
                        m.bindPopup(`<strong>${escapeHtml(name)}</strong><br>${data.churches} churches · ${data.staff} staff`);
                        m.addTo(stateMarkers);
                    });
                }
            });
        }
        }); // end L.geoJSON
        countriesLayerDirty = false;
    }

    countriesGeoLayer.addTo(countryMarkers);
}

/**
 * Apply a 10/40 Window pin security mode and re-render the map.
 *
 * Modes:
 *   'normal'     — All pins shown at their true coordinates.
 *   'obfuscate'  — 10/40 Window pins shifted ~15 km by a deterministic offset.
 *   'hidden'     — 10/40 Window pins removed from the map entirely.
 *
 * Updates the security button label and active CSS state, then re-renders
 * via showAllCountries().
 *
 * @param {string} mode  Security mode to apply: 'normal' | 'obfuscate' | 'hidden'.
 */
function applySecurityMode(mode) {
    pinSecurityMode = (pinSecurityMode === mode) ? 'normal' : mode;
    countriesLayerDirty = true; // security mode affects which countries are shown
    const securityOpts  = document.querySelectorAll('.sec-option');
    const securityBtn   = document.getElementById('obscurePinsBtn');
    const securityPopup = document.getElementById('securityPopup');
    securityOpts.forEach(o => o.classList.toggle('selected', o.dataset.mode === pinSecurityMode));
    if (securityBtn) {
        const text = securityBtn.querySelector('.btn-text');
        if (text) text.textContent = { normal:'Security: Off', obfuscate:'Security: Obfuscated', hidden:'Security: Hidden' }[pinSecurityMode];
        securityBtn.classList.remove('active');
    }
    if (securityPopup) securityPopup.classList.remove('open');
    if (currentStateChurches) renderSpecificChurchPins(currentStateChurches);
    else if (currentCountry)  renderSpecificChurchPins(currentCountry.churches);
    else                      showAllCountries();
}


// ============================================================================
// 8. DASHBOARD & FORMS
// ============================================================================

/**
 * Populate the Global Overview modal with aggregated ministry statistics.
 *
 * Counts total active countries, churches, groups, staff, and volunteers
 * from the in-memory liveData object, then injects the values into the
 * corresponding DOM elements (#totalCountries, #totalChurches, etc.).
 * Also populates the #countryList <ul> with per-country summary rows.
 */
function renderGlobalDashboard() {
    const active = countries.filter(c => !['inactive','cancelled'].includes(c.level));
    const el = id => document.getElementById(id);
    if (el('totalCountries'))   el('totalCountries').textContent  = active.length;
    if (el('countryList'))      el('countryList').innerHTML       = active.map(c => `<li>${escapeHtml(c.name)}</li>`).join('');
    let tC=0, tG=0, tS=0, tV=0;
    Object.values(liveData.countryStats).forEach(s => { tC+=s.churches||0; tG+=s.groups||0; tS+=s.staff||0; tV+=s.volunteers||0; });
    if (el('totalChurches'))   el('totalChurches').textContent  = tC;
    if (el('totalGroups'))     el('totalGroups').textContent    = tG;
    if (el('totalStaff'))      el('totalStaff').textContent     = tS;
    if (el('totalVolunteers')) el('totalVolunteers').textContent = tV;
}

/**
 * Populate all <select> dropdowns in the Data Management forms.
 *
 * Reads the current countries[] and their churches from liveData to build
 * options for: country selectors, church selectors, and staff selectors.
 * Called each time the Data Management panel is opened to ensure dropdowns
 * reflect the latest in-memory data.
 */
function populateFormDropdowns() {
    // Build the master church list once — O(n) with Set for dedup
    const liveChurches = Object.keys(liveData.churchDetails || {});
    const allChurches = Array.from(new Set([...liveChurches, ...(dbGroupNames || [])])).sort((a, b) => a.localeCompare(b));

    // Pre-build a Set of churches that have a country (for staff selects) — O(1) lookup
    const staffAdded = new Set();
    const staffOpts = [];
    const editStaffOpts = [];
    const countryOpts = [];

    countries.forEach(c => {
        countryOpts.push({ value: c.name, label: c.name });
        c.churches.forEach(ch => {
            const lbl = ch.name + ' (' + c.name + ')';
            staffOpts.push({ value: ch.name, label: lbl });
            editStaffOpts.push({ value: ch.name, label: lbl });
            staffAdded.add(ch.name);
        });
    });

    // Add orphan churches not in any country — O(1) Set.has() instead of O(n) Array.some()
    allChurches.forEach(name => {
        if (!staffAdded.has(name)) {
            staffOpts.push({ value: name, label: name });
            editStaffOpts.push({ value: name, label: name });
        }
    });

    // Batch-build each <select> via DocumentFragment — single DOM write per select
    const batchFill = (id, defaultText, items) => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const frag = document.createDocumentFragment();
        const def = document.createElement('option');
        def.value = ''; def.textContent = defaultText;
        frag.appendChild(def);
        for (let i = 0; i < items.length; i++) {
            const o = document.createElement('option');
            o.value = items[i].value;
            o.textContent = items[i].label;
            frag.appendChild(o);
        }
        sel.innerHTML = '';
        sel.appendChild(frag);  // single DOM mutation
    };

    const churchItems = allChurches.map(n => ({ value: n, label: n }));

    batchFill('churchCountrySelect',     '-- Choose --',       countryOpts);
    batchFill('updateLevelCountrySelect', '-- Choose --',       countryOpts);
    batchFill('staffChurchSelect',        '-- Choose --',       staffOpts);
    batchFill('editStaffChurchSelect',    '-- Choose --',       editStaffOpts);
    batchFill('editChurchSelect',         '-- Choose Church --', churchItems);
    batchFill('pinDataChurchSelect',      '-- Choose Church --', churchItems);
}

function initAddChurchMap() {
    if (!addChurchMapInstance) {
        addChurchMapInstance = L.map('addChurchMap', { minZoom:1, maxZoom:16, zoom:2 }).setView([20,0], 2);
        const mode = document.documentElement.getAttribute('data-theme');
        L.tileLayer(mode === 'dark'
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            { attribution: '(c) OpenStreetMap' }
        ).addTo(addChurchMapInstance);
        addChurchMapInstance.on('click', e => {
            const { lat, lng } = e.latlng;
            document.getElementById('addChurchLat').value = lat;
            document.getElementById('addChurchLng').value = lng;
            const ct = document.getElementById('selectedCoordsText');
            ct.textContent = `Location set — Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
            ct.style.color = '#4caf50';
            if (addChurchMarker) addChurchMarker.setLatLng(e.latlng);
            else addChurchMarker = L.marker(e.latlng).addTo(addChurchMapInstance);
        });
    } else {
        setTimeout(() => addChurchMapInstance.invalidateSize(), 100);
    }
}

function initPinDataMap() {
    if (!pinDataMapInstance) {
        pinDataMapInstance = L.map('pinDataMap', { minZoom:1, maxZoom:16, zoom:2 }).setView([20,0], 2);
        const mode = document.documentElement.getAttribute('data-theme');
        L.tileLayer(mode === 'dark'
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            { attribution: '(c) OpenStreetMap' }
        ).addTo(pinDataMapInstance);
        pinDataMapInstance.on('click', e => {
            const { lat, lng } = e.latlng;
            document.getElementById('pinDataLat').value = lat;
            document.getElementById('pinDataLng').value = lng;
            const ct = document.getElementById('pinDataCoordsText');
            ct.textContent = `Location set — Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
            ct.style.color = '#4caf50';
            if (pinDataMarker) pinDataMarker.setLatLng(e.latlng);
            else pinDataMarker = L.marker(e.latlng).addTo(pinDataMapInstance);
        });
    } else {
        setTimeout(() => pinDataMapInstance.invalidateSize(), 100);
    }
}

function setSaving(btn, saving, defaultText) {
    if (!btn) return;
    btn.disabled = saving;
    btn.textContent = saving ? 'Saving...' : defaultText;
}


// ============================================================================
// 9. EVENT LISTENERS
// ============================================================================

/**
 * Attach all top-level DOM event listeners.
 *
 * Wires:
 *   - Theme toggle button
 *   - Global Overview button and close button
 *   - Security mode popup and option buttons
 *   - Sidebar close button
 *   - Add Data / Close forms buttons
 *   - Form card navigation (switching between the 6 form sections)
 *   - All form submit handlers (Add Country, Add Church, Add Staff,
 *     Update Level, Edit Church, Edit Staff)
 *   - Country list toggle and CSV export button
 *   - Inspector panel open/close and fetch buttons
 *
 * Called once from the DOMContentLoaded handler at the bottom of this file.
 */
function setupEventListeners() {
    const el = id => document.getElementById(id);

    updateModeButtons();
    switchScreen('home');

    // Single delegated listener on the sidebar container handles all church-list
    // and expand-detail button clicks. One listener replaces N per-button listeners
    // that were previously added on every openSidebar() call.
    el('sidebarContent')?.addEventListener('click', e => {
        const listBtn = e.target.closest('.church-list-btn');
        if (listBtn) {
            e.stopPropagation();
            const found = findChurchByName(listBtn.dataset.church);
            if (found) openSidebar(buildChurchSidebar(found.church));
            return;
        }
        const detailBtn = e.target.closest('.expand-detail-btn');
        if (detailBtn) {
            e.stopPropagation();
            openDetailPanel(detailBtn.dataset.church);
        }
    });

    el('startMapBtn')?.addEventListener('click', async () => {
        switchScreen('map');
        await ensureMapReady();
    });
    el('openViewOptionsBtn')?.addEventListener('click', () => switchScreen('options'));
    el('closeViewOptionsBtn')?.addEventListener('click', () => switchScreen('home'));
    el('goToMapFromOptionsBtn')?.addEventListener('click', async () => {
        switchScreen('map');
        await ensureMapReady();
    });
    el('setPinModeBtn')?.addEventListener('click', () => setViewMode('pin'));
    el('setStandardModeBtn')?.addEventListener('click', () => setViewMode('standard'));

    el('optionsOpenAddDataBtn')?.addEventListener('click', async () => {
        switchScreen('map');
        await ensureMapReady();
        populateFormDropdowns();
        const formsPage = el('formsPage');
        if (formsPage) formsPage.style.display = 'block';
        if (!addChurchMapInstance) initAddChurchMap();
    });
    el('optionsOpenInspectorBtn')?.addEventListener('click', async () => {
        switchScreen('map');
        await ensureMapReady();
        const panel = el('inspectorPanel');
        const btn = el('inspectorBtn');
        if (panel) panel.classList.add('insp-open');
        if (btn) btn.classList.add('active');
    });
    el('optionsThemeToggleBtn')?.addEventListener('click', () => el('themeToggleBtn')?.click());
    el('optionsOpenSecurityBtn')?.addEventListener('click', async () => {
        switchScreen('map');
        await ensureMapReady();
        const securityBtn = el('obscurePinsBtn');
        const securityPopup = el('securityPopup');
        if (securityPopup) securityPopup.classList.add('open');
        if (securityBtn) securityBtn.classList.add('active');
    });

    el('themeToggleBtn')?.addEventListener('click', e => {
        e.stopPropagation();
        applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });

    const overviewModal = el('globalOverviewModal');
    el('globalOverviewBtn')?.addEventListener('click', e => { e.stopPropagation(); renderGlobalDashboard(); if (overviewModal) overviewModal.style.display = 'block'; });
    el('closeOverview')?.addEventListener('click', () => { if (overviewModal) overviewModal.style.display = 'none'; });

    const securityBtn   = el('obscurePinsBtn');
    const securityPopup = el('securityPopup');
    securityBtn?.addEventListener('click', e => {
        e.stopPropagation();
        const opening = !securityPopup.classList.contains('open');
        securityPopup.classList.toggle('open', opening);
        securityBtn.classList.toggle('active', opening);
    });
    securityPopup?.querySelectorAll('.sec-option').forEach(opt => {
        opt.addEventListener('click', e => { e.stopPropagation(); applySecurityMode(opt.dataset.mode); });
    });

    document.addEventListener('click', e => {
        if (securityPopup && securityBtn && !securityPopup.contains(e.target) && e.target !== securityBtn) {
            securityPopup.classList.remove('open'); securityBtn.classList.remove('active');
        }
        if (overviewModal && e.target === overviewModal) overviewModal.style.display = 'none';
    });

    el('closeSidebar')?.addEventListener('click', () => { closeSidebar(); });
    el('mapBackBtn')?.addEventListener('click', () => {
        closeSidebar();
        pinPlacementChurchName = null;
        if (pinPlacementTempMarker && map) {
            map.removeLayer(pinPlacementTempMarker);
            pinPlacementTempMarker = null;
        }
        switchScreen('home');
    });

    // Add Data
    const formsPage = el('formsPage');
    el('addDataBtn')?.addEventListener('click', async () => {
        await ensureMapReady();
        populateFormDropdowns();
        if (formsPage) formsPage.style.display = 'block';
        if (!addChurchMapInstance) initAddChurchMap();
    });
    el('closeFormsPage')?.addEventListener('click', () => {
        if (formsPage) formsPage.style.display = 'none';
        switchScreen('map');
    });

    document.querySelectorAll('.form-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.form-card').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
            card.classList.add('active');
            const target = el(card.dataset.target);
            if (target) target.classList.add('active');
            if (card.dataset.target === 'addChurchSection') setTimeout(() => addChurchMapInstance?.invalidateSize(), 50);
            if (card.dataset.target === 'addPinDataSection') {
                if (!pinDataMapInstance) initPinDataMap();
                else setTimeout(() => pinDataMapInstance.invalidateSize(), 50);
            }
        });
    });

    el('churchCountrySelect')?.addEventListener('change', function() {
        const cName = this.value;
        if (!cName || !worldGeoJSON || !addChurchMapInstance) return;
        const feature = worldGeoJSON.features.find(f => f.properties.name.toLowerCase() === (GEOJSON_NAME_MAP[cName] || cName).toLowerCase());
        if (feature) addChurchMapInstance.fitBounds(L.geoJSON(feature).getBounds(), { padding:[20,20] });
        else { const c = countries.find(c => c.name === cName); if (c) addChurchMapInstance.setView(c.coords, 5); }
    });

    el('pinDataChurchSelect')?.addEventListener('change', function() {
        const churchName = this.value;
        if (!churchName || !pinDataMapInstance) return;
        const match = findChurchByName(churchName);
        if (match && match.church.coords && match.church.coords[0]) {
            pinDataMapInstance.setView(match.church.coords, 8);
        } else if (match && worldGeoJSON) {
            const feature = worldGeoJSON.features.find(f => f.properties.name.toLowerCase() === (GEOJSON_NAME_MAP[match.country.name] || match.country.name).toLowerCase());
            if (feature) pinDataMapInstance.fitBounds(L.geoJSON(feature).getBounds(), { padding:[20,20] });
            else if (match.country.coords) pinDataMapInstance.setView(match.country.coords, 5);
        }
    });

    // Add Country
    el('formAddCountry')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const cName = el('addCountryName').value.trim(), cCode = el('addCountryCode').value.trim().toLowerCase();
        if (!worldGeoJSON) { showToast('Map data still loading', 'warning'); return; }
        const feature = worldGeoJSON.features.find(f => f.properties.name.toLowerCase() === (GEOJSON_NAME_MAP[cName] || cName).toLowerCase());
        if (!feature) { showToast(`Could not find borders for "${cName}"`, 'error'); return; }
        if (!countries.find(c => c.name.toLowerCase() === cName.toLowerCase())) {
            const center = L.geoJSON(feature).getBounds().getCenter();
            countries.push({ name:cName, coords:[center.lat,center.lng], countryCode:cCode, level:'default', churches:[], sensitive:false });
            liveData.countryStats[cName] = { churches:0, groups:0, staff:0, volunteers:0 };
            liveData.stateStats[cName]   = {};
            countriesLayerDirty = true; // new country means the cached layer is stale
            rebuildChurchLookups();
            showToast(`Added country: ${cName}`, 'success');
            showAllCountries();
        } else { showToast(`${cName} already exists`, 'warning'); }
        this.reset(); populateFormDropdowns();
    });

    // Add Church
    el('formAddChurch')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const lat = el('addChurchLat').value, lng = el('addChurchLng').value;
        if (!lat || !lng) { showToast('Click the mini-map to place a pin first', 'warning'); return; }
        const cName = el('churchCountrySelect').value, sName = el('addChurchState').value.trim();
        const chName = el('addChurchName').value.trim(), year = el('addChurchYear').value, attendees = el('addChurchAttendees').value;
        const countryObj = countries.find(c => c.name === cName);
        if (!countryObj) { showToast('Country not found', 'error'); return; }
        const btn = this.querySelector('.submit-btn');
        setSaving(btn, true, 'Add Church');
        try {
            const payload = { title:chName, group_status:'active', group_type:'church', member_count: attendees ? parseInt(attendees) : 0, location_grid_meta:[{ grid_meta_id:null, lat:String(lat), lng:String(lng), level:'place', label:`${sName}, ${cName}` }] };
            if (year) payload.start_date = `${year}-01-01`;
            const created = await dtFetch('/dt-posts/v2/groups', 'POST', payload);
            const coords = [parseFloat(lat), parseFloat(lng)];
            countryObj.churches.push({ name:chName, coords, address:null });
            liveData.churchDetails[chName] = { address:null, groupType:'Church', groupStatus:'active', startDate:year||null, churchStartDate:null, endDate:null, attendees:attendees||0, leaderCount:0, leaders:[], coaches:[], parentChurch:null, childChurches:[], peerChurches:[], healthMetrics:[] };
            liveData.staffDetails[chName]  = [];
            liveData.dtGroupIds[chName]    = created.ID;
            liveData.countryStats[cName].churches++;
            liveData.countryStats[cName].groups++;
            if (!liveData.stateStats[cName]) liveData.stateStats[cName] = {};
            if (!liveData.stateStats[cName][sName]) liveData.stateStats[cName][sName] = { coords, churches:0, groups:0, staff:0, names:[] };
            liveData.stateStats[cName][sName].churches++;
            liveData.stateStats[cName][sName].names.push(chName);
            rebuildChurchLookups(); // keep fast lookups and layer cache in sync
            showToast(`Church "${chName}" created`, 'success');
            this.reset();
            const ct = el('selectedCoordsText');
            if (ct) { ct.textContent = 'No location selected yet — click the map to place a pin.'; ct.style.color = ''; }
            if (addChurchMarker) { addChurchMapInstance.removeLayer(addChurchMarker); addChurchMarker = null; }
            el('addChurchLat').value = ''; el('addChurchLng').value = '';
            populateFormDropdowns();
        } catch (err) { console.error(err); showToast('Failed to save church', 'error'); }
        finally { setSaving(btn, false, 'Add Church'); }
    });

    // Add Staff
    el('formAddStaff')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const chName = el('staffChurchSelect').value, staffName = el('addStaffName').value.trim();
        const age = el('addStaffAge').value, sLvl = el('addStaffSalvation').value, bLvl = el('addStaffBaptism').value;
        const groupId = liveData.dtGroupIds[chName], maxIdx = Math.max(discLabelToIndex(sLvl), discLabelToIndex(bLvl));
        const btn = this.querySelector('.submit-btn');
        setSaving(btn, true, 'Add Staff Member');
        try {
            const payload = { title:staffName, faith_status:'staff', salvation:{ values:discLabelToDTKeys(sLvl).map(k=>({value:k})) }, baptism:{ values:discLabelToDTKeys(bLvl).map(k=>({value:k})) } };
            if (age) payload.age_range = age;
            if (groupId) payload.groups = { values:[{ value:groupId }] };
            const created = await dtFetch('/dt-posts/v2/contacts', 'POST', payload);
            if (!liveData.staffDetails[chName]) liveData.staffDetails[chName] = [];
            const emptyDisc = { salvation:sLvl, baptism:bLvl, cbsClass:'None', praying:'None', fellowship:'None', moneyManagement:'None', reports:'None', worship:'None', lastSupper:'None', love:'None', marriage:'None', singles:'None', family:'None', teacher:'None', counseling:'None', fruitOfSpirit:'None' };
            liveData.staffDetails[chName].push({ name:staffName, age:age||null, mentoredBy:null, mentoring:[], baptizedBy:null, milestones:[], baptismDate:null, availability:null, disc:emptyDisc, discipleshipLevel:Math.max(1,maxIdx) });
            liveData.dtContactIds[staffName] = created.ID;
            const loc = getChurchLocationData(chName);
            if (loc.country && liveData.countryStats[loc.country]) liveData.countryStats[loc.country].staff++;
            showToast(`Staff "${staffName}" created`, 'success');
            this.reset();
        } catch (err) { console.error(err); showToast('Failed to save staff', 'error'); }
        finally { setSaving(btn, false, 'Add Staff Member'); }
    });

    // Update Level
    el('formUpdateLevel')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const cName = el('updateLevelCountrySelect').value, newLvl = el('updateLevelSelect').value;
        const countryObj = countries.find(c => c.name === cName);
        if (!countryObj) { showToast('Country not found', 'error'); return; }
        const btn = this.querySelector('.submit-btn');
        setSaving(btn, true, 'Update Map Color');
        countryObj.level = newLvl;
        try {
            await Promise.all(countryObj.churches.map(ch => { const gId = liveData.dtGroupIds[ch.name]; return gId ? dtFetch(`/dt-posts/v2/groups/${gId}`,'PATCH',{door_map_level:newLvl}).catch(err=>console.warn(err)) : Promise.resolve(); }));
            showToast(`Updated ${cName} to ${newLvl}`, 'success');
        } catch (err) { showToast('Some updates may have failed', 'warning'); }
        finally { setSaving(btn, false, 'Update Map Color'); }
        countriesLayerDirty = true; // level color changed — rebuild the cached layer
        showAllCountries(); this.reset();
    });

    // Edit Church — church select is pre-populated by populateFormDropdowns
    el('editChurchSelect')?.addEventListener('change', function() {
        const d = liveData.churchDetails[this.value] || {};
        if (el('editChurchYear'))      el('editChurchYear').value      = d.startDate || '';
        if (el('editChurchAttendees')) el('editChurchAttendees').value = d.attendees || '';
    });
    el('formEditChurch')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const chName = el('editChurchSelect').value, year = el('editChurchYear').value, attendees = el('editChurchAttendees').value;
        const gId = liveData.dtGroupIds[chName], btn = this.querySelector('.submit-btn');
        setSaving(btn, true, 'Update Church');
        try {
            if (gId) { const p = {}; if (attendees) p.member_count = parseInt(attendees); if (year) p.start_date = `${year}-01-01`; await dtFetch(`/dt-posts/v2/groups/${gId}`,'PATCH',p); }
            if (!liveData.churchDetails[chName]) liveData.churchDetails[chName] = {};
            liveData.churchDetails[chName].startDate = year || null;
            liveData.churchDetails[chName].attendees = attendees || null;
            showToast(`Updated "${chName}"`, 'success');
            this.reset();
        } catch (err) { console.error(err); showToast('Failed to save changes', 'error'); }
        finally { setSaving(btn, false, 'Update Church'); }
    });

    // Edit Staff
    el('editStaffChurchSelect')?.addEventListener('change', function() {
        const ss = el('editStaffSelect');
        if (!ss) return;
        ss.innerHTML = '<option value="">-- Choose Staff Member --</option>';
        (liveData.staffDetails[this.value] || []).forEach((st, idx) => {
            const opt = document.createElement('option');
            opt.value = String(idx);
            opt.textContent = st.name;
            ss.appendChild(opt);
        });
    });
    el('editStaffSelect')?.addEventListener('change', function() {
        const chName = el('editStaffChurchSelect').value;
        if (!chName || this.value === '') return;
        const s = (liveData.staffDetails[chName] || [])[this.value];
        if (!s) return;
        if (el('editStaffAge'))       el('editStaffAge').value       = s.age || '';
        if (el('editStaffYear'))      el('editStaffYear').value      = '';
        if (el('editStaffSalvation')) el('editStaffSalvation').value = s.disc?.salvation || 'None';
        if (el('editStaffBaptism'))   el('editStaffBaptism').value   = s.disc?.baptism   || 'None';
    });
    el('formEditStaff')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const chName = el('editStaffChurchSelect').value, staffIdx = el('editStaffSelect').value;
        if (!chName || staffIdx === '') return;
        const staff = (liveData.staffDetails[chName] || [])[staffIdx];
        const sLvl = el('editStaffSalvation').value, bLvl = el('editStaffBaptism').value, age = el('editStaffAge').value;
        const cId = liveData.dtContactIds[staff.name], btn = this.querySelector('.submit-btn');
        setSaving(btn, true, 'Update Staff');
        try {
            if (cId) await dtFetch(`/dt-posts/v2/contacts/${cId}`,'PATCH',{ salvation:{ values:discLabelToDTKeys(sLvl).map(k=>({value:k})) }, baptism:{ values:discLabelToDTKeys(bLvl).map(k=>({value:k})) }, ...(age?{age_range:age}:{}) });
            staff.age = age || null;
            if (!staff.disc) staff.disc = {};
            staff.disc.salvation = sLvl; staff.disc.baptism = bLvl;
            staff.discipleshipLevel = Math.max(1, Math.max(discLabelToIndex(sLvl), discLabelToIndex(bLvl)));
            showToast(`Updated "${staff.name}"`, 'success');
            this.reset();
        } catch (err) { console.error(err); showToast('Failed to save changes', 'error'); }
        finally { setSaving(btn, false, 'Update Staff'); }
    });

    el('formAddPinData')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const churchName = el('pinDataChurchSelect')?.value || '';
        if (!churchName) { showToast('Select a church first.', 'warning'); return; }
        const lat = el('pinDataLat').value, lng = el('pinDataLng').value;
        if (!lat || !lng) { showToast('Click the map to place a pin first.', 'warning'); return; }
        const btn = el('savePinDataBtn');
        setSaving(btn, true, 'Save Pin');
        try {
            await savePinForChurch(churchName, { lat: parseFloat(lat), lng: parseFloat(lng) });
            // Reset the form inputs
            el('pinDataLat').value = ''; el('pinDataLng').value = '';
            const ct = el('pinDataCoordsText');
            if (ct) { ct.textContent = 'No location selected \u2014 click the map above.'; ct.style.color = ''; }
            if (pinDataMarker) { pinDataMapInstance.removeLayer(pinDataMarker); pinDataMarker = null; }
            el('pinDataChurchSelect').value = '';

            // Close the forms page and go back to the map
            const formsPage = el('formsPage');
            if (formsPage) formsPage.style.display = 'none';
            switchScreen('map');
        } finally { setSaving(btn, false, 'Save Pin'); }
    });

    // Country list toggle
    el('toggleCountryList')?.addEventListener('click', e => {
        e.stopPropagation();
        const list = el('countryList');
        if (!list) return;
        const visible = list.style.display !== 'none';
        list.style.display = visible ? 'none' : 'block';
        const btn = e.currentTarget;
        if (btn.lastChild) btn.lastChild.textContent = visible ? ' Show Country List' : ' Hide Country List';
    });

    // CSV Export
    el('exportGlobalCSV')?.addEventListener('click', () => {
        let csv = 'Country,Churches,Groups,Staff,Volunteers\n';
        Object.entries(liveData.countryStats).forEach(([name, s]) => { csv += `"${name}",${s.churches},${s.groups},${s.staff},${s.volunteers}\n`; });
        Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv],{type:'text/csv'})), download:'door-ministry-stats.csv' }).click();
    });
}


// ============================================================================
// 10. BOOT
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    seedCountriesFromCSV(); // pre-populate from CSV so shapes render before DT data arrives
    setupEventListeners();
    initTheme();
    renderGlobalDashboard();
});
