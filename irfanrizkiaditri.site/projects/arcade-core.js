/* arcade-core.js
   Core game logic for Fanra Escape (separated from UI).
   Exposes window.FanraCore API used by arcade-ui.js.
*/
(function () {
  const BASE_W = 800, BASE_H = 480;
  let DPR = Math.min(window.devicePixelRatio || 1, 2);

  // Canvas & ctx will be set by init
  let canvas, ctx, gameBox;

  // game state
  const player = { x: BASE_W / 2, y: BASE_H - 48, w: 44, h: 22, speed: 5, vx: 0, invUntil: 0 };
  let obstacles = [];
  let bullets = [];        // player's bullets
  let enemyBullets = [];   // boss/projectile bullets
  let powerups = [];       // includes coins, ammo, powerups, life
  let particles = [];

  let frames = 0;
  let score = 0;
  let best = parseInt(localStorage.getItem('fanra_best') || '0', 10) || 0;
  let lives = 3;
  let level = 1;
  let running = false;
  let paused = false;
  let demoMode = false;

  let spawnAcc = 0;
  let lastTS = performance.now();

  // boss
  let boss = null;

  // ammo
  let ammo = 0;
  const MAX_AMMO = 9;

  // coins & revive
  let coins = parseInt(localStorage.getItem('fanra_coins') || '0', 10) || 0;
  let reviveUses = 0; // number of times player used revive in current session/run (not persisted)
  const REVIVE_BASE = 10; // base cost
  const REVIVE_MULT = 2.5; // multiplier per use

  // inputs
  let moveLeft = false, moveRight = false;
  let mouseDown = false;
  let touchActive = false;

  // powerup meta
  let pSlowEl = null, pShieldEl = null, pMultEl = null;
  const POWERUPS = {
    slow: { color: '#34d399', duration: 5000 },
    shield: { color: '#60a5fa', duration: 4500 },
    multiplier: { color: '#f59e0b', duration: 6000, value: 2 },
    ammo: { color: '#ffffff', duration: 0 },
    life: { color: '#ef4444', duration: 0 },
    coin: { color: '#ffd166', duration: 0 }
  };
  const active = {
    slow: false, slowUntil: 0,
    shield: false, shieldUntil: 0,
    multiplier: false, multiplierUntil: 0
  };

  // visual damage flash
  let damageFlash = 0; // 0..1 decays

  // helpers
  const rand = (a, b) => Math.random() * (b - a) + a;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => Date.now();

  // API: init with canvas element and optional UI hooks container
  function init(opts = {}) {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    gameBox = document.getElementById('gameBox');
    pSlowEl = document.getElementById('pSlow');
    pShieldEl = document.getElementById('pShield');
    pMultEl = document.getElementById('pMult');

    DPR = Math.min(window.devicePixelRatio || 1, 2);
    resizeCanvas();
    draw(); // initial draw
    requestAnimationFrame((t) => { lastTS = t; requestAnimationFrame(loop); });

    // wire basic inputs inside core (keyboard + canvas pointer movement)
    bindInput();
  }

  function resizeCanvas() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    let boxW, boxH;
    if (document.fullscreenElement || (gameBox && gameBox.classList.contains('full-game'))) {
      boxW = window.innerWidth; boxH = window.innerHeight;
    } else {
      const rect = gameBox.getBoundingClientRect();
      boxW = rect.width || BASE_W;
      boxH = rect.height || BASE_H;
    }
    const scale = Math.min(boxW / BASE_W, boxH / BASE_H);
    canvas.style.width = `${Math.round(BASE_W * scale)}px`;
    canvas.style.height = `${Math.round(BASE_H * scale)}px`;

    canvas.width = Math.round(BASE_W * DPR);
    canvas.height = Math.round(BASE_H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  // HUD data getter for UI
  function getHUD() {
    return {
      score, best, lives, level, ammo, bossHp: boss ? boss.hp : '—',
      coins, reviveCost: getReviveCost()
    };
  }

  function saveCoins() {
    localStorage.setItem('fanra_coins', String(coins));
  }

  function getReviveCost() {
    return Math.ceil(REVIVE_BASE * Math.pow(REVIVE_MULT, reviveUses));
  }

  // spawn functions
  function spawnObstacle() {
    const size = Math.floor(rand(18, 60));
    const x = rand(8, BASE_W - size - 8);
    const baseSpeed = rand(1.2, 2.6);
    const difficultyFactor = 1 + Math.min(3, score / 60);
    const speed = (active.slow ? baseSpeed * 0.5 : baseSpeed) * difficultyFactor;
    const hp = Math.max(1, Math.ceil(size / 20));
    obstacles.push({ x, y: -size, w: size, h: size, speed, color: `hsl(${Math.floor(rand(200, 260))} 80% 55%)`, hp, maxHp: hp });
  }
  function spawnPowerup() {
    const tRand = Math.random();
    let type = 'coin';
    if (tRand < 0.04) type = 'life';
    else if (tRand < 0.20) type = 'ammo';
    else if (tRand < 0.36) type = 'slow';
    else if (tRand < 0.52) type = 'shield';
    else if (tRand < 0.68) type = 'multiplier';
    else type = 'coin';
    const size = 16;
    const x = rand(8, BASE_W - size - 8);
    powerups.push({ x, y: -size, w: size, h: size, speed: 0.9 + Math.random() * 0.8, type, color: POWERUPS[type].color, value: (type === 'coin') ? Math.floor(rand(1, 4)) : undefined });
  }

  function spawnCoinAt(x, y, value = 1) {
    powerups.push({ x: clamp(x - 8, 8, BASE_W - 20), y: clamp(y - 8, 8, BASE_H - 20), w: 12, h: 12, speed: 1.0, type: 'coin', color: POWERUPS.coin.color, value });
  }

  // bullets
  function fireBullet() {
    if (ammo <= 0) return;
    ammo = Math.max(0, ammo - 1);
    const bx = player.x;
    const by = player.y - player.h / 2 - 6;
    bullets.push({ x: bx, y: by, vx: 0, vy: -8, r: 4, color: '#fefefe' });
    // UI update announced by update loop; but request immediate HUD update:
    notifyUI('updateHUD', getHUD());
  }

  // helper to set player x (used by UI drag)
  function setPlayerX(x) {
    player.x = clamp(x, player.w / 2, BASE_W - player.w / 2);
  }

  // particles
  function emitParticles(x, y, color, cnt = 10) {
    for (let i = 0; i < cnt; i++) {
      particles.push({
        x, y,
        vx: rand(-2.4, 2.4),
        vy: rand(-2.4, 2.4),
        life: 1,
        decay: rand(0.02, 0.06),
        color
      });
    }
  }

  // collision helpers
  function rectIntersect(a, b) {
    return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
  }
  function rectCircleIntersect(rect, circle) {
    const distX = Math.abs(circle.x - rect.x - rect.w / 2);
    const distY = Math.abs(circle.y - rect.y - rect.h / 2);
    if (distX > (rect.w / 2 + circle.r)) return false;
    if (distY > (rect.h / 2 + circle.r)) return false;
    if (distX <= (rect.w / 2)) return true;
    if (distY <= (rect.h / 2)) return true;
    const dx = distX - rect.w / 2, dy = distY - rect.h / 2;
    return (dx * dx + dy * dy <= (circle.r * circle.r));
  }

  // powerups handling
  function activatePowerup(type, value) {
    const tnow = now();
    if (type === 'slow') {
      active.slow = true; active.slowUntil = tnow + POWERUPS.slow.duration;
      if (pSlowEl) pSlowEl.classList.add('active');
    } else if (type === 'shield') {
      active.shield = true; active.shieldUntil = tnow + POWERUPS.shield.duration;
      if (pShieldEl) pShieldEl.classList.add('active');
    } else if (type === 'multiplier') {
      active.multiplier = true; active.multiplierUntil = tnow + POWERUPS.multiplier.duration;
      if (pMultEl) pMultEl.classList.add('active');
    } else if (type === 'ammo') {
      ammo = clamp(ammo + (value || Math.floor(rand(1, 4))), 0, MAX_AMMO);
    } else if (type === 'life') {
      lives = Math.min(9, lives + 1);
    } else if (type === 'coin') {
      const got = value || 1;
      coins = Math.max(0, coins + got);
      saveCoins();
    }
  }
  function checkPowerupExpiry() {
    const tnow = now();
    if (active.slow && tnow > active.slowUntil) { active.slow = false; if (pSlowEl) pSlowEl.classList.remove('active'); }
    if (active.shield && tnow > active.shieldUntil) { active.shield = false; if (pShieldEl) pShieldEl.classList.remove('active'); }
    if (active.multiplier && tnow > active.multiplierUntil) { active.multiplier = false; if (pMultEl) pMultEl.classList.remove('active'); }
  }

  // game control
  function startGame(demo = false) {
    demoMode = demo;
    running = true; paused = false;
    frames = 0; score = 0; lives = demo ? 999 : 3; level = 1;
    obstacles = []; bullets = []; enemyBullets = []; powerups = []; particles = [];
    ammo = 0; boss = null; spawnAcc = 0;
    reviveUses = 0;
    damageFlash = 0;
    notifyUI('updateHUD', getHUD());
  }

  function pauseToggle() {
    if (!running) return;
    paused = !paused;
    notifyUI('toast', paused ? 'Paused' : 'Resumed');
  }

  function resetGame() {
    running = false; paused = false; demoMode = false;
    obstacles = []; bullets = []; enemyBullets = []; powerups = []; particles = [];
    score = 0; lives = 3; ammo = 0; level = 1; boss = null;
    reviveUses = 0;
    damageFlash = 0;
    notifyUI('updateHUD', getHUD());
  }

  function endGame() {
    running = false;
    if (score > best) { best = score; localStorage.setItem('fanra_best', String(best)); }
    notifyUI('gameOver', { score, best, coins, reviveCost: getReviveCost() });
  }

  // revive using coins
  function tryRevive() {
    const cost = getReviveCost();
    if (coins >= cost) {
      coins -= cost;
      reviveUses++;
      saveCoins();
      // revive: restore 1 life, give brief invulnerability, keep score
      lives = Math.max(1, lives);
      running = true;
      paused = false;
      player.invUntil = now() + 1500;
      damageFlash = 0.8;
      ammo = Math.min(MAX_AMMO, ammo + 2);
      notifyUI('toast', `Revived! (-${cost} coins)`);
      notifyUI('updateHUD', getHUD());
      notifyUI('hideGameOver');
      return true;
    } else {
      notifyUI('toast', 'Koin tidak cukup');
      return false;
    }
  }

  // lose life handling with damage flash & invulnerability (no pause)
  function loseLife() {
    if (active.shield) {
      active.shield = false; if (pShieldEl) pShieldEl.classList.remove('active');
      notifyUI('toast', 'Shield absorbed!');
      return;
    }
    const nowt = now();
    if (player.invUntil > nowt) return;
    lives--;
    damageFlash = 1.0;
    player.invUntil = nowt + 1200;
    emitParticles(player.x, player.y, '#ef4444', 18);
    if (lives <= 0) {
      notifyUI('offerRevive', { score, best, coins, reviveCost: getReviveCost() });
    } else {
      notifyUI('toast', 'You got hit!');
    }
    notifyUI('updateHUD', getHUD());
  }

  // boss
  function spawnBossForLevel(l) {
    const hp = 20 + (l * 12);
    boss = { hp, maxHp: hp, x: BASE_W / 2 - 60, y: 60, w: 120, h: 48, vx: 1.6 + l * 0.12, timer: 0, pattern: (l % 3), fireAcc: 0, stunned: 0 };
    notifyUI('toast', 'BOSS INCOMING!');
  }

  function bossUpdate(dt) {
    if (!boss) return;
    boss.timer += dt;
    boss.x += boss.vx * (dt / 16);
    if (boss.x < 60) { boss.x = 60; boss.vx *= -1; }
    if (boss.x > BASE_W - 60 - boss.w) { boss.x = BASE_W - 60 - boss.w; boss.vx *= -1; }

    boss.fireAcc += dt;
    if (boss.pattern === 0) {
      if (boss.fireAcc > Math.max(600 - level * 10, 240)) {
        boss.fireAcc = 0;
        for (let i = -2; i <= 2; i++) {
          const angle = (Math.PI / 2) + (i * 0.18);
          enemyBullets.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h, vx: Math.cos(angle) * 3.5, vy: Math.sin(angle) * 3.5, r: 5, color: '#f97316' });
        }
      }
    } else if (boss.pattern === 1) {
      if (boss.fireAcc > Math.max(900 - level * 25, 350)) {
        boss.fireAcc = 0;
        for (let i = 0; i < 4; i++) {
          const angleToPlayer = Math.atan2(player.y - boss.y, player.x - (boss.x + boss.w / 2));
          const spread = (i - 1.5) * 0.18;
          enemyBullets.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h, vx: Math.cos(angleToPlayer + spread) * 3.8, vy: Math.sin(angleToPlayer + spread) * 3.8, r: 4, color: '#60a5fa' });
        }
      }
    } else {
      if (boss.fireAcc > Math.max(1400 - level * 30, 520)) {
        boss.fireAcc = 0;
        for (let i = 0; i < 3 + Math.floor(level / 2); i++) {
          const x = rand(boss.x + 8, boss.x + boss.w - 8);
          enemyBullets.push({ x, y: boss.y + boss.h, vx: 0, vy: 2.2 + level * 0.06, r: 8, color: '#ef4444' });
        }
      }
    }
  }

  // main update
  function update(dt) {
    if (!running) return;
    if (paused) return;
    frames++;
    spawnAcc += dt;
    const spawnInterval = clamp(700 - Math.floor(score * 2.2), 220, 900);
    if (spawnAcc > spawnInterval) {
      spawnAcc = 0;
      if (Math.random() < 0.86) spawnObstacle();
      if (Math.random() < 0.12) spawnPowerup();
      if (Math.random() < 0.06) spawnCoinAt(rand(40, BASE_W - 40), -10, Math.floor(rand(1, 3)));
    }
    checkPowerupExpiry();

    if (moveLeft) player.x -= player.speed;
    if (moveRight) player.x += player.speed;
    player.x = clamp(player.x, player.w / 2, BASE_W - player.w / 2);

    // bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.y += b.vy;
      b.x += b.vx;
      if (b.y < -10) bullets.splice(i, 1);
      else {
        for (let j = obstacles.length - 1; j >= 0; j--) {
          const ob = obstacles[j];
          const rect = { x: ob.x, y: ob.y, w: ob.w, h: ob.h };
          if (rectCircleIntersect(rect, { x: b.x, y: b.y, r: b.r })) {
            ob.hp -= 1;
            bullets.splice(i, 1);
            emitParticles(b.x, b.y, '#fff', 5);
            if (ob.hp <= 0) {
              const gained = ob.maxHp * (active.multiplier ? (POWERUPS.multiplier.value || 2) : 1);
              score += gained;
              if (Math.random() < 0.28) spawnCoinAt(ob.x + ob.w / 2, ob.y + ob.h / 2, Math.max(1, Math.floor(gained / 2)));
              emitParticles(ob.x + ob.w / 2, ob.y + ob.h / 2, ob.color, 12);
              obstacles.splice(j, 1);
            }
            break;
          }
        }
      }
    }

    // enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const eb = enemyBullets[i];
      eb.x += eb.vx;
      eb.y += eb.vy;
      const playerRect = { x: player.x - player.w / 2, y: player.y - player.h / 2, w: player.w, h: player.h };
      if (rectCircleIntersect(playerRect, { x: eb.x, y: eb.y, r: eb.r })) {
        enemyBullets.splice(i, 1);
        emitParticles(eb.x, eb.y, eb.color, 10);
        loseLife();
        continue;
      }
      if (eb.y > BASE_H + 40 || eb.x < -40 || eb.x > BASE_W + 40) enemyBullets.splice(i, 1);
    }

    // obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const ob = obstacles[i];
      ob.y += ob.speed * (active.slow ? 0.5 : 1);
      if (ob.y > BASE_H + 50) {
        obstacles.splice(i, 1);
        score += 1;
      } else {
        const playerRect = { x: player.x - player.w / 2, y: player.y - player.h / 2, w: player.w, h: player.h };
        const obRect = { x: ob.x, y: ob.y, w: ob.w, h: ob.h };
        if (rectIntersect(playerRect, obRect)) {
          obstacles.splice(i, 1);
          emitParticles(ob.x + ob.w / 2, ob.y + ob.h / 2, ob.color, 12);
          loseLife();
        }
      }
    }

    // powerups move & pickup
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += p.speed;
      if (p.y > BASE_H + 30) { powerups.splice(i, 1); continue; }
      const playerCircle = { x: player.x, y: player.y, r: Math.max(player.w, player.h) / 2 };
      if (rectCircleIntersect({ x: p.x, y: p.y, w: p.w, h: p.h }, playerCircle)) {
        activatePowerup(p.type, p.value);
        emitParticles(p.x + p.w / 2, p.y + p.h / 2, p.color, 10);
        powerups.splice(i, 1);
        notifyUI('updateHUD', getHUD());
      }
    }

    // particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const pa = particles[i];
      pa.x += pa.vx;
      pa.y += pa.vy;
      pa.life -= pa.decay;
      if (pa.life <= 0) particles.splice(i, 1);
    }

    // boss
    if (boss) {
      bossUpdate(dt);
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if (b.y < boss.y + boss.h && Math.abs(b.x - (boss.x + boss.w / 2)) < boss.w / 2 + 6) {
          boss.hp -= 1;
          bullets.splice(i, 1);
          emitParticles(b.x, b.y, '#ffd', 10);
          if (boss.hp <= 0) {
            const reward = 5 * level;
            score += 40 * level;
            coins += reward;
            saveCoins();
            emitParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, '#ffd', 32);
            boss = null;
            levelUp();
            notifyUI('toast', `Boss defeated! +${reward} coins`);
            break;
          } else {
            boss.stunned = 100;
          }
        }
      }
    } else {
      const threshold = 120 + (level - 1) * 200;
      if (score >= threshold) levelUp();
    }

    if (!boss && level > 1 && level % 3 === 0 && Math.random() < 0.005) spawnBossForLevel(level);

    if (frames % 6 === 0) notifyUI('updateHUD', getHUD());
  }

  function levelUp() {
    level++;
    spawnAcc = 0;
    if (level % 3 === 0) spawnBossForLevel(level);
    notifyUI('toast', 'LEVEL UP!');
    notifyUI('updateHUD', getHUD());
  }

  // drawing
  function draw() {
    damageFlash = Math.max(0, damageFlash - 0.03);

    const g = ctx.createLinearGradient(0, 0, 0, BASE_H);
    const hue = 220 + (level * 8) % 80;
    g.addColorStop(0, `hsl(${(hue + 10) % 360} 40% 8%)`);
    g.addColorStop(1, `hsl(${hue % 360} 35% 10%)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, BASE_W, BASE_H);

    const shake = damageFlash ? (Math.random() - 0.5) * 6 * damageFlash : 0;
    ctx.save();
    ctx.translate(shake, shake);

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let i = 0; i < 35; i++) {
      const sx = (i * 53) % BASE_W;
      const sy = (i * 97 + (frames % 100)) % BASE_H;
      const s = (i % 3) + 1;
      ctx.fillRect(sx, sy, s, s);
    }

    drawShip(player.x, player.y, active.shield, player.invUntil > now());

    for (const ob of obstacles) {
      ctx.fillStyle = ob.color;
      ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(ob.x, ob.y - 6, ob.w, 4);
      const hpPct = clamp(ob.hp / ob.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(ob.x, ob.y - 6, ob.w * hpPct, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(ob.x + 2, ob.y + 4, Math.max(0, ob.w - 4), Math.min(6, ob.h / 3));
    }

    for (const p of powerups) {
      ctx.save();
      const pulse = 0.85 + 0.12 * Math.sin(frames * 0.12);
      ctx.globalAlpha = pulse;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
    }

    for (const b of bullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    }

    for (const eb of enemyBullets) {
      ctx.fillStyle = eb.color || '#f97316';
      ctx.beginPath(); ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2); ctx.fill();
    }

    if (boss) {
      ctx.fillStyle = '#5b21b6'; ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(boss.x, boss.y - 12, boss.w, 8);
      const bP = clamp(boss.hp / boss.maxHp, 0, 1);
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(boss.x, boss.y - 12, boss.w * bP, 8);
    }

    for (const p of particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = '600 14px Poppins, sans-serif';
    ctx.fillText('Score: ' + score, 12, 20);
    ctx.fillText('Best: ' + best, 12, 40);

    for (let i = 0; i < lives; i++) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(BASE_W - 110 + i * 18, 12, 14, 10);
    }

    ctx.restore();

    if (damageFlash > 0) {
      ctx.fillStyle = `rgba(239,68,68,${Math.min(0.35, damageFlash * 0.35)})`;
      ctx.fillRect(0, 0, BASE_W, BASE_H);
    }

    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(0, 0, BASE_W, BASE_H);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 40px Poppins, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('PAUSED', BASE_W / 2, BASE_H / 2);
      ctx.textAlign = 'left';
    }
  }

  function drawShip(x, y, shield, invulnerable) {
    ctx.save();
    ctx.translate(x, y);
    if (invulnerable && Math.floor(now() / 80) % 2 === 0) ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(-18, 12); ctx.lineTo(18, 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0b1220'; ctx.beginPath(); ctx.ellipse(0, -2, 6, 6, 0, 0, Math.PI * 2); ctx.fill();
    if (shield) {
      ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, Math.max(player.w, player.h) / 1.2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // main loop
  function loop(ts) {
    const dt = ts - lastTS;
    lastTS = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function bindInput() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') { moveLeft = true; moveRight = false; }
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') { moveRight = true; moveLeft = false; }
      if (e.key === ' ') { fireBullet(); }
      if (e.key === 'Enter' && !running) startGame(false);
      if (e.key === 'Escape') {
        if (document.fullscreenElement) document.exitFullscreen();
        if (gameBox && gameBox.classList.contains('full-game')) leaveElementFullscreen(gameBox);
      }
      // Note: 'f' fullscreen is handled by UI layer (so user shortcut toggles there)
      if (e.key === 'p') pauseToggle();
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') moveLeft = false;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') moveRight = false;
    });

    // mouse & touch - core only supports shoot on mousedown (no teleport)
    canvas.addEventListener('mousedown', (e) => { mouseDown = true; fireBullet(); });
    canvas.addEventListener('mousemove', (e) => { /* UI handles drag to call setPlayerX via API */ });
    window.addEventListener('mouseup', () => { mouseDown = false; moveLeft = moveRight = false; });

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); touchActive = true; fireBullet(); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { /* UI handles drag touch */ }, { passive: false });
    canvas.addEventListener('touchend', (e) => { touchActive = false; }, { passive: false });

    window.addEventListener('resize', () => resizeCanvas());
  }

  // UI bridge
  let uiHandler = null;
  function notifyUI(evt, data) { if (uiHandler) uiHandler(evt, data); }
  function registerUI(fn) { uiHandler = fn; }

  // public API
  window.FanraCore = {
    init,
    startGame,
    resetGame,
    pauseToggle,
    fireBullet,
    resizeCanvas,
    getHUD,
    tryRevive,
    addCoins(amount) { coins += amount; saveCoins(); notifyUI('updateHUD', getHUD()); },
    setPlayerX,
    // debug helpers
    _state() { return { score, lives, level, coins, reviveUses }; },
    _registerUI: registerUI,
    enterElementFullscreen: async function (el) {
      try {
        if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
        else el.classList.add('full-game');
      } catch (err) { el.classList.add('full-game'); }
      resizeCanvas();
    },
    leaveElementFullscreen: function (el) { el.classList.remove('full-game'); resizeCanvas(); }
  };

  // expose internal notify for testing
  // nothing else to init; UI should call FanraCore.init() on load
})();