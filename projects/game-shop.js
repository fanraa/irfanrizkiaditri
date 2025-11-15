/* game-shop.js
   Logika untuk Toko, Profil, dan Sistem Upgrade.
   [VERSI PERBAIKAN BUG KOIN]
*/

// (1) DATA MASTER UNTUK TOKO & UPGRADE
// ======================================
window.SHOP_DATA = {
  ships: {
    'default': {
      name: "Standar",
      desc: "Pesawat standar tanpa bonus.",
      price: 0,
      icon: "fa-rocket",
      stats: { speed: 5, fireRate: 20, damage: 1 },
      draw: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#4fa3ff';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - w / 2, y + h);
        ctx.lineTo(x + w / 2, y + h);
        ctx.closePath();
        ctx.fill();
      }
    },
    'speedy': {
      name: "Jet Cepat",
      desc: "Gerakan 40% lebih cepat, tapi tembakan standar.",
      price: 500,
      icon: "fa-fighter-jet",
      stats: { speed: 7, fireRate: 20, damage: 1 },
      draw: (ctx, x, y, w, h) => { // Bentuk baru: Jet Ramping
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(x, y); // Hidung
        ctx.lineTo(x - w / 3, y + h); // Sayap belakang kiri
        ctx.lineTo(x, y + h * 0.8); // Tengah
        ctx.lineTo(x + w / 3, y + h); // Sayap belakang kanan
        ctx.closePath();
        ctx.fill();
      }
    },
    'heavy': {
      name: "Kargo Berat",
      desc: "Lambat, tapi menembak 25% lebih cepat.",
      price: 750,
      icon: "fa-shuttle-space",
      stats: { speed: 4, fireRate: 15, damage: 1 },
      draw: (ctx, x, y, w, h) => { // Bentuk baru: Trapesium Lebar
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(x - w / 4, y); // Atap kiri
        ctx.lineTo(x + w / 4, y); // Atap kanan
        ctx.lineTo(x + w / 1.8, y + h); // Bawah kanan
        ctx.lineTo(x - w / 1.8, y + h); // Bawah kiri
        ctx.closePath();
        ctx.fill();
      }
    }
  },
  upgrades: {
    'ammo': {
      name: "Kapasitas Amunisi",
      desc: "Tambah amunisi awal +25 per level.",
      basePrice: 100,
      maxLevel: 5 // Batas Maksimum Level 5
    },
    'damage': {
      name: "Kekuatan Tembakan",
      desc: "Tambah damage peluru +0.5 per level.",
      basePrice: 250,
      maxLevel: 3
    }
  },
  consumables: {
    'ammoPack': {
      name: "Paket Amunisi",
      desc: "Membeli +50 amunisi untuk 1x main.",
      price: 50,
      icon: "fa-box"
    }
  }
};


// (2) LOGIKA TOKO & DATA PEMAIN
// =================================
(function () {
  if (window.Shop) return;

  const PLAYER_DATA_KEY = 'fanra_playerData_v2';
  const COIN_KEY = 'fanra_coins';

  let playerData = {
    ownedShips: ['default'],
    equippedShip: 'default',
    upgrades: {
      'ammo': 0,
      'damage': 0
    },
    consumables: {
      'ammoPack': 0
    }
  };

  function getCoins() {
    return parseInt(localStorage.getItem(COIN_KEY) || '0', 10);
  }

  function setCoins(amount) {
    localStorage.setItem(COIN_KEY, amount.toString());
    // [PERBAIKAN BUG KOIN] Panggil addCoins(0) untuk memberi tahu game
    // agar membaca ulang jumlah koin dari localStorage.
    if (window.FanraCore) {
      window.FanraCore.addCoins(0); 
    }
  }

  function savePlayerData() {
    localStorage.setItem(PLAYER_DATA_KEY, JSON.stringify(playerData));
  }

  function loadPlayerData() {
    const data = localStorage.getItem(PLAYER_DATA_KEY);
    if (data) {
      const parsedData = JSON.parse(data);
      playerData = { ...playerData, ...parsedData };
      if (!playerData.upgrades) playerData.upgrades = { 'ammo': 0, 'damage': 0 };
      if (!playerData.consumables) playerData.consumables = { 'ammoPack': 0 };
    }
    if (!playerData.ownedShips.includes('default')) {
      playerData.ownedShips.push('default');
    }
  }
  
  function resetPlayerData() {
    localStorage.removeItem(PLAYER_DATA_KEY);
    playerData = {
      ownedShips: ['default'], equippedShip: 'default',
      upgrades: { 'ammo': 0, 'damage': 0 },
      consumables: { 'ammoPack': 0 }
    };
    savePlayerData();
  }

  const Shop = {
    
    render: function() {
      this.renderCoins();
      this.renderSkins();
      this.renderUpgrades();
      this.renderConsumables();
      this.renderProfile();
    },
    
    renderCoins: function() {
      const coinDisplay = document.getElementById('shopCoinDisplay');
      if (coinDisplay) {
        coinDisplay.textContent = `Koin: ${getCoins()}`;
      }
    },
    
    renderSkins: function() {
      const grid = document.getElementById('skin-grid');
      if (!grid) return;
      grid.innerHTML = '';
      const coins = getCoins();
      
      for (const id in SHOP_DATA.ships) {
        const item = SHOP_DATA.ships[id];
        const isOwned = playerData.ownedShips.includes(id);
        const isEquipped = playerData.equippedShip === id;

        let buttonHtml;
        if (isEquipped) {
          buttonHtml = `<button class="btn-buy" disabled>Digunakan</button>`;
        } else if (isOwned) {
          buttonHtml = `<button class="btn-buy" onclick="Shop.equip('${id}')">Gunakan</button>`;
        } else {
          buttonHtml = `<button class="btn-buy" onclick="Shop.buy('ship', '${id}')" ${coins < item.price ? 'disabled' : ''}>Beli</button>`;
        }

        grid.innerHTML += `
          <div class="shop-item">
            <div class="item-icon"><i class="fas ${item.icon}"></i></div>
            <h4>${item.name}</h4>
            <p class="item-desc">${item.desc}</p>
            <div class="item-price">${isOwned ? 'Dimiliki' : `${item.price} Koin`}</div>
            ${buttonHtml}
          </div>
        `;
      }
    },
    
    renderUpgrades: function() {
      const list = document.getElementById('upgrade-list');
      if (!list) return;
      list.innerHTML = '<h3>Upgrade Permanen</h3>';
      const coins = getCoins();
      
      for (const id in SHOP_DATA.upgrades) {
        const item = SHOP_DATA.upgrades[id];
        const currentLevel = playerData.upgrades[id] || 0;
        const isMax = currentLevel >= item.maxLevel;
        
        let price = item.basePrice * Math.pow(1.5, currentLevel);
        price = Math.floor(price);
        
        let buttonHtml;
        if (isMax) {
          buttonHtml = `<button class="btn-buy" disabled>MAX</button>`;
        } else {
          buttonHtml = `<button class="btn-buy" onclick="Shop.buy('upgrade', '${id}')" ${coins < price ? 'disabled' : ''}>
            Beli (${price} Koin)
          </button>`;
        }

        list.innerHTML += `
          <div class="upgrade-item">
            <div class="upgrade-info">
              <span>${item.name}</span>
              <div class="level-display">Level ${currentLevel} / ${item.maxLevel}</div>
            </div>
            ${buttonHtml}
          </div>
        `;
      }
    },
    
    renderConsumables: function() {
      const grid = document.getElementById('consumable-grid');
      if (!grid) return;
      grid.innerHTML = '<h3>Beli Amunisi (1x Pakai)</h3>';
      const coins = getCoins();

      for (const id in SHOP_DATA.consumables) {
        const item = SHOP_DATA.consumables[id];
        const price = item.price;
        const currentStock = playerData.consumables[id] || 0;

        grid.innerHTML += `
          <div class="shop-item">
            <div class="item-icon"><i class="fas ${item.icon}"></i></div>
            <h4>${item.name}</h4>
            <p class="item-desc">${item.desc}</p>
            <div class="item-price">${price} Koin</div>
            <button class="btn-buy" onclick="Shop.buy('consumable', '${id}')" ${coins < price ? 'disabled' : ''}>Beli</button>
            <p class="item-desc" style="margin-top: 10px; font-weight: 600;">Dimiliki: ${currentStock}</p>
          </div>
        `;
      }
    },

    renderProfile: function() {
      const pane = document.getElementById('shop-pane-profile');
      if (!pane) return;
      
      const ship = SHOP_DATA.ships[playerData.equippedShip] || SHOP_DATA.ships['default'];
      const damage = (ship.stats.damage || 1) + ((playerData.upgrades.damage || 0) * 0.5);
      const maxAmmo = 100 + ((playerData.upgrades.ammo || 0) * 25);

      pane.innerHTML = `
        <div class="profile-stats">
          <h3>Statistik Permanen</h3>
          <div class="stat-item">
            <span>Pesawat</span>
            <span>${ship.name}</span>
          </div>
          <div class="stat-item">
            <span>Kecepatan</span>
            <span>${ship.stats.speed}</span>
          </div>
          <div class="stat-item">
            <span>Kecepatan Tembak</span>
            <span>${ship.stats.fireRate} (lebih kecil lebih cepat)</span>
          </div>
          <div class="stat-item">
            <span>Kekuatan Tembak</span>
            <span>${damage.toFixed(1)}</span>
          </div>
          <div class="stat-item">
            <span>Kapasitas Amunisi</span>
            <span>${maxAmmo}</span>
          </div>
        </div>
      `;
    },
    
    buy: function(type, id) {
      const coins = getCoins();
      let price = 0;
      let item;

      if (type === 'ship') {
        item = SHOP_DATA.ships[id];
        price = item.price;
        if (coins >= price) {
          setCoins(coins - price);
          playerData.ownedShips.push(id);
          this.equip(id);
        }
      } 
      else if (type === 'upgrade') {
        item = SHOP_DATA.upgrades[id];
        const currentLevel = playerData.upgrades[id] || 0;
        if (currentLevel < item.maxLevel) {
          price = Math.floor(item.basePrice * Math.pow(1.5, currentLevel));
          if (coins >= price) {
            setCoins(coins - price);
            playerData.upgrades[id] = currentLevel + 1;
          }
        }
      }
      else if (type === 'consumable') {
        item = SHOP_DATA.consumables[id];
        price = item.price;
        if (coins >= price) {
          setCoins(coins - price);
          playerData.consumables[id] = (playerData.consumables[id] || 0) + 1;
        }
      }
      
      savePlayerData();
      this.render();
    },
    
    equip: function(id) {
      if (playerData.ownedShips.includes(id)) {
        playerData.equippedShip = id;
        savePlayerData();
        this.render();
      }
    },
    
    getPlayerStats: function() {
      loadPlayerData();
      const ship = SHOP_DATA.ships[playerData.equippedShip] || SHOP_DATA.ships['default'];
      const ammoUp = playerData.upgrades.ammo || 0;
      const dmgUp = playerData.upgrades.damage || 0;
      const ammoPack = playerData.consumables.ammoPack || 0;
      
      const maxAmmo = 100 + (ammoUp * 25);
      const startingAmmo = maxAmmo + (ammoPack * 50);
      
      return {
        ...ship.stats,
        damage: (ship.stats.damage || 1) + (dmgUp * 0.5),
        ammo: startingAmmo,
        maxAmmo: maxAmmo,
        drawFunc: ship.draw
      };
    },
    
    consumeItems: function() {
      loadPlayerData();
      playerData.consumables.ammoPack = 0;
      savePlayerData();
    },

    reset: function() {
      resetPlayerData();
      this.render();
    },

    init: function() {
      loadPlayerData();
      
      const tabButtons = document.querySelectorAll('.shop-tab-btn');
      const panes = document.querySelectorAll('.shop-pane');
      
      tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          tabButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const targetPane = btn.getAttribute('data-tab');
          panes.forEach(p => {
            p.classList.toggle('active', p.id === `shop-pane-${targetPane}`);
          });
        });
      });
      
      // Logika tombol tutup dipindahkan ke arcade-ui.js
      
      window.Shop = this;
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    Shop.init();
  });

})();