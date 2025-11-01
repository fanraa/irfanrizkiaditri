// toast.js
// - Simple toast notifications (non-blocking).
// - Berfungsi untuk menampilkan notifikasi singkat di UI.
// - Digunakan di hampir semua modul ketika perlu memberi tahu pengguna tentang hasil operasi.

(function () {
  function ensureContainer() {
    let c = document.getElementById('toastContainer');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toastContainer';
      c.setAttribute('aria-live','polite');
      c.style.position = 'fixed';
      c.style.right = '18px';
      c.style.bottom = '18px';
      c.style.zIndex = 9999;
      document.body.appendChild(c);
    }
    return c;
  }

  function show(message, opts = {}) {
    const container = ensureContainer();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    el.style.opacity = '1';
    el.style.transition = 'opacity 0.25s';
    container.appendChild(el);
    const ttl = opts.duration || 3500;
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, ttl);
    return el;
  }

  window.showToast = show;
})();
