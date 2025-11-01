// js/menu.js
// - Mengatur perilaku hamburger/sidebar, caret untuk submenu kontak, dan About modal.
// - Perbaikan: memastikan warna hamburger menyesuaikan tema, menutup menu on outside click, dan memperbaiki toggling modal.

document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.getElementById('hamburgerMenu');
  const sideMenu = document.getElementById('sideMenu');
  const caret = document.getElementById('contactCaret');
  const submenu = document.getElementById('contactSubmenu');
  const aboutModal = document.getElementById('aboutModal');
  const closeAbout = document.getElementById('closeAbout');
  let menuOpen = false;
  let submenuOpen = false;

  // Theme bubbles (if any)
  document.querySelectorAll('.theme-bubble').forEach(bubble => {
    bubble.addEventListener('click', () => {
      const theme = bubble.getAttribute('data-theme') || 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('selectedTheme', theme);
      if (typeof applyThemeToDocument === 'function') applyThemeToDocument(theme);
      updateHamburgerColor();
      document.dispatchEvent(new Event('themeChanged'));
    });
  });

  // Apply saved theme if available
  const savedTheme = localStorage.getItem('selectedTheme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (typeof applyThemeToDocument === 'function') applyThemeToDocument(savedTheme);

  function updateHamburgerColor() {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const spans = document.querySelectorAll('#hamburgerMenu span');
    let color = '#eaf6ff';
    if (theme === 'light') color = '#ffffff';
    if (theme === 'gold') color = '#1b1b1b';
    if (theme === 'emerald') color = '#053827';
    spans.forEach(s => { s.style.backgroundColor = color; s.style.boxShadow = '0 1px 0 rgba(0,0,0,0.12)'; });
    const sb = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-bg').trim();
    if (sb && sideMenu) sideMenu.style.background = sb;
  }
  updateHamburgerColor();
  document.addEventListener('themeChanged', updateHamburgerColor);
  document.addEventListener('themeApplied', updateHamburgerColor);

  // Toggle sidebar: simpler behavior — on open hide hamburger (if desired), on close show it back.
  hamburger?.addEventListener('click', (e) => {
    e.stopPropagation();
    try { e.currentTarget.blur(); } catch (err) {}

    menuOpen = !menuOpen;
    if (menuOpen) {
      sideMenu?.classList.add('show');
      hamburger?.classList.add('active');
      hamburger?.classList.add('hidden');
      document.body.style.overflow = 'hidden';
    } else {
      sideMenu?.classList.remove('show');
      hamburger?.classList.remove('active');
      hamburger?.classList.remove('hidden');
      document.body.style.overflow = '';
      submenu?.classList.remove('show');
      caret && (caret.innerHTML = "&#9660;");
      submenuOpen = false;
      submenu?.setAttribute('aria-hidden','true');
    }
  });

  // Close sidebar on click outside
  document.addEventListener('click', function(e) {
    if (menuOpen && sideMenu && !sideMenu.contains(e.target) && e.target !== hamburger) {
      sideMenu.classList.remove('show');
      hamburger?.classList.remove('active');
      menuOpen = false;
      hamburger?.classList.remove('hidden');
      document.body.style.overflow = '';
      submenu?.classList.remove('show');
      caret && (caret.innerHTML = "&#9660;");
      submenuOpen = false;
      submenu?.setAttribute('aria-hidden','true');
    }
  });

  // ESC to close
  window.addEventListener('keydown', function(e){
    if (e.key === "Escape") {
      if (menuOpen) {
        sideMenu?.classList.remove('show');
        hamburger?.classList.remove('active');
        menuOpen = false;
        hamburger?.classList.remove('hidden');
        document.body.style.overflow = '';
        submenu?.classList.remove('show');
        caret && (caret.innerHTML = "&#9660;");
        submenuOpen = false;
        submenu?.setAttribute('aria-hidden','true');
      }
      if (aboutModal?.classList.contains('show')) {
        aboutModal.classList.remove('show');
        document.body.style.overflow = '';
      }
    }
  });

  // Contact caret toggle
  caret?.addEventListener('click', function(e){
    e.stopPropagation();
    submenuOpen = !submenuOpen;
    if (submenuOpen) {
      submenu?.classList.add('show');
      caret && (caret.innerHTML = "&#9650;");
      submenu?.setAttribute('aria-hidden','false');
    } else {
      submenu?.classList.remove('show');
      caret && (caret.innerHTML = "&#9660;");
      submenu?.setAttribute('aria-hidden','true');
    }
  });

  // Prevent default navigation on Contact link
  const menuContact = document.getElementById('menuContact');
  if (menuContact) {
    menuContact.addEventListener('click', function(e){
      e.preventDefault();
      caret?.click();
    });
  }

  // Home action
  const menuHome = document.getElementById('menuHome');
  if (menuHome) {
    menuHome.addEventListener('click', function(e){
      e.preventDefault();
      sideMenu?.classList.remove('show');
      hamburger?.classList.remove('active');
      menuOpen=false;
      hamburger?.classList.remove('hidden');
      document.body.style.overflow = '';
      window.scrollTo({top:0,behavior:"smooth"});
    });
  }

  // About action (show modal)
  const menuAbout = document.getElementById('menuAbout');
  if (menuAbout) {
    menuAbout.addEventListener('click', function(e){
      e.preventDefault();
      sideMenu?.classList.remove('show'); hamburger?.classList.remove('active'); menuOpen=false;
      hamburger?.classList.remove('hidden');
      aboutModal.classList.add('show');
      aboutModal.setAttribute('aria-hidden','false');
      document.body.style.overflow = 'hidden';
    });
  }

  if (closeAbout) {
    closeAbout.addEventListener('click', function() {
      aboutModal.classList.remove('show');
      aboutModal.setAttribute('aria-hidden','true');
      document.body.style.overflow = '';
    });
  }

  // Close submenu when clicking one of its links
  if (submenu) {
    submenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function(){
        sideMenu?.classList.remove('show');
        hamburger?.classList.remove('active');
        menuOpen = false;
        submenu.classList.remove('show');
        caret && (caret.innerHTML = "&#9660;");
        submenuOpen = false;
        hamburger?.classList.remove('hidden');
        document.body.style.overflow = '';
      });
    });
  }
});
