// visitors.js
// Tanggung jawab:
// - Mengelola visitor counter: inisialisasi, increment sekali per device, sinkronisasi, reset oleh creator.
// - Perbaikan utama:
//   * Increment sekali per device (flag visitors_seen_v2).
//   * Default inisialisasi 200-220 jika dokumen belum ada.
//   * Update tampilan dan localStorage secara konsisten.
// Berpengaruh pada: header visitors (visitorSmall) dan editor reset visitor.

const visitorDisplay = document.getElementById('visitorSmall');
const visitorDoc = (window.db && typeof db.collection === 'function') ? db.collection('siteData').doc('visitors') : null;
const LOCAL_KEY = 'visitors_count_v2';
const SEEN_KEY = 'visitors_seen_v2';

async function initVisitors(){
  if(!visitorDisplay) return;
  visitorDisplay.textContent = 'Visitors: —';
  if (!visitorDoc) {
    const cached = localStorage.getItem(LOCAL_KEY);
    const count = cached ? Number(cached) : 200 + Math.floor(Math.random()*21);
    visitorDisplay.textContent = 'Visitors: ' + count;
    localStorage.setItem(LOCAL_KEY, count);
    return;
  }

  try {
    const doc = await visitorDoc.get();
    if (!doc.exists) {
      const init = 200 + Math.floor(Math.random() * 21);
      await visitorDoc.set({ count: init });
      localStorage.setItem(LOCAL_KEY, init);
      visitorDisplay.textContent = 'Visitors: ' + init;
      return;
    }

    const serverCount = Number(doc.data().count || 0);
    const seen = localStorage.getItem(SEEN_KEY);
    if (seen) {
      visitorDisplay.textContent = 'Visitors: ' + serverCount;
      localStorage.setItem(LOCAL_KEY, serverCount);
      return;
    }

    const newCount = serverCount + 1;
    await visitorDoc.update({ count: newCount });
    localStorage.setItem(LOCAL_KEY, newCount);
    localStorage.setItem(SEEN_KEY, Date.now().toString());
    visitorDisplay.textContent = 'Visitors: ' + newCount;
  } catch (e) {
    console.error('initVisitors', e);
    const cached = localStorage.getItem(LOCAL_KEY);
    if (cached) visitorDisplay.textContent = 'Visitors: ' + cached;
    else visitorDisplay.textContent = 'Visitors: 200';
  }
}

window.addEventListener('online', async () => {
  try {
    if (!visitorDoc) return;
    const doc = await visitorDoc.get();
    if (doc && doc.exists) {
      const c = Number(doc.data().count || 0);
      localStorage.setItem(LOCAL_KEY, c);
      visitorDisplay.textContent = 'Visitors: ' + c;
    }
  } catch (e) { console.warn('visitor sync', e); }
});

document.addEventListener('DOMContentLoaded', initVisitors);
