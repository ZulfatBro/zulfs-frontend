// src/firebase.js

// Импорты Firebase SDK (модульная версия)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Конфиг твоего проекта (из консоли Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyCLIbIvWygldkiGHD6zN3jLSlijhHfzLvk",
  authDomain: "zulfs-8d5f6.firebaseapp.com",
  projectId: "zulfs-8d5f6",
  storageBucket: "zulfs-8d5f6.firebasestorage.app",
  messagingSenderId: "1088885843207",
  appId: "1:1088885843207:web:ae7e6fc670cb96803691a2",
  measurementId: "G-ZVL24M57JN"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Экспорты для использования в коде
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
