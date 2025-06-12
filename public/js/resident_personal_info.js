//########## RESIDENT_PERSONAL_INFO.JS ##########
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, collection, doc, updateDoc, getDoc, getDocs, setDoc, addDoc, limit, orderBy, where, query, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

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
const storage = getStorage(app);


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
            window.location.href = "../index.html";
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

//#################### FETCH AND DISPLAY USERNAME ######################

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
                        employmentStatus, phone, occupation, educationalStatus,
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
                setTextContent('educational-status', educationalStatus);
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

/*######################################  ################################################*/

async function handleUpdateButton() {
    console.log("handleUpdateButton function called");
    const user = auth.currentUser;
    if (!user) {
        console.log("No user logged in");
        alert("You must be logged in to update your profile.");
        return;
    }
    console.log("User is logged in:", user.email);

    try {
        const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
        const userSnapshot = await getDocs(userQuery);
        
        if (userSnapshot.empty) {
            console.error("User document not found");
            alert("Error: User profile not found. Please contact support.");
            return;
        }

        const userData = userSnapshot.docs[0].data();
        const uniqueId = userData.uniqueId;
        
        if (!uniqueId) {
            console.error("UniqueId not found for user");
            alert("Error: User uniqueId not found. Please contact support.");
            return;
        }

        const updateCountdownRef = doc(db, "Update_Countdown", uniqueId);
        const docSnap = await getDoc(updateCountdownRef);

        const currentTime = new Date();
        if (docSnap.exists()) {
            const lastUpdateTime = docSnap.data().lastUpdate.toDate();
            const timeDifference = currentTime - lastUpdateTime;
            const sixMonthsInMs = 6 * 30 * 24 * 60 * 60 * 1000; // Approximate 6 months in milliseconds

            if (timeDifference < sixMonthsInMs) {
                const remainingTime = sixMonthsInMs - timeDifference;
                const remainingDays = Math.ceil(remainingTime / (24 * 60 * 60 * 1000));
                const nextUpdateDate = new Date(currentTime.getTime() + remainingTime);
                
                alert(`You can only update every 6 months. Your next update will be available on ${nextUpdateDate.toDateString()}. (${remainingDays} days remaining)`);
                return;
            }
        }

        // If we're here, either the doc doesn't exist (new user) or 6 months have passed
        await setDoc(updateCountdownRef, {
            lastUpdate: serverTimestamp()
        });

        // Show the update info form
        document.getElementById('overlay').style.display = 'flex';
        prepopulateUserData();

    } catch (error) {
        console.error("Error handling update button:", error);
        alert("An error occurred. Please try again later.");
    }
}

async function checkUpdateButtonState() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
        const userSnapshot = await getDocs(userQuery);
        
        if (userSnapshot.empty) return;

        const userData = userSnapshot.docs[0].data();
        const uniqueId = userData.uniqueId;

        if (!uniqueId) return;

        const updateCountdownRef = doc(db, "Update_Countdown", uniqueId);
        const docSnap = await getDoc(updateCountdownRef);

        const updateBtn = document.getElementById('update-btn');
        const currentTime = new Date();

        if (docSnap.exists()) {
            const lastUpdateTime = docSnap.data().lastUpdate.toDate();
            const timeDifference = currentTime - lastUpdateTime;
            const sixMonthsInMs = 6 * 30 * 24 * 60 * 60 * 1000;

            if (timeDifference < sixMonthsInMs) {
                updateBtn.disabled = true;
                updateBtn.classList.remove('inactive-submit');
                updateBtn.classList.add('disabled-submit');
                
                const remainingTime = sixMonthsInMs - timeDifference;
                const nextUpdateDate = new Date(currentTime.getTime() + remainingTime);
                updateBtn.title = `Next update available on ${nextUpdateDate.toDateString()}`;
            } else {
                updateBtn.disabled = false;
                updateBtn.classList.remove('disabled-submit');
                updateBtn.classList.add('inactive-submit');
                updateBtn.title = "Click to update your profile";
            }
        } else {
            updateBtn.disabled = false;
            updateBtn.classList.remove('disabled-submit');
            updateBtn.classList.add('inactive-submit');
            updateBtn.title = "Click to update your profile";
        }
    } catch (error) {
        console.error("Error checking update button state:", error);
    }
}

// Add these event listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded");
    const updateBtn = document.getElementById('update-btn');
    if (updateBtn) {
        console.log("Update button found, adding event listener");
        // Remove any existing listeners
        const newUpdateBtn = updateBtn.cloneNode(true);
        updateBtn.parentNode.replaceChild(newUpdateBtn, updateBtn);
        
        // Add our new listener
        newUpdateBtn.addEventListener('click', handleUpdateButton);
        console.log("Update button event listener added.");
    } else {
        console.error("Update button not found in the DOM.");
    }
});

// Auth state change listener
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("User authenticated:", user.email);
    } else {
        console.log("No user signed in.");
    }
});


/*######################################  ################################################*/

document.getElementById('update-btn').addEventListener('click', function () {
    document.getElementById('overlay').style.display = 'flex';
});

document.getElementById('closePopup').addEventListener('click', function () {
    document.getElementById('overlay').style.display = 'none';
});

document.getElementById('cancel-update-btn').addEventListener('click', function () {
    document.getElementById('overlay').style.display = 'none';
});


document.getElementById('submit-update-btn').addEventListener('click', async function (event) {
    event.preventDefault();

    const formData = {
        firstName: document.getElementById('upd-fname')?.value.toUpperCase() || '',
        middleName: document.getElementById('upd-mname')?.value.toUpperCase() || '',
        lastName: document.getElementById('upd-lname')?.value.toUpperCase() || '',
        suffix: document.getElementById('upd-suffix')?.value.toUpperCase() || '',
        blklot: document.getElementById('upd-blklot')?.value.toUpperCase() || '',
        street: document.getElementById('upd-street')?.value.toUpperCase() || '',
        citizenship: document.getElementById('upd-citizenship')?.value.toUpperCase() || '',
        age: document.getElementById('upd-age')?.value || '',
        birthdate: document.getElementById('upd-birthdate')?.value || '',
        birthplace: document.getElementById('upd-birthplace')?.value.toUpperCase() || '',
        gender: document.getElementById('upd-gender')?.value.toUpperCase() || '',
        voter: document.getElementById('upd-voter')?.value.toUpperCase() || '',
        email: document.getElementById('upd-email')?.value || '',
        maritalStatus: document.getElementById('upd-marital-status')?.value.toUpperCase() || '',
        employmentStatus: document.getElementById('upd-employment-status')?.value.toUpperCase() || '',
        educationalStatus: document.getElementById('upd-educational-status')?.value.toUpperCase() || '',
        phone: document.getElementById('upd-phone')?.value || '',
        occupation: document.getElementById('upd-occupation')?.value.toUpperCase() || '',
        kdbm: document.getElementById('upd-kdbm')?.value || '',
        pwd: document.getElementById('upd-pwd')?.value || '',
        fourPs: document.getElementById('upd-fourPs')?.value || '',
        soloParent: document.getElementById('upd-soloParent')?.value || '',
    };

    try {
        // Get the current user and retrieve uniqueId
        const currentUser = auth.currentUser;
        if (currentUser) {
            const uniqueId = await getUserUniqueId(currentUser.uid);
            await createProfileUpdateRequest(uniqueId, formData);
            console.log('Form data:', formData);
        } else {
            console.log('User not logged in');
            alert('Please log in to submit an update request.');
        }
    } catch (error) {
        console.error('Error submitting update request:', error.message);
        alert('There was an error submitting the update request. Please try again.');
    }
});

//#################### PREPOPULATE ######################


async function prepopulateUserData() {
    const currentUser = auth.currentUser;
    if (currentUser) {
        try {
            const userQuery = query(collection(db, "users"), where("userId", "==", currentUser.uid));
            const userSnapshot = await getDocs(userQuery);
            
            if (!userSnapshot.empty) {
                const userDoc = userSnapshot.docs[0];
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
                document.getElementById('upd-educational-status').value = userData.educationalStatus || '';
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
                'upd-marital-status', 'upd-employment-status', 'upd-educational-status',
                 'upd-phone', 'upd-occupation', 'upd-kdbm', 'upd-pwd', 'upd-fourPs', 'upd-soloParent'
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

async function createProfileUpdateRequest(uniqueId, requestData) {
    try {
        const currentUser = auth.currentUser;
        if (currentUser) {
            // Generate the transaction number
            const transactionNo = await generateTransactionNo();
            
            // Submit the profile update request to the "Profile_Update" collection
            const updateRequestRef = await addDoc(collection(db, 'Profile_Update'), {
                uniqueId: uniqueId, // Use uniqueId directly
                fullName: `${requestData.firstName} ${requestData.middleName} ${requestData.lastName}`.trim(),
                status: 'PENDING',
                timestamp: serverTimestamp(),
                transactionNo: transactionNo,

                // Collect values directly from requestData for clarity
                firstName: requestData.firstName.toUpperCase(),
                middleName: requestData.middleName.toUpperCase(),
                lastName: requestData.lastName.toUpperCase(),
                suffix: requestData.suffix.toUpperCase(),
                blklot: requestData.blklot.toUpperCase(),
                street: requestData.street.toUpperCase(),
                citizenship: requestData.citizenship.toUpperCase(),
                birthdate: requestData.birthdate,
                birthplace: requestData.birthplace.toUpperCase(),
                email: requestData.email,
                occupation: requestData.occupation.toUpperCase(),
                phone: requestData.phone,
                gender: requestData.gender.toUpperCase(),
                voter: requestData.voter.toUpperCase(),
                maritalStatus: requestData.maritalStatus.toUpperCase(),
                employmentStatus: requestData.employmentStatus.toUpperCase(),
                educationalStatus: requestData.educationalStatus.toUpperCase(),
                kdbm: requestData.kdbm.toUpperCase(),
                pwd: requestData.pwd.toUpperCase(),
                fourPs: requestData.fourPs.toUpperCase(),
                soloParent: requestData.soloParent.toUpperCase()
            });

            console.log('Update request submitted successfully');
            alert(`Update request submitted. Your transaction number is ${transactionNo}. Please wait for admin approval.`);
            document.getElementById('overlay').style.display = 'none';
        } else {
            console.log('User not logged in');
            alert('Please log in to submit an update request.');
        }
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


// Event listener for form submission
document.getElementById('update-info-form').addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent default form submission behavior

    // Capture updated data from the form fields
    const updatedData = {
        firstName: document.getElementById('upd-fname').value.toUpperCase(),
        middleName: document.getElementById('upd-mname').value.toUpperCase(),
        lastName: document.getElementById('upd-lname').value.toUpperCase(),
        suffix: document.getElementById('upd-suffix').value.toUpperCase(),
        blklot: document.getElementById('upd-blklot').value.toUpperCase(),
        street: document.getElementById('upd-street').value.toUpperCase(),
        citizenship: document.getElementById('upd-citizenship').value.toUpperCase(),
        birthdate: document.getElementById('upd-birthdate').value,
        birthplace: document.getElementById('upd-birthplace').value.toUpperCase(),
        email: document.getElementById('upd-email').value,
        occupation: document.getElementById('upd-occupation').value.toUpperCase(),
        phone: document.getElementById('upd-phone').value,
        gender: document.getElementById('upd-gender').value.toUpperCase(),
        voter: document.getElementById('upd-voter').value.toUpperCase(),
        maritalStatus: document.getElementById('upd-marital-status').value.toUpperCase(),
        educationalStatus: document.getElementById('upd-educational-status').value.toUpperCase(),
        employmentStatus: document.getElementById('upd-employment-status').value.toUpperCase(),
        kdbm: document.getElementById('upd-kdbm').value,
        pwd: document.getElementById('upd-pwd').value,
        fourPs: document.getElementById('upd-fourPs').value,
        soloParent: document.getElementById('upd-soloParent').value
    };

    // Assume you already have the resident ID available
    const residentID = getCurrentResidentID(); // Fetch or define how you get the resident ID

    // Call the function to submit the profile update request
    await submitProfileUpdate(residentID, updatedData);
});


//#################### GENERATE TRANSACTION NO ######################

async function generateTransactionNo() {
    const counterRef = doc(db, 'counters', 'profileUpdate');
    
    try {
        const newCount = await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            const currentCount = counterDoc.exists() ? counterDoc.data().count : 0;
            const newCount = currentCount + 1;
            
            transaction.set(counterRef, { count: newCount });
            
            return newCount;
        });
        
        return `SADPI-PU-${newCount.toString().padStart(6, '0')}`;
    } catch (error) {
        console.error("Error generating transaction number:", error);
        throw error;
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
            // console.log("Fetched user data:", userData);
            
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
            document.getElementById('display-educational-status').textContent = userData.educationalStatus?.toUpperCase() || '';
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
    
    
    return age;
}

function updateAgeDisplay() {
    
    const birthdateElement = document.getElementById('display-birthdate');
    const ageElement = document.getElementById('display-age');
    
    if (birthdateElement && ageElement) {
        const birthdate = birthdateElement.textContent;
        
        if (birthdate && birthdate !== 'N/A') {
            const age = calculateAge(birthdate);
            
            ageElement.textContent = age;
        } else {
            console.log("Birthdate is not available or set to N/A");
        }
    } else {
        console.log("Birthdate or age element not found in the DOM");
    }
}

setInterval(updateAgeDisplay, 3000);

// document.addEventListener('DOMContentLoaded', () => {
//     console.log("DOM content loaded, calling updateAgeDisplay");
//     updateAgeDisplay();
// });

// function showCustomAlert(message) {
//     console.log("Showing custom alert:", message);
//     const alertDiv = document.createElement('div');
//     alertDiv.textContent = message;
//     alertDiv.style.cssText = `
//         position: fixed;
//         top: 20px;
//         left: 50%;
//         transform: translateX(-50%);
//         background-color: #f8d7da;
//         color: #721c24;
//         padding: 10px 20px;
//         border-radius: 5px;
//         z-index: 1000;
//     `;
//     document.body.appendChild(alertDiv);
//     setTimeout(() => {
//         alertDiv.remove();
//     }, 5000);
// }



// Format the date function
function formatDate(date) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    return new Intl.DateTimeFormat('en-US', options).format(date);
}


async function loadUserData() {
    console.log("Loading user data...");
    const user = auth.currentUser;
    if (user) {
        // console.log("Authenticated user:", user);
        try {
            const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
            const userSnapshot = await getDocs(userQuery);
            
            if (!userSnapshot.empty) {
                const userDoc = userSnapshot.docs[0];
                const userData = userDoc.data();
                // console.log("Fetched user data:", userData);

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
                    
                    const age = calculateAge(birthdate);
                    const ageSpan = document.getElementById('display-age');
                    const birthdateSpan = document.getElementById('display-birthdate');
                    if (ageSpan) {
                        
                        ageSpan.textContent = age;
                    }
                    if (birthdateSpan) {
                        
                        birthdateSpan.textContent = birthdate;
                    }
                } else {
                    console.log("Birthdate not found in user data");
                }

                const fields = [
                    'birthdate', 'birthplace', 'address', 'age', 'citizenship',
                    'gender', 'voter', 'email', 'maritalStatus', 'employmentStatus',
                    'phone', 'occupation', 'educationalStatus', 'pwd', 'kdbm', 'fourPs',
                     'soloParent'
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

async function handleProfileImageUpload(event, uniqueId) {
    try {
        const file = event.target.files[0];
        if (!file) {
            throw new Error('No file selected');
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            throw new Error('Invalid file type. Please upload an image file');
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error('Image size should be less than 5MB');
        }

        // Show loading state
        const profileImage = document.getElementById('profile-image');
        profileImage.style.opacity = '0.5';

        console.log('Starting upload process for user:', uniqueId);

        // Delete previous image
        await deletePreviousProfileImage(uniqueId);

        // Create storage reference
        const storage = getStorage();
        const storageRef = ref(storage, `Resident_Profile_Image/${uniqueId}`);
        console.log('Storage reference created:', `Resident_Profile_Image/${uniqueId}`);

        // Upload new image
        console.log('Uploading file...');
        const snapshot = await uploadBytes(storageRef, file);
        console.log('File uploaded successfully');

        // Get download URL
        console.log('Getting download URL...');
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log('Download URL obtained:', downloadURL);

        // Update profile image in UI
        profileImage.src = downloadURL;
        profileImage.style.opacity = '1';

        // Update Firestore document
        console.log('Updating Firestore document...');
        const userQuery = query(collection(db, "users"), where('uniqueId', '==', uniqueId));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0];
            await updateDoc(doc(db, "users", userDoc.id), {
                profileImageUrl: downloadURL
            });
            console.log('Firestore document updated successfully');
        } else {
            throw new Error('User document not found in Firestore');
        }

        alert('Profile image updated successfully');
    } catch (error) {
        console.error('Detailed error in handleProfileImageUpload:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error stack:', error.stack);
        
        // Reset opacity
        const profileImage = document.getElementById('profile-image');
        profileImage.style.opacity = '1';
        
        throw error; // Re-throw for the event listener to catch
    }
}

async function deletePreviousProfileImage(uniqueId) {
    try {
        console.log('Attempting to delete previous profile image for:', uniqueId);
        const storage = getStorage();
        const previousImageRef = ref(storage, `Resident_Profile_Image/${uniqueId}`);
        
        try {
            await deleteObject(previousImageRef);
            console.log('Previous profile image deleted successfully');
        } catch (error) {
            if (error.code === 'storage/object-not-found') {
                console.log('No previous image found to delete');
            } else {
                console.error('Error deleting previous image:', error);
                throw error;
            }
        }
    } catch (error) {
        console.error('Error in deletePreviousProfileImage:', error);
        // Don't throw error here to continue with new upload
    }
}

// Function to initialize profile image loading
async function loadProfileImage(userId) {
    try {
        const storageRef = ref(storage, `Resident_Profile_Image/${userId}`);
        const downloadURL = await getDownloadURL(storageRef);
        
        const profileImage = document.getElementById('profile-image');
        if (profileImage) {
            profileImage.src = downloadURL;
        }
    } catch (error) {
        // If no image exists, keep default image
        if (error.code !== 'storage/object-not-found') {
            console.error('Error loading profile image:', error);
        }
    }
}

document.getElementById('file-input').addEventListener('change', async (event) => {
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('Please log in to update your profile image');
            return;
        }

        // Get user's uniqueId instead of uid
        const userQuery = query(collection(db, "users"), where('email', '==', user.email));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            const uniqueId = userData.uniqueId; // Use uniqueId instead of uid
            await handleProfileImageUpload(event, uniqueId);
        } else {
            throw new Error('User data not found');
        }
    } catch (error) {
        console.error('Error in file upload event listener:', error);
        alert('Error uploading image. Please try again.');
    }
});

// Event listener for file input change

export { 
    app, 
    db, 
    auth, 
    getDoc, 
    collection, 
    doc, 
    toggleDropdown, 
    logout, 
    loadUserData, 
    handleProfileImageUpload,
    loadProfileImage 
 };