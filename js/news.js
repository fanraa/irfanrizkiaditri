// news.js (robust version)
// - Mengambil berita dari beberapa sumber RSS (parallel).
// - Jika rss2json gagal (422 atau rate-limit), coba fallback ke AllOrigins proxy.
// - Jika Firestore (db) belum tersedia, tetap tampilkan hasil otomatis (autoItems) dan tetap coba manual news ketika db siap.
// - Menangani semua error sehingga tidak menghentikan eksekusi.

// Daftar sumber RSS (ubah/hapus jika perlu)
const NEWS_SOURCES = [
  "https://www.reuters.com/world/rss.xml",
  "https://www.antaranews.com/rss/terkini.xml",
  "https://www.techradar.com/rss",
  "https://www.nature.com/subjects/physics.rss"
];

// Ambil berita manual dari Firestore jika tersedia, jika tidak, return [].
async function fbGetManualNews(){
  if (!window.db) {
    // Firestore belum siap — jangan lempar error, kembalikan array kosong
    console.warn('fbGetManualNews: Firestore (db) belum tersedia. Akan coba lagi nanti.');
    return [];
  }
  try {
    const snap = await db.collection('manual_news').orderBy('ts','desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('fbGetManualNews error', e);
    return [];
  }
}
async function fbAddManualNews(n){
  if (!window.db) throw new Error('Firestore not available');
  return db.collection('manual_news').add(n);
}
async function fbDeleteManualNews(id){
  if (!window.db) throw new Error('Firestore not available');
  return db.collection('manual_news').doc(id).delete();
}

// Helper: try rss2json API first; if 422 or other failure -> try AllOrigins proxy fallback fetch raw RSS text and parse minimal items.
async function fetchRssToJson(source) {
  // try rss2json first
  try {
    const rss2url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source)}`;
    const res = await fetch(rss2url);
    if (!res.ok) throw new Error('Bad response ' + res.status);
    const data = await res.json();
    if (!data || !Array.isArray(data.items)) throw new Error('Invalid rss2json response');
    return (data.items || []).slice(0,3).map(it => ({ title: it.title, link: it.link, source: it.link ? (new URL(it.link)).hostname : source }));
  } catch (err) {
    console.warn('fetchRssToJson failed for', source, err);
    // If rss2json failed (422, rate-limit, etc.), try AllOrigins to fetch raw RSS and extract <item><title><link>
    try {
      // AllOrigins: proxy to bypass CORS for public RSS (no guarantees)
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(source)}`;
      const r = await fetch(proxyUrl);
      if (!r.ok) throw new Error('AllOrigins bad response ' + r.status);
      const text = await r.text();
      // Very simple parsing: find occurrences of <item> ... <title> and <link>
      const items = [];
      const itemMatches = text.match(/<item[\s\S]*?<\/item>/gi) || [];
      for (let i = 0; i < Math.min(3, itemMatches.length); i++) {
        const it = itemMatches[i];
        const titleMatch = it.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const linkMatch = it.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        const title = titleMatch ? titleMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g,'') : '(No title)';
        const link = linkMatch ? linkMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g,'') : '';
        items.push({ title, link, source: link ? (new URL(link)).hostname : source });
      }
      return items;
    } catch (e2) {
      console.warn('AllOrigins fallback failed for', source, e2);
      return []; // give up on this source
    }
  }
}

async function renderNews(){
  const adsArea = document.getElementById('adsArea');
  if(!adsArea) return;
  adsArea.innerHTML = `<div class="note">Memuat berita...</div>`;

  try {
    // fetch auto items in parallel; tolerate failures per-source
    const fetchPromises = NEWS_SOURCES.map(s => fetchRssToJson(s));
    const results = await Promise.all(fetchPromises);
    const autoItems = results.flat().slice(0,6); // ambil hingga 6 item gabungan

    // Manual news from Firestore (if available)
    const manual = await fbGetManualNews().catch(err => {
      console.warn('fbGetManualNews error fallback', err);
      return [];
    });

    // combine automatic + manual
    const all = [...autoItems, ...manual];

    adsArea.innerHTML = '';
    if (!all.length) {
      adsArea.innerHTML = '<div class="note">Belum ada berita.</div>';
      return;
    }

    all.forEach(a=>{
      const d = document.createElement('div');
      d.className='card';
      d.style.padding='10px';
      d.style.cursor='pointer';
      d.innerHTML = `<div style="display:flex;flex-direction:column;gap:4px"><strong style="font-size:0.95rem">${escapeHtml(a.title||'(Judul kosong)')}</strong><div class="note">${escapeHtml(a.source||a.link||'')}</div></div>`;
      d.addEventListener('click', ()=> {
        if (a.link) window.open(a.link,'_blank');
      });
      adsArea.appendChild(d);
    });
  } catch (e) {
    console.error('renderNews unexpected error', e);
    const manual = await fbGetManualNews().catch(()=>[]);
    adsArea.innerHTML = '';
    if (manual.length) {
      manual.forEach(n=> {
        const d = document.createElement('div'); d.className='card'; d.style.padding='10px'; d.style.cursor='pointer';
        d.innerHTML = `<div style="display:flex;flex-direction:column;gap:4px"><strong>${escapeHtml(n.title||'(No title)')}</strong><div class="note">${escapeHtml(n.source||n.link||'')}</div></div>`;
        d.addEventListener('click', ()=> n.link && window.open(n.link,'_blank'));
        adsArea.appendChild(d);
      });
    } else {
      adsArea.innerHTML = '<div class="note">Tidak dapat memuat berita saat ini.</div>';
    }
  }
}

// small escape helper
function escapeHtml(s) {
  if (!s && s !== '') return '';
  return String(s).replace(/[&<>"'`=\/]/g, function (c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c];
  });
}

// Run on DOMContentLoaded; also refresh every 60s
document.addEventListener('DOMContentLoaded', ()=>{ renderNews(); setInterval(renderNews, 60000); });

// Also try to refresh manual news when Firestore becomes available later
// (in case firebase-init loads after news.js)
(function watchForDbReady(){
  if (window.db) return;
  const interval = setInterval(async () => {
    if (window.db) {
      clearInterval(interval);
      try { await renderNews(); } catch(e){ console.warn('renderNews after db ready failed', e); }
    }
  }, 1500);
})();
