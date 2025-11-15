/* arcade-ui.js
   UI glue: binds DOM elements to FanraCore, handles fullscreen, overlays,
   revive/coin UI, toasts, and input behavior.
   
   [VERSI PERBAIKAN BUG]
   - Logika 'pointerdown', 'pointermove', 'pointerup' diperbaiki total.
   - Logika 'fullscreenBtn' diubah HANYA menggunakan CSS class.
   - Menambahkan listener untuk UI Login
*/
(function () {
  function $id(id) { return document.getElementById(id); }
  const canvas = $id('gameCanvas');
  const gameBox = $id('gameBox');
  const gameCard = $id('gameCard');

  const fullscreenBtn = $id('fullscreenBtn');

  const startOverlay = $id('startOverlay');
  const overOverlay = $id('overOverlay');
  const playBtn = $id('playBtn');
  const demoBtn = $id('demoBtn');
  const restartBtn = $id('restartBtn');
  const reviveBtn = $id('reviveBtn');
  const finalScoreEl = $id('finalScore');
  const finalBestEl = $id('finalBest');
  const coinCountEl = $id('coinCount');
  const reviveCostEl = $id('reviveCost');

  const scoreEl = $id('score');
  const bestEl = $id('best');
  const livesEl = $id('lives');
  const ammoCountEl = $id('ammoCount');

  const pauseBtn = $id('pauseBtn');
  const resetBtn = $id('resetBtn');

  // Elemen Menu Jeda
  const pauseOverlay = $id('pauseOverlay');
  const pauseResumeBtn = $id('pauseResumeBtn');
  const pauseRestartBtn = $id('pauseRestartBtn');
  const pauseShopBtn = $id('pauseShopBtn');
  const pauseQuitBtn = $id('pauseQuitBtn');
  
  // Elemen Toko
  const shopBtnStart = $id('shopBtnStart');
  const shopBtnOver = $id('shopBtnOver');
  const shopOverlay = $id('shopOverlay');
  const closeShopBtn = $id('closeShopBtn');
  
  // Elemen Login
  const loginBtn = $id('loginBtn'); // Tombol di leaderboard
  const loginOverlay = $id('loginOverlay');

  let core = window.FanraCore;
  if (!core) {
    console.error('FanraCore not loaded!');
    return;
  }
  core._registerUI(handleCoreEvent);

  // === Event Listeners ===

  playBtn.addEventListener('click', () => core.startGame(false));
  demoBtn.addEventListener('click', () => core.startGame(true));
  restartBtn.addEventListener('click', () => core.startGame(false));
  reviveBtn.addEventListener('click', () => {
    if (!core.tryRevive()) {
      showToast('Koin tidak cukup!', 'danger');
    }
  });

  pauseBtn.addEventListener('click', () => core.pauseToggle());
  resetBtn.addEventListener('click', () => core.resetGame());

  // [PERBAIKAN BUG FULLSCREEN]
  fullscreenBtn.addEventListener('click', () => {
    if (gameBox.classList.contains('full-game')) {
      core.exitFullscreen(gameBox);
    } else {
      core.enterElementFullscreen(gameBox);
    }
  });

  // Listener Menu Jeda
  pauseResumeBtn.addEventListener('click', () => core.pauseToggle());
  pauseRestartBtn.addEventListener('click', () => core.startGame(false));
  pauseQuitBtn.addEventListener('click', () => core.quitToMenu());
  pauseShopBtn.addEventListener('click', () => {
    pauseOverlay.classList.remove('active');
    openShop(true); // 'true' = dari menu jeda
  });


  // Event Listener untuk Toko
  function openShop(fromPause = false) {
    startOverlay.classList.remove('active');
    overOverlay.classList.remove('active');
    shopOverlay.classList.add('active');
    
    shopOverlay.dataset.fromPause = fromPause; 
    
    if (window.Shop) window.Shop.render();
  }
  shopBtnStart.addEventListener('click', () => openShop(false));
  shopBtnOver.addEventListener('click', () => openShop(false));
  
  // [PERBAIKAN] Logika tombol tutup toko
  closeShopBtn.addEventListener('click', () => {
    shopOverlay.classList.remove('active');
    
    if (shopOverlay.dataset.fromPause === 'true') {
      pauseOverlay.classList.add('active');
    } else {
      const coreHUD = window.FanraCore ? window.FanraCore.getHUD() : { lives: 3, score: 0 };
      if (coreHUD.lives > 0 && coreHUD.score === 0) {
         startOverlay.classList.add('active');
      } 
      else if (coreHUD.lives <= 0) {
         overOverlay.classList.add('active');
      }
      else {
         core.pauseToggle(); // Jeda game jika ditutup saat main
      }
    }
  });

  // [FITUR BARU] Listener untuk UI Login
  if (window.Auth) {
    window.Auth.initAuthUI();
  }


  // === Core Event Handler ===
  function handleCoreEvent(evt, data) {
    switch (evt) {
      case 'gameStart':
        startOverlay.classList.remove('active');
        overOverlay.classList.remove('active');
        shopOverlay.classList.remove('active');
        pauseOverlay.classList.remove('active');
        pauseBtn.textContent = 'Jeda';
        break;
      case 'gameOver':
        finalScoreEl.textContent = data.score;
        finalBestEl.textContent = data.best;
        reviveCostEl.textContent = `(${data.cost})`;
        reviveBtn.disabled = data.coins < data.cost;
        overOverlay.classList.add('active');
        break;
      case 'updateHUD':
        scoreEl.textContent = data.score;
        bestEl.textContent = data.best;
        livesEl.innerHTML = `&times;${data.lives}`;
        ammoCountEl.textContent = data.ammo;
        coinCountEl.textContent = data.coins;
        break;
      case 'pause':
        pauseOverlay.classList.toggle('active', data);
        pauseBtn.textContent = data ? 'Lanjut' : 'Jeda';
        break;
      case 'gameReset':
        startOverlay.classList.add('active');
        overOverlay.classList.remove('active');
        shopOverlay.classList.remove('active');
        pauseOverlay.classList.remove('active');
        showToast('Game direset!', 'success');
        if (window.Shop) window.Shop.reset();
        break;
      case 'spawnPowerup':
        showToast(data.name, 'powerup');
        break;
    }
  }

  // === Helper Functions ===
  function showToast(message, type = 'info') {
    let toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    gameCard.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  (function () {
    let style = document.createElement('style');
    style.innerHTML = `
      .toast {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translate(-50%, 20px);
        background: var(--card);
        color: var(--text);
        padding: 10px 16px;
        border-radius: 8px;
        border: 1px solid var(--card-border);
        box-shadow: 0 4px 10px rgba(0,0,0,.3);
        z-index: 200;
        opacity: 0;
        transition: .3s ease;
      }
      .toast.danger { border-left: 4px solid var(--danger); }
      .toast.success { border-left: 4px solid var(--success); }
      .toast.powerup { border-left: 4px solid var(--accent); }
    `;
    document.head.appendChild(style);
  })();

  // === Advanced Input Handling (untuk UI) ===
  let pointerDown = false;
  let startX = 0, startY = 0, moved = false;
  const DRAG_THRESHOLD = 8;

  // [PERBAIKAN TOTAL BUG FULLSCREEN & HP]
  
  // 1. Mouse Follow (Desktop)
  canvas.addEventListener('mousemove', (e) => {
    // Hanya gerak jika pointer TIDAK ditekan dan bukan sentuhan
    if (!pointerDown && e.pointerType === 'mouse') {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (800 / rect.width);
      core.setPlayerX(mx);
    }
  });

  // 2. Touch/Drag/Click
  canvas.addEventListener('pointerdown', (e) => {
    if (e.target !== canvas) return;
    
    pointerDown = true; 
    moved = false;
    startX = e.clientX; 
    startY = e.clientY;
    
    if (e.pointerType === 'touch') {
      e.preventDefault();
      // Langsung gerakkan ke posisi sentuh
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (800 / rect.width);
      core.setPlayerX(mx);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointerDown) return;
    
    const dx = Math.abs(e.clientX - startX), dy = Math.abs(e.clientY - startY);
    if (!moved && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
      moved = true;
    }

    // Gerakkan player saat di-drag (sentuh atau mouse)
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (800 / rect.width);
    core.setPlayerX(mx);
  });

  window.addEventListener('pointerup', (e) => {
    if (!pointerDown) return;
    pointerDown = false;
    
    // Tembak HANYA jika tidak di-drag
    if (!moved) { 
      core.fireBullet();
    }
  });

})();