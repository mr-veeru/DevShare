// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, browserSessionPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAcDPeZJuya0i5fz-bG6B9ot_cx2d4y8JM",
  authDomain: "devshare-68.firebaseapp.com",
  projectId: "devshare-68",
  storageBucket: "devshare-68.firebasestorage.app",
  messagingSenderId: "107679324180",
  appId: "1:107679324180:web:ac7fbc0ab7c5525e9aef01",
  measurementId: "G-GVXF8PQ6D0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// Configure auth with browser session persistence
export const auth = getAuth(app);
// Set session persistence to browser session
setPersistence(auth, browserSessionPersistence).catch((error) => {
  console.error("Error setting auth persistence:", error);
});

// Configure Google provider with custom settings
export const provider = new GoogleAuthProvider();
// Add login hint to reduce the need for user interaction
provider.setCustomParameters({
  prompt: 'select_account'
});

export const db = getFirestore(app);