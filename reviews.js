// reviews.js
// Tanggung jawab:
// - Menangani ulasan (rating + teks): simpan, render, sinkronisasi.
// - Perbaikan utama:
//   * Submit review memastikan data tersimpan lokal ketika offline, dan dikirim saat online.
//   * Render review menampilkan rata-rata dan daftar secara realtime.
// Berpengaruh pada: bagian rating/ulasan dan panel editor ulasan.

function isOnline() { return navigator.onLine; }
function isLoggedIn() { return (typeof auth !== 'undefined') && !!auth.currentUser; }
function isCreatorLocal() { return sessionStorage.getItem('irfan_editor_v2') === '1'; }

function saveReviewLocal(review) {
  let reviews = JSON.parse(localStorage.getItem("local_reviews") || "[]");
  reviews.unshift(review);
  localStorage.setItem("local_reviews", JSON.stringify(reviews));
}
function getLocalReviews() { return JSON.parse(localStorage.getItem("local_reviews") || "[]"); }
function clearLocalReviews() { localStorage.removeItem("local_reviews"); }

async function fbGetReviews() { try { const snap = await db.collection("reviews").orderBy("ts", "desc").get(); return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); } catch (e) { console.error('fbGetReviews', e); throw e; } }
async function saveReviewFirebase(review) { return db.collection("reviews").add(review); }
async function fbDeleteReview(id) { return db.collection("reviews").doc(id).delete(); }

function renderStarsInline(n) {
  let s = '';
  for (let i = 1; i <= 5; i++) s += `<span style="color:${i<=n?'#ffd166':'rgba(255,255,255,0.1)'}">★</span>`;
  return s;
}

async function renderReviews() {
  const container = document.getElementById('reviewsList');
  if (!container) return;
  let list = [];
  try {
    if (isOnline() && isLoggedIn()) list = await fbGetReviews();
    else list = getLocalReviews();
  } catch (err) {
    console.warn('renderReviews fallback', err);
    list = getLocalReviews();
  }

  const total = list.length;
  const sum = list.reduce((s,r)=> s + Number(r.stars || 0), 0);
  const avg = total ? (sum / total) : 0;
  document.getElementById('avgScore') && (document.getElementById('avgScore').textContent = avg ? avg.toFixed(1) : '-');
  document.getElementById('reviewsCount') && (document.getElementById('reviewsCount').textContent = total + ' ulasan');

  container.innerHTML = '';
  if (!list.length) { container.innerHTML = '<div class="note">Belum ada ulasan.</div>'; return; }
  list.forEach(r => {
    const el = document.createElement('div');
    el.className = 'comment';
    el.style.padding = '10px';
    el.style.borderRadius = '8px';
    el.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.01), transparent)';
    el.style.marginBottom = '8px';
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>${r.name||'Anonim'}</strong>
        <div class="note">${new Date(r.ts || Date.now()).toLocaleDateString()}</div>
      </div>
      <div style="margin-top:8px">${renderStarsInline(r.stars)}</div>
      <div style="margin-top:6px;color:var(--muted)">${r.text||''}</div>`;
    container.appendChild(el);
  });
}

let selStar = 0;
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('#starForm .star').forEach(s => {
    s.addEventListener('mouseover', () => {
      const v = Number(s.dataset.val);
      document.querySelectorAll('#starForm .star').forEach(x => x.style.color = (Number(x.dataset.val) <= v ? '#ffd166' : 'rgba(255,255,255,0.1)'));
    });
    s.addEventListener('mouseout', () => {
      document.querySelectorAll('#starForm .star').forEach(x => x.style.color = (Number(x.dataset.val) <= selStar ? '#ffd166' : 'rgba(255,255,255,0.1)'));
    });
    s.addEventListener('click', () => selStar = Number(s.dataset.val));
  });

  document.getElementById('submitReview')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      if (selStar <= 0) { showToast('Silakan pilih bintang terlebih dahulu.'); return; }
      const name = (document.getElementById('reviewName')?.value || '').trim();
      const txt = prompt('Tulis komentar singkat untuk ulasan (opsional):') || '';
      const review = { name: name || 'Anonim', stars: selStar, text: txt, ts: Date.now() };

      if (isOnline() && isLoggedIn()) {
        try { await saveReviewFirebase(review); showToast('Ulasan berhasil dikirim ke server.'); }
        catch (err) { console.error(err); saveReviewLocal(review); showToast('Gagal ke server — ulasan disimpan lokal.'); }
      } else if (isCreatorLocal()) {
        await IrfanIDB.add('pending_posts', { id: 'r_' + Date.now(), post: review });
        showToast('Ulasan tersimpan lokal (creator offline).');
      } else {
        saveReviewLocal(review);
        showToast('Ulasan disimpan di perangkat — akan dikirim saat online.');
      }

      selStar = 0;
      if (document.getElementById('reviewName')) document.getElementById('reviewName').value = '';
      document.querySelectorAll('#starForm .star').forEach(x => x.style.color = 'rgba(255,255,255,0.1)');
      renderReviews();
    } catch (err) {
      console.error('submitReview handler error', err);
      showToast('Terjadi kesalahan saat mengirim ulasan.');
    } finally {
      btn.disabled = false;
    }
  });

  renderReviews();
});

window.addEventListener('online', async () => {
  // sync local reviews to server when possible
  if (isOnline() && isLoggedIn()) {
    const local = getLocalReviews();
    if (local.length) {
      for (const r of local) {
        try { await saveReviewFirebase(r); } catch (e) { console.error('sync review failed', e); }
      }
      clearLocalReviews();
      showToast('Ulasan lokal berhasil disinkron ke server.');
      renderReviews();
    }
  }
});