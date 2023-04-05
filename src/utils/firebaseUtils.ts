import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyBa_r-q6Mf4I0VaIZ8yTXDa1M6SEjCsutM",
  authDomain: "chatgpt-d546a.firebaseapp.com",
  projectId: "chatgpt-d546a",
  storageBucket: "chatgpt-d546a.appspot.com",
  messagingSenderId: "699273813437",
  appId: "1:699273813437:web:47a8b6e4b8790aa21346d4",
  measurementId: "G-T2Z8RMCC3N",
};

export async function signInAnonymously(auth): Promise<string> {
  try {
    const result = await auth.signInAnonymously();
    return result.user?.uid || "";
  } catch (error) {
    console.error("Error signing in anonymously: ", error);
    return "";
  }
}
