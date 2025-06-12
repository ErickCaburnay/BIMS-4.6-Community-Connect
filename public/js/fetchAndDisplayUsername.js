import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBDp03_t7kWck8XTT9iqv3SIX8UqFp_C6w",
    authDomain: "bims-9aaa7.firebaseapp.com",
    databaseURL: "https://bims-9aaa7-default-rtdb.firebaseio.com",
    projectId: "bims-9aaa7",
    storageBucket: "bims-9aaa7.appspot.com",
    messagingSenderId: "323333588672",
    appId: "1:323333588672:web:16775be162a67673004f25",
    measurementId: "G-Q5FJD5VDKC",};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const fetchAndDisplayUsername = async (user) => {
  try {
    const userAccountRef = doc(db, "User_Accounts", user.uid);
    const userAccountDoc = await getDoc(userAccountRef);

    if (userAccountDoc.exists()) {
      const userData = userAccountDoc.data();
      const username = userData.username || "No Username Available";
      console.log('User username:', username);

      // Update display
      updateUsernameDisplay(username);
    } else {
      console.log("No user account found in User_Accounts collection");
      updateUsernameDisplay("No Username Available");
    }
  } catch (error) {
    console.error('Error fetching user username:', error);
    updateUsernameDisplay('No Username Available');
  }
};

// Check authentication state
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('User is signed in:', user.uid);
    fetchAndDisplayUsername(user);
  } else {
    console.log('No user signed in.');
    updateUsernameDisplay('No User Signed In');
  }
});

function updateUsernameDisplay(username) {
  const usernameDisplay = document.getElementById('current-user');
  if (usernameDisplay) {
    usernameDisplay.textContent = username;
  } else {
    console.error('Element with id "current-user" not found.');
  }
}