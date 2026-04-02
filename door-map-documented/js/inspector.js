/**
 * @file inspector.js
 * @description
 *   Data Inspector panel for the DOOR International Global Ministry Map.
 *
 *   Provides a full-screen overlay table that fetches raw ministry records
 *   directly from the custom door-map/v1 REST endpoints (which query $wpdb
 *   directly, bypassing DT middleware). Displays Groups, Contacts, or Users
 *   as a searchable, sortable, horizontally-scrollable data table.
 *
 *   Features:
 *     - Paginated fetch with live progress status messages
 *     - Client-side column search (filters all visible rows on keystroke)
 *     - Click-to-sort on any column header (toggle asc/desc)
 *     - Sticky first column (record ID) for horizontal scroll readability
 *     - Summary pills showing record type, count, field count, load time
 *     - Copy raw JSON button for debugging and data export
 *     - Separate fetch flow for Users (different endpoint, different fields)
 *
 *   Depends on:
 *     - window.dtMapData.inspectorEndpoint  (set by door-map-plugin3.php)
 *     - window.dtMapData.usersEndpoint      (set by door-map-plugin3.php)
 *     - window.dtMapData.inspectorNonce     (set by door-map-plugin3.php)
 *     - inspector.js is enqueued after script1.js so dtMapData is defined
 *
 *   @version 5.0.0
 *   @authors Evan Simons, Rylan Vannaman
 */
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Module State
//
// All inspector state is module-scoped. No state leaks to the global scope
// beyond what is explicitly attached to window by script1.js.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Object[]}    Full dataset currently loaded into the table. */
let inspData    = [];
/** @type {string[]}    Column headers derived from the first record's keys. */
let inspCols    = [];
/** @type {string|null} Currently sorted column key, or null if unsorted. */
let inspSortCol = null;
/** @type {number}      Sort direction: 1 = ascending, -1 = descending. */
let inspSortDir = 1;
/** @type {string}      Raw JSON string of the last fetched dataset (for Copy JSON). */
let inspRawJSON = '';
/** @type {number}      Timestamp (Date.now()) when the current fetch started. */
let inspStart   = 0;

// Our own direct-DB endpoint — bypasses DT REST middleware, no 500s
const ENDPOINT       = window.dtMapData?.inspectorEndpoint || '';
const USERS_ENDPOINT = window.dtMapData?.usersEndpoint     || '';
const NONCE          = window.dtMapData?.inspectorNonce    || window.dtMapData?.nonce || '';

// ── DOM refs ──────────────────────────────────────────────────────
const inspectorBtn   = document.getElementById('inspectorBtn');
const inspectorPanel = document.getElementById('inspectorPanel');
const inspClose      = document.getElementById('inspClose');
const inspFetchGroups   = document.getElementById('inspFetchGroups');
const inspFetchContacts = document.getElementById('inspFetchContacts');
const inspFetchUsers    = document.getElementById('inspFetchUsers');
const inspClear      = document.getElementById('inspClear');
const inspCopyRaw    = document.getElementById('inspCopyRaw');
const inspStatus     = document.getElementById('inspStatus');
const inspSummary    = document.getElementById('inspSummary');
const inspSumType    = document.getElementById('inspSumType');
const inspSumCount   = document.getElementById('inspSumCount');
const inspSumFields  = document.getElementById('inspSumFields');
const inspSumTime    = document.getElementById('inspSumTime');
const inspSearchBar  = document.getElementById('inspSearchBar');
const inspSearch     = document.getElementById('inspSearch');
const inspRowCount   = document.getElementById('inspRowCount');
const inspTableWrap  = document.getElementById('inspTableWrap');
const inspThead      = document.getElementById('inspThead');
const inspTbody      = document.getElementById('inspTbody');

// ── Helpers ───────────────────────────────────────────────────────
/**
 * Remove the insp-hidden class from a DOM element.
 * @param {HTMLElement} el  Element to show.
 */
function inspShow(el) { el.classList.remove('insp-hidden'); }
/**
 * Add the insp-hidden class to a DOM element.
 * @param {HTMLElement} el  Element to hide.
 */
function inspHide(el) { el.classList.add('insp-hidden'); }

/**
 * Update the inspector status bar with a message and severity class.
 *
 * @param {string} msg   Message text to display.
 * @param {string} type  Severity: 'info' | 'success' | 'warn' | 'error'.
 */
function inspSetStatus(msg, type = 'info') {
    inspStatus.textContent = msg;
    inspStatus.className   = `insp-status insp-status-${type}`;
    inspShow(inspStatus);
}

// Flatten any DT field value to a readable string
function flatVal(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean')  return v ? 'true' : 'false';
    if (typeof v === 'number')   return String(v);
    if (typeof v === 'string')   return v;
    if (typeof v === 'object') {
        // DT date: { timestamp, formatted }
        if (v.formatted)     return v.formatted;
        if (v.timestamp)     return new Date(v.timestamp * 1000).toLocaleDateString();
        // DT key_select: { key, label }
        if (v.label)         return v.label;
        // DT user_select: { ID, display_name }
        if (v.display_name)  return v.display_name;
        // DT communication_channel single: { value }
        if (v.value && typeof v.value === 'string') return v.value;
        // DT location coords: { lat, lng }
        if (v.lat && v.lng)  return `${v.lat}, ${v.lng}`;
    }
    if (Array.isArray(v)) {
        return v.map(item => {
            if (!item || typeof item !== 'object') return String(item ?? '');
            return item.post_title || item.label || item.name
                || item.value     || item.display_name
                || JSON.stringify(item);
        }).filter(Boolean).join(' | ');
    }
    return JSON.stringify(v);
}

function flatRecord(rec) {
    const out = {};
    for (const [k, v] of Object.entries(rec)) out[k] = flatVal(v);
    return out;
}

// ── Fetch one page from our own direct-DB endpoint ───────────────
async function inspFetchPage(postType, offset, limit = 50) {
    if (!ENDPOINT) throw new Error('Inspector endpoint not defined — check plugin is active and page was refreshed after update.');
    const params = new URLSearchParams({ type: postType, limit, offset });
    const url    = `${ENDPOINT}?${params}`;
    const res    = await fetch(url, {
        method: 'GET',
        headers: {
            'X-WP-Nonce': NONCE,
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
    });
    if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText);
        throw new Error(`HTTP ${res.status} — ${txt.substring(0, 400)}`);
    }
    return res.json();
}

// ── Fetch all pages ───────────────────────────────────────────────
async function inspFetchAll(postType) {
    const all = [];
    let   offset = 0;
    const limit  = 25;  // Match server hard cap   // small page size — avoids server timeouts

    while (true) {
        inspSetStatus(
            `Fetching ${postType}… ${all.length} records so far`,
            'info'
        );
        const data = await inspFetchPage(postType, offset, limit);

        if (!data.posts?.length) break;
        all.push(...data.posts);

        const total = data.total || all.length;
        inspSetStatus(
            `Fetching ${postType}… ${all.length} / ${total}`,
            'info'
        );

        if (all.length >= total) break;
        offset += limit;
    }
    return all;
}

// ── Build & render table ──────────────────────────────────────────
function inspBuildTable(records, postType) {
    if (!records.length) {
        inspSetStatus(`No ${postType} records found.`, 'warn');
        return;
    }

    // Collect every unique key across all records
    const colSet = new Set();
    records.forEach(r => Object.keys(r).forEach(k => colSet.add(k)));

    // Sort: ID first, name second, rest alphabetically
    inspCols = Array.from(colSet).sort((a, b) => {
        if (a === 'ID')   return -1;
        if (b === 'ID')   return  1;
        if (a === 'name') return -1;
        if (b === 'name') return  1;
        return a.localeCompare(b);
    });

    inspData    = records.map(flatRecord);
    inspRawJSON = JSON.stringify(records, null, 2);

    inspRenderTable(inspData);

    // Summary pills
    inspShow(inspSummary);
    inspSumType.textContent   = `Type: ${postType}`;
    inspSumCount.textContent  = `${records.length} records`;
    inspSumFields.textContent = `${inspCols.length} fields`;
    inspSumTime.textContent   = `${((Date.now() - inspStart) / 1000).toFixed(2)}s`;

    inspShow(inspSearchBar);
    inspShow(inspTableWrap);
}

function inspRenderTable(rows) {
    // Header row
    inspThead.innerHTML = '';
    const tr = document.createElement('tr');
    inspCols.forEach(col => {
        const th       = document.createElement('th');
        th.textContent = col;
        th.title       = col;
        if (inspSortCol === col) {
            th.classList.add(inspSortDir === 1 ? 'isort-asc' : 'isort-desc');
        }
        th.addEventListener('click', () => {
            if (inspSortCol === col) inspSortDir *= -1;
            else { inspSortCol = col; inspSortDir = 1; }
            const sorted = [...inspData].sort((a, b) =>
                (a[col] || '').localeCompare(b[col] || '', undefined, { numeric: true }) * inspSortDir
            );
            inspRenderTable(sorted);
        });
        tr.appendChild(th);
    });
    inspThead.appendChild(tr);

    // Body
    inspTbody.innerHTML = '';
    const frag = document.createDocumentFragment();
    rows.forEach(row => {
        const tr = document.createElement('tr');
        inspCols.forEach(col => {
            const td = document.createElement('td');
            const val = row[col] || '';
            td.textContent = val;
            td.title       = val;  // show full value on hover
            if (!val) td.classList.add('icell-empty');
            tr.appendChild(td);
        });
        frag.appendChild(tr);
    });
    inspTbody.appendChild(frag);

    inspRowCount.textContent = `${rows.length} rows`;
}

// ── Search ────────────────────────────────────────────────────────
inspSearch.addEventListener('input', () => {
    const q = inspSearch.value.toLowerCase().trim();
    if (!q) { inspRenderTable(inspData); return; }
    const filtered = inspData.filter(row =>
        inspCols.some(col => (row[col] || '').toLowerCase().includes(q))
    );
    inspRenderTable(filtered);
});

// ── Panel open / close ────────────────────────────────────────────
inspectorBtn.addEventListener('click', e => {
    e.stopPropagation();
    inspectorPanel.classList.toggle('insp-open');
    inspectorBtn.classList.toggle('active');
});

inspClose.addEventListener('click', () => {
    inspectorPanel.classList.remove('insp-open');
    inspectorBtn.classList.remove('active');
});

// ── Fetch buttons ─────────────────────────────────────────────────
/**
 * Fetch all records of a given type and render them in the inspector table.
 *
 * Orchestrates the full fetch pipeline:
 *   1. Reset state and hide previous results
 *   2. Paginate through all records via inspFetchPage()
 *   3. Call inspBuildTable() to render results
 *   4. Show summary pills and update status bar with timing
 *
 * @param {string} postType  Record type to fetch: 'groups' | 'contacts'.
 * @returns {Promise<void>}
 */
async function runFetch(postType) {
    // Reset
    inspHide(inspSummary);
    inspHide(inspSearchBar);
    inspHide(inspTableWrap);
    inspSearch.value = '';
    inspData = []; inspCols = [];
    inspSortCol = null; inspSortDir = 1;
    inspThead.innerHTML = ''; inspTbody.innerHTML = '';
    inspStart = Date.now();

    try {
        const records = await inspFetchAll(postType);
        inspBuildTable(records, postType);
        inspSetStatus(
            `Done — ${records.length} ${postType} loaded in ${((Date.now() - inspStart) / 1000).toFixed(2)}s`,
            'success'
        );
    } catch (err) {
        inspSetStatus(`Error: ${err.message}`, 'error');
        console.error('[Inspector]', err);
    }
}

inspFetchGroups.addEventListener('click',   () => runFetch('groups'));
inspFetchContacts.addEventListener('click', () => runFetch('contacts'));

// ── Users fetch ───────────────────────────────────────────────────
/**
 * Fetch all users from the inspector-users endpoint and render the table.
 *
 * Uses a separate endpoint (USERS_ENDPOINT) and fetch loop since users come
 * from wp_users / wp_usermeta rather than wp_posts / wp_postmeta.
 *
 * @returns {Promise<void>}
 */
async function runFetchUsers() {
    inspHide(inspSummary); inspHide(inspSearchBar); inspHide(inspTableWrap);
    inspSearch.value = '';
    inspData = []; inspCols = []; inspSortCol = null; inspSortDir = 1;
    inspThead.innerHTML = ''; inspTbody.innerHTML = '';
    inspStart = Date.now();

    if (!USERS_ENDPOINT) {
        inspSetStatus('Users endpoint not available — refresh the page after updating the plugin', 'error');
        return;
    }

    try {
        const all = [];
        let offset = 0;
        const limit = 25;
        while (true) {
            inspSetStatus('Fetching users… ' + all.length + ' so far', 'info');
            const url = USERS_ENDPOINT + '?limit=' + limit + '&offset=' + offset;
            const res = await fetch(url, {
                headers: { 'X-WP-Nonce': NONCE },
                credentials: 'same-origin'
            });
            if (!res.ok) {
                const txt = await res.text().catch(() => res.statusText);
                throw new Error('HTTP ' + res.status + ' — ' + txt.substring(0, 300));
            }
            const data = await res.json();
            if (!data.posts || !data.posts.length) break;
            all.push(...data.posts);
            if (all.length >= (data.total || all.length)) break;
            offset += limit;
        }
        inspBuildTable(all, 'users');
        inspSetStatus('Done — ' + all.length + ' users loaded in ' + ((Date.now() - inspStart) / 1000).toFixed(2) + 's', 'success');
    } catch (err) {
        inspSetStatus('Error fetching users: ' + err.message, 'error');
        console.error('[Inspector Users]', err);
    }
}

if (inspFetchUsers) inspFetchUsers.addEventListener('click', runFetchUsers);

inspClear.addEventListener('click', () => {
    inspData = []; inspCols = []; inspRawJSON = '';
    inspThead.innerHTML = ''; inspTbody.innerHTML = '';
    inspSearch.value = '';
    inspHide(inspStatus);
    inspHide(inspSummary);
    inspHide(inspSearchBar);
    inspHide(inspTableWrap);
});

inspCopyRaw.addEventListener('click', () => {
    if (!inspRawJSON) { inspSetStatus('Nothing to copy yet — fetch data first', 'warn'); return; }
    navigator.clipboard.writeText(inspRawJSON)
        .then(()  => inspSetStatus('Raw JSON copied to clipboard', 'success'))
        .catch(()  => inspSetStatus('Copy failed — open browser console and run: copy(inspRawJSON)', 'warn'));
});
