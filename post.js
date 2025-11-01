// post.js
// Tanggung jawab:
// - Mengelola posting: render, create, edit, delete, sync pending.
// - Perbaikan utama:
//   * Pastikan tombol "Buat" membaca file input dan bereaksi.
//   * Jika offline, creator menyimpan posting ke IndexedDB sebagai pending (dataURL untuk file).
//   * Jika online, upload file ke storage dengan uploadAvatar; fallback ke menyimpan lokal saat upload gagal.
//   * Semua operasi melaporkan status via showToast dan console.
// Berpengaruh pada: daftar posting (postList), post modal, editor panel posts.

function isOnline() { return navigator.onLine; }
function isLoggedIn() { return (typeof auth !== 'undefined') && !!auth.currentUser; }
function isCreator() { return sessionStorage.getItem('irfan_editor_v2') === '1'; }

function savePostLocal(post) {
  let posts = JSON.parse(localStorage.getItem("local_posts") || "[]");
  posts.unshift(post);
  localStorage.setItem("local_posts", JSON.stringify(posts));
}
function getLocalPosts() { return JSON.parse(localStorage.getItem("local_posts") || "[]"); }
function clearLocalPosts() { localStorage.removeItem("local_posts"); }

async function fbGetPosts() {
  try {
    const snap = await db.collection("posts").orderBy("ts", "desc").get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error('fbGetPosts error', e);
    throw e;
  }
}
async function fbAddPost(post) { return db.collection("posts").add(post); }
async function fbUpdatePost(id, data) { return db.collection("posts").doc(id).update(data); }
async function fbDeletePost(id) { return db.collection("posts").doc(id).delete(); }

async function uploadFileToStorage(file, onProgress) {
  if (!file) return '';
  if (typeof uploadAvatar !== 'function') throw new Error('uploadAvatar not available');
  return await uploadAvatar(file, onProgress);
}

async function renderPosts() {
  const container = document.getElementById('postList');
  if (!container) return;
  container.innerHTML = '';
  let posts = [];
  try {
    if (isOnline() && isLoggedIn()) posts = await fbGetPosts();
    else posts = getLocalPosts();
  } catch (err) {
    console.warn('renderPosts fallback to local', err);
    posts = getLocalPosts();
  }

  if (!posts || !posts.length) {
    container.innerHTML = `<div class="note-empty">Tidak ada konten saat ini. Konten akan muncul secara berkala.</div>`;
    return;
  }
  posts.forEach(p => {
    const div = document.createElement('div');
    div.className = 'post';
    div.tabIndex = 0;
    div.innerHTML = `
      <div class="post-thumb">${p.img ? `<img src="${p.img}" alt="">` : ''}</div>
      <div class="post-body">
        <h4>${p.title || '(Tanpa judul)'}</h4>
        <p>${String(p.caption || '').slice(0,200)}${(p.caption||'').length>200?'...':''}</p>
        <div class="note" style="margin-top:6px;">${new Date(p.ts || Date.now()).toLocaleDateString()} • ❤️ ${p.likes || 0}</div>
      </div>`;
    div.addEventListener('click', () => openPostModal(p));
    container.appendChild(div);
  });
}

function openPostModal(p) {
  document.getElementById('postModalTitle').textContent = p.title || '(Tanpa judul)';
  document.getElementById('postModalImg').src = p.img || '';
  document.getElementById('postModalCaption').textContent = p.caption || '';
  document.getElementById('postMeta').textContent = `oleh ${p.author || 'Editor'} • ${new Date(p.ts || Date.now()).toLocaleString()}`;
  document.getElementById('postModal')?.classList.add('show');
}

async function createPost({ title, caption, file }, onProgress) {
  const post = { title, caption, img: '', ts: Date.now(), likes: 0, comments: [], author: (auth && auth.currentUser && auth.currentUser.displayName) || 'Creator' };

  if (file) {
    // validate file size if possible
    if (typeof Utils !== 'undefined' && !Utils.fileSizeValid(file, 10)) {
      showToast('Ukuran file terlalu besar. Maks 10MB.');
      return;
    }

    if (isOnline()) {
      try {
        const url = await uploadFileToStorage(file, onProgress);
        post.img = url;
        if (isLoggedIn() || isCreator()) {
          await fbAddPost(post);
          showToast('Posting berhasil ditambahkan ke server.');
        } else {
          savePostLocal(post);
          showToast('Posting disimpan lokal (perlu login untuk upload ke server).');
        }
        await renderPosts();
        return;
      } catch (err) {
        console.error('Upload failed', err);
        // fallback for creator: save as dataURL to IndexedDB pending_posts
        if (isCreator()) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            post.img = e.target.result; // dataURL
            post._pending = true;
            const id = 'p_' + Date.now();
            await IrfanIDB.add('pending_posts', { id, post });
            showToast('Upload gagal — posting disimpan lokal dan akan disinkron saat online.');
            renderPosts();
          };
          reader.readAsDataURL(file);
          return;
        } else {
          savePostLocal(post);
          showToast('Upload gagal — posting disimpan lokal.');
          return;
        }
      }
    } else {
      // offline
      if (isCreator()) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          post.img = e.target.result;
          post._pending = true;
          const id = 'p_' + Date.now();
          await IrfanIDB.add('pending_posts', { id, post });
          showToast('Offline: posting disimpan lokal (creator). Akan disinkron saat online.');
          renderPosts();
        };
        reader.readAsDataURL(file);
        return;
      } else {
        showToast('Anda harus online untuk mengunggah gambar. Posting disimpan lokal sebagai teks.');
        savePostLocal(post);
        renderPosts();
        return;
      }
    }
  } else {
    // text only
    if (isOnline() && (isLoggedIn() || isCreator())) {
      await fbAddPost(post);
      showToast('Posting teks ditambahkan.');
    } else if (isCreator()) {
      post._pending = true;
      await IrfanIDB.add('pending_posts', { id: 'p_' + Date.now(), post });
      showToast('Posting teks disimpan lokal (creator).');
    } else {
      savePostLocal(post);
      showToast('Posting teks disimpan lokal — akan dikirim saat online.');
    }
    renderPosts();
  }
}

async function syncPendingPosts() {
  if (!isOnline()) return;
  const pending = await IrfanIDB.getAll('pending_posts');
  if (!pending || !pending.length) return;
  for (const item of pending) {
    try {
      const p = item.post;
      if (p.img && p.img.startsWith('data:')) {
        const blob = dataURLToBlob(p.img);
        const file = new File([blob], `post_${Date.now()}.png`, { type: blob.type });
        const url = await uploadFileToStorage(file, (pct) => {});
        p.img = url;
      }
      await fbAddPost({ title: p.title, caption: p.caption, img: p.img, ts: p.ts, likes: p.likes, comments: p.comments, author: p.author });
      await IrfanIDB.del('pending_posts', item.id);
      showToast('Posting lokal berhasil disinkron ke server.');
    } catch (err) {
      console.error('Sync post failed', err);
    }
  }
  renderPosts();
}

function dataURLToBlob(dataurl) {
  const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]); let n = bstr.length; const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

window.addEventListener('online', async () => { await syncPendingPosts(); trySyncPosts(); });
document.addEventListener('DOMContentLoaded', renderPosts);

async function trySyncPosts() {
  if (isLoggedIn() && isOnline()) {
    let localPosts = getLocalPosts();
    if (localPosts.length) {
      for (const p of localPosts) { try { await fbAddPost(p); } catch (err) { console.error('Gagal sinkron post:', err); } }
      clearLocalPosts();
      showToast('Posting lokal berhasil disinkron ke server.');
      renderPosts();
    }
  }
}

window.createPost = createPost;
window.renderPosts = renderPosts;
window.syncPendingPosts = syncPendingPosts;