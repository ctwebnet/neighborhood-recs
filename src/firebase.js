// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDgDx6Ql2jl_E_xYw4CchD7DAH_jor7-0I",
  authDomain: "neighborhood-recs.firebaseapp.com",
  projectId: "neighborhood-recs",
  storageBucket: "neighborhood-recs.firebasestorage.app",
  messagingSenderId: "249831998728",
  appId: "1:249831998728:web:54ece841584c05cc0758bd"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
