// firebase-init.js
// - Inisialisasi Firebase (compat).
// - Export global db, storage, auth agar modul lain dapat menggunakannya.

const firebaseConfig = {
  apiKey: "AIzaSyDpPVoSzktWFsR1DhIxpYU-gUDmbvNSwHs",
  authDomain: "irfanrizkiaditri-site.firebaseapp.com",
  projectId: "irfanrizkiaditri-site",
  storageBucket: "irfanrizkiaditri-site.appspot.com",
  messagingSenderId: "599243074823",
  appId: "1:599243074823:web:1e440b2566c11daea229a2",
  measurementId: "G-VJFXR0B0ZC"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// Export to global for other modules
window.db = db;
window.storage = storage;
window.auth = auth;

// Dispatch event so other modules can wait until firebase is ready
document.dispatchEvent(new Event('firebaseReady'));
