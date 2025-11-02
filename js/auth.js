// auth.js (adjusted: set online/offline status immediately on DOMContentLoaded; default "Offline" instead of "—")
// - Ensures the status element is updated as soon as DOM is ready, not waiting for Supabase.
// - Other auth flows remain handled when supabaseReady fires.

(function () {
  async function getSession() {
    if (!window.sb) return null;
    try {
      const { data } = await window.sb.auth.getSession();
      return data.session || null;
    } catch (e) {
      console.warn('getSession error', e);
      return null;
    }
  }

  function userDisplayNameFromSession(session) {
    return session?.user?.user_metadata?.full_name || session?.user?.email || '';
  }

  function showLoginUI(show) {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    if (!loginBtn || !logoutBtn || !userInfo) return;
    if (show) {
      loginBtn.style.display = '';
      logoutBtn.style.display = 'none';
      userInfo.innerHTML = '';
    } else {
      loginBtn.style.display = 'none';
      logoutBtn.style.display = '';
    }
  }

  async function updateUIFromSession(session) {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    if (!loginBtn || !logoutBtn || !userInfo) return;

    if (session && session.user) {
      const name = userDisplayNameFromSession(session);
      loginBtn.style.display = 'none';
      logoutBtn.style.display = '';
      userInfo.innerHTML = `Masuk sebagai: <strong>${name}</strong>`;
      if (typeof showToast === 'function') showToast(`Masuk sebagai ${name}`);
    } else {
      loginBtn.style.display = '';
      logoutBtn.style.display = 'none';
      userInfo.innerHTML = '';
    }
    window.updateProjectsNote && window.updateProjectsNote();
  }

  function onAuthChange(callback) {
    if (!window.sb) return;
    window.sb.auth.onAuthStateChange((event, session) => {
      callback(session);
    });
  }

  // Update online/offline status element (called on DOMContentLoaded)
  function setOnlineStatusElement(online) {
    const onlineStatus = document.getElementById('onlineStatus');
    if (!onlineStatus) return;
    if (online) {
      onlineStatus.textContent = 'Online';
      onlineStatus.style.color = '#b8ffca';
    } else {
      // show explicit 'Offline' instead of dash
      onlineStatus.textContent = 'Offline';
      onlineStatus.style.color = '#ffb3b3';
    }
  }

  function initOnlineStatus() {
    // set immediately based on navigator state
    setOnlineStatusElement(navigator.onLine);
    // update on change
    window.addEventListener('online', () => setOnlineStatusElement(true));
    window.addEventListener('offline', () => setOnlineStatusElement(false));
  }

  // Run DOM-level setup quickly (so status shows without waiting for supabase)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initOnlineStatus();
    });
  } else {
    initOnlineStatus();
  }

  // When supabase is ready, wire auth UI and session handlers
  document.addEventListener('supabaseReady', async () => {
    // defensive wait for DOM inside in case supabaseReady fired early
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', async () => {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const googleLogin = document.getElementById('googleLogin');

        const session = await getSession();
        await updateUIFromSession(session);

        onAuthChange(async ({}) => {
          const s = await getSession();
          updateUIFromSession(s);
        });

        loginBtn?.addEventListener('click', async () => {
          if (!window.sb) return showToast('Auth not available');
          try {
            await window.sb.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: window.location.href }
            });
          } catch (e) {
            console.error('signInWithOAuth error', e);
            showToast('Gagal memulai autentikasi: ' + (e.message || e));
          }
        });

        googleLogin?.addEventListener('click', async () => {
          if (!window.sb) return showToast('Auth not available');
          try {
            await window.sb.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: window.location.href }
            });
          } catch (e) {
            console.error('googleLogin error', e);
            showToast('Gagal memulai autentikasi: ' + (e.message || e));
          }
        });

        logoutBtn?.addEventListener('click', async () => {
          if (!window.sb) return;
          try {
            await window.sb.auth.signOut();
            showToast('Anda keluar.');
            updateUIFromSession(null);
          } catch (e) {
            console.error('signOut error', e);
            showToast('Gagal keluar: ' + (e.message || e));
          }
        });
      });
    } else {
      const loginBtn = document.getElementById('loginBtn');
      const logoutBtn = document.getElementById('logoutBtn');
      const googleLogin = document.getElementById('googleLogin');

      const session = await getSession();
      await updateUIFromSession(session);

      onAuthChange(async ({}) => {
        const s = await getSession();
        updateUIFromSession(s);
      });

      loginBtn?.addEventListener('click', async () => {
        if (!window.sb) return showToast('Auth not available');
        try {
          await window.sb.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
          });
        } catch (e) {
          console.error('signInWithOAuth error', e);
          showToast('Gagal memulai autentikasi: ' + (e.message || e));
        }
      });

      googleLogin?.addEventListener('click', async () => {
        if (!window.sb) return showToast('Auth not available');
        try {
          await window.sb.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
          });
        } catch (e) {
          console.error('googleLogin error', e);
          showToast('Gagal memulai autentikasi: ' + (e.message || e));
        }
      });

      logoutBtn?.addEventListener('click', async () => {
        if (!window.sb) return;
        try {
          await window.sb.auth.signOut();
          showToast('Anda keluar.');
          updateUIFromSession(null);
        } catch (e) {
          console.error('signOut error', e);
          showToast('Gagal keluar: ' + (e.message || e));
        }
      });
    }
  });

})();