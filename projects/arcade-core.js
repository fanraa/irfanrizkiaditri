/* arcade-core.js
   [VERSI PERBAIKAN BUG KOIN & TEMBAK]
   - addCoins(0) sekarang 'refresh' koin dari localStorage.
   - Tombol tembak: 'e', 'c', dan ' ' (Spasi).
   - Logika Menu Jeda diperbaiki.
   - gameOver memanggil Auth.saveScore()
*/

(function () {
  const BASE_W = 800, BASE_H = 480;
  let DPR = 1;

  let canvas, ctx, gameBox;

  const player = { 
    x: BASE_W / 2, y: BASE_H - 48, w: 44, h: 22, 
    speed: 5, 
    vx: 0, invUntil: 0, 
    fireRate: 20, 
    bulletDamage: 1,
    maxAmmo: 100,
    drawFunc: null
  };
  
  const MAX_LIVES = 5;
  
  let obstacles = [];
  let bullets = [];
  let enemyBullets = [];
  let powerups = [];
  let particles = [];

  let frames = 0;
  let score = 0;
  let best = parseInt(localStorage.getItem('fanra_best') || '0', 10) || 0;
  let lives = 3;
  let level = 1;
  let running = false;
  let paused = false;
  let demoMode = false;
  let scoreForNextLife = 100;

  let spawnAcc = 0;
  let lastTS = performance.now();
  let boss = null;
  let ammo = 100;
  let lastShot = 0;
  
  let coins = parseInt(localStorage.getItem('fanra_coins') || '0', 10);
  function saveCoins() {
    localStorage.setItem('fanra_coins', coins.toString());
  }

  let reviveUses = 0;
  const REVIVE_BASE_COST = 100;

  let moveLeft = false, moveRight = false, touchActive = false;
  let mouseX = BASE_W / 2;

  let uiHandler = null;
  function notifyUI(evt, data) { if (uiHandler) uiHandler(evt, data); }
  function registerUI(fn) { uiHandler = fn; }

  function init(gameCanvas, boxElement) {
    canvas = gameCanvas;
    ctx = canvas.getContext('2d');
    gameBox = boxElement;
    resizeCanvas();
    setupInput();

    best = parseInt(localStorage.getItem('fanra_best') || '0', 10);
    coins = parseInt(localStorage.getItem('fanra_coins') || '0', 10);

    notifyUI('updateHUD', getHUD());
    requestAnimationFrame(gameLoop);
  }

  function startGame(isDemo) {
    demoMode = isDemo;
    running = true;
    paused = false;
    frames = 0;
    score = 0;
    lives = 3;
    level = 1;
    reviveUses = 0;
    spawnAcc = 0;
    scoreForNextLife = 100;
    
    obstacles = [];
    bullets = [];
    enemyBullets = [];
    powerups = [];
    particles = [];
    boss = null;
    
    player.x = BASE_W / 2;
    player.invUntil = frames + 100;

    if (window.Shop) {
      const stats = window.Shop.getPlayerStats();
      player.speed = stats.speed;
      player.fireRate = stats.fireRate;
      player.bulletDamage = stats.damage;
      player.drawFunc = stats.drawFunc;
      player.maxAmmo = stats.maxAmmo;
      ammo = stats.ammo;
    } else {
      player.speed = 5; player.fireRate = 20; player.bulletDamage = 1;
      player.maxAmmo = 100; ammo = 100; player.drawFunc = null;
    }
    
    if (window.Shop) {
      window.Shop.consumeItems();
    }

    for (let i = 0; i < 50; i++) {
      spawnObstacle('star', Math.random() * BASE_W, Math.random() * BASE_H);
    }

    notifyUI('gameStart');
    notifyUI('updateHUD', getHUD());
  }

  function gameOver() {
    running = false;
    demoMode = false;
    if (score > best) {
      best = score;
      localStorage.setItem('fanra_best', best.toString());
    }
    
    // [FITUR BARU] Coba simpan skor ke Papan Peringkat
    if (window.Auth) {
      window.Auth.saveScore(score);
    }
    
    notifyUI('gameOver', { score, best, coins, cost: (REVIVE_BASE_COST * (reviveUses + 1)) });
  }

  function resetGame() {
    if (confirm('Anda yakin ingin mereset semua kemajuan (skor terbaik, koin, DAN skin/upgrade)?')) {
      localStorage.removeItem('fanra_best');
      localStorage.removeItem('fanra_coins');
      best = 0;
      coins = 0;
      score = 0;
      lives = 3;
      ammo = 100;
      running = false;
      
      if (window.Shop) window.Shop.reset();
      
      notifyUI('gameReset');
      notifyUI('updateHUD', {score: 0, best: 0, lives: 3, ammo: 100, coins: 0});
    }
  }

  function tryRevive() {
    const cost = REVIVE_BASE_COST * (reviveUses + 1);
    if (coins >= cost) {
      coins -= cost;
      saveCoins();
      
      lives = 3;
      ammo = Math.min(player.maxAmmo, Math.max(ammo, 50));
      player.invUntil = frames + 180;
      reviveUses++;
      running = true;
      
      obstacles = obstacles.filter(o => o.type === 'star');
      enemyBullets = [];
      
      notifyUI('gameStart');
      notifyUI('updateHUD', getHUD());
      return true;
    }
    return false;
  }

  function getHUD() {
    return { score, best, lives, ammo, coins };
  }

  function gameLoop(ts) {
    requestAnimationFrame(gameLoop);
    const dt = Math.min((ts - lastTS) / 1000, 1 / 20) * 60;
    lastTS = ts;

    if (!running || paused) return;

    frames++;
    
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    update(dt);
    draw();
  }

  function update(dt) {
    const difficultyFactor = 1 + (score / 500) * 0.1;
    
    // 1. Update Spawning
    spawnAcc += dt;
    const spawnThreshold = Math.max(10, 30 / difficultyFactor);
    
    if (spawnAcc > spawnThreshold) {
      spawnAcc = 0;
      const x = Math.random() * BASE_W;
      const r = Math.random();
      
      if (r < 0.8) {
        spawnObstacle('rock', x, 0, difficultyFactor);
      } else {
        Math.random() < 0.5 ? spawnObstacle('coin', x) : spawnObstacle('ammo', x);
      }
    }
    if (frames % 10 === 0) spawnObstacle('star', Math.random() * BASE_W, 0);

    // 2. Update Player
    player.vx = 0;
    if (demoMode) {
      // (logika demo)
    } else if (touchActive) {
      // (logika touch - dikontrol oleh UI)
    } else {
      if (moveLeft) player.vx = -player.speed;
      if (moveRight) player.vx = player.speed;
    }
    player.x += player.vx * dt;
    player.x = Math.max(player.w / 2, Math.min(BASE_W - player.w / 2, player.x));

    // 3. Update Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.y += o.speed * dt;
      
      if (o.type === 'rock' && !o.scored && o.y > player.y + player.h) {
        o.scored = true;
        addScore(1);
      }
      
      if (o.y > BASE_H + o.size) {
        obstacles.splice(i, 1);
      }
    }

    // 4. Update Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.y -= b.speed * dt;
      if (b.y < -b.h) {
        bullets.splice(i, 1);
      }
    }

    // 5. Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
    
    checkHits();
  }

  function draw() {
    // 1. Gambar Bintang
    ctx.fillStyle = '#555';
    obstacles.filter(o => o.type === 'star').forEach(o => {
      ctx.fillRect(o.x, o.y, o.size, o.size);
    });

    // 2. Gambar Rintangan (Batu)
    ctx.fillStyle = '#9da3b3';
    obstacles.filter(o => o.type === 'rock').forEach(o => {
      ctx.fillRect(o.x - o.size / 2, o.y - o.size / 2, o.size, o.size);
      if (o.health < o.maxHealth) {
        ctx.fillStyle = 'red';
        ctx.fillRect(o.x - o.size / 2, o.y - o.size / 2 - 5, o.size * (o.health / o.maxHealth), 3);
        ctx.fillStyle = '#9da3b3';
      }
    });

    // 3. Gambar Powerups
    obstacles.filter(o => o.type !== 'star' && o.type !== 'rock').forEach(o => {
      ctx.fillStyle = o.color || '#FFF';
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.size / 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Gambar Peluru
    ctx.fillStyle = '#FFF';
    bullets.forEach(b => {
      ctx.fillRect(b.x - b.w / 2, b.y, b.w, b.h);
    });

    // 5. Gambar Partikel
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / 60);
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1.0;
    });

    drawPlayer();
  }

  function drawPlayer() {
    if (player.invUntil > frames) {
      if (Math.floor((player.invUntil - frames) / 6) % 2 === 0) return;
    }
    
    if (player.drawFunc) {
      player.drawFunc(ctx, player.x, player.y, player.w, player.h);
    } else {
      // Fallback
      ctx.fillStyle = '#4fa3ff';
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(player.x - player.w / 2, player.y + player.h);
      ctx.lineTo(player.x + player.w / 2, player.y + player.h);
      ctx.closePath();
      ctx.fill();
    }
  }

  function fireBullet() {
    if (!running || demoMode || ammo <= 0 || (frames - lastShot < player.fireRate)) return;
    
    ammo--;
    lastShot = frames;
    bullets.push({ 
      x: player.x, y: player.y, w: 5, h: 10, speed: 8,
      damage: player.bulletDamage 
    });
    
    notifyUI('updateHUD', getHUD());
  }
  
  function addPowerup(type, x, y) {
    let name = '';
    if (type === 'coin') {
      coins += 10;
      saveCoins();
      name = '+10 Koin';
    } else if (type === 'ammo') {
      if (ammo < player.maxAmmo) {
        ammo = Math.min(player.maxAmmo, ammo + 25);
        name = '+25 Amunisi';
      } else {
        name = 'Amunisi Penuh';
      }
    } else if (type === 'life') {
      if (lives < MAX_LIVES) {
        lives++;
        name = '+1 Nyawa';
      } else {
        name = 'Nyawa Penuh';
      }
    }
    addParticles(x, y, 10, '#FFF');
    notifyUI('updateHUD', getHUD());
    notifyUI('spawnPowerup', { name });
  }

  function spawnObstacle(type, x, y = 0, difficulty = 1) {
    let speed = 2;
    let size = 10;
    let color = '#FFF';
    let health = 1;

    if (type === 'star') {
      speed = Math.random() * 1 + 0.5;
      size = Math.random() * 2 + 1;
      x = x || Math.random() * BASE_W;
      y = y || 0;
    } else if (type === 'rock') {
      speed = (Math.random() * 2 + 2) * difficulty;
      size = Math.random() * 20 + 20;
      x = x || Math.random() * (BASE_W - size) + size / 2;
      y = -size;
      health = Math.floor(size / 8);
    } else {
      speed = 3;
      size = 15;
      y = -size;
      if (type === 'coin') color = '#f59e0b';
      else if (type === 'ammo') color = '#4fa3ff';
      else if (type === 'life') color = '#ef4444';
    }
    
    obstacles.push({ type, x, y, speed, size, color, health, maxHealth: health, scored: false });
  }

  function checkHits() {
    // Cek peluru kena rintangan
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      for (let j = obstacles.length - 1; j >= 0; j--) {
        const o = obstacles[j];
        if (o.type !== 'rock') continue;

        if (b.x < o.x + o.size/2 && b.x + b.w > o.x - o.size/2 &&
            b.y < o.y + o.size/2 && b.y + b.h > o.y - o.size/2) {
          
          bullets.splice(i, 1);
          o.health -= b.damage;
          
          if (o.health <= 0) {
            obstacles.splice(j, 1);
            addParticles(o.x, o.y, 15, '#9da3b3');
          } else {
            addParticles(b.x, b.y, 3, '#FFF');
          }
          break; 
        }
      }
    }

    // Cek pemain kena rintangan atau powerup
    if (player.invUntil > frames) return;

    const px = player.x, py = player.y, pw = player.w, ph = player.h;
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      if (o.type === 'star') continue;

      const dist = Math.hypot(px - o.x, (py + ph/2) - o.y);
      if (dist < o.size / 2 + pw / 3) {
        if (o.type === 'rock') {
          obstacles.splice(i, 1);
          addParticles(px, py, 20, '#ef4444');
          lives--;
          player.invUntil = frames + 120;
          if (lives <= 0) gameOver();
          notifyUI('updateHUD', getHUD());
        } else {
          addPowerup(o.type, o.x, o.y);
          obstacles.splice(i, 1);
        }
      }
    }
  }

  function addScore(n) {
    const oldScore = score;
    score += n;
    
    if (score >= scoreForNextLife) {
      if (lives < MAX_LIVES) {
        spawnObstacle('life', Math.random() * BASE_W);
      }
      scoreForNextLife += 100;
    }
    
    if (score > best) best = score;
    notifyUI('updateHUD', getHUD());
  }

  function addParticles(x, y, amount, color) {
    for (let i = 0; i < amount; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        size: Math.random() * 3 + 1,
        life: Math.random() * 60 + 30,
        color
      });
    }
  }
  
  function setupInput() {
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') moveLeft = true;
      if (key === 'arrowright' || key === 'd') moveRight = true;
      
      // [PERBAIKAN] Tembak pakai 'e', 'c', dan ' ' (spasi)
      if (key === 'e' || key === 'c' || key === ' ') {
        e.preventDefault(); // Hentikan spasi agar tidak scroll
        fireBullet();
      }
    });
    document.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') moveLeft = false;
      if (key === 'arrowright' || key === 'd') moveRight = false;
    });
    
    // UI menangani tembakan (pointerup) dan mousemove
    
    canvas.addEventListener('mouseleave', () => { moveLeft = moveRight = false; });
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); touchActive = true; /* UI handles fire */ }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); touchActive = true; /* UI handles drag touch */ }, { passive: false });
    canvas.addEventListener('touchend', (e) => { touchActive = false; }, { passive: false });
    window.addEventListener('resize', () => resizeCanvas());
  }
  
  function resizeCanvas() {
    const rect = gameBox.getBoundingClientRect();
    DPR = window.devicePixelRatio || 1;
    
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    canvas.width = rect.width * DPR;
    canvas.height = rect.height * DPR;
    
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  
  function setPlayerX(mx) {
    if (!running || demoMode) return;
    player.x = Math.max(player.w / 2, Math.min(BASE_W - player.w / 2, mx));
  }
  
  function pauseToggle() {
    if (!running) return;
    paused = !paused;
    notifyUI('pause', paused);
  }
  
  function quitToMenu() {
    running = false;
    paused = false;
    notifyUI('gameReset');
    notifyUI('updateHUD', getHUD());
  }

  // public API
  window.FanraCore = {
    init,
    startGame,
    resetGame,
    pauseToggle,
    quitToMenu,
    fireBullet,
    resizeCanvas,
    getHUD,
    tryRevive,
    // [PERBAIKAN BUG KOIN]
    addCoins(amount) { 
      if (amount === 0) {
        // Ini adalah sinyal 'refresh' dari toko
        coins = parseInt(localStorage.getItem('fanra_coins') || '0', 10);
      } else {
        // Ini adalah penambahan koin dari game
        coins += amount; 
        saveCoins(); 
      }
      notifyUI('updateHUD', getHUD()); 
    },
    setPlayerX,
    _registerUI: registerUI,
    enterElementFullscreen: async function (el) {
      el.classList.add('full-game');
      setTimeout(resizeCanvas, 100); // Panggil resize SETELAH css diterapkan
    },
    exitFullscreen: async function () {
      document.querySelector('.full-game')?.classList.remove('full-game');
      setTimeout(resizeCanvas, 100); // Panggil resize SETELAH css diterapkan
    },
  };

})();