// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // ✅ for image & file uploads

// 🧩 Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBk-V-q02C5pCDmzFGG10dKgDcECgyln0g",
  authDomain: "classmentor-fd7e5.firebaseapp.com",
  projectId: "classmentor-fd7e5",
  storageBucket: "classmentor-fd7e5.appspot.com", // ✅ Corrected (was .app)
  messagingSenderId: "295397153255",
  appId: "1:295397153255:web:ac402ebeab7e3c91f20542",
  measurementId: "G-27QY4S0WJM",
};

// ✅ Initialize Firebase core
const app = initializeApp(firebaseConfig);

// ✅ Optional: enable Analytics only when supported (avoids localhost errors)
let analytics = null;
isAnalyticsSupported().then((yes) => {
  if (yes) analytics = getAnalytics(app);
});

// ✅ Initialize Firebase Services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // ✅ Enables image & file uploads

// ✅ Export everything needed throughout the project
export { app, auth, db, storage, analytics };
