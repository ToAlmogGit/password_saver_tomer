import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBRNpJW8KnnPL_NSHQ1YcsJ9KwEroWnPjg",
    authDomain: "password-saver-tomer.firebaseapp.com",
    projectId: "password-saver-tomer",
    storageBucket: "password-saver-tomer.firebasestorage.app",
    messagingSenderId: "759649953127",
    appId: "1:759649953127:web:27784012b08cd1bf463bc2",
    measurementId: "G-TJSVK1LYLP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, analytics };
