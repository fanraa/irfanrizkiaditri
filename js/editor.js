// editor.js (refactor + UX upgrade)
// - Defensive event handling (no duplicate listeners, cleanup on close)
// - Profile editor: preview, file validation, upload via handleAvatarFileUpload/uploadAvatar, progress UI
// - Metadata save (fbSetProfile) with fallbacks to IndexedDB when offline or on error
// - Posts panel improved layout and safer event wiring
// - Small UI touches: fade-in animation, disabled state, data-hint attributes for tooltip hints
// - Uses showToast and Utils if available; falls back gracefully

const EDITOR = { user: 'irfanrizkiaditri', pin: '47326' };

function isCreator() { return sessionStorage.getItem("irfan_editor_v2") === '1'; }
function setCreator(val) {
  if (val) sessionStorage.setItem("irfan_editor_v2", '1');
  else sessionStorage.removeItem("irfan_editor_v2");
  updateEditorUI();
  showToast && showToast(val ? 'Mode Creator aktif' : 'Mode Creator nonaktif');
}

// Helper to safely query element
function $id(id) { return document.getElementById(id); }

// Keep references for cleanup
const EditorState = {
  currentSection: null,
  listeners: [],
  baseIndex: 0
};

function addListener(target, evt, fn, opts) {
  if (!target || !evt || !fn) return;
  target.addEventListener(evt, fn, opts);
  EditorState.listeners.push({ target, evt, fn, opts });
}
function removePanelListeners() {
  // Remove only listeners added after baseIndex (panel-specific)
  const toRemove = EditorState.listeners.splice(EditorState.baseIndex || 0);
  for (const l of toRemove) {
    try { l.target.removeEventListener(l.evt, l.fn, l.opts); } catch (e) {}
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Open login modal
  addListener($id('openEditor'), 'click', () => {
    const m = $id('loginModal');
    if (m) { m.classList.add('show'); m.setAttribute('aria-hidden','false'); document.body.style.overflow = 'hidden'; }
  });

  addListener($id('closeLogin'), 'click', () => {
    const m = $id('loginModal');
    if (m) { m.classList.remove('show'); m.setAttribute('aria-hidden','true'); document.body.style.overflow = ''; }
  });

  // Creator login (local)
  addListener($id('doLogin'), 'click', () => {
    try {
      const u = ($id('editorUser')?.value || '').trim();
      const p = ($id('editorPin')?.value || '').trim();
      if (u === EDITOR.user && p === EDITOR.pin) {
        setCreator(true);
        $id('loginModal')?.classList.remove('show');
        document.body.style.overflow = '';
        showToast && showToast('Akses creator berhasil.');
      } else {
        showToast && showToast('Username atau PIN salah.');
      }
    } catch (e) {
      console.error('doLogin error', e);
      showToast && showToast('Terjadi kesalahan saat login (console error).');
    }
  });

  // Google login inside modal
  addListener($id('googleLogin'), 'click', () => {
    try {
      if (!window.sb) return showToast && showToast('Auth tidak tersedia');
      // use supabase client if available
      window.sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })
        .catch(error => {
          console.error('Google login error', error);
          showToast && showToast('Gagal masuk: ' + (error.message || error));
        });
    } catch (e) {
      console.error('googleLogin handler error', e);
      showToast && showToast('Autentikasi Google tidak tersedia.');
    }
  });

  // Logout creator (local)
  addListener($id('btnLogout'), 'click', () => {
    if (!confirm('Keluar dari mode editor?')) return;
    setCreator(false);
  });

  updateEditorUI();

  // Toolbar bindings
  addListener($id('btnEditProfile'), 'click', () => openEditorPanel('profile'));
  addListener($id('btnManagePosts'), 'click', () => openEditorPanel('posts'));
  addListener($id('btnManageComments'), 'click', () => openEditorPanel('comments'));
  addListener($id('btnManageReviews'), 'click', () => openEditorPanel('reviews'));
  addListener($id('btnManageNews'), 'click', () => openEditorPanel('news'));
  addListener($id('closePanel'), 'click', () => closeEditorPanel());

  // Reset visitors (creator)
  addListener($id('btnResetVisitors'), 'click', async () => {
    if (!isCreator()) return showToast && showToast('Akses ditolak. Harap masuk sebagai creator.');
    if (!confirm('Reset counter pengunjung menjadi 200 di cloud?')) return;
    try {
      if (!window.sb) throw new Error('Supabase tidak tersedia');
      await sb.from('site_data').upsert([{ key: 'visitors', value: JSON.stringify({ count: 200 }) }]);
      const vEl = $id('visitorSmall');
      if (vEl) vEl.textContent = 'Visitors: 200';
      localStorage.setItem('visitors_count_v2', 200);
      showToast && showToast('Counter pengunjung berhasil di-reset.');
    } catch (err) {
      console.error('reset visitors failed', err);
      showToast && showToast('Gagal mereset counter pengunjung.');
    }
  });

  // mark base index so panel-specific listeners won't remove initial global ones
  EditorState.baseIndex = EditorState.listeners.length;
});


// update editor toolbar visibility
function updateEditorUI() {
  const toolbar = $id('editorToolbar');
  if (isCreator()) { toolbar?.classList.add('show'); toolbar?.setAttribute('aria-hidden','false'); }
  else { toolbar?.classList.remove('show'); toolbar?.setAttribute('aria-hidden','true'); }
  window.updateProjectsNote && window.updateProjectsNote();
}

// close editor panel and cleanup listeners related to panel
function closeEditorPanel() {
  const modal = $id('editorPanel');
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
  // remove only panel-specific listeners
  removePanelListeners();
}

// MAIN: open editor panel (profile/posts/...)
async function openEditorPanel(section) {
  if (!isCreator()) return showToast && showToast('Silakan masuk sebagai creator terlebih dahulu untuk mengakses panel ini.');
  const modal = $id('editorPanel');
  if (!modal) return showToast && showToast('Editor panel tidak ditemukan.');
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
  const body = $id('panelBody');
  if (!body) return showToast && showToast('Panel body tidak ditemukan.');
  $id('panelTitle') && ($id('panelTitle').textContent = 'Editor — ' + section);
  // add fade-in
  modal.querySelector('.dialog')?.classList.add('fade-in');

  // set current section
  EditorState.currentSection = section;

  try {
    if (section === 'profile') {
      await buildProfileEditor(body);
      return;
    }

    if (section === 'posts') {
      await buildPostsEditor(body);
      return;
    }

    // other sections (comments/reviews/news) fallback
    body.innerHTML = `<div class="note">Bagian <strong>${escapeHtml(section)}</strong> sedang dalam pengembangan. Gunakan panel Posts / Profile untuk operasi utama.</div>`;
  } catch (err) {
    console.error('openEditorPanel fatal', err);
    body.innerHTML = `<div class="note">Terjadi kesalahan saat membuka panel editor: ${escapeHtml(String(err))}</div>`;
    showToast && showToast('Gagal membuka panel editor (lihat console).');
  }
}

/* ---------------------------
   PROFILE EDITOR BUILDER
   --------------------------- */
async function buildProfileEditor(container) {
  container.innerHTML = `<div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
    <div style="min-width:160px">
      <div id="editorAvatarWrap" style="width:160px;height:160px;border-radius:12px;overflow:hidden;border:1px solid rgba(0,0,0,0.06);background:var(--card);display:flex;align-items:center;justify-content:center">
        <img id="editorAvatarPreview" src="" alt="Preview" style="width:100%;height:100%;object-fit:cover;display:block">
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-direction:column">
        <input id="editorAvatarInput" type="file" accept="image/*">
        <label style="font-size:12px;color:var(--muted)"><input id="avatarLockCheckbox" type="checkbox"> Kunci Avatar</label>
      </div>
    </div>

    <div style="flex:1;min-width:260px">
      <input id="editorName" placeholder="Nama" style="width:100%;padding:10px;border-radius:8px;margin-bottom:8px">
      <input id="editorRole" placeholder="Peran" style="width:100%;padding:10px;border-radius:8px;margin-bottom:8px">
      <textarea id="editorBio" placeholder="Bio" style="width:100%;padding:10px;border-radius:8px;min-height:120px"></textarea>

      <div style="display:flex;gap:8px;margin-top:8px">
        <input id="editorLocation" placeholder="Lokasi" style="flex:1;padding:8px;border-radius:8px">
        <input id="editorFamily" placeholder="Family" style="flex:1;padding:8px;border-radius:8px">
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <input id="editorStudy" placeholder="Bidang studi" style="flex:1;padding:8px;border-radius:8px">
        <input id="editorCampus" placeholder="Kampus" style="flex:1;padding:8px;border-radius:8px">
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
        <button class="btn ghost" id="cancelProfile" data-hint="Batal dan tutup editor">Batal</button>
        <button class="btn" id="saveProfile" data-hint="Simpan perubahan profil">Simpan</button>
      </div>
    </div>
  </div>`;

  // load existing profile
  let profile = null;
  try {
    profile = await fbGetProfile();
  } catch (e) {
    console.warn('fbGetProfile failed', e);
    profile = null;
  }
  if (!profile) profile = { name: '', role: '', bio: '', avatar: '', avatarLocked: false, location: '', family: '', study: '', campus: '' };

  // populate fields
  $id('editorName').value = profile.name || '';
  $id('editorRole').value = profile.role || '';
  $id('editorBio').value = profile.bio || '';
  $id('editorLocation').value = profile.location || '';
  $id('editorFamily').value = profile.family || '';
  $id('editorStudy').value = profile.study || '';
  $id('editorCampus').value = profile.campus || '';
  $id('avatarLockCheckbox').checked = !!profile.avatarLocked;

  const avatarPreview = $id('editorAvatarPreview');
  if (avatarPreview) avatarPreview.src = (profile.avatar && profile.avatar.trim()) ? profile.avatar : getIllustrativeAvatar();

  // local state for selected file
  let selectedFile = null;

  // file input handling with validation
  const fileInput = $id('editorAvatarInput');
  const fileChangeHandler = (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    // validate size (use Utils if available)
    const maxMB = 10;
    if (window.Utils && typeof Utils.fileSizeValid === 'function') {
      if (!Utils.fileSizeValid(f, maxMB)) {
        showToast && showToast(`Ukuran file terlalu besar. Maks ${maxMB}MB.`);
        fileInput.value = '';
        return;
      }
    } else {
      const limit = maxMB * 1024 * 1024;
      if (f.size > limit) {
        showToast && showToast(`Ukuran file terlalu besar. Maks ${maxMB}MB.`);
        fileInput.value = '';
        return;
      }
    }
    selectedFile = f;
    try { avatarPreview.src = URL.createObjectURL(f); } catch (e) { console.warn('preview fail', e); }
  };
  addListener(fileInput, 'change', fileChangeHandler);

  // cancel handler
  addListener($id('cancelProfile'), 'click', () => closeEditorPanel());

  // save handler - robust
  addListener($id('saveProfile'), 'click', async function onSave(e) {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';
    try {
      const updated = {
        name: $id('editorName').value.trim() || profile.name,
        role: $id('editorRole').value.trim() || profile.role,
        bio: $id('editorBio').value.trim() || profile.bio,
        location: $id('editorLocation').value.trim() || profile.location,
        family: $id('editorFamily').value.trim() || profile.family,
        study: $id('editorStudy').value.trim() || profile.study,
        campus: $id('editorCampus').value.trim() || profile.campus,
        avatarLocked: !!$id('avatarLockCheckbox').checked
      };

      // If a new avatar file selected...
      if (selectedFile) {
        // If offline, save dataURL to IDB for later sync
        if (!navigator.onLine) {
          const reader = new FileReader();
          reader.onload = async (ev2) => {
            updated.avatar = ev2.target.result;
            updated.avatarLocked = true;
            try {
              await IrfanIDB.add('pending_posts', { id: 'profile_' + Date.now(), post: { type: 'profile', data: updated } });
              showToast && showToast('Offline: profil disimpan lokal. Akan disinkron saat online.');
              await applyProfile();
              closeEditorPanel();
            } catch (err) {
              console.error('IDB save failed', err);
              showToast && showToast('Gagal menyimpan lokal (IndexedDB).');
            }
          };
          reader.readAsDataURL(selectedFile);
          btn.disabled = false;
          btn.textContent = 'Simpan';
          return;
        }

        // Online: attempt upload using handleAvatarFileUpload (recommended)
        try {
          if (typeof handleAvatarFileUpload === 'function') {
            // handleAvatarFileUpload will upload and save profile in DB
            await handleAvatarFileUpload(selectedFile);
            // handleAvatarFileUpload calls applyProfile internally then returns
            closeEditorPanel();
            return;
          } else {
            // Fallback: direct uploadAvatar -> set profile
            const url = await uploadAvatar(selectedFile);
            updated.avatar = url;
            updated.avatarLocked = true;
            if (window.sb) {
              await fbSetProfile(updated);
              showToast && showToast('Profil diperbarui di cloud.');
            } else {
              await IrfanIDB.add('pending_posts', { id: 'profile_' + Date.now(), post: { type: 'profile', data: updated } });
              showToast && showToast('Profil disimpan lokal (fallback).');
            }
          }
        } catch (err) {
          console.error('avatar upload fail', err);
          // fallback: save as dataURL to IDB
          const reader = new FileReader();
          reader.onload = async (ev2) => {
            updated.avatar = ev2.target.result;
            updated.avatarLocked = true;
            try {
              await IrfanIDB.add('pending_posts', { id: 'profile_' + Date.now(), post: { type: 'profile', data: updated } });
              showToast && showToast('Gagal upload ke storage — profil disimpan lokal.');
            } catch (err2) {
              console.error('IDB fallback failed', err2);
              showToast && showToast('Gagal menyimpan profil (lihat console).');
            }
          };
          reader.readAsDataURL(selectedFile);
        }
      } else {
        // No new avatar file: just update metadata
        updated.avatar = profile.avatar || '';
        if (navigator.onLine && window.sb) {
          try { await fbSetProfile(updated); showToast && showToast('Profil diperbarui di cloud.'); }
          catch (e) { console.warn('fbSetProfile failed', e); await IrfanIDB.add('pending_posts', { id: 'profile_' + Date.now(), post: { type: 'profile', data: updated } }); showToast && showToast('Profil disimpan lokal (gagal ke cloud).'); }
        } else {
          await IrfanIDB.add('pending_posts', { id: 'profile_' + Date.now(), post: { type: 'profile', data: updated } });
          showToast && showToast('Profil disimpan lokal (offline).');
        }
      }

      // apply local changes and close
      await applyProfile();
      closeEditorPanel();

    } catch (err) {
      console.error('saveProfile error', err);
      showToast && showToast('Terjadi kesalahan saat menyimpan profil.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Simpan';
    }
  });
}

/* ---------------------------
   POSTS EDITOR BUILDER
   --------------------------- */
async function buildPostsEditor(container) {
  // fetch posts (resilient)
  let posts = [];
  try { posts = await (typeof fbGetPosts === 'function' ? fbGetPosts() : getLocalPosts()); } catch (e) { console.warn('fbGetPosts failed', e); posts = getLocalPosts(); }

  // build UI, cleaner layout
  container.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;gap:8px;align-items:center">
      <input id="newPostTitle" placeholder="Judul" style="flex:1;padding:8px;border-radius:8px">
      <input id="newPostImg" type="file" accept="image/*">
      <button class="btn" id="createPost" data-hint="Buat posting baru">Buat</button>
    </div>
    <div id="postsList" style="display:flex;flex-direction:column;gap:8px;max-height:46vh;overflow:auto;padding-right:6px"></div>
  </div>`;

  const listEl = $id('postsList');
  if (!posts || !posts.length) {
    listEl.innerHTML = `<div class="note">Belum ada posting.</div>`;
  } else {
    listEl.innerHTML = '';
    posts.forEach(p => {
      const item = document.createElement('div');
      item.className = 'card';
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';
      item.style.padding = '10px';
      item.innerHTML = `<div style="display:flex;flex-direction:column">
        <strong>${escapeHtml(p.title||'(Tanpa Judul)')}</strong>
        <div class="note" style="font-size:12px">${new Date(p.ts || Date.now()).toLocaleString()}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" data-edit="${escapeHtml(p.id||'')}">Edit</button>
        <button class="btn ghost" data-del="${escapeHtml(p.id||'')}">Hapus</button>
      </div>`;
      listEl.appendChild(item);
    });
  }

  // create post
  addListener($id('createPost'), 'click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const title = ($id('newPostTitle')?.value || '').trim();
      const file = $id('newPostImg')?.files?.[0];
      if (!title) { showToast && showToast('Judul tidak boleh kosong.'); return; }
      await createPost({ title, caption: '(belum ada caption)', file });
      showToast && showToast('Permintaan pembuatan posting diproses.');
      // rebuild panel
      await buildPostsEditor(container);
    } catch (err) {
      console.error('createPost error', err);
      showToast && showToast('Gagal membuat posting.');
    } finally {
      btn.disabled = false;
    }
  });

  // delegate edit/delete
  listEl.querySelectorAll('[data-del]').forEach(b => {
    addListener(b, 'click', async () => {
      const id = b.getAttribute('data-del');
      if (!id) return;
      if (!confirm('Hapus posting ini?')) return;
      try { await fbDeletePost(id); showToast && showToast('Posting berhasil dihapus.'); } catch (err) { console.error(err); showToast && showToast('Gagal menghapus posting.'); }
      await buildPostsEditor(container);
    });
  });

  listEl.querySelectorAll('[data-edit]').forEach(b => {
    addListener(b, 'click', async () => {
      const id = b.getAttribute('data-edit');
      try {
        const postsArr = await (typeof fbGetPosts === 'function' ? fbGetPosts() : getLocalPosts());
        const p = (postsArr || []).find(x => String(x.id) === String(id));
        if (!p) return showToast && showToast('Posting tidak ditemukan.');
        // Replace content with edit form
        container.innerHTML = `<div>
          <h4>Edit Post</h4>
          <input id="editTitle" value="${escapeHtml(p.title||'')}" style="padding:8px;border-radius:8px;width:100%;margin-bottom:8px">
          <textarea id="editCaption" style="min-height:140px;padding:8px;border-radius:8px;width:100%">${escapeHtml(p.caption||'')}</textarea>
          <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
            <input id="editImg" type="file" accept="image/*">
            <button class="btn ghost" id="cancelEdit">Batal</button>
            <button class="btn" id="saveEdit">Simpan</button>
          </div>
        </div>`;
        addListener($id('cancelEdit'), 'click', () => buildPostsEditor(container));
        addListener($id('saveEdit'), 'click', async () => {
          const saveBtn = $id('saveEdit');
          saveBtn.disabled = true;
          try {
            let title = ($id('editTitle')?.value || '').trim() || p.title;
            let caption = ($id('editCaption')?.value || '').trim() || p.caption;
            const fileinp = $id('editImg');
            if (fileinp?.files && fileinp.files[0]) {
              // handle file upload similar to create/edit earlier
              const file = fileinp.files[0];
              if (navigator.onLine) {
                const url = await uploadFileToStorage(file);
                await fbUpdatePost(id, { title, caption, img: url });
                showToast && showToast('Posting diperbarui.');
                await buildPostsEditor(container);
              } else {
                const reader = new FileReader();
                reader.onload = async (evt) => {
                  const dataUrl = evt.target.result;
                  await IrfanIDB.add('pending_posts', { id: 'edit_'+Date.now(), post: { type:'edit', id, title, caption, img: dataUrl } });
                  showToast && showToast('Perubahan disimpan lokal (offline). Akan disinkron saat online.');
                  await buildPostsEditor(container);
                };
                reader.readAsDataURL(file);
              }
            } else {
              await fbUpdatePost(id, { title, caption });
              showToast && showToast('Posting diperbarui.');
              await buildPostsEditor(container);
            }
          } catch (err) {
            console.error('saveEdit error', err);
            showToast && showToast('Gagal menyimpan perubahan.');
          } finally {
            saveBtn.disabled = false;
          }
        });
      } catch (err) {
        console.error('edit handler error', err);
        showToast && showToast('Gagal memuat posting untuk diedit.');
      }
    });
  });
}

/* ---------------------------
   Utilities
   --------------------------- */
function escapeHtml(s) {
  if (!s && s !== '') return '';
  return String(s).replace(/[&<>"'`=\/]/g, function (c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c];
  });
}

// small illustrative avatar fallback (same as profile.js)
function getRandomSeed() { return 'irf_seed_' + (Date.now() + '_' + Math.floor(Math.random() * 10000)); }
function getIllustrativeAvatar(seed) { seed = seed || getRandomSeed(); return `https://api.dicebear.com/6.x/adventurer-neutral/svg?seed=${encodeURIComponent(seed)}&scale=90`; }

/* Exports for other modules if necessary */
window.updateEditorUI = updateEditorUI;
window.openEditorPanel = openEditorPanel;
window.closeEditorPanel = closeEditorPanel;