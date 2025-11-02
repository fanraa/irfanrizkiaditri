// visitors.js (updated per request)
// - DEFAULT_INIT = 473 as the first visitor value.
// - Ensure we only increment once per device (SEEN_KEY persists across refresh).
// - If DB row missing, initialize it with DEFAULT_INIT.
// - If offline or value unavailable, show cached value; when no value and offline show "Offline".
// - Expose window.refreshVisitors() for debugging (does NOT increment on page refresh because SEEN_KEY persists).

(function () {
  const LOCAL_KEY = 'visitors_count_v2';
  const SEEN_KEY = 'visitors_seen_v2';
  const DEFAULT_INIT = 473; // initial visitor count requested

  let inited = false;
  let lastKnownCount = null;

  function getVisitorEl() {
    return document.getElementById('visitorSmall');
  }

  function updateVisitorDisplay(count) {
    // If count is not a finite number and user is offline -> show "Offline"
    const el = getVisitorEl();
    if (!Number.isFinite(+count)) {
      lastKnownCount = null;
      if (!navigator.onLine) {
        if (el) el.textContent = 'Visitors: Offline';
        return;
      } else {
        if (el) el.textContent = 'Visitors: —';
        return;
      }
    }
    lastKnownCount = Number(count);
    if (el) {
      el.textContent = 'Visitors: ' + lastKnownCount;
    }
  }

  function saveLocal(count) {
    try { localStorage.setItem(LOCAL_KEY, String(count)); } catch (e) { console.warn('localStorage set failed', e); }
  }
  function readLocal() {
    try { const v = localStorage.getItem(LOCAL_KEY); return v === null ? null : Number(v); } catch (e) { return null; }
  }

  async function initVisitors() {
    // Prevent double-initializing within same load, but still safe to call trySyncVisitorsOnOnline manually
    if (inited) return;
    inited = true;

    const el = getVisitorEl();
    // Immediately show offline/placeholder instead of "—"
    if (el) {
      if (!navigator.onLine) el.textContent = 'Visitors: Offline';
      else el.textContent = 'Visitors: —';
    }

    // If Supabase not present: show local cached value or default, and do not attempt DB ops
    if (!window.sb) {
      const cached = readLocal();
      const count = (cached !== null && !Number.isNaN(Number(cached))) ? Number(cached) : DEFAULT_INIT;
      updateVisitorDisplay(count);
      saveLocal(count);
      return;
    }

    try {
      // Pull site_data row
      const { data, error } = await sb.from('site_data').select('value').eq('key', 'visitors').limit(1).maybeSingle();
      if (error) throw error;

      // If no row, create one with DEFAULT_INIT (or any cached)
      if (!data) {
        const cached = readLocal();
        const initCount = (cached !== null && !Number.isNaN(Number(cached))) ? cached : DEFAULT_INIT;
        await sb.from('site_data').upsert([{ key: 'visitors', value: JSON.stringify({ count: initCount }) }]);
        saveLocal(initCount);
        updateVisitorDisplay(initCount);
        return;
      }

      // parse stored value robustly
      let serverCount = 0;
      try {
        const parsed = (typeof data.value === 'string') ? JSON.parse(data.value) : data.value;
        serverCount = Number(parsed && parsed.count ? parsed.count : 0);
      } catch (e) {
        console.warn('visitors parse failed', e);
        serverCount = 0;
      }

      // If the device has been seen before (SEEN_KEY), do NOT increment on refresh
      const seen = localStorage.getItem(SEEN_KEY);
      if (seen) {
        const displayCount = (serverCount && Number.isFinite(serverCount)) ? serverCount : (readLocal() || DEFAULT_INIT);
        updateVisitorDisplay(displayCount);
        saveLocal(displayCount);
        return;
      }

      // Device not seen before -> increment once
      const newCount = (Number.isFinite(serverCount) ? serverCount : 0) + 1;
      try {
        await sb.from('site_data').upsert([{ key: 'visitors', value: JSON.stringify({ count: newCount }) }]);
      } catch (upErr) {
        console.warn('upsert visitors failed', upErr);
        // if upsert failed, still store locally and show incremented value
      }
      localStorage.setItem(LOCAL_KEY, String(newCount));
      localStorage.setItem(SEEN_KEY, Date.now().toString());
      updateVisitorDisplay(newCount);
    } catch (err) {
      console.error('initVisitors error', err);
      // fallback: show cached or default
      const cached = readLocal();
      const count = (cached !== null && !Number.isNaN(Number(cached))) ? cached : DEFAULT_INIT;
      updateVisitorDisplay(count);
      saveLocal(count);
    }
  }

  // On reconnect, resync display from server (does NOT increment)
  async function trySyncVisitorsOnOnline() {
    if (!window.sb) return;
    try {
      const { data, error } = await sb.from('site_data').select('value').eq('key', 'visitors').limit(1).maybeSingle();
      if (error) throw error;
      if (data) {
        let serverCount = 0;
        try {
          const parsed = (typeof data.value === 'string') ? JSON.parse(data.value) : data.value;
          serverCount = Number(parsed && parsed.count ? parsed.count : 0);
        } catch (e) {
          serverCount = 0;
        }
        const displayCount = (serverCount && Number.isFinite(serverCount)) ? serverCount : (readLocal() || DEFAULT_INIT);
        updateVisitorDisplay(displayCount);
        saveLocal(displayCount);
      }
    } catch (e) {
      console.warn('visitor sync on online failed', e);
    }
  }

  // Allow manual refresh (for debugging); does not increment if SEEN_KEY present
  window.refreshVisitors = async function() {
    try {
      // temporarily allow re-run even if inited was set
      inited = false;
      await initVisitors();
    } catch (e) { console.warn(e); }
  };

  // Wire events. initVisitors is safe to call multiple times but increments only when SEEN_KEY absent.
  function setupListeners() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initVisitors);
    } else {
      initVisitors();
    }
    // If supabase comes later, init again (it checks inited guarded)
    document.addEventListener('supabaseReady', () => { initVisitors(); });
    // Sync from server when connection regained (no increment)
    window.addEventListener('online', trySyncVisitorsOnOnline);
  }

  setupListeners();
})();