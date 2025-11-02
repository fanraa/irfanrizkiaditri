// comments.js
// Perbaikan tombol kirim komentar: disable saat aksi, showToast pada sukses/gagal, fallback ke lokal/IDB.
// Menggunakan Supabase table 'comments' ketika tersedia.

function isOnline() { return navigator.onLine; }
function isLoggedIn() { return (typeof window.sb !== 'undefined') && !!(window.sb.auth && typeof sb.auth.getSession === 'function'); }
function isCreatorLocal() { return sessionStorage.getItem('irfan_editor_v2') === '1'; }

async function fbGetComments() {
  try {
    if (!window.sb) throw new Error('Supabase not available');
    const { data, error } = await sb.from('comments').select('*').order('ts', { ascending: false });
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('fbGetComments fallback', e);
    throw e;
  }
}
async function saveCommentFirebase(comment) {
  if (!window.sb) throw new Error('Supabase not available');
  const { data, error } = await sb.from('comments').insert([comment]);
  if (error) throw error;
  return data;
}
async function fbDeleteComment(id) {
  if (!window.sb) throw new Error('Supabase not available');
  const { data, error } = await sb.from('comments').delete().eq('id', id);
  if (error) throw error;
  return data;
}

function saveCommentLocal(comment) {
  let comments = JSON.parse(localStorage.getItem("local_comments") || "[]");
  comments.unshift(comment);
  localStorage.setItem("local_comments", JSON.stringify(comments));
}
function getLocalComments() { return JSON.parse(localStorage.getItem("local_comments") || "[]"); }
function clearLocalComments() { localStorage.removeItem("local_comments"); }

document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('sendComment');
  sendBtn?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    try {
      btn.disabled = true;
      const name = (document.getElementById('commentName')?.value || '').trim();
      const text = (document.getElementById('commentText')?.value || '').trim();
      if (!text) { showToast('Silakan tulis pesan terlebih dahulu.'); return; }

      const comment = { name: name || 'Anonim', text, ts: Date.now() };

      if (isOnline() && window.sb) {
        try {
          await saveCommentFirebase(comment);
          showToast('Komentar terkirim ke server.');
        } catch (err) {
          console.error('saveCommentFirebase error', err);
          saveCommentLocal(comment);
          showToast('Gagal kirim ke server — komentar disimpan lokal.');
        }
      } else if (isCreatorLocal()) {
        comment._pending = true;
        const id = 'c_' + Date.now();
        try {
          await IrfanIDB.add('pending_posts', { id, post: comment });
          showToast('Komentar tersimpan lokal (creator offline). Akan disinkron saat online.');
        } catch (err) {
          console.error('IDB add comment failed', err);
          saveCommentLocal(comment);
          showToast('Gagal simpan ke IndexedDB — disimpan ke localStorage.');
        }
      } else {
        saveCommentLocal(comment);
        showToast('Komentar disimpan lokal — akan dikirim saat online.');
      }

      // clear inputs
      if (document.getElementById('commentName')) document.getElementById('commentName').value = '';
      if (document.getElementById('commentText')) document.getElementById('commentText').value = '';
      // rerender
      renderSiteComments();
    } catch (err) {
      console.error('sendComment handler error', err);
      showToast('Terjadi kesalahan saat mengirim komentar.');
    } finally {
      btn.disabled = false;
    }
  });

  // initial render
  renderSiteComments();
});

async function renderSiteComments() {
  const el = document.getElementById('commentList');
  if (!el) return;
  el.innerHTML = `<div class="note">Memuat komentar...</div>`;
  let comments = [];
  try {
    if (isOnline() && window.sb) {
      try { comments = await fbGetComments(); }
      catch (e) { comments = getLocalComments(); }
    } else {
      comments = getLocalComments();
    }
  } catch (err) {
    console.warn('renderSiteComments fallback', err);
    comments = getLocalComments();
  }

  el.innerHTML = '';
  if (!comments || !comments.length) { el.innerHTML = '<div class="note">Belum ada pesan.</div>'; return; }
  comments.forEach(c => {
    const d = document.createElement('div');
    d.className = 'comment';
    d.style.padding = '10px';
    d.style.borderRadius = '8px';
    d.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.01), transparent)';
    d.style.marginBottom = '8px';
    d.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><strong>${escapeHtml(c.name || 'Anonim')}</strong></div>
        <div class="note">${new Date(c.ts || Date.now()).toLocaleDateString()}</div>
      </div>
      <div style="margin-top:8px">${escapeHtml(c.text)}</div>`;
    el.appendChild(d);
  });
}

async function syncPendingComments() {
  if (!isOnline()) return;
  try {
    const pending = await IrfanIDB.getAll('pending_posts');
    if (!pending || !pending.length) return;
    for (const item of pending) {
      const p = item.post;
      // detect comment-like pending entries
      if (p && p._pending && p.text && !p.title) {
        try {
          await saveCommentFirebase({ name: p.name || 'Creator', text: p.text, ts: p.ts });
          await IrfanIDB.del('pending_posts', item.id);
          showToast('Komentar lokal berhasil disinkron ke server.');
        } catch (err) {
          console.error('sync comment failed', err);
        }
      }
    }
    renderSiteComments();
  } catch (err) {
    console.error('syncPendingComments fatal', err);
  }
}

window.addEventListener('online', () => { trySyncComments(); syncPendingComments(); });

async function trySyncComments() {
  if (isOnline() && window.sb) {
    const localComments = getLocalComments();
    if (localComments.length) {
      for (const c of localComments) {
        try { await saveCommentFirebase(c); } catch (err) { console.error('trySyncComments save error', err); }
      }
      clearLocalComments();
      showToast('Komentar lokal berhasil disinkron ke server.');
      renderSiteComments();
    }
  }
}

// small helper to escape text content
function escapeHtml(s) {
  if (!s && s !== '') return '';
  return String(s).replace(/[&<>"'`=\/]/g, function (c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c];
  });
}