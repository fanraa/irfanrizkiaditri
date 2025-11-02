// supabase-init.js
// Replace the SUPABASE_URL and SUPABASE_ANON_KEY values with your project's values.
// You can create a free project at https://app.supabase.com/ and copy the Project URL and anon (public) API Key.
//
// This module initializes the supabase client and exposes a lightweight Auth wrapper (window.Auth)
// and window.supabaseReady / 'supabaseAuthReady' events to let other modules proceed.
// Compatibility: this file ensures both window.supabase and window.sb references are available
// (many modules in the project expect `sb` variable).

(function () {
  // TODO: Replace these placeholders with your Supabase project's credentials.
  // You can either replace them here or set global variables SUPABASE_URL and SUPABASE_ANON_KEY
  // before this script loads (e.g. via a server-side include, or by editing this file).
  const SUPABASE_URL = window.SUPABASE_URL || 'https://your-project.supabase.co';
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'your-anon-key';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('your-project')) {
    console.warn('Supabase not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in the environment or in this file.');
  }

  // Create the client
  try {
    const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // store session in localStorage so offline detection and persistence are simpler
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    // expose both names so existing code works with either sb or supabase
    window.supabase = client;
    window.sb = client;
    // also alias to `window.sb` for modules expecting it
  } catch (e) {
    console.error('Failed to create Supabase client', e);
    window.supabase = null;
    window.sb = null;
  }

  // Simple auth wrapper
  window.Auth = {
    user: null,
    // sign in with Google (redirect). Supabase uses redirect or popup depending on provider; popup support relies on OAuth settings.
    async signInWithGoogle() {
      if (!window.sb) throw new Error('Supabase client not initialized');
      try {
        await window.sb.auth.signInWithOAuth({
          provider: 'google',
          options: {
            // redirect back to current page
            redirectTo: window.location.href
          }
        });
      } catch (err) {
        console.error('signInWithGoogle error', err);
        throw err;
      }
    },
    async signOut() {
      if (!window.sb) return;
      try {
        await window.sb.auth.signOut();
        window.Auth.user = null;
        document.dispatchEvent(new Event('supabaseAuthReady'));
      } catch (e) {
        console.error('signOut error', e);
      }
    },
    onAuthStateChange(cb) {
      if (!window.sb) return () => {};
      const { data: sub } = window.sb.auth.onAuthStateChange((event, session) => {
        window.Auth.user = session && session.user ? session.user : null;
        try { cb(window.Auth.user, event); } catch (e) { console.error(e); }
        document.dispatchEvent(new Event('supabaseAuthReady'));
      });
      // initial populate
      (async () => {
        try {
          const { data } = await window.sb.auth.getUser();
          window.Auth.user = data?.user ?? null;
          document.dispatchEvent(new Event('supabaseAuthReady'));
        } catch (e) { console.warn('getUser initial failed', e); }
      })();
      return () => { sub?.unsubscribe(); };
    }
  };

  // Expose helpers for DB and Storage convenience
  window.DB = {
    from(table) {
      if (!window.sb) throw new Error('Supabase not ready');
      return window.sb.from(table);
    }
  };

  // Fire an event others can listen for
  document.dispatchEvent(new Event('supabaseReady'));

  // When auth state changes, fire an event (other modules listen)
  window.Auth.onAuthStateChange(() => { /* doc event fired inside */ });

  // Instructions for connecting to Supabase (copy/paste for convenience)
  // 1) Create a free project at https://app.supabase.com/
  // 2) In the Project -> Settings -> API, copy 'Project URL' -> set as SUPABASE_URL
  // 3) In the same page copy 'anon public' key -> set as SUPABASE_ANON_KEY
  // 4) To use Storage features: create a bucket named 'avatars' (public) and a bucket named 'posts' (public) or adjust upload code.
  // 5) Create tables (SQL) using Supabase SQL editor (examples below).
  //
  // Example SQL to create the tables used by this site:
  //
  // create table profile (id text primary key, name text, role text, bio text, avatar text, avatarLocked boolean, location text, family text, study text, campus text, gender text, updated_at timestamptz default now());
  // insert into profile (id, name) values ('main','Irfan Rizki Aditri') on conflict do nothing;
  //
  // create table posts (id uuid primary key default gen_random_uuid(), title text, caption text, img text, ts bigint, likes int default 0, author text);
  // create table comments (id uuid primary key default gen_random_uuid(), name text, text text, ts bigint);
  // create table reviews (id uuid primary key default gen_random_uuid(), name text, stars int, text text, ts bigint);
  // create table site_data (key text primary key, value jsonb);
  // create table manual_news (id uuid primary key default gen_random_uuid(), title text, link text, source text, ts bigint);
  //
  // Note: If your Supabase project doesn't support gen_random_uuid(), use uuid_generate_v4() or supply IDs in the client.
  //
  // After setting SUPABASE_URL and SUPABASE_ANON_KEY either inlined above or via global variables before this script,
  // reload the page. The app will connect to Supabase and your data will sync.
})();