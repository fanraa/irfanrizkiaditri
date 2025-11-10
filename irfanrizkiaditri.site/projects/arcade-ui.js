/* arcade-ui.js
   UI glue: binds DOM elements to FanraCore, handles fullscreen, overlays,
   revive/coin UI, toasts, and input behavior:
   - click/tap shoots (does NOT teleport)
   - drag moves player (no teleport on click)
   - 'f' toggles fullscreen
*/
(function () {
  function $id(id) { return document.getElementById(id); }
  const canvas = $id('gameCanvas');
  const gameBox = $id('gameBox');
  const gameCard = $id('gameCard');

  const fullscreenBtn = $id('fullscreenBtn');
  const fsMenu = $id('fsMenu');
  const fsElement = $id('fsElement');
  const fsDocument = $id('fsDocument');
  const exitFull = $id('exitFull');

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
  const levelEl = $id('level');
  const ammoEl = $id('ammo');
  const bossHpEl = $id('bossHp');
  const coinsStatEl = $id('coins');

  const core = window.FanraCore;

  // register UI handler to receive events from core
  core._registerUI((evt, data) => {
    if (evt === 'updateHUD') updateHUD(data);
    if (evt === 'toast') showToast(data);
    if (evt === 'offerRevive') offerRevive(data);
    if (evt === 'gameOver') showGameOver(data);
    if (evt === 'hideGameOver') hideGameOver();
  });

  // initialize core
  core.init();

  // initial HUD
  updateHUD(core.getHUD());

  // buttons
  playBtn.addEventListener('click', () => { core.startGame(false); startOverlay.classList.add('hidden'); startOverlay.classList.remove('visible'); });
  demoBtn.addEventListener('click', () => { core.startGame(true); startOverlay.classList.add('hidden'); startOverlay.classList.remove('visible'); });
  $id('startBtn').addEventListener('click', () => { core.startGame(false); startOverlay.classList.add('hidden'); });
  $id('pauseBtn').addEventListener('click', () => core.pauseToggle());
  $id('resetBtn').addEventListener('click', () => { core.resetGame(); startOverlay.classList.remove('hidden'); startOverlay.classList.add('visible'); });
  restartBtn.addEventListener('click', () => { core.startGame(false); hideGameOver(); });

  reviveBtn.addEventListener('click', () => { core.tryRevive(); });

  function updateHUD(hud) {
    if (!hud) hud = core.getHUD();
    scoreEl.textContent = hud.score;
    bestEl.textContent = hud.best;
    livesEl.textContent = hud.lives;
    levelEl.textContent = hud.level;
    ammoEl.textContent = hud.ammo;
    bossHpEl.textContent = hud.bossHp;
    coinCountEl.textContent = hud.coins;
    coinsStatEl && (coinsStatEl.textContent = hud.coins);
    reviveCostEl && (reviveCostEl.textContent = hud.reviveCost);
  }

  // toasts
  function showToast(msg, ms = 1200) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    gameBox.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  function offerRevive(data) {
    showGameOver(data);
  }

  function showGameOver(data) {
    finalScoreEl.textContent = data.score;
    finalBestEl.textContent = data.best;
    coinCountEl.textContent = data.coins;
    reviveCostEl.textContent = data.reviveCost;
    overOverlay.classList.remove('hidden'); overOverlay.classList.add('visible');
  }

  function hideGameOver() {
    overOverlay.classList.add('hidden'); overOverlay.classList.remove('visible');
  }

  // fullscreen controls
  fullscreenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fsMenu.style.display = fsMenu.style.display === 'flex' ? 'none' : 'flex';
  });
  fsElement.addEventListener('click', async () => { fsMenu.style.display = 'none'; await core.enterElementFullscreen(gameBox); exitFull.style.display = 'inline-block'; });
  fsDocument.addEventListener('click', async () => { fsMenu.style.display = 'none'; await core.enterElementFullscreen(document.documentElement); exitFull.style.display = 'inline-block'; });

  function hideFsMenu() { fsMenu.style.display = 'none'; }
  document.addEventListener('click', (e) => { if (!fsMenu.contains(e.target) && e.target !== fullscreenBtn) hideFsMenu(); });

  exitFull.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    core.leaveElementFullscreen(gameBox);
    exitFull.style.display = 'none';
  });
  document.addEventListener('fullscreenchange', () => {
    exitFull.style.display = document.fullscreenElement || gameBox.classList.contains('full-game') ? 'inline-block' : 'none';
    fullscreenBtn.textContent = document.fullscreenElement ? '▢' : '▢';
    core.resizeCanvas();
  });

  // keyboard fullscreen shortcut 'f'
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      // toggle element fullscreen
      if (!document.fullscreenElement && !gameBox.classList.contains('full-game')) {
        core.enterElementFullscreen(gameBox).then(()=>{ exitFull.style.display='inline-block'; }).catch(()=>{});
      } else {
        if (document.fullscreenElement) document.exitFullscreen();
        if (gameBox.classList.contains('full-game')) core.leaveElementFullscreen(gameBox);
      }
    }
  });

  // input: drag vs click behavior
  // - pointerdown starts potential drag
  // - pointermove with movement > threshold becomes drag and moves player (calls core.setPlayerX)
  // - pointerup without significant move counts as click -> triggers shoot (call core.fireBullet)
  let pointerDown = false;
  let startX = 0, startY = 0, moved = false;
  const DRAG_THRESHOLD = 8;

  canvas.addEventListener('pointerdown', (e) => {
    pointerDown = true; moved = false;
    startX = e.clientX; startY = e.clientY;
    // Do NOT move player immediately. Shooting handled by core's mousedown (it calls fireBullet()).
    // Prevent default on touch so mousedown in core gets handled properly
    if (e.pointerType === 'touch') e.preventDefault();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointerDown) return;
    const dx = Math.abs(e.clientX - startX), dy = Math.abs(e.clientY - startY);
    if (!moved && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) moved = true;
    if (moved) {
      // perform drag: convert pointer x to game coord and set player x via core API
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (800 / rect.width);
      core.setPlayerX(mx);
    }
  });

  window.addEventListener('pointerup', (e) => {
    if (!pointerDown) return;
    pointerDown = false;
    if (!moved) {
      // treat as click: call core.fireBullet() (core also triggers on mousedown, but calling again is okay)
      core.fireBullet();
    }
    moved = false;
  });

  // Ensure initial HUD shows
  updateHUD(core.getHUD());

  // expose small helpers
  window._FanraUI = { showToast, updateHUD };

  // done
})();