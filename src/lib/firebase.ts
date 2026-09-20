import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDjgrBvKUaVg9U1XustHj9TeO4lHZDrcNg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "fanra-dev.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "fanra-dev",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "fanra-dev.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "664735861834",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:664735861834:web:6519570201553dbe4faab3",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-HMKEVZS65H"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Initialize Analytics conditionally to avoid SSR issues or missing window
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}
export { analytics };
