/* game-auth.js
   Logika untuk Firebase Auth & Firestore Leaderboard
*/

// =========================================================
// (1) KONFIGURASI FIREBASE
// =========================================================
// !!! PENTING: Salin firebaseConfig kamu dari fanra-chat.html
// dan tempel di sini.
// =========================================================
        const firebaseConfig = {
            apiKey: "AIzaSyCVYfH91lXeOIkLFXmk_rRsObNbo4n-G_A",
            authDomain: "portofolio-fanra.firebaseapp.com",
            projectId: "portofolio-fanra",
            storageBucket: "portofolio-fanra.firebasestorage.app",
            messagingSenderId: "1048993283215",
            appId: "1:1048993283215:web:137862db54a113409404fa",
            measurementId: "G-JFJ1X7FQSR"
        };
// =========================================================


// (2) INISIALISASI & REFERENSI
(function () {
  if (window.Auth) return; // Jangan jalankan dua kali
  
  // Inisialisasi Firebase
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const googleProvider = new firebase.auth.GoogleAuthProvider();
  
  // Referensi Koleksi
  const leaderboardCollection = db.collection('leaderboard');
  
  // Elemen DOM
  const body = document.body;
  const usernameDisplay = document.getElementById('usernameDisplay');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const leaderboardList = document.getElementById('leaderboard-list');

  // Elemen Overlay Login
  const loginOverlay = document.getElementById('loginOverlay');
  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const authError = document.getElementById('authError');
  const toggleToSignup = document.getElementById('toggleToSignup');
  const toggleToLogin = document.getElementById('toggleToLogin');
  
  
  // (3) FUNGSI UTAMA AUTH
  
  // Gatekeeper: Cek status login
  auth.onAuthStateChanged(user => {
    if (user) {
      // User sedang login
      body.classList.add('logged-in');
      body.classList.remove('logged-out');
      usernameDisplay.textContent = user.displayName || user.email;
      loginOverlay.classList.remove('active'); // Tutup overlay jika berhasil
    } else {
      // User logged out
      body.classList.add('logged-out');
      body.classList.remove('logged-in');
      usernameDisplay.textContent = '';
    }
  });

  // Fungsi untuk menyimpan skor
  async function saveScore(newScore) {
    if (!auth.currentUser) return; // Hanya simpan jika login
    if (newScore <= 0) return; // Jangan simpan skor 0
    
    const user = auth.currentUser;
    const leaderboardRef = leaderboardCollection.doc(user.uid);
    
    try {
      const doc = await leaderboardRef.get();
      let oldScore = 0;
      if (doc.exists) {
        oldScore = doc.data().score || 0;
      }
      
      // Hanya simpan jika skor baru LEBIH TINGGI
      if (newScore > oldScore) {
        await leaderboardRef.set({
          score: newScore,
          username: user.displayName || user.email.split('@')[0], // Ambil nama
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Skor tertinggi baru disimpan!");
      }
    } catch (e) {
      console.error("Error saat menyimpan skor: ", e);
    }
  }

  // Fungsi untuk memuat papan peringkat
  function loadLeaderboard() {
    leaderboardCollection
      .orderBy('score', 'desc')
      .limit(10)
      .onSnapshot(snapshot => {
        leaderboardList.innerHTML = ''; // Kosongkan daftar
        if (snapshot.empty) {
          leaderboardList.innerHTML = '<li>Belum ada skor. Jadilah yang pertama!</li>';
          return;
        }
        
        let rank = 1;
        snapshot.forEach(doc => {
          const data = doc.data();
          const li = document.createElement('li');
          li.innerHTML = `
            <span>${rank}.</span> 
            <strong>${data.username}</strong> 
            <span>${data.score}</span>
          `;
          leaderboardList.appendChild(li);
          rank++;
        });
      }, err => {
        console.error("Error memuat leaderboard: ", err);
        leaderboardList.innerHTML = '<li>Gagal memuat papan peringkat.</li>';
      });
  }
  
  // (4) FUNGSI HELPER LOGIN (di-copy dari fanra-chat.html)
  
  function showAuthError(message) {
    authError.textContent = message;
  }

  function handleEmailSignUp(e) {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    auth.createUserWithEmailAndPassword(email, password)
      .then(userCredential => {
        // Otomatis login, 'onAuthStateChanged' akan menangani
        showAuthError('');
      })
      .catch(error => {
        if (error.code === 'auth/weak-password') {
          showAuthError('Password terlalu lemah (minimal 6 karakter).');
        } else if (error.code === 'auth/email-already-in-use') {
          showAuthError('Email sudah terdaftar. Silakan Masuk.');
        } else {
          showAuthError(error.message);
        }
      });
  }

  function handleEmailSignIn(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    auth.signInWithEmailAndPassword(email, password)
      .then(userCredential => {
        // Otomatis login, 'onAuthStateChanged' akan menangani
        showAuthError('');
      })
      .catch(error => {
        showAuthError('Email atau password salah.');
      });
  }
  
  function handleGoogleSignIn() {
    auth.signInWithPopup(googleProvider)
      .then(result => {
        // Berhasil, 'onAuthStateChanged' akan menangani
      })
      .catch(error => {
        showAuthError(error.message);
      });
  }
  
  function handleLogout() {
    auth.signOut();
  }
  
  // (5) PUBLIC API & EVENT LISTENERS
  
  // Tautkan fungsi ke window agar bisa dipanggil oleh arcade-core.js
  window.Auth = {
    saveScore: saveScore,
    loadLeaderboard: loadLeaderboard,
    
    // Fungsi yang dipanggil oleh tombol di arcade-ui.js
    initAuthUI: () => {
      // Tombol di Papan Peringkat
      loginBtn.addEventListener('click', () => loginOverlay.classList.add('active'));
      logoutBtn.addEventListener('click', handleLogout);
      
      // Tombol di dalam Overlay Login
      document.getElementById('closeLoginBtn').addEventListener('click', () => loginOverlay.classList.remove('active'));
      document.getElementById('googleSignInBtn').addEventListener('click', handleGoogleSignIn);
      
      // Form
      loginForm.addEventListener('submit', handleEmailSignIn);
      signupForm.addEventListener('submit', handleEmailSignUp);
      
      // Toggler
      toggleToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        toggleToSignup.style.display = 'none';
        toggleToLogin.style.display = 'inline';
        authTitle.textContent = 'Daftar Akun Baru';
        authSubtitle.textContent = 'Daftar untuk menyimpan skormu.';
        showAuthError('');
      });
      toggleToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        toggleToSignup.style.display = 'inline';
        toggleToLogin.style.display = 'none';
        authTitle.textContent = 'Masuk';
        authSubtitle.textContent = 'Masuk untuk menyimpan skormu.';
        showAuthError('');
      });
    }
  };
  
  // (6) JALANKAN
  loadLeaderboard(); // Muat papan peringkat saat halaman dibuka

})();