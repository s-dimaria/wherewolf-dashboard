import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDSgdAdGnYtlBNA1g7s5Se86C4HaQj6BI4",
  authDomain: "wherewolf-dashboard.firebaseapp.com",
  projectId: "wherewolf-dashboard",
  storageBucket: "wherewolf-dashboard.firebasestorage.app",
  messagingSenderId: "320122892316",
  appId: "1:320122892316:web:61a3a1f7c226e5abfd2fd9",
  measurementId: "G-QNXG973WBQ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);