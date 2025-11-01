// editor.js
// Editor panel + creator login
// Perbaikan utama:
// - Defensive coding: setiap langkah cek elemen ada, tangani error dengan showToast dan console.
// - Panel profile selalu membuat UI (fallback) meskipun fbGetProfile gagal.
// - File input dan tombol simpan dipasang listener dengan jelas, tombol dinonaktifkan saat operasi.
// - Login creator: user "irfanrizkiaditri", PIN "47326".

const EDITOR = { user: 'irfanrizkiaditri', pin: '47326' };

function isCreator() { return sessionStorage.getItem("irfan_editor_v2") === '1'; }
function setCreator(val) {
  if (val) sessionStorage.setItem("irfan_editor_v2", '1');
  else sessionStorage.removeItem("irfan_editor_v2");
  updateEditorUI();
  showToast(val ? 'Mode Creator aktif' : 'Mode Creator nonaktif');
}

document.addEventListener('DOMContentLoaded', () => {
  // Open login modal
  document.getElementById('openEditor')?.addEventListener('click', () => {
    const m = document.getElementById('loginModal');
    if (m) { m.classList.add('show'); m.setAttribute('aria-hidden','false'); }
  });

  document.getElementById('closeLogin')?.addEventListener('click', () => {
    const m = document.getElementById('loginModal');
    if (m) { m.classList.remove('show'); m.setAttribute('aria-hidden','true'); }
  });

  // Creator login (local)
  document.getElementById('doLogin')?.addEventListener('click', () => {
    try {
      const u = (document.getElementById('editorUser')?.value || '').trim();
      const p = (document.getElementById('editorPin')?.value || '').trim();
      if (u === EDITOR.user && p === EDITOR.pin) {
        setCreator(true);
        document.getElementById('loginModal')?.classList.remove('show');
        showToast('Akses creator berhasil.');
      } else {
        showToast('Username atau PIN salah.');
      }
    } catch (e) {
      console.error('doLogin error', e);
      showToast('Terjadi kesalahan saat login (console error).');
    }
  });

  // Google login button inside login modal
  document.getElementById('googleLogin')?.addEventListener('click', () => {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithPopup(provider).catch(error => {
        console.error('Google login error', error);
        showToast('Gagal masuk: ' + (error.message || error));
      });
    } catch (e) {
      console.error('googleLogin handler error', e);
      showToast('Autentikasi Google tidak tersedia.');
    }
  });

  // Logout creator (local)
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    if (!confirm('Keluar dari mode editor?')) return;
    setCreator(false);
  });

  updateEditorUI();

  // Toolbar bindings (safe guard)
  document.getElementById('btnEditProfile')?.addEventListener('click', () => openEditorPanel('profile'));
  document.getElementById('btnManagePosts')?.addEventListener('click', () => openEditorPanel('posts'));
  document.getElementById('btnManageComments')?.addEventListener('click', () => openEditorPanel('comments'));
  document.getElementById('btnManageReviews')?.addEventListener('click', () => openEditorPanel('reviews'));
  document.getElementById('btnManageNews')?.addEventListener('click', () => openEditorPanel('news'));
  document.getElementById('closePanel')?.addEventListener('click', () => closeEditorPanel());

  document.getElementById('btnResetVisitors')?.addEventListener('click', async () => {
    if (!isCreator()) return showToast('Akses ditolak. Harap masuk sebagai creator.');
    if (!confirm('Reset counter pengunjung menjadi 200 di cloud?')) return;
    try {
      if (!window.db) throw new Error('Firestore tidak tersedia');
      await db.collection("siteData").doc("visitors").set({ count: 200 });
      document.getElementById('visitorSmall') && (document.getElementById('visitorSmall').textContent = 'Visitors: 200');
      localStorage.setItem('visitors_count_v2', 200);
      showToast('Counter pengunjung berhasil di-reset.');
    } catch (err) {
      console.error('reset visitors failed', err);
      showToast('Gagal mereset counter pengunjung.');
    }
  });
});

function updateEditorUI() {
  const toolbar = document.getElementById('editorToolbar');
  if (isCreator()) { toolbar?.classList.add('show'); toolbar?.setAttribute('aria-hidden','false'); }
  else { toolbar?.classList.remove('show'); toolbar?.setAttribute('aria-hidden','true'); }
  window.updateProjectsNote && window.updateProjectsNote();
}

async function openEditorPanel(section) {
  if (!isCreator()) return showToast('Silakan masuk sebagai creator terlebih dahulu untuk mengakses panel ini.');
  const modal = document.getElementById('editorPanel');
  if (!modal) return showToast('Editor panel tidak ditemukan.');
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  const body = document.getElementById('panelBody');
  if (!body) return showToast('Panel body tidak ditemukan.');
  document.getElementById('panelTitle') && (document.getElementById('panelTitle').textContent = 'Editor — ' + section);

  try {
    if (section === 'profile') {
      // fetch profile but be resilient
      let profile = null;
      try { profile = await fbGetProfile(); } catch (e) { console.warn('fbGetProfile failed', e); profile = null; }
      if (!profile) profile = {
        name: 'Irfan Rizki Aditri',
        role: 'Mahasiswa S1 Fisika',
        bio: '',
        avatar: '',
        avatarLocked: false,
        location: '', family: '', study: '', campus: ''
      };

      body.innerHTML = `
        <div class="editor-grid">
          <div class="editor-avatar">
            <div style="width:140px;height:140px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.04)"><img id="editorAvatarPreview" src="${escapeHtml(profile.avatar||'')}" style="width:100%;height:100%;object-fit:cover" alt="preview"></div>
            <div style="margin-top:8px"><input id="editorAvatarInput" type="file" accept="image/*"></div>
            <div style="margin-top:8px"><label><input type="checkbox" id="avatarLockCheckbox" ${profile.avatarLocked ? 'checked' : ''}> Kunci Avatar</label></div>
          </div>
          <div class="editor-fields">
            <input id="editorName" value="${escapeHtml(profile.name||'')}" placeholder="Nama">
            <input id="editorRole" value="${escapeHtml(profile.role||'')}" placeholder="Peran">
            <textarea id="editorBio" placeholder="Bio" style="min-height:120px">${escapeHtml(profile.bio||'')}</textarea>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
              <input id="editorLocation" value="${escapeHtml(profile.location||'')}" placeholder="Lokasi">
              <input id="editorFamily" value="${escapeHtml(profile.family||'')}" placeholder="Keterangan keluarga">
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
              <input id="editorStudy" value="${escapeHtml(profile.study||'')}" placeholder="Bidang studi">
              <input id="editorCampus" value="${escapeHtml(profile.campus||'')}" placeholder="Kampus">
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
              <button class="btn ghost" id="cancelProfile">Batal</button>
              <button class="btn" id="saveProfile">Simpan</button>
            </div>
          </div>
        </div>
      `;

      // event wiring
      let selectedAvatarFile = null;
      const avatarInput = document.getElementById('editorAvatarInput');
      const avatarPreview = document.getElementById('editorAvatarPreview');

      avatarInput?.addEventListener('change', (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (file) {
          selectedAvatarFile = file;
          try { avatarPreview.src = URL.createObjectURL(file); } catch (e) { console.warn('preview fail', e); }
        }
      });

      document.getElementById('cancelProfile')?.addEventListener('click', () => closeEditorPanel());

      document.getElementById('saveProfile')?.addEventListener('click', async function onSaveProfile(e) {
        const btn = e.currentTarget;
        btn.disabled = true;
        try {
          const updated = {
            name: document.getElementById('editorName').value.trim() || profile.name,
            role: document.getElementById('editorRole').value.trim() || profile.role,
            bio: document.getElementById('editorBio').value.trim() || profile.bio,
            location: document.getElementById('editorLocation').value.trim() || profile.location,
            family: document.getElementById('editorFamily').value.trim() || profile.family,
            study: document.getElementById('editorStudy').value.trim() || profile.study,
            campus: document.getElementById('editorCampus').value.trim() || profile.campus,
            avatarLocked: !!document.getElementById('avatarLockCheckbox').checked
          };

          if (selectedAvatarFile) {
            if (!navigator.onLine) {
              // store to IDB for later sync
              const reader = new FileReader();
              reader.onload = async (ev2) => {
                updated.avatar = ev2.target.result;
                updated.avatarLocked = true;
                await IrfanIDB.add('pending_posts', { id: 'profile_' + Date.now(), post: { type: 'profile', data: updated } });
                showToast('Offline: profil disimpan lokal. Akan disinkron saat online.');
                await applyProfile();
              };
              reader.readAsDataURL(selectedAvatarFile);
            } else {
              try {
                const url = await uploadAvatar(selectedAvatarFile, (pct) => { /* could show progress */ });
                updated.avatar = url;
                updated.avatarLocked = true;
                if (window.db) {
                  await fbSetProfile(updated);
                  showToast('Profil diperbarui di cloud.');
                } else {
                  showToast('Profil diperbarui lokal karena Firestore tidak tersedia.');
                  await IrfanIDB.add('pending_posts', { id: 'profile_' + Date.now(), post: { type: 'profile', data: updated } });
                }
              } catch (err) {
                console.error('avatar upload fail', err);
                // fallback: save as dataURL to IDB
                const reader = new FileReader();
                reader.onload = async (ev2) => {
                  updated.avatar = ev2.target.result;
                  updated.avatarLocked = true;
                  await IrfanIDB.add('pending_posts', { id: 'profile_' + Date.now(), post: { type: 'profile', data: updated } });
                  showToast('Gagal upload ke storage — profil disimpan lokal.');
                };
                reader.readAsDataURL(selectedAvatarFile);
              }
            }
          } else {
            // no new file, just update metadata
            updated.avatar = profile.avatar || '';
            if (navigator.onLine && window.db) {
              try { await fbSetProfile(updated); showToast('Profil diperbarui di cloud.'); }
              catch (e) { console.warn('fbSetProfile failed', e); await IrfanIDB.add('pending_posts', { id: 'profile_' + Date.now(), post: { type: 'profile', data: updated } }); showToast('Profil disimpan lokal (gagal ke cloud).'); }
            } else {
              await IrfanIDB.add('pending_posts', { id: 'profile_' + Date.now(), post: { type: 'profile', data: updated } });
              showToast('Profil disimpan lokal (offline).');
            }
          }

          // apply changes locally
          await applyProfile();
          closeEditorPanel();
        } catch (err) {
          console.error('saveProfile error', err);
          showToast('Terjadi kesalahan saat menyimpan profil.');
        } finally {
          btn.disabled = false;
        }
      });

      return;
    }

    // For other sections, reuse existing logic in editor panel builders
    if (section === 'posts') {
      // minimal posts UI handled by original code (ensure events wired)
      const posts = (await (async () => { try { return await fbGetPosts(); } catch(e){ return getLocalPosts(); } })()) || [];
      let html = `<div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;gap:8px;align-items:center">
          <input id="newPostTitle" placeholder="Judul" style="flex:1;padding:8px;border-radius:8px">
          <input id="newPostImg" type="file" accept="image/*">
          <button class="btn" id="createPost">Buat</button>
        </div>
        <div class="note">Daftar posting saat ini:</div>`;
      if (!posts.length) html += `<div class="note">Belum ada posting.</div>`;
      posts.forEach((p) => {
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-radius:8px;background:linear-gradient(180deg, rgba(255,255,255,0.01), transparent);margin-bottom:6px">
          <div><strong>${escapeHtml(p.title||'(Tanpa Judul)')}</strong><div class="note">${new Date(p.ts || Date.now()).toLocaleString()}</div></div>
          <div style="display:flex;gap:8px">
            <button class="btn ghost" data-edit="${escapeHtml(p.id||'')}">Edit</button>
            <button class="btn ghost" data-del="${escapeHtml(p.id||'')}">Hapus</button>
          </div>
        </div>`;
      });
      html += `</div>`;
      body.innerHTML = html;

      document.getElementById('createPost')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        try {
          const title = (document.getElementById('newPostTitle')?.value || '').trim();
          const file = document.getElementById('newPostImg')?.files?.[0];
          if (!title) { showToast('Judul tidak boleh kosong.'); return; }
          await createPost({ title, caption: '(belum ada caption)', file });
          showToast('Permintaan pembuatan posting diproses.');
          openEditorPanel('posts'); // refresh panel
        } catch (err) {
          console.error('createPost error', err);
          showToast('Gagal membuat posting.');
        } finally { btn.disabled = false; }
      });

      // delete/edit handlers (delegation)
      body.querySelectorAll('[data-del]').forEach(b => {
        b.addEventListener('click', async () => {
          const id = b.getAttribute('data-del');
          if (!id) return;
          if (!confirm('Hapus posting ini?')) return;
          try { await fbDeletePost(id); showToast('Posting berhasil dihapus.'); } catch (err) { console.error(err); showToast('Gagal menghapus posting.'); }
          renderPosts(); openEditorPanel('posts');
        });
      });

      body.querySelectorAll('[data-edit]').forEach(b => {
        b.addEventListener('click', async () => {
          const id = b.getAttribute('data-edit');
          try {
            const postsArr = await fbGetPosts();
            const p = postsArr.find(x => x.id === id);
            if (!p) return showToast('Posting tidak ditemukan.');
            // reuse earlier edit UI (simplified)
            body.innerHTML = `<h4>Edit Post</h4>
              <input id="editTitle" value="${escapeHtml(p.title||'')}" style="padding:8px;border-radius:8px">
              <textarea id="editCaption" style="min-height:140px;padding:8px;border-radius:8px">${escapeHtml(p.caption||'')}</textarea>
              <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
                <input id="editImg" type="file" accept="image/*">
                <button class="btn ghost" id="cancelEdit">Batal</button>
                <button class="btn" id="saveEdit">Simpan</button>
              </div>`;
            document.getElementById('cancelEdit')?.addEventListener('click', () => openEditorPanel('posts'));
            document.getElementById('saveEdit')?.addEventListener('click', async () => {
              const saveBtn = document.getElementById('saveEdit');
              saveBtn.disabled = true;
              try {
                let title = (document.getElementById('editTitle')?.value || '').trim() || p.title;
                let caption = (document.getElementById('editCaption')?.value || '').trim() || p.caption;
                const fileinp = document.getElementById('editImg');
                if (fileinp?.files && fileinp.files[0]) {
                  const reader = new FileReader();
                  reader.onload = async (evt) => {
                    const dataUrl = evt.target.result;
                    if (navigator.onLine) {
                      const blob = dataURLToBlob(dataUrl);
                      const file = new File([blob], 'img_'+Date.now()+'.png', { type: blob.type });
                      try { const url = await uploadFileToStorage(file); await fbUpdatePost(id, { title, caption, img: url }); showToast('Posting diperbarui.'); renderPosts(); openEditorPanel('posts'); }
                      catch (err) { console.error(err); showToast('Gagal update di server.'); }
                    } else {
                      await IrfanIDB.add('pending_posts', { id: 'edit_'+Date.now(), post: { type:'edit', id, title, caption, img: dataUrl } });
                      showToast('Perubahan disimpan lokal (offline). Akan disinkron saat online.');
                      renderPosts(); openEditorPanel('posts');
                    }
                  };
                  reader.readAsDataURL(fileinp.files[0]);
                } else {
                  try { await fbUpdatePost(id, { title, caption }); showToast('Posting diperbarui.'); renderPosts(); openEditorPanel('posts'); } catch (err) { console.error(err); showToast('Gagal memperbarui posting.'); }
                }
              } catch (err) { console.error('saveEdit error', err); showToast('Gagal menyimpan perubahan.'); }
              finally { saveBtn.disabled = false; }
            });
          } catch (err) {
            console.error('edit handler error', err);
            showToast('Gagal memuat posting untuk diedit.');
          }
        });
      });

      return;
    }

    // fallback for other sections: show simple message
    body.innerHTML = `<div class="note">Bagian "${escapeHtml(section)}" belum diimplementasikan di panel editor ini.</div>`;
  } catch (err) {
    console.error('openEditorPanel fatal', err);
    body.innerHTML = `<div class="note">Terjadi kesalahan saat membuka panel editor: ${escapeHtml(String(err))}</div>`;
    showToast('Gagal membuka panel editor (lihat console).');
  }
}

function closeEditorPanel() {
  const modal = document.getElementById('editorPanel');
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
}

// small helper to avoid injecting raw HTML unescaped
function escapeHtml(s) {
  if (!s && s !== '') return '';
  return String(s).replace(/[&<>"'`=\/]/g, function (c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c];
  });
}
