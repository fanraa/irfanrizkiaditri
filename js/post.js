// post.js
// Tanggung jawab:
// - Mengelola posting: render, create, edit, delete, sync pending.
// - Menggunakan Supabase (sb) sebagai backend; fallback ke localStorage/IndexedDB saat offline.

// Note: This module seeds a welcome post locally if there are no posts,
// to ensure the UI shows at least one example post (as requested).

function isOnline() { return navigator.onLine; }
function isLoggedIn() { return (typeof window.sb !== 'undefined') && !!(window.sb.auth && typeof sb.auth.getSession === 'function'); }
function isCreator() { return sessionStorage.getItem('irfan_editor_v2') === '1'; }

function savePostLocal(post) {
  let posts = JSON.parse(localStorage.getItem("local_posts") || "[]");
  posts.unshift(post);
  localStorage.setItem("local_posts", JSON.stringify(posts));
}
function getLocalPosts() { return JSON.parse(localStorage.getItem("local_posts") || "[]"); }
function clearLocalPosts() { localStorage.removeItem("local_posts"); }

async function fbGetPosts() {
  if (!window.sb) throw new Error('Supabase not available');
  const { data, error } = await sb.from("posts").select("*").order('ts', { ascending: false });
  if (error) throw error;
  return data;
}
async function fbAddPost(post) {
  if (!window.sb) throw new Error('Supabase not available');
  const { data, error } = await sb.from("posts").insert([post]);
  if (error) throw error;
  return data;
}
async function fbUpdatePost(id, dataObj) {
  if (!window.sb) throw new Error('Supabase not available');
  const { data, error } = await sb.from("posts").update(dataObj).eq('id', id);
  if (error) throw error;
  return data;
}
async function fbDeletePost(id) {
  if (!window.sb) throw new Error('Supabase not available');
  const { data, error } = await sb.from("posts").delete().eq('id', id);
  if (error) throw error;
  return data;
}

async function uploadFileToStorage(file, onProgress) {
  if (!file) return '';
  if (typeof window.uploadAvatar === 'function') return await window.uploadAvatar(file, onProgress);
  throw new Error('uploadAvatar not available');
}

async function renderPosts() {
  const container = document.getElementById('postList');
  if (!container) return;
  container.innerHTML = '';
  let posts = [];
  try {
    if (isOnline() && window.sb) posts = await fbGetPosts();
    else posts = getLocalPosts();
  } catch (err) {
    console.warn('renderPosts fallback to local', err);
    posts = getLocalPosts();
  }

  // If nothing found, seed a single welcome post locally for the first-time user
  if (!posts || !posts.length) {
    const seeded = getLocalPosts();
    if (!seeded || !seeded.length) {
      const welcome = {
        id: 'local_welcome_1',
        title: 'Selamat Datang di irfanrizkiaditri.site',
        caption: 'Terima kasih telah berkunjung! Ini adalah postingan sambutan. Nikmati konten dan silakan tinggalkan komentar.',
        img: 'https://images.unsplash.com/photo-1503264116251-35a269479413?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=8f4f2c2e0a2a7b1245edb3d8a2f2c35d', // free-to-use image from Unsplash
        ts: Date.now(),
        likes: 0,
        comments: [],
        author: 'Irfan'
      };
      savePostLocal(welcome);
      posts = [welcome];
    } else {
      posts = seeded;
    }
  }

  if (!posts || !posts.length) {
    container.innerHTML = `<div class="note-empty">Tidak ada konten saat ini. Konten akan muncul secara berkala.</div>`;
    return;
  }

  posts.forEach(p => {
    const div = document.createElement('div');
    div.className = 'post fade-in';
    div.tabIndex = 0;
    div.innerHTML = `
      <div class="post-thumb">${p.img ? `<img src="${p.img}" alt="">` : ''}</div>
      <div class="post-body">
        <h4>${escapeHtml(p.title || '(Tanpa judul)')}</h4>
        <p>${escapeHtml(String(p.caption || '')).slice(0,200)}${(p.caption||'').length>200?'...':''}</p>
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
  const post = { title, caption, img: '', ts: Date.now(), likes: 0, comments: [], author: (window.sb && sb.auth && sb.auth.getUser) ? (await sb.auth.getUser()).data?.user?.user_metadata?.full_name || 'Creator' : 'Creator' };

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
        if (window.sb) {
          await fbAddPost(post);
          showToast('Posting berhasil ditambahkan ke server.');
        } else {
          savePostLocal(post);
          showToast('Posting disimpan lokal (perlu backend untuk upload ke server).');
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
    if (isOnline() && window.sb) {
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
        try {
          const url = await uploadFileToStorage(file, (pct) => {});
          p.img = url;
        } catch (err) {
          console.error('upload pending file failed', err);
          continue;
        }
      }
      await fbAddPost({ title: p.title, caption: p.caption, img: p.img, ts: p.ts, likes: p.likes || 0, comments: p.comments || [], author: p.author || 'Creator' });
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
  if (!isOnline() || !window.sb) return;
  let localPosts = getLocalPosts();
  if (localPosts.length) {
    for (const p of localPosts) { try { await fbAddPost(p); } catch (err) { console.error('Gagal sinkron post:', err); } }
    clearLocalPosts();
    showToast('Posting lokal berhasil disinkron ke server.');
    renderPosts();
  }
}

window.createPost = createPost;
window.renderPosts = renderPosts;
window.syncPendingPosts = syncPendingPosts;

// small helper to avoid injecting raw HTML unescaped
function escapeHtml(s) {
  if (!s && s !== '') return '';
  return String(s).replace(/[&<>"'`=\/]/g, function (c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c];
  });
}