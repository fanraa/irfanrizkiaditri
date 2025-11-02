// js/theme.js
// Theme toggling and helpers.
// - Provides applyThemeToDocument(theme) used by menu.js and other modules.
// - Ensures --sidebar-text and --hamburger-line-color set per theme so text is readable.
// - Sets solid (non-transparent) background and card colors (no gradients, no transparency).

(function () {
  const THEMES = {
    dark: {
      '--bg1': '#071124',                 // page background (solid)
      '--accent': '#3ea0ff',
      '--text': '#eaf6ff',
      '--muted': '#9fb1c8',
      '--sidebar-bg': '#071124',
      '--sidebar-text': '#ffffff',
      '--card': '#0b1724',                // card background solid
      '--hamburger-line-color': '#eaf6ff'
    },
    light: { // light biru mode with dark text and dark hamburger lines
      '--bg1': '#eaf6ff',                 // solid light blue
      '--accent': '#0066cc',
      '--text': '#071624',                // dark text for contrast on light
      '--muted': '#5b6c7b',
      '--sidebar-bg': '#ffffff',
      '--sidebar-text': '#071624',
      '--card': '#ffffff',                // white cards
      '--hamburger-line-color': '#071624'
    },
    gold: {
      '--bg1': '#0f0b06',
      '--accent': '#ffd166',
      '--text': '#fff9f0',
      '--muted': '#e5d8c3',
      '--sidebar-bg': '#120c06',
      '--sidebar-text': '#fff9f0',
      '--card': '#1b130a',
      '--hamburger-line-color': '#ffffff'
    },
    emerald: {
      '--bg1': '#051a16',
      '--accent': '#28c98a',
      '--text': '#eafff4',
      '--muted': '#9fd7ba',
      '--sidebar-bg': '#041912',
      '--sidebar-text': '#eafff4',
      '--card': '#07221d',
      '--hamburger-line-color': '#eafff4'
    }
  };

  const THEME_ORDER = Object.keys(THEMES);
  const STORAGE_KEY = 'selectedTheme';

  // applyThemeToDocument is intentionally global so other modules can call it
  window.applyThemeToDocument = function applyThemeToDocument(themeName) {
    try {
      if (!themeName || !THEMES[themeName]) themeName = 'dark';
      const theme = THEMES[themeName];

      // set CSS variables on :root
      const root = document.documentElement;
      Object.entries(theme).forEach(([k, v]) => root.style.setProperty(k, v));

      // set attribute for styling hooks / accessibility
      root.setAttribute('data-theme', themeName);

      // persist selection
      try { localStorage.setItem(STORAGE_KEY, themeName); } catch (e) { /* ignore */ }

      // Emit events so other modules can react
      document.dispatchEvent(new Event('themeChanged'));
      document.dispatchEvent(new CustomEvent('themeApplied', { detail: { theme: themeName } }));

      return themeName;
    } catch (err) {
      console.error('applyThemeToDocument failed', err);
      return null;
    }
  };

  // cycleTheme: next in THEME_ORDER
  function cycleTheme() {
    const current = localStorage.getItem(STORAGE_KEY) || document.documentElement.getAttribute('data-theme') || 'dark';
    const idx = THEME_ORDER.indexOf(current);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    const applied = window.applyThemeToDocument(next);
    if (applied) {
      showToast && showToast(`Mode: ${applied}`);
    }
  }

  // attach theme button
  function attachThemeButton() {
    const btn = document.getElementById('themeBtn');
    if (!btn) return;
    btn.setAttribute('data-hint', 'Ganti mode (klik untuk berganti).'); // hint displayed by menu.js tooltip
    btn.addEventListener('click', () => cycleTheme());
    // right click cycles backwards
    btn.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      const current = localStorage.getItem(STORAGE_KEY) || document.documentElement.getAttribute('data-theme') || 'dark';
      const idx = THEME_ORDER.indexOf(current);
      const prev = THEME_ORDER[(idx - 1 + THEME_ORDER.length) % THEME_ORDER.length];
      const applied = window.applyThemeToDocument(prev);
      if (applied) showToast && showToast(`Mode: ${applied}`);
    });
  }

  // immediate init to apply saved theme ASAP (minimize flicker)
  function init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
      window.applyThemeToDocument(saved);
    } catch (e) {
      console.warn('theme init failed', e);
    }
  }

  init();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachThemeButton);
  } else {
    attachThemeButton();
  }

  // expose utility to get current theme
  window.getCurrentTheme = function () {
    return document.documentElement.getAttribute('data-theme') || localStorage.getItem(STORAGE_KEY) || 'dark';
  };

})();