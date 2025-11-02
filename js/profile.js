// profile.js (improved upload + robust public URL handling + better init)
// Replaces previous profile.js. Saves avatar URL to profile and tries multiple fallbacks:
//  - Supabase Storage public URL (preferred)
//  - Supabase signed URL (if bucket is private)
//  - Cloudinary (fallback if configured)
// Adds more logging and user feedback (showToast) to help debug why avatar may not change.

const DEFAULT_PROFILE = {
  name: 'Irfan Rizki Aditri',
  bio: 'Saya Irfan Rizki Aditri, seorang mahasiswa Fisika di Institut Teknologi Sumatera, yang memiliki beragam hobi namun seringkali dihadapkan pada sifat malas, dan saya masih mencari jawaban tentang diri saya sendiri, meskipun demikian saya terus berusaha untuk berkembang dan menemukan passion saya.',
  avatar: '',
  avatarLocked: false,
  location: 'Sumatra',
  family: 'Mahasiswa',
  study: 'Fisika',
  campus: 'ITERA',
  gender: 'Laki-laki'
};

async function fbGetProfile() {
  try {
    if (!window.sb) return { ...DEFAULT_PROFILE };
    // expect a table 'profile' with an id='main'
    const { data, error } = await sb.from("profile").select().eq('id','main').limit(1).maybeSingle();
    if (error) { console.warn('fbGetProfile supabase error', error); return { ...DEFAULT_PROFILE }; }
    return data || { ...DEFAULT_PROFILE };
  } catch (err) {
    console.error('fbGetProfile error', err);
    return { ...DEFAULT_PROFILE };
  }
}
async function fbSetProfile(profile) {
  try {
    if (!window.sb) throw new Error('Supabase not available');
    // Upsert row with id='main'
    const payload = { ...profile, id: 'main' };
    const { data, error } = await sb.from("profile").upsert([payload]);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('fbSetProfile error', err);
    throw err;
  }
}

// Helper: get a public (or signed) URL from Supabase storage for a given path
async function getStorageUrl(path) {
  if (!window.sb || !path) return null;
  try {
    // prefer public URL
    const { data: publicData, error: publicErr } = await sb.storage.from('avatars').getPublicUrl(path);
    if (!publicErr && publicData && (publicData.publicUrl || publicData.publicURL)) {
      // supabase client variations: property may be publicUrl or publicURL
      return publicData.publicUrl || publicData.publicURL;
    }
    // If bucket is private or public URL not available, try signed URL
    try {
      const { data: signed, error: signedErr } = await sb.storage.from('avatars').createSignedUrl(path, 60); // 60s
      if (!signedErr && signed && signed.signedUrl) return signed.signedUrl;
    } catch (e2) {
      console.warn('createSignedUrl failed:', e2);
    }
    return null;
  } catch (err) {
    console.warn('getStorageUrl error', err);
    return null;
  }
}

// uploadAvatar: try Supabase Storage first (bucket: 'avatars'), otherwise fallback to Cloudinary
async function uploadAvatar(file, onProgress) {
  if (!file) return '';
  // Try Supabase Storage first (if configured)
  if (window.sb && sb.storage) {
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const filename = `avatars/${Date.now()}_${Math.floor(Math.random()*10000)}.${ext}`;
      // upload
      const { data: upData, error: upErr } = await sb.storage.from('avatars').upload(filename, file, { cacheControl: '3600', upsert: false });
      if (upErr) {
        console.warn('Supabase storage upload error, will fallback to Cloudinary', upErr);
        if (window.uploadToCloudinary) {
          const cloudUrl = await uploadToCloudinary(file, onProgress);
          return cloudUrl;
        }
        throw upErr;
      }
      // Determine path to ask for URL - supabase returns path in upData.path in many clients
      const path = (upData && (upData.path || upData.Key || upData.KeyName)) ? (upData.path || upData.Key || upData.KeyName) : filename;

      // Try to get a public URL (or signed if private)
      const url = await getStorageUrl(path);
      if (url) {
        return url;
      }

      // fallback: Cloudinary if available
      if (window.uploadToCloudinary) return await uploadToCloudinary(file, onProgress);

      throw new Error('Could not determine public URL for uploaded avatar');
    } catch (e) {
      console.warn('uploadAvatar supabase failed, fallback', e);
      if (window.uploadToCloudinary) return await uploadToCloudinary(file, onProgress);
      throw e;
    }
  } else {
    // No supabase storage configured -> use Cloudinary
    if (window.uploadToCloudinary) return await uploadToCloudinary(file, onProgress);
    throw new Error('No storage available and Cloudinary not configured');
  }
}

function getRandomSeed() {
  return 'irf_seed_' + (Date.now() + '_' + Math.floor(Math.random() * 10000));
}
function getIllustrativeAvatar(seed) {
  seed = seed || getRandomSeed();
  return `https://api.dicebear.com/6.x/adventurer-neutral/svg?seed=${encodeURIComponent(seed)}&scale=90`;
}

async function applyProfile() {
  try {
    const profile = await fbGetProfile();
    let avatarUrl = '';
    try {
      if (profile.avatar && typeof profile.avatar === 'string' && profile.avatar.trim()) {
        avatarUrl = profile.avatar;
      } else {
        avatarUrl = getIllustrativeAvatar();
      }
    } catch (e) {
      console.warn('avatar selection error', e);
      avatarUrl = getIllustrativeAvatar();
    }

    // update DOM
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText('siteName', profile.name || DEFAULT_PROFILE.name);
    setText('displayName', profile.name || DEFAULT_PROFILE.name);
    setText('siteTag', profile.role || DEFAULT_PROFILE.role);
    setText('displayRole', profile.role || DEFAULT_PROFILE.role);
    setText('displayBio', profile.bio || DEFAULT_PROFILE.bio);

    const map = { location: profile.location, family: profile.family, study: profile.study, campus: profile.campus, gender: profile.gender };
    document.querySelectorAll('#tagsWrapper .tag').forEach(el => {
      const k = el.dataset.key;
      if (k && map[k] !== undefined) el.textContent = map[k] || '';
    });

    const mainAvatar = document.getElementById('mainAvatar');
    const aboutAvatar = document.getElementById('aboutAvatar');
    try {
      if (mainAvatar) mainAvatar.src = avatarUrl;
      if (aboutAvatar) aboutAvatar.src = avatarUrl;
    } catch (e) {
      console.warn('applyProfile set src failed', e);
      if (mainAvatar) mainAvatar.src = getIllustrativeAvatar();
      if (aboutAvatar) aboutAvatar.src = getIllustrativeAvatar();
    }

    // Persist default avatar if backend available (only if avatar empty & not locked)
    try {
      if ((!profile.avatar || profile.avatar === '') && !profile.avatarLocked && navigator.onLine && window.sb) {
        const remote = await fbGetProfile();
        if (!remote.avatar) {
          await fbSetProfile({ ...profile, avatar: avatarUrl, avatarLocked: false });
        }
      }
    } catch (e) {
      console.warn('persist default avatar failed', e);
    }

  } catch (err) {
    console.error('applyProfile fatal', err);
    if (typeof showToast === 'function') showToast('Gagal memuat profil (lihat console).', { type: 'error' });
  }
}

// Improved helper to be called after avatar upload to set profile and refresh UI
async function saveAvatarToProfile(avatarUrl, extra = {}) {
  try {
    if (!avatarUrl) throw new Error('No avatar URL provided');
    const profile = await fbGetProfile();
    const updated = { ...profile, avatar: avatarUrl, avatarLocked: true, ...extra };
    await fbSetProfile(updated);
    if (typeof showToast === 'function') showToast('Foto profil berhasil diperbarui.', { type: 'success' });
    // update DOM immediately
    const mainAvatar = document.getElementById('mainAvatar');
    const aboutAvatar = document.getElementById('aboutAvatar');
    try {
      if (mainAvatar) {
        // add small cache-busting query to ensure new image shows
        mainAvatar.src = avatarUrl + (/\?/.test(avatarUrl) ? '&_=' : '?_=') + Date.now();
      }
      if (aboutAvatar) aboutAvatar.src = avatarUrl + (/\?/.test(avatarUrl) ? '&_=' : '?_=') + Date.now();
    } catch (e) {
      console.warn('refresh DOM avatar failed', e);
    }
    // re-run applyProfile to refresh any other UI
    await applyProfile();
  } catch (err) {
    console.error('saveAvatarToProfile failed', err);
    if (typeof showToast === 'function') showToast('Gagal menyimpan foto profil (lihat console).', { type: 'error' });
    throw err;
  }
}

// Expose utilities for external code (editor.js uses uploadAvatar)
// Also expose a convenience function to handle file input and full flow:
async function handleAvatarFileUpload(file, onProgress) {
  if (!file) throw new Error('No file');
  if (typeof showToast === 'function') showToast('Mengunggah foto...', { duration: 2000 });
  try {
    const url = await uploadAvatar(file, onProgress);
    if (!url) throw new Error('Upload succeeded but no URL returned');
    // Save avatar URL into profile table
    await saveAvatarToProfile(url);
    return url;
  } catch (err) {
    console.error('handleAvatarFileUpload error', err);
    if (typeof showToast === 'function') showToast('Gagal mengunggah foto profil. Cek console.', { type: 'error' });
    throw err;
  }
}

// Initialization: apply profile once DOM ready, and also when Supabase becomes ready.
// This ensures applyProfile runs regardless of load order.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyProfile);
} else {
  applyProfile();
}
document.addEventListener('supabaseReady', applyProfile);

// export for other modules (editor.js, post.js, etc.)
window.uploadAvatar = uploadAvatar;
window.handleAvatarFileUpload = handleAvatarFileUpload;

window.saveAvatarToProfile = saveAvatarToProfile;
