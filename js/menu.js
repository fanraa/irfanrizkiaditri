// js/menu.js
// Perubahan: ketika membuka submenu (kontak / tools) kita atur max-height
// dinamis sesuai ruang viewport sehingga submenu menjadi scrollable.
// Juga menyesuaikan pada resize dan ketika sidebar dibuka/ditutup.

document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.getElementById('hamburgerMenu');
  const sideMenu = document.getElementById('sideMenu');
  const caret = document.getElementById('contactCaret');
  const submenu = document.getElementById('contactSubmenu');
  const aboutModal = document.getElementById('aboutModal');
  const closeAbout = document.getElementById('closeAbout');
  const toolsCaret = document.getElementById('toolsCaret');
  const toolsSubmenu = document.getElementById('toolsSubmenu');

  const menuSync = document.getElementById('syncNow');
  const menuExport = document.getElementById('exportLocal');
  const menuClear = document.getElementById('clearLocal');
  const menuToggleOffline = document.getElementById('toggleOfflineMode');

  let menuOpen = false;
  let submenuOpen = false;
  let toolsOpen = false;

  // shared tooltip (existing implementation may call this)
  const tooltip = document.getElementById('miniTooltip'); // menu.js versi Anda sebelumnya membuat ini
  // helper: set usable max-height for a submenu element so it doesn't overflow viewport
  function setSubmenuMaxHeight(el) {
    if (!el) return;
    try {
      // compute space below the top of the submenu to bottom of viewport
      const rect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.top - 20; // 20px padding from bottom
      // also ensure it doesn't exceed a sensible upper bound (e.g. 80vh)
      const max = Math.max(120, Math.min(spaceBelow, Math.round(window.innerHeight * 0.82)));
      el.style.maxHeight = max + 'px';
      el.style.overflowY = 'auto';
    } catch (e) {
      // fallback to CSS default if something goes wrong
      el.style.maxHeight = '';
      el.style.overflowY = 'auto';
    }
  }

  function clearSubmenuMaxHeight(el) {
    if (!el) return;
    el.style.maxHeight = '';
    // keep overflowY at auto so if CSS fallback present it's scrollable
    el.style.overflowY = 'auto';
  }

  // update color and sidebar background per theme variables (unchanged logic)
  function updateHamburgerColor() {
    try {
      if (!sideMenu) return;
      const computed = getComputedStyle(document.documentElement);
      const sb = computed.getPropertyValue('--sidebar-bg').trim();
      if (sb) sideMenu.style.background = sb;
      const sidebarText = computed.getPropertyValue('--sidebar-text').trim();
      if (sidebarText) {
        sideMenu.querySelectorAll('a').forEach(a => a.style.color = sidebarText || '');
      }
      const hamburgerColor = computed.getPropertyValue('--hamburger-line-color').trim();
      if (hamburger && hamburgerColor) {
        const spans = hamburger.querySelectorAll('span');
        spans.forEach(s => s.style.backgroundColor = hamburgerColor || '');
      }
      const hbBg = computed.getPropertyValue('--hamburger-bg')?.trim();
      if (hbBg && hamburger) hamburger.style.background = hbBg;
    } catch (e) {}
  }

  // attach hints already present in your previous implementation
  function attachHints(root = document) {
    root.querySelectorAll('[data-hint]').forEach(el => {
      if (el.__hintAttached) return;
      el.__hintAttached = true;
      el.addEventListener('mouseenter', (ev) => {
        const rect = el.getBoundingClientRect();
        const text = el.getAttribute('data-hint');
        if (text) {
          const mini = document.getElementById('miniTooltip');
          if (mini) {
            mini.textContent = text;
            mini.style.left = (ev.clientX + 12) + 'px';
            mini.style.top = (ev.clientY + 12) + 'px';
            mini.style.opacity = '1';
            mini.style.transform = 'translateY(0)';
          }
        }
      });
      el.addEventListener('mousemove', (ev) => {
        const mini = document.getElementById('miniTooltip');
        if (mini) {
          mini.style.left = (ev.clientX + 12) + 'px';
          mini.style.top = (ev.clientY + 12) + 'px';
        }
      });
      el.addEventListener('mouseleave', () => {
        const mini = document.getElementById('miniTooltip');
        if (mini) {
          mini.style.opacity = '0';
          mini.style.transform = 'translateY(-6px)';
        }
      });
    });
  }

  // initial wiring
  updateHamburgerColor();
  attachHints(document);
  document.addEventListener('themeChanged', updateHamburgerColor);
  document.addEventListener('themeApplied', updateHamburgerColor);

  // Toggle sidebar
  hamburger?.addEventListener('click', (e) => {
    e.stopPropagation();
    try { e.currentTarget.blur(); } catch (err) {}
    menuOpen = !menuOpen;
    if (menuOpen) {
      sideMenu?.classList.add('show');
      hamburger?.classList.add('active');
      hamburger?.classList.add('hidden');
      document.body.style.overflow = 'hidden';
      // if there are submenus already visible, recompute heights
      setTimeout(() => {
        setSubmenuMaxHeight(submenu);
        setSubmenuMaxHeight(toolsSubmenu);
      }, 80);
    } else {
      sideMenu?.classList.remove('show');
      hamburger?.classList.remove('active');
      hamburger?.classList.remove('hidden');
      document.body.style.overflow = '';
      submenu?.classList.remove('show');
      caret && (caret.innerHTML = "&#9660;");
      submenuOpen = false;
      submenu?.setAttribute('aria-hidden','true');
      clearSubmenuMaxHeight(submenu);
      toolsSubmenu?.classList.remove('show');
      toolsCaret && (toolsCaret.innerHTML = "&#9660;");
      toolsOpen = false;
      clearSubmenuMaxHeight(toolsSubmenu);
    }
  });

  // Close on outside click
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
      clearSubmenuMaxHeight(submenu);
      toolsSubmenu?.classList.remove('show');
      toolsCaret && (toolsCaret.innerHTML = "&#9660;");
      toolsOpen = false;
      clearSubmenuMaxHeight(toolsSubmenu);
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
        clearSubmenuMaxHeight(submenu);
      }
      if (aboutModal?.classList.contains('show')) {
        aboutModal.classList.remove('show');
        document.body.style.overflow = '';
      }
    }
  });

  // Contact caret toggle - now set max-height when shown
  caret?.addEventListener('click', function(e){
    e.stopPropagation();
    submenuOpen = !submenuOpen;
    if (submenuOpen) {
      submenu?.classList.add('show');
      caret && (caret.innerHTML = "&#9650;");
      submenu?.setAttribute('aria-hidden','false');
      // compute usable max-height
      setSubmenuMaxHeight(submenu);
    } else {
      submenu?.classList.remove('show');
      caret && (caret.innerHTML = "&#9660;");
      submenu?.setAttribute('aria-hidden','true');
      clearSubmenuMaxHeight(submenu);
    }
  });

  // Tools caret toggle (if exists)
  toolsCaret?.addEventListener('click', function(e){
    e.stopPropagation();
    toolsOpen = !toolsOpen;
    if (toolsOpen) {
      toolsSubmenu?.classList.add('show');
      toolsCaret && (toolsCaret.innerHTML = "&#9650;");
      toolsSubmenu?.setAttribute('aria-hidden','false');
      setSubmenuMaxHeight(toolsSubmenu);
    } else {
      toolsSubmenu?.classList.remove('show');
      toolsCaret && (toolsCaret.innerHTML = "&#9660;");
      toolsSubmenu?.setAttribute('aria-hidden','true');
      clearSubmenuMaxHeight(toolsSubmenu);
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
        clearSubmenuMaxHeight(submenu);
      });
    });
  }

  // Tools handlers wiring (ke fungsi yang Anda miliki)
  if (menuSync) { menuSync.addEventListener('click', (e) => { e.preventDefault(); if (typeof doSyncNow === 'function') doSyncNow(); else { /* fallback */ if (typeof syncPendingPosts === 'function') syncPendingPosts(); showToast('Sinkronisasi dipicu.'); } }); menuSync.setAttribute('data-hint','Sinkronkan data lokal ke server sekarang.'); }
  if (menuExport) { menuExport.addEventListener('click', (e) => { e.preventDefault(); if (typeof doExportLocal === 'function') doExportLocal(); else { showToast('Export data (fallback)'); } }); menuExport.setAttribute('data-hint','Unduh data lokal (backup).'); }
  if (menuClear) { menuClear.addEventListener('click', (e) => { e.preventDefault(); if (typeof doClearLocal === 'function') doClearLocal(); else { showToast('Clear lokal (fallback)'); } }); menuClear.setAttribute('data-hint','Hapus cache lokal (localStorage & pending).'); }
  if (menuToggleOffline) { menuToggleOffline.addEventListener('click', (e) => { e.preventDefault(); if (typeof doToggleOffline === 'function') doToggleOffline(); else { const cur = sessionStorage.getItem('irfan_editor_v2')==='1'; if (cur) { sessionStorage.removeItem('irfan_editor_v2'); showToast('Creator mode OFF'); } else { sessionStorage.setItem('irfan_editor_v2','1'); showToast('Creator mode ON'); } } }); menuToggleOffline.setAttribute('data-hint','Toggle mode creator (offline testing).'); }

  // On resize / orientation change, recompute visible submenu height
  window.addEventListener('resize', () => {
    if (submenu && submenu.classList.contains('show')) setSubmenuMaxHeight(submenu);
    if (toolsSubmenu && toolsSubmenu.classList.contains('show')) setSubmenuMaxHeight(toolsSubmenu);
  });

  // If page scrolled or content moves, ensure tooltip/hints won't linger
  window.addEventListener('scroll', () => {
    const mini = document.getElementById('miniTooltip');
    if (mini) { mini.style.opacity = '0'; mini.style.transform = 'translateY(-6px)'; }
  }, { passive: true });

});