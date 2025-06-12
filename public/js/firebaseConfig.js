// ############## FIREBASECONFIG.JS #################
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { 
    getFirestore,
    collection,
    addDoc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    doc,
    orderBy,
    query,
    where,
    serverTimestamp,
    Timestamp,
    onSnapshot,
    limit,
    startAfter,
    endBefore
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

import { 
    signOut,
    getAuth, 
    initializeAuth,
    createUserWithEmailAndPassword, 
    sendEmailVerification,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    browserLocalPersistence,
    fetchSignInMethodsForEmail 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

import { 
    getStorage,
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

import { 
    getFunctions, 
    httpsCallable 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-functions.js";

const firebaseConfig = {
    apiKey: "AIzaSyBDp03_t7kWck8XTT9iqv3SIX8UqFp_C6w",
    authDomain: "bims-9aaa7.firebaseapp.com",
    databaseURL: "https://bims-9aaa7-default-rtdb.firebaseio.com",
    projectId: "bims-9aaa7",
    storageBucket: "bims-9aaa7.appspot.com",
    messagingSenderId: "323333588672",
    appId: "1:323333588672:web:cfb7ea2dff4d9eb2004f25",
    measurementId: "G-RQJBMNMFQ8"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app);

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('User is authenticated:', user.uid);
    } else {
        console.log('User is not authenticated');
    }
});

console.log("Firebase initialized, db:", db);

// Add to window object for non-module scripts (if needed)
window.auth = auth;
window.db = db;
window.functions = functions;
window.httpsCallable = httpsCallable;

// Export everything that might be needed
export {
    app,
    db,
    auth,
    getAuth,
    storage,
    functions,
    httpsCallable,
    // Auth exports
    createUserWithEmailAndPassword,
    sendEmailVerification,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    fetchSignInMethodsForEmail, 
    browserLocalPersistence,
    initializeAuth,
    signOut,
    // Firestore exports
    collection,
    addDoc,
    updateDoc,
    getDocs,
    getDoc,
    setDoc,
    deleteDoc,
    doc,
    orderBy,
    query,
    where,
    serverTimestamp,
    Timestamp,
    onSnapshot,
    limit,
    startAfter,
    endBefore,
    // Storage exports
    getStorage,
    storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject
};