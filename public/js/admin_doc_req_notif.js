// Import Firebase SDK
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to set up notification listeners
function setupNotificationListeners() {
  const collections = ['brgy_clearance', 'brgy_indigency', 'brgy_certificate'];
  let totalPendingRequests = 0;

  collections.forEach(collectionName => {
    const q = query(collection(db, collectionName), where("status", "==", "pending"));
    
    onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          totalPendingRequests++;
          addNotification(`New ${collectionName} request`);
        }
        if (change.type === "modified" && change.doc.data().status === "printed") {
          totalPendingRequests--;
        }
      });
      
      updateNotificationCount(totalPendingRequests);
    });
  });
}

// Function to add a notification to the dropdown
function addNotification(message) {
  const notificationList = document.getElementById('notificationList');
  const li = document.createElement('li');
  li.textContent = message;
  notificationList.appendChild(li);
}

// Function to update the notification count
function updateNotificationCount(count) {
  const notificationCount = document.getElementById('notificationCount');
  notificationCount.textContent = count;
  notificationCount.style.display = count > 0 ? 'block' : 'none';
}

// Function to toggle the notification dropdown
function toggleNotificationDropdown() {
  const dropdown = document.getElementById('notificationDropdown');
  dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

// Event listener for the notification icon
document.getElementById('notificationIcon').addEventListener('click', toggleNotificationDropdown);

// Call the setup function when the page loads
document.addEventListener('DOMContentLoaded', setupNotificationListeners);

// Export the functions if needed
export { setupNotificationListeners, addNotification, updateNotificationCount, toggleNotificationDropdown };