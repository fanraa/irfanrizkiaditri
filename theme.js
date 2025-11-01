// theme.js
// - Mengelola tema (dark, light, gold, emerald).
// - Menyimpan pilihan pengguna di localStorage dan menerapkan CSS variables.
// - Berpengaruh pada tampilan situs secara global.

(function () {
  const storageKey = "irfan_theme_v2";
  const order = ['dark', 'light', 'gold', 'emerald'];

  const PALETTES = {
    dark: {
      '--bg': '#071124',
      '--card': 'rgba(255,255,255,0.03)',
      '--text': '#eaf6ff',
      '--muted': '#9fb1c8',
      '--sidebar-bg': 'rgba(7,12,18,0.98)',
      '--accent': '#3ea0ff',
      '--glass': 'rgba(255,255,255,0.02)'
    },
    light: {
      '--bg': '#f6fbff',
      '--card': '#ffffff',
      '--text': '#052033',
      '--muted': '#5b6c7b',
      '--sidebar-bg': '#3ea0ff',
      '--accent': '#3ea0ff',
      '--glass': 'rgba(11,26,43,0.03)'
    },
    gold: {
      '--bg': '#fff9f0',
      '--card': '#fffaf3',
      '--text': '#1b1b1b',
      '--muted': '#6b5a3a',
      '--sidebar-bg': '#ffb800',
      '--accent': '#ffb800',
      '--glass': 'rgba(11,26,43,0.03)'
    },
    emerald: {
      '--bg': '#f2fbf8',
      '--card': '#f6fffb',
      '--text': '#07221a',
      '--muted': '#3b6f5b',
      '--sidebar-bg': '#00b37e',
      '--accent': '#00b37e',
      '--glass': 'rgba(11,26,43,0.03)'
    }
  };

  function applyThemeToDocument(theme) {
    const root = document.documentElement;
    const p = PALETTES[theme] || PALETTES['dark'];
    Object.keys(p).forEach(k => root.style.setProperty(k, p[k]));
    root.setAttribute('data-theme', theme);
    const computedBg = getComputedStyle(root).getPropertyValue('--bg').trim();
    if (computedBg) {
      document.body.style.background = computedBg;
      void document.body.offsetHeight;
    }
    document.dispatchEvent(new Event('themeApplied'));
    document.dispatchEvent(new Event('themeChanged'));
  }

  document.addEventListener('DOMContentLoaded', function () {
    const saved = localStorage.getItem('selectedTheme') || localStorage.getItem(storageKey) || 'dark';
    const theme = (saved === 'default') ? 'dark' : saved;
    document.documentElement.setAttribute('data-theme', theme);
    applyThemeToDocument(theme);

    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        const cur = document.documentElement.getAttribute('data-theme') || 'dark';
        const idx = order.indexOf(cur);
        const nxt = order[(idx + 1) % order.length];
        localStorage.setItem(storageKey, nxt);
        localStorage.setItem('selectedTheme', nxt);
        applyThemeToDocument(nxt);
      });
    }

    window.applyThemeToDocument = applyThemeToDocument;
  });
})();