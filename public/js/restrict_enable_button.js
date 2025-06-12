import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, collection, doc, updateDoc, getDoc, getDocs, setDoc, addDoc, limit, orderBy, where, query, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBDp03_t7kWck8XTT9iqv3SIX8UqFp_C6w",
    authDomain: "bims-9aaa7.firebaseapp.com",
    projectId: "bims-9aaa7",
    storageBucket: "bims-9aaa7.appspot.com",
    messagingSenderId: "323333588672",
    appId: "1:323333588672:web:cfb7ea2dff4d9eb2004f25",
    measurementId: "G-RQJBMNMFQ8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

//#################### LOADER ######################
function showLoader() {
    document.getElementById('loader-container').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loader-container').style.display = 'none';
}

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
            window.location.href = "/landingPage.html";
        } catch (error) {
            console.error('Error signing out:', error);
            alert('Error signing out. Please try again.');
        }
    }
}

document.querySelector('.toggle-menu').addEventListener('click', toggleDropdown);
document.querySelector('.dropdown-item:last-child').addEventListener('click', logout);

//#################### ACTIVE TAB ######################
document.addEventListener('DOMContentLoaded', () => {
    function setActiveTab() {
        const path = window.location.pathname.split('/').pop();
        const tabMap = {
            'visitorspage.html': 'visitorspage-tab',
            'documentrequest.html': 'documentrequest-tab',
            'trackrequest.html': 'trackrequest-tab',
            'res-complaint.html': 'complaint-tab',
            };

        const activeTabId = tabMap[path];

        if (activeTabId) {
            document.getElementById(activeTabId).classList.add('active');
        }
    }

    setActiveTab();

    function handleTabClick(event) {
        const clickedTab = event.target.closest('.tab');
        if (!clickedTab) return;

        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        clickedTab.classList.add('active');
    }

    document.querySelector('.sidebar').addEventListener('click', handleTabClick);
});

function openTab(tabName) {
    var i, tabContent;
    tabContent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabContent.length; i++) {
        tabContent[i].classList.remove("active");
    }
    document.getElementById(tabName).classList.add("active");
}

window.onload = function () {
    openTab('dashboard');
};



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

//#################### FETCH AND DISPLAY USER INFO ######################

async function fetchAndDisplayUserInfo(uniqueId) {
    try {
        const userQuery = query(collection(db, "users"), where('uniqueId', '==', uniqueId));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0];
            const userData = userDoc.data();
            console.log("Fetched user data:", userData);
            
            document.getElementById('display-fullName').textContent = `${userData.firstName?.toUpperCase() || ''} ${userData.middleName?.toUpperCase() || ''} ${userData.lastName?.toUpperCase() || ''}`.trim();
            document.getElementById('display-birthdate').textContent = userData.birthdate || '';
            document.getElementById('display-birthplace').textContent = userData.birthplace?.toUpperCase() || '';
            document.getElementById('display-blklot').textContent = userData.blklot?.toUpperCase() || '';
            document.getElementById('display-street').textContent = userData.street?.toUpperCase() || '';
            // document.getElementById('display-address').textContent = `${userData.blklot?.toUpperCase() || ''} ${userData.street?.toUpperCase() || ''}`.trim();
            document.getElementById('display-age').textContent = userData.age || '';
            document.getElementById('display-citizenship').textContent = userData.citizenship?.toUpperCase() || '';
            document.getElementById('display-gender').textContent = userData.gender?.toUpperCase() || '';
            document.getElementById('display-voter').textContent = userData.voter?.toUpperCase() || '';
            document.getElementById('display-email').textContent = userData.email?.toUpperCase() || '';
            document.getElementById('display-marital-status').textContent = userData.maritalStatus?.toUpperCase() || '';
            document.getElementById('display-employment-status').textContent = userData.employmentStatus?.toUpperCase() || '';
            document.getElementById('display-phone').textContent = userData.phone || ''; // No need for upper case
            document.getElementById('display-occupation').textContent = userData.occupation?.toUpperCase() || '';
            document.getElementById('display-pwd').textContent = userData.pwd?.toUpperCase() || '';
            document.getElementById('display-kdbm').textContent = userData.kdbm?.toUpperCase() || '';
            document.getElementById('display-fourPs').textContent = userData.fourPs?.toUpperCase() || '';
            document.getElementById('display-soloParent').textContent = userData.soloParent?.toUpperCase() || '';

        
            // updateEmailDisplay(userData.email || 'No Email Available'); // For email display
            updateUsernameDisplay(userData.username || 'No Email Available');
        } else {
            console.log("User document does not exist");
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            fetchAndDisplayUserInfo(user.uid);
        } else {
            console.log('No user signed in.');
        }
    });
});

function calculateAge(birthdate) {
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    console.log(`Calculated age for birthdate ${birthdate}: ${age}`);
    return age;
}

function updateAgeDisplay() {
    console.log("updateAgeDisplay function called");
    const birthdateElement = document.getElementById('display-birthdate');
    const ageElement = document.getElementById('display-age');
    
    if (birthdateElement && ageElement) {
        const birthdate = birthdateElement.textContent;
        console.log(`Birthdate from element: ${birthdate}`);
        if (birthdate && birthdate !== 'N/A') {
            const age = calculateAge(birthdate);
            console.log(`Updating age display to: ${age}`);
            ageElement.textContent = age;
        } else {
            console.log("Birthdate is not available or set to N/A");
        }
    } else {
        console.log("Birthdate or age element not found in the DOM");
    }
}


document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded, calling updateAgeDisplay");
    updateAgeDisplay();
});

function showCustomAlert(message) {
    console.log("Showing custom alert:", message);
    const alertDiv = document.createElement('div');
    alertDiv.textContent = message;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #f8d7da;
        color: #721c24;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000;
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Format the date function
function formatDate(date) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    return new Intl.DateTimeFormat('en-US', options).format(date);
}


async function loadUserData() {
    console.log("Loading user data...");
    const user = auth.currentUser;
    if (user) {
        console.log("Authenticated user:", user);
        try {
            const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
            const userSnapshot = await getDocs(userQuery);
            
            if (!userSnapshot.empty) {
                const userDoc = userSnapshot.docs[0];
                const userData = userDoc.data();
                console.log("Fetched user data:", userData);

                // Call fetchAndDisplayUserInfo with userData.uniqueId
                await fetchAndDisplayUserInfo(userData.uniqueId);

                // Update DOM elements with user data
                const uniqueIdSpan = document.getElementById('unique-id');
                if (uniqueIdSpan) {
                    uniqueIdSpan.textContent = userData.uniqueId || 'Not assigned yet';
                }

                const fullNameSpan = document.getElementById('display-fullName');
                if (fullNameSpan) {
                    fullNameSpan.textContent = `${userData.firstName || ''} ${userData.middleName || ''} ${userData.lastName || ''} ${userData.suffix || ''}`.trim();
                }

                const birthdate = userData.birthdate;
                if (birthdate) {
                    console.log(`Birthdate from user data: ${birthdate}`);
                    const age = calculateAge(birthdate);
                    const ageSpan = document.getElementById('display-age');
                    const birthdateSpan = document.getElementById('display-birthdate');
                    if (ageSpan) {
                        console.log(`Setting initial age display to: ${age}`);
                        ageSpan.textContent = age;
                    }
                    if (birthdateSpan) {
                        console.log(`Setting birthdate display to: ${birthdate}`);
                        birthdateSpan.textContent = birthdate;
                    }
                } else {
                    console.log("Birthdate not found in user data");
                }

                const fields = [
                    'birthdate', 'birthplace', 'address', 'age', 'citizenship',
                    'gender', 'voter', 'email', 'maritalStatus', 'employmentStatus',
                    'phone', 'occupation', 'pwd', 'kdbm', 'fourPs', 'soloParent'
                ];

                fields.forEach(field => {
                    const element = document.getElementById(`display-${field}`);
                    if (element) {
                        element.textContent = userData[field] || 'N/A';
                    }
                });

                const addressSpan = document.getElementById('display-address');
                if (addressSpan) {
                    addressSpan.textContent = `${userData.blklot || ''} ${userData.street || ''}`.trim() || 'N/A';
                }

                // Load profile image if available
                const profileImage = document.getElementById('profile-image');
                if (profileImage && userData.profileImageUrl) {
                    profileImage.src = userData.profileImageUrl;
                }
               
            } else {
                console.log("No user document found!");
                showCustomAlert("User data not found.");
            }
        } catch (error) {
            console.error("Error loading user data:", error);
            showCustomAlert("An error occurred while loading your data.");
        }
    } else {
        console.log("No user is signed in.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged((user) => {
        if (user) {
            loadUserData();
        } else {
            console.log("No user is signed in.");            
        }
    });
});

//#################### PREPOPULATE ######################


async function prepopulateUserData() {
    const currentUser = auth.currentUser;
    if (currentUser) {
        try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Pre-populate form fields
                document.getElementById('upd-fname').value = userData.firstName || '';
                document.getElementById('upd-mname').value = userData.middleName || '';
                document.getElementById('upd-lname').value = userData.lastName || '';
                document.getElementById('upd-birthdate').value = userData.birthdate || '';

                document.getElementById('upd-suffix').value = userData.suffix || '';
                document.getElementById('upd-blklot').value = userData.blklot || '';
                document.getElementById('upd-street').value = userData.street || '';
                // document.getElementById('upd-address').value = userData.address || '';
                document.getElementById('upd-citizenship').value = userData.citizenship || '';
                // document.getElementById('upd-age').value = userData.age || '';
                document.getElementById('upd-birthdate').value = userData.birthdate || '';
                document.getElementById('upd-birthplace').value = userData.birthplace || '';
                document.getElementById('upd-gender').value = userData.gender || '';
                document.getElementById('upd-voter').value = userData.voter || '';
                document.getElementById('upd-email').value = userData.email || '';
                document.getElementById('upd-marital-status').value = userData.maritalStatus || '';
                document.getElementById('upd-employment-status').value = userData.employmentStatus || '';
                document.getElementById('upd-phone').value = userData.phone || '';
                document.getElementById('upd-occupation').value = userData.occupation || '';
                document.getElementById('upd-kdbm').value = userData.kdbm || '';
                document.getElementById('upd-pwd').value = userData.pwd || '';
                document.getElementById('upd-fourPs').value = userData.fourPs || '';
                document.getElementById('upd-soloParent').value = userData.soloParent || '';
            // }
            
            document.getElementById('declaration-checkbox').addEventListener('change', function () {
                const submitButton = document.getElementById('submit-update-btn');
                submitButton.disabled = !this.checked;
              });

            const fields = [
                // 'upd-fname', 'upd-mname', 'upd-lname', 
                'upd-suffix', 'upd-blklot', 
                'upd-street', 'upd-citizenship', 'upd-age',
                'upd-birthplace', 'upd-gender', 'upd-voter', 'upd-email', 
                'upd-marital-status', 'upd-employment-status', 'upd-phone', 
                'upd-occupation', 'upd-kdbm', 'upd-pwd', 'upd-fourPs', 'upd-soloParent'
            ];

            // Populate fields
            fields.forEach(field => {
                const element = document.getElementById(field);
                if (element) {
                    const key = field.replace('upd-', '');
                    element.value = userData[key] || '';
                } else {
                    console.error(`Element with id "${field}" not found.`);
                }
            });
        } else {
            console.error('User document does not exist.');
        }

        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    }
}

// Call this function when the update button is clicked
document.getElementById('update-btn').addEventListener('click', function () {
    document.getElementById('overlay').style.display = 'flex';
    prepopulateUserData();
});


//#################### CREATE PROFILE UPDATE REQUEST ######################

async function createProfileUpdateRequest(userId, formData) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      const uniqueId = userData.uniqueId;
  
      // Generate the transaction number
      const transactionNo = await generateTransactionNo();
  
      // Submit the profile update request to the "Profile_Update" collection
      await addDoc(collection(db, 'Profile_Update'), {
        uniqueId: uniqueId,
        fullName: `${formData.firstName} ${formData.middleName} ${formData.lastName}`.trim(),
        status: 'PENDING',
        timestamp: serverTimestamp(),
        transactionNo: transactionNo,
        ...formData
      });
  
      console.log('Update request submitted successfully');
      alert(`Update request submitted. Your transaction number is ${transactionNo}. Please wait for admin approval.`);
  
      // Update the lastUpdate field in the users collection
      await updateDoc(doc(db, 'users', userId), {
        lastUpdate: serverTimestamp()
      });
  
    } catch (error) {
      console.error('Error submitting update request:', error.message);
      alert('Error submitting update request. Please try again.');
    }
  }



async function getUserUniqueId(uid) {
    const userRef = doc(db, 'User_Accounts', uid); // Adjust this if you need to fetch by a different field
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
        return userDoc.data().uniqueId;
    } else {
        console.error("No such user document!");
        return null;
    }
}




// Get references to DOM elements
const updateBtn = document.getElementById('update-btn');
const overlay = document.getElementById('overlay');
const updatePopup = document.getElementById('updatePopup');
const closePopupBtn = document.getElementById('closePopup');
const updateForm = document.getElementById('update-info-form');
const submitUpdateBtn = document.getElementById('submit-update-btn');



// Function to check if the user can update their information
async function canUserUpdate(userId) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    
    if (userData && userData.lastUpdate) {
      const lastUpdate = userData.lastUpdate.toDate();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      return {
        canUpdate: lastUpdate < sixMonthsAgo,
        nextUpdateDate: new Date(lastUpdate.getTime() + (6 * 30 * 24 * 60 * 60 * 1000))
      };
    }
    
    return { canUpdate: true };
  }

// Function to update user information
async function updateUserInfo(userId, formData) {
  const userRef = doc(db, 'users', userId);
  
  try {
    await updateDoc(userRef, {
      ...formData,
      lastUpdate: serverTimestamp()
    });
    alert('Information updated successfully!');
    hideUpdatePopup();
  } catch (error) {
    console.error('Error updating user information:', error);
    alert('An error occurred while updating your information. Please try again.');
  }
}

// Event listener for the update button
updateBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (user) {
      const updateStatus = await canUserUpdate(user.uid);
      if (updateStatus.canUpdate) {
        showUpdatePopup();
        prepopulateUserData();
      } else {
        alert(`You can update your information again on ${updateStatus.nextUpdateDate.toLocaleDateString()}.`);
      }
    } else {
      alert('Please log in to update your information.');
    }
  });

// Event listener for form submission
submitUpdateBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (user) {
      const formData = Object.fromEntries(new FormData(updateForm));
      await createProfileUpdateRequest(user.uid, formData);
      hideUpdatePopup();
    } else {
      alert('Please log in to update your information.');
    }
  });

  // Function to show the update popup
function showUpdatePopup() {
    overlay.style.display = 'flex';
    updatePopup.style.display = 'block';
  }
  
  // Function to hide the update popup
  function hideUpdatePopup() {
    overlay.style.display = 'none';
    updatePopup.style.display = 'none';
  }

// Event listener for closing the popup
closePopupBtn.addEventListener('click', hideUpdatePopup);

// Event listener for form submission
updateForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (user) {
    const formData = Object.fromEntries(new FormData(updateForm));
    await updateUserInfo(user.uid, formData);
  }
});

// Check user's auth state and update UI accordingly
onAuthStateChanged(auth, (user) => {
  if (user) {
    updateBtn.classList.remove('inactive-submit');
    updateBtn.classList.add('active-submit');
  } else {
    updateBtn.classList.remove('active-submit');
    updateBtn.classList.add('inactive-submit');
  }
});