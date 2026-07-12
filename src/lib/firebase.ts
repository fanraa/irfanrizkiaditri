import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDjgrBvKUaVg9U1XustHj9TeO4lHZDrcNg",
  authDomain: "fanra-dev.firebaseapp.com",
  projectId: "fanra-dev",
  storageBucket: "fanra-dev.firebasestorage.app",
  messagingSenderId: "664735861834",
  appId: "1:664735861834:web:6519570201553dbe4faab3",
  measurementId: "G-HMKEVZS65H"
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
