// <!-- ####### RESIDENT_DOCUMENT_REQUEST.JS ####### -->

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, query, where, serverTimestamp, limit, orderBy  } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js';

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
const db = getFirestore(app)
const auth = getAuth(app);

//=======================TOGGLE DROPDOWN========================//
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

//#################### LOGOUT ######################
async function logout() {
  var logoutConfirmed = window.confirm("Are you sure you want to logout?");

  if (logoutConfirmed) {
      try {
          await auth.signOut();
          console.log('User signed out successfully');
          window.location.href = "../index.html";
      } catch (error) {
          console.error('Error signing out:', error);
          alert('Error signing out. Please try again.');
      }
  }
}

document.querySelector('.toggle-menu').addEventListener('click', toggleDropdown);
document.querySelector('.dropdown-item:last-child').addEventListener('click', logout);


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

// For email display
// function updateEmailDisplay(email) {
//     const emailDisplay = document.getElementById('current-user');
//     if (emailDisplay) {
//         emailDisplay.textContent = email;
//     } else {
//         console.error('Element with id "current-user" not found.');
//     }
// }

function updateUsernameDisplay(username) {
  const usernameDisplay = document.getElementById('current-user');
  if (usernameDisplay) {
      usernameDisplay.textContent = username;
  } else {
      console.error('Element with id "current-user" not found.');
  }
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

onAuthStateChanged(auth, user => {
  if (user) {
      const userId = user.uid;
      const userRef = doc(db, "users", userId);

      getDoc(userRef).then((docSnapshot) => {
          if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              const { fname, mname, lname, blklot, 
                      street, suffix, citizenship, age, birthdate, 
                      birthplace, gender, voter, email, maritalStatus, 
                      employmentStatus, phone, occupation,
                      kdbm, pwd, fourPs, soloParent } = data;

              const fullName = `${toTitleCase(fname || '')} ${toTitleCase(mname || '')} ${toTitleCase(lname || '')}`.trim();
              // const address = `${toTitleCase(blklot || '')} ${toTitleCase(street || '')}`.trim();

              setTextContent('fullName', fullName);
              setTextContent('current-user', data.username);
              setTextContent('suffix', suffix);
              // setTextContent('address', address);
              setTextContent('blklot', blklot);
              setTextContent('street', street);
              setTextContent('citizenship', citizenship);
              setTextContent('age', age);
              setTextContent('birthdate', birthdate);
              setTextContent('birthplace', birthplace);
              setTextContent('gender', gender);
              setTextContent('voter', voter);
              setTextContent('email', email);
              setTextContent('marital-status', maritalStatus);
              setTextContent('employment-status', employmentStatus);
              setTextContent('phone', phone);
              setTextContent('occupation', occupation);
              setTextContent('kdbm', kdbm);
              setTextContent('pwd', pwd);
              setTextContent('fourPs', fourPs);
              setTextContent('soloParent', soloParent);
          } else {
              console.log("No such document!");
          }
      }).catch(error => {
          console.error("Error fetching document: ", error);
      });
  } else {
      console.log("User is not signed in.");
  }
});

function setTextContent(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
      element.textContent = text || '';
  }
}

// ########### DISPLAY REQUEST AT TABLE ##########
// You might also want to listen for auth state changes
auth.onAuthStateChanged((user) => {
    if (user) {
        displayUserDocumentRequests();
    } else {
        // Handle logged out state
        const tableBody = document.querySelector('#residentClearanceTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7">Please log in to view your document requests.</td></tr>';
        }
    }
});


async function fetchCollectionData(collectionName, userId, callback) {
    // console.log(`Fetching data from ${collectionName} for user ${userId}`);
    
    try {
        // First, query the User_Accounts collection to get the user's uniqueId
        const userAccountRef = doc(db, "User_Accounts", userId);
        const userAccountDoc = await getDoc(userAccountRef);
        
        if (!userAccountDoc.exists()) {
            console.log("No user account found");
            callback(null, []);
            return;
        }
        
        const uniqueId = userAccountDoc.data().uniqueId;
        console.log(`User's uniqueId: ${uniqueId}`);
        
        // Now use this uniqueId to query the document collections
        const q = query(
            collection(db, collectionName),
            where('uniqueId', '==', uniqueId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        console.log(`Received ${querySnapshot.size} documents from ${collectionName}`);
        
        const requests = querySnapshot.docs.map(doc => ({
            id: doc.id,
            type: collectionName.replace('brgy_', ''),
            ...doc.data()
        }));
        
        callback(null, requests);
    } catch (error) {
        console.error(`Error fetching from ${collectionName}:`, error);
        callback(error, null);
    }
}

async function fetchAllCollections(userId) {
    const collections = ['brgy_clearance', 'brgy_certificate', 'brgy_indigency'];
    let allRequests = [];

    for (const collectionName of collections) {
        try {
            const requests = await new Promise((resolve, reject) => {
                fetchCollectionData(collectionName, userId, (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                });
            });
            allRequests = allRequests.concat(requests);
        } catch (error) {
            console.error(`Error fetching from ${collectionName}:`, error);
        }
    }

    console.log(`Total requests fetched: ${allRequests.length}`);
    return allRequests.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
}

function displayRequests(requests) {
    const tableBody = document.querySelector('#residentClearanceTable tbody');
    tableBody.innerHTML = '';

    if (requests.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">No document requests found.</td></tr>';
        return;
    }

    requests.forEach((request) => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${request.transactionId || ''}</td>
            <td>${request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : ''}</td>
            <td>${request.fullName || ''}</td>
            <td>${request.purpose || ''}</td>
            <td>${request.status || ''}</td>
            <td>${formatIssuedAt(request.issuedAt)}</td>
            <td>
                <button class="action-btn view-btn" data-id="${request.id}" data-type="${request.type}">View</button>
            </td>
        `;
    });
}

function formatIssuedAt(issuedAt) {
  if (!issuedAt) return 'Not yet issued';
  
  // Check if issuedAt is a Firestore Timestamp
  if (issuedAt.seconds) {
      return new Date(issuedAt.seconds * 1000).toLocaleDateString();
  }
  
  // Check if issuedAt is an ISO string
  if (typeof issuedAt === 'string') {
      return new Date(issuedAt).toLocaleDateString();
  }
  
  // If it's already a Date object
  if (issuedAt instanceof Date) {
      return issuedAt.toLocaleDateString();
  }
  
  return 'Invalid Date';
}

// Function to display requests in the table
async function displayUserDocumentRequests() {
    const user = auth.currentUser;
    if (!user) {
        console.error("No user is currently logged in");
        return;
    }

    const tableBody = document.querySelector('#residentClearanceTable tbody');
    tableBody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

    try {
        const allRequests = await fetchAllCollections(user.uid);
        displayRequests(allRequests);
    } catch (error) {
        console.error("Error displaying user document requests:", error);
        tableBody.innerHTML = '<tr><td colspan="7">Error loading requests. Please try again.</td></tr>';
    }
}


function calculateAge(birthdate) {
    if (!birthdate) return '';
    const today = new Date();
    const birth = new Date(birthdate);
    if (isNaN(birth.getTime())) return '';
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

// ########### AUTO POPULATE FORM ##########3

async function getUserData(authUserId) {
  try {
      // Query the users collection where userId matches the auth user id
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("userId", "==", authUserId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          
          // Use the stored fullName if available, otherwise construct it from individual fields
          if (!userData.fullName) {
              userData.fullName = `${toTitleCase(userData.firstName || '')} ${toTitleCase(userData.middleName || '')} ${toTitleCase(userData.lastName || '')}`.trim();
          }
          
          console.log('Found user data:', userData); // Debug log
          return userData;
      } else {
          console.log(`No user found with userId: ${authUserId}`);
          return null;
      }
  } catch (error) {
      console.error("Error fetching user data:", error);
      throw error;
  }
}

// Function to handle form population
async function populateFormData(formType) {
  const user = auth.currentUser;
  if (!user) {
      console.log("No user is signed in.");
      return;
  }

  try {
      console.log('Fetching data for user:', user.uid); // Debug log
      const userData = await getUserData(user.uid);
      
      if (!userData) {
          console.log("No user data found");
          return;
      }

      const currentDate = getCurrentDate();
      console.log('Populating form with user data:', userData); // Debug log
      
      switch(formType) {
          case 'clearance':
              document.getElementById('clearanceName').value = userData.fullName || '';
              document.getElementById('clearanceAge').value = calculateAge(userData.birthdate) || '';
              document.getElementById('clearanceBlklot').value = userData.blklot || '';
              // document.getElementById('clearanceStreet').value = userData.street || '';
              document.getElementById('clearanceDateFiled').value = currentDate;
              break;
          case 'certificate':
              document.getElementById('certificateName').value = userData.fullName || '';
              document.getElementById('certificateAge').value = calculateAge(userData.birthdate) || '';
              document.getElementById('certificateBlklot').value = userData.blklot || '';
              // document.getElementById('certificateStreet').value = userData.street || '';
              document.getElementById('certificateDateFiled').value = currentDate;
              break;
          case 'indigency':
              document.getElementById('indigencyName').value = userData.fullName || '';
              document.getElementById('indigencyAge').value = calculateAge(userData.birthdate) || '';
              document.getElementById('indigencyBlklot').value = userData.blklot || '';
              // document.getElementById('indigencyStreet').value = userData.street || '';
              document.getElementById('indigencyDateFiled').value = currentDate;
              break;
      }
  } catch (error) {
      console.error("Error populating form:", error);
  }
}

// Updated event listeners with proper async handling
document.getElementById('applyBrgyClearance').addEventListener('click', async () => {
  showClearancePopup();
  await populateFormData('clearance');
});

document.getElementById('applyBrgyCertificate').addEventListener('click', async () => {
  showCertificatePopup();
  await populateFormData('certificate');
});

document.getElementById('applyBrgyIndigency').addEventListener('click', async () => {
  showIndigencyPopup();
  await populateFormData('indigency');
});

  
  // Function to get current date in YYYY-MM-DD format
  function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }
  
  // Function to show overlay and populate form
  function showOverlayAndPopulateForm() {
    
  
    onAuthStateChanged(auth, (user) => {
      if (user) {
        getUserData(user.uid).then(userData => {
          if (userData) {
            populateForm(userData);
          }
        }).catch(error => {
          console.error("Error fetching user data:", error);
        });
      } else {
        console.log("No user is signed in.");
        // Optionally, you can clear the form or handle this case as needed
      }
    });
  }

  showOverlayAndPopulateForm()

  
  async function generateTransactionId(type) {
    let collectionName, prefix;
    
    if (type === 'clearance') {
      collectionName = 'brgy_clearance';
      prefix = 'CLRN';
    } else if (type === 'certificate') {
      collectionName = 'brgy_certificate';
      prefix = 'CERT';
    } else if (type === 'indigency') {
        collectionName = 'brgy_indigency';
        prefix = 'INDG';
    } else {
      throw new Error('Invalid transaction type');
    }
  
    const collectionRef = collection(db, collectionName);
  const q = query(collectionRef, orderBy('transactionId', 'desc'), limit(1));
  const querySnapshot = await getDocs(q);

  let lastNumber = 0;
  if (!querySnapshot.empty) {
    const lastDoc = querySnapshot.docs[0];
    const lastTransactionId = lastDoc.data().transactionId;
    lastNumber = parseInt(lastTransactionId.split('-')[1]);
  }

  const newNumber = lastNumber + 1;
  return `${prefix}-${newNumber.toString().padStart(6, '0')}`;
}

async function getUserUniqueId(authUserId) {
  try {
      // Query the users collection where userId matches the auth user id
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("userId", "==", authUserId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          console.log('Found user uniqueId:', userData.uniqueId); // Debug log
          return userData.uniqueId;
      } else {
          console.log(`No user found with userId: ${authUserId}`);
          return null;
      }
  } catch (error) {
      console.error("Error fetching user uniqueId:", error);
      throw error;
  }
}
// ########################## CLEARANCE ################################33
async function submitClearanceForm() {
  const user = auth.currentUser;
  if (!user) {
      alert('You must be logged in to submit a clearance form.');
      return;
  }

  // Get form values
  const fullName = document.getElementById('clearanceName').value;
  const age = document.getElementById('clearanceAge').value;
  const blockLot = document.getElementById('clearanceBlklot').value;
  // const street = document.getElementById('clearanceStreet').value;
  const issueDate = document.getElementById('clearanceDateFiled').value;
  const purpose = document.getElementById('clearancePurpose').value;

  // Validate form
  if (!fullName || !age || !blockLot || !issueDate || !purpose) {
      alert('Please fill out all fields.');
      return;
  }

  try {
      console.log('Getting user unique ID...');
      const uniqueId = await getUserUniqueId(user.uid);
      console.log('User unique ID retrieved:', uniqueId);
      
      if (!uniqueId) {
          throw new Error('Unable to retrieve user uniqueId');
      }

      console.log('Generating transaction ID...');
      const transactionId = await generateTransactionId('clearance');
      console.log('Transaction ID generated:', transactionId);

      // Prepare the document to be saved
      const clearanceData = {
          transactionId,
          uniqueId,
          fullName,
          age: parseInt(age),
          blockLot,
          
          issueDate,
          purpose,
          status: 'Pending',
          createdAt: serverTimestamp(),
      };

      console.log('Clearance data prepared:', clearanceData);

      // Add the document to the "brgy_clearance" collection
      console.log('Adding document to brgy_clearance collection...');
      const docRef = await addDoc(collection(db, 'brgy_clearance'), clearanceData);
      
      console.log('Clearance submitted with ID:', docRef.id);
      console.log('Transaction ID:', transactionId);
      alert(`Barangay Clearance form submitted successfully!\nTransaction ID: ${transactionId}`);

      // Close the overlay and reset the form
      document.getElementById('overlay').style.display = 'none';
      document.getElementById('clearanceForm').reset();

  } catch (error) {
      console.error('Error in submitClearanceForm:', error);
      if (error.message.includes('uniqueId')) {
          alert('Error: Unable to retrieve your resident information. Please make sure you are registered as a resident.');
      } else {
          alert('An error occurred while submitting the form. Please try again or contact support.');
      }
  }
}
  
  // Add event listener to the submit button
  document.getElementById('submitClearanceBtn').addEventListener('click', submitClearanceForm);

  // ########################## CERTIFICATE ################################


  async function submitCertificateForm() {
    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in to submit a certificate form.');
      return;
    }
  
    // Get form values
    const fullName = document.getElementById('certificateName').value;
    const age = document.getElementById('certificateAge').value;
    const blockLot = document.getElementById('certificateBlklot').value;
    // const street = document.getElementById('certificateStreet').value;
    const issueDate = document.getElementById('certificateDateFiled').value;
    const purpose = document.getElementById('certificatePurpose').value;
    const dor = document.getElementById('certificateDateOfResidency').value;
  
    // Validate form
    if (!fullName || !age || !blockLot || !issueDate ||!dor || !purpose) {
      alert('Please fill out all fields.');
      return;
    }
  
    try {
      console.log('Generating transaction ID...');
      const transactionId = await generateTransactionId('certificate');
      console.log('Transaction ID generated:', transactionId);
  
      console.log('Getting user unique ID...');
      const uniqueId = await getUserUniqueId(user.uid);
      console.log('User unique ID retrieved:', uniqueId);
      
      if (!uniqueId) {
        console.error('Error: Unable to retrieve user information.');
        alert('Error: Unable to retrieve user information. Please try again or contact support.');
        return;
      }
  
      // Prepare the document to be saved
      const certificateData = {
        transactionId,
        uniqueId,
        fullName,
        age: parseInt(age),
        blockLot,
        issueDate,
        dor,
        purpose,
        status: 'Pending',
        createdAt: serverTimestamp(),
      };
  
      console.log('certificate data prepared:', certificateData);
  
      // Add the document to the "brgy_clearance" collection
      console.log('Adding document to brgy_certificate collection...');
      const docRef = await addDoc(collection(db, 'brgy_certificate'), certificateData);
      
      console.log('certificate submitted with ID:', docRef.id);
      console.log('Transaction ID:', transactionId);
      alert(`Barangay certificate form submitted successfully!\nTransaction ID: ${transactionId}`);
  
      // Close the overlay or reset the form as needed
      document.getElementById('certificateOverlay').style.display = 'none';
      document.getElementById('certificateForm').reset();
  
    } catch (error) {
      console.error('Detailed error in submitCertificateForm:', error);
      if (error.code) {
        console.error('Error code:', error.code);
      }
      if (error.message) {
        console.error('Error message:', error.message);
      }
      alert('An error occurred while submitting the form. Please check the console for details and try again.');
    }
  }
  
  // Add event listener to the submit button
  document.getElementById('submitCertificateBtn').addEventListener('click', submitCertificateForm);

  // ########################## INDIGENCY ################################


  async function submitIndigencyForm() {
    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in to submit a certificate form.');
      return;
    }
  
    // Get form values
    const fullName = document.getElementById('indigencyName').value;
    const age = document.getElementById('indigencyAge').value;
    const blockLot = document.getElementById('indigencyBlklot').value;
    // const street = document.getElementById('indigencyStreet').value;
    const issueDate = document.getElementById('indigencyDateFiled').value;
    const purpose = document.getElementById('indigencyPurpose').value;
  
    // Validate form
    if (!fullName || !age || !blockLot || !issueDate || !purpose) {
      alert('Please fill out all fields.');
      return;
    }
  
    try {
      console.log('Generating transaction ID...');
      const transactionId = await generateTransactionId('indigency');
      console.log('Transaction ID generated:', transactionId);
  
      console.log('Getting user unique ID...');
      const uniqueId = await getUserUniqueId(user.uid);
      console.log('User unique ID retrieved:', uniqueId);
      
      if (!uniqueId) {
        console.error('Error: Unable to retrieve user information.');
        alert('Error: Unable to retrieve user information. Please try again or contact support.');
        return;
      }
  
      // Prepare the document to be saved
      const indigencyData = {
        transactionId,
        uniqueId,
        fullName,
        age: parseInt(age),
        blockLot,
        issueDate,
        purpose,
        status: 'Pending',
        createdAt: serverTimestamp(),
      };
  
      console.log('certificate data prepared:', indigencyData);
  
      // Add the document to the "brgy_clearance" collection
      console.log('Adding document to brgy_indigency collection...');
      const docRef = await addDoc(collection(db, 'brgy_indigency'), indigencyData);
      
      console.log('indigency submitted with ID:', docRef.id);
      console.log('Transaction ID:', transactionId);
      alert(`Barangay indigency form submitted successfully!\nTransaction ID: ${transactionId}`);
  
      // Close the overlay or reset the form as needed
      document.getElementById('indigencyOverlay').style.display = 'none';
      document.getElementById('indigencyForm').reset();
  
    } catch (error) {
      console.error('Detailed error in submitIndigencyForm:', error);
      if (error.code) {
        console.error('Error code:', error.code);
      }
      if (error.message) {
        console.error('Error message:', error.message);
      }
      alert('An error occurred while submitting the form. Please check the console for details and try again.');
    }
  }

  
  
  // Add event listener to the submit button
  document.getElementById('submitIndigencyBtn').addEventListener('click', submitIndigencyForm);