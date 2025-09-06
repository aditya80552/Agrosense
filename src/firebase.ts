import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getApps } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAI_-g1ovyBLW3fGp_X2dMOawMOidccow4",
  authDomain: "demo22-83e8f.firebaseapp.com",
  databaseURL: "https://demo22-83e8f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "demo22-83e8f",
  storageBucket: "demo22-83e8f.firebasestorage.app",
  messagingSenderId: "394233994752",
  appId: "1:394233994752:web:06b80ba08df1880fbe42e5"
};

// Initialize Firebase
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

export const db = getDatabase(app);