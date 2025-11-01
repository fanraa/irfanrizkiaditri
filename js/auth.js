// auth.js
// Tanggung jawab:
// - Menangani autentikasi Google, update UI login/logout, dan indikator online/offline.
// - Perbaikan utama:
//   * Defensive coding ketika elemen belum ada (return jika tidak ada).
//   * setOnlineStatus dipanggil saat DOM siap dan saat event online/offline agar tidak menunjukkan strip kosong.

(function () {
  if (typeof auth === 'undefined') {
    console.warn('Firebase auth belum tersedia.');
    return;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const onlineStatus = document.getElementById('onlineStatus');

    function updateUI(user) {
      if (!loginBtn || !logoutBtn || !userInfo) return;
      if (user) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = '';
        userInfo.innerHTML = `Masuk sebagai: <strong>${user.displayName}</strong>`;
        showToast(`Masuk sebagai ${user.displayName}`);
      } else {
        loginBtn.style.display = '';
        logoutBtn.style.display = 'none';
        userInfo.innerHTML = '';
      }
      window.updateProjectsNote && window.updateProjectsNote();
    }

    if (loginBtn) {
      loginBtn.addEventListener('click', function () {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(error => {
          showToast('Gagal masuk: ' + (error.message || error));
        });
      });
    }
    if (logoutBtn) logoutBtn.addEventListener('click', () => auth.signOut().catch(err=>console.error(err)));
    auth.onAuthStateChanged(updateUI);

    function setOnlineStatus() {
      if (!onlineStatus) return;
      const online = navigator.onLine;
      if (online) {
        onlineStatus.textContent = 'Online';
        onlineStatus.style.color = '#b8ffca';
      } else {
        onlineStatus.textContent = 'Offline';
        onlineStatus.style.color = '#ffb3b3';
      }
    }
    window.addEventListener('online', setOnlineStatus);
    window.addEventListener('offline', setOnlineStatus);
    setOnlineStatus();
  });
})();
