// src/authService.js
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

// Регистрация нового пользователя
export async function register(email, password, displayName) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Обновляем имя пользователя
  await updateProfile(user, { displayName });

  // Сохраняем профиль в Firestore
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    displayName,
    createdAt: new Date().toISOString(),
  });

  return user;
}

// Вход пользователя
export async function login(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}
