// profile.js (patched to use Cloudinary fallback when Firebase Storage is unavailable)
// Replace your existing js/profile.js with this file.

const DEFAULT_PROFILE = {
  name: 'Irfan Rizki Aditri',
  role: 'Mahasiswa S1 Fisika — Institut Teknologi Sumatera (ITERA)',
  bio: 'Saya sedang menempuh studi S1 Fisika. Minat: fisika, penulisan, dan eksperimen digital.',
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
    if (!window.db) return { ...DEFAULT_PROFILE };
    const doc = await db.collection("profile").doc("main").get();
    return doc.exists ? doc.data() : { ...DEFAULT_PROFILE };
  } catch (err) {
    console.error('fbGetProfile error', err);
    return { ...DEFAULT_PROFILE };
  }
}
async function fbSetProfile(profile) {
  try {
    if (!window.db) throw new Error('Firestore not available');
    await db.collection("profile").doc("main").set(profile);
  } catch (err) {
    console.error('fbSetProfile error', err);
    throw err;
  }
}

// uploadAvatar: try Firebase Storage if available, otherwise fallback to Cloudinary
async function uploadAvatar(file, onProgress) {
  if (!file) return '';
  // Try Firebase Storage first (if configured)
  if (window.storage && storage.ref) {
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const ref = storage.ref().child('avatars/' + Date.now() + '.' + ext);
      const task = ref.put(file);
      return await new Promise((resolve, reject) => {
        task.on('state_changed', (snap) => {
          if (onProgress && snap.totalBytes) {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            try { onProgress(pct); } catch (e) {}
          }
        }, async (err) => {
          console.warn('Firebase storage put error, will fallback to Cloudinary', err);
          try {
            if (window.uploadToCloudinary) {
              const url = await uploadToCloudinary(file, onProgress);
              resolve(url);
            } else reject(err);
          } catch (e2) { reject(e2); }
        }, async () => {
          try {
            const url = await ref.getDownloadURL();
            resolve(url);
          } catch (e) {
            console.warn('getDownloadURL failed, fallback to Cloudinary', e);
            try {
              if (window.uploadToCloudinary) {
                const url2 = await uploadToCloudinary(file, onProgress);
                resolve(url2);
              } else reject(e);
            } catch (e2) { reject(e2); }
          }
        });
      });
    } catch (e) {
      console.warn('Firebase storage path failed, fallback to Cloudinary', e);
      if (window.uploadToCloudinary) return await uploadToCloudinary(file, onProgress);
      throw e;
    }
  } else {
    // No firebase storage configured -> use Cloudinary
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

    document.getElementById('siteName') && (document.getElementById('siteName').textContent = profile.name || DEFAULT_PROFILE.name);
    document.getElementById('displayName') && (document.getElementById('displayName').textContent = profile.name || DEFAULT_PROFILE.name);
    document.getElementById('siteTag') && (document.getElementById('siteTag').textContent = profile.role || DEFAULT_PROFILE.role);
    document.getElementById('displayRole') && (document.getElementById('displayRole').textContent = profile.role || DEFAULT_PROFILE.role);
    document.getElementById('displayBio') && (document.getElementById('displayBio').textContent = profile.bio || DEFAULT_PROFILE.bio);

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

    // Try persist default avatar if Firestore available
    if ((!profile.avatar || profile.avatar === '') && !profile.avatarLocked && navigator.onLine && window.db) {
      try {
        const remote = await fbGetProfile();
        if (!remote.avatar) {
          await fbSetProfile({ ...profile, avatar: avatarUrl, avatarLocked: false });
        }
      } catch (e) { console.warn('persist default avatar failed', e); }
    }
  } catch (err) {
    console.error('applyProfile fatal', err);
    showToast('Gagal memuat profil (lihat console).');
  }
}

document.addEventListener('DOMContentLoaded', applyProfile);
window.uploadAvatar = uploadAvatar; // export for other modules
