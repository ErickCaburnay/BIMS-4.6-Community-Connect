// <!--============== DOCUMENTREQUEST.JS ===============-->

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { db, auth } from './firebaseConfig.js';
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, updateDoc, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";



function updateDate() {
  const currentDate = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
  document.getElementById('current-date').textContent = currentDate.toLocaleDateString('en-US', options);
  const userContainer = document.getElementById('current-user');
  userContainer.textContent = "Welcome, " + currentUser + " | " + currentDate.toLocaleDateString('en-US', options);
}        

window.onload = function() {
updateDate();        
};

//===============TOGGLE DROPDOWN===============//
function toggleDropdown() {
var dropdownMenu = document.getElementById("dropdownMenu");
dropdownMenu.classList.toggle("show");
}

window.addEventListener('click', function (event) {
if (!event.target.closest('.toggle-menu')) {
    var dropdowns = document.getElementsByClassName("dropdown-menu");
    for (var i = 0; i < dropdowns.length; i++) {
        var openDropdown = dropdowns[i];
        if (openDropdown.classList.contains('show')) {
            openDropdown.classList.remove('show');
        }
    }
}
});

//############# LOGOUT ###############
async function logout() {
var logoutConfirmed = window.confirm("Are you sure you want to logout?");

if (logoutConfirmed) {
    try {
        await auth.signOut();
        console.log('User signed out successfully');
        window.location.href = "/residentsPage/loginresident.html";
    } catch (error) {
        console.error('Error signing out:', error);
        alert('Error signing out. Please try again.');
    }
}
}

//############# FETCH AND DISPLAY USERNAME ############

// For email display
// const fetchAndDisplayUserEmail = async (user) => {
//     try {
//         // Display user email
//         const email = user.email || "No Email Available";
//         console.log('User email:', email);

//         // Update display
//         updateEmailDisplay(email);
//     } catch (error) {
//         console.error('Error fetching user email:', error);
//         updateEmailDisplay('No Email Available');
//     }
// };

// For email display
// function updateEmailDisplay(email) {
//     const emailDisplay = document.getElementById('current-user');
//     if (emailDisplay) {
//         emailDisplay.textContent = email;
//     } else {
//         console.error('Element with id "current-user" not found.');
//     }
// }

const fetchAndDisplayUsername = async (user) => {
try {
    const db = getFirestore();
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




  
export {logout, toggleDropdown}