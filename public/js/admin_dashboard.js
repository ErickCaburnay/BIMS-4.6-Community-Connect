// <!-- ######## ADMIN_DASHBOARD.JS ######### -->

import { initializeApp } from '../firebaseConfig.js';
import { getFirestore, collection, addDoc, orderBy, getDocs, doc, getDoc, query, where, onSnapshot } from '../firebaseConfig.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

import { initializeCharts } from './admin_demographic_chart.js';




function updateDate() {
  const currentDate = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
  document.getElementById('current-date').textContent = currentDate.toLocaleDateString('en-US', options);
  const userContainer = document.getElementById('current-user');
  userContainer.textContent = "Welcome, " + currentUser + " | " + currentDate.toLocaleDateString('en-US', options);
}

window.onload = function () {
  updateDate();
};

const fetchAndDisplayUsername = async (user) => {
    try {
      const db = getFirestore();
      const userAccountRef = doc(db, "Admin_Accounts", user.uid);
      const userAccountDoc = await getDoc(userAccountRef);
  
      if (userAccountDoc.exists()) {
        const userData = userAccountDoc.data();
        const username = userData.username || "No Username Available";
        console.log('User username:', username);
  
        // Update display
        updateUsernameDisplay(username);
      } else {
        console.log("No user account found in Admin_Accounts collection");
        updateUsernameDisplay("No Username Available");
      }
    } catch (error) {
      console.error('Error fetching user username:', error);
      updateUsernameDisplay('Error fetching username');
    }
  };
  
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('User is signed in:', user.uid);
      fetchAndDisplayUsername(user);
      initializeCharts(db);
    } else {
      console.log('No user signed in.');
      updateUsernameDisplay('No User Signed In');
    }
  });
  
  function updateUsernameDisplay(username) {
    const usernameDisplay = document.getElementById('current-user');
    if (usernameDisplay) {
      usernameDisplay.textContent = `Welcome, ${username}`;
    } else {
      console.error('Element with id "current-user" not found.');
    }
  }

// #####################  #######################
