import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD4J9sbkbBcOKL5y_m7vm3NtE-dQqn1k_M",
  authDomain: "pillpal-4a695.firebaseapp.com",
  databaseURL: "https://pillpal-4a695-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pillpal-4a695",
  storageBucket: "pillpal-4a695.firebasestorage.app",
  messagingSenderId: "184508444377",
  appId: "1:184508444377:web:24ca22eb50d8896c8f98c8"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);