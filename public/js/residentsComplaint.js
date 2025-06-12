//########################################## RESIDENTSCOMPLAINT.JS #######################################

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, collection, doc, getDoc, query, where, orderBy, getDocs, addDoc, Timestamp, runTransaction } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getDatabase, ref, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

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
const realtimeDb = getDatabase(app);

//#################### LOADER ######################
function showLoader() {
    document.getElementById('loader-container').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loader-container').style.display = 'none';
}

//#################### TIMESTAMP ######################
function formatDate(dateField) {
    if (dateField instanceof Timestamp) {
        return dateField.toDate().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    } else if (dateField instanceof Date) {
        return dateField.toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    } else if (typeof dateField === 'string') {
        return dateField; // Return the string as is
    } else {
        return 'N/A';
    }
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

let currentPage = 1;
const rowsPerPage = 10;
let complaintData = [];


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

document.addEventListener('DOMContentLoaded', function () {
    const fileComplaintBtn = document.getElementById('fileComplaintBtn');
    const complaintPopup = document.getElementById('complaintPopup');
    const closePopupBtn = document.getElementById('complaintCloseBtn');

    // Function to show the popup
    fileComplaintBtn.addEventListener('click', function () {
        complaintPopup.style.display = 'flex';
    });

    // Function to hide the popup
    closePopupBtn.addEventListener('click', function () {
        complaintPopup.style.display = 'none';
    });

    // Hide the popup if the user clicks outside of the container
    complaintPopup.addEventListener('click', function (event) {
        if (event.target === complaintPopup) {
            complaintPopup.style.display = 'none';
        }
    });
});

async function generateComplaintId() {
    try {
        const counterDocRef = doc(db, 'counters', 'complaintId');
        let complaintId = '';

        await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterDocRef);

            let lastComplaintId = counterDoc.exists() ? counterDoc.data().value : 0;

            lastComplaintId++;

            transaction.set(counterDocRef, { value: lastComplaintId });

            const paddedCounter = lastComplaintId.toString().padStart(6, '0');
            complaintId = `SADPI-FC-${paddedCounter}`;
        });

        console.log(`Generated complaint ID: ${complaintId}`);
        return complaintId;
    } catch (error) {
        console.error('Error in generateComplaintId:', error);
        throw error;
    }
}

//#################### SEND A COMPLAINT ######################

async function notifyAdmin(complaintInfo) {
    try {
        const notificationRef = ref(realtimeDb, `adminNotifications/${complaintInfo.complaintId}`);
        await set(notificationRef, {
            type: 'NEW_COMPLAINT',
            complaintId: complaintInfo.complaintId,
            complaintType: complaintInfo.complaintType,
            complainant: complaintInfo.complainant,
            timestamp: serverTimestamp(),
            status: 'unread',
            message: `New complaint filed: ${complaintInfo.complaintType} by ${complaintInfo.complainant}`
        });
        
        console.log('Admin notification sent successfully');
    } catch (error) {
        console.error('Error sending admin notification:', error);
    }
}

async function fileComplaint(complaintInput) {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.log('User not logged in');
        alert('Please log in to file a complaint.');
        return;
    }

    console.log('User is authenticated');
    const userId = currentUser.uid;
    
    if (!userId) {
        console.error('User ID is undefined');
        alert('An error occurred while filing the complaint. Please try logging in again.');
        return;
    }

    console.log('Attempting to file complaint...');
    showLoader();

    try {
        const complaintId = await generateComplaintId();
        const complaintData = {
            userId: userId,
            complaintId: complaintId,
            complaintType: complaintInput.complaintType,
            respondent: complaintInput.respondent,
            respondentAddress: complaintInput.respondentAddress,
            complainant: complaintInput.complainant,
            complainantAddress: complaintInput.complainantAddress,
            issue: complaintInput.issue,
            status: 'Pending',
            timestamp: Timestamp.now(),
            read: false,
            resolutionDate: null 
        };

        // Add complaint to Firestore
        const complaintRef = await addDoc(collection(db, 'Complaints'), complaintData);

        // Send notification to admin with the complaint data
        await notifyAdmin(complaintData);

        console.log('Complaint filed successfully');
        console.log('Complaint ID:', complaintRef.id);
        hideLoader();
        alert('Your complaint has been filed. Please wait for admin review.');
        
        // Clear form fields
        document.getElementById('complaintType').value = '';
        document.getElementById('respondent').value = '';
        document.getElementById('respondent-address').value = '';
        document.getElementById('complainant').value = '';
        document.getElementById('complainant-address').value = '';
        document.getElementById('issue').value = '';
        
        closeComplaintPopup();
    } catch (error) {
        console.error('Error adding complaint to Firestore:', error);
        hideLoader();
        alert('An error occurred while filing the complaint. Please try again.');
    }
}

function closeComplaintPopup() {
    const complaintPopup = document.getElementById('complaintPopup');
    if (complaintPopup) {
        complaintPopup.style.display = 'none';
    }
}

// Event listener for the submit button
document.getElementById('complaint-btn').addEventListener('click', async function() {
    const complaintType = document.getElementById('complaintType').value;
    const respondent = document.getElementById('respondent').value;
    const respondentAddress = document.getElementById('respondent-address').value;
    const complainant = document.getElementById('complainant').value;
    const complainantAddress = document.getElementById('complainant-address').value;
    const issue = document.getElementById('issue').value;
    
    if (complaintType && respondent && issue) {
        const complaintData = {
            complaintType: complaintType,
            respondent: respondent,
            respondentAddress: respondentAddress,
            complainant: complainant,
            complainantAddress: complainantAddress,
            issue: issue
        };
                
            await fileComplaint(complaintData);
       
    } else {
        alert('Please fill in all fields before submitting the complaint.');
    }
});

//#################### DISPLAY USER-SPECIFIC COMPLAINTS ######################
async function fetchAndDisplayUserComplaints() {
    const user = auth.currentUser;
    if (!user) {
        console.log('No user signed in');
        return;
    }

    try {
        const complaintsRef = collection(db, 'Complaints');
        const q = query(
            complaintsRef,
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
            orderBy('__name__', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const complaintsTableBody = document.querySelector('#complaintsTable tbody');
        complaintsTableBody.innerHTML = '';
        complaintData = []; // Store all complaints for pagination
        let unreadCount = 0;

        // Store all complaints in the complaintData array
        querySnapshot.forEach((doc) => {
            const complaint = doc.data();
            complaint.docId = doc.id; // Store document ID for read status updates
            complaintData.push(complaint);
            if (!complaint.read) {
                unreadCount++;
            }
        });

        if (querySnapshot.empty) {
            complaintsTableBody.innerHTML = '<tr><td colspan="8">No complaints filed yet.</td></tr>';
        } else {
            displayComplaints(currentPage, unreadCount);
        }
        
        updateNotificationCount(unreadCount);
        setupPagination();
    } catch (error) {
        console.error('Error fetching complaints:', error);
        alert('An error occurred while fetching your complaints. Please try again.');
    }
}

function displayComplaints(page, unreadCount) {
    const complaintsTableBody = document.querySelector('#complaintsTable tbody');
    complaintsTableBody.innerHTML = '';

    // Calculate the range of complaints to display
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedComplaints = complaintData.slice(startIndex, endIndex);

    paginatedComplaints.forEach((complaint) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${complaint.complaintId}</td>
            <td>${complaint.complaintType}</td>
            <td>${formatDate(complaint.timestamp)}</td>                
            <td>${complaint.respondent}</td>                
            <td>${complaint.complainant}</td>
            <td>${complaint.assignedOfficer || 'Not assigned'}</td>                
            <td>${complaint.status}</td>
            <td>${formatDate(complaint.resolutionDate)}</td>
        `;
        
        // Preserve the click event listener for read status
        row.addEventListener('click', async () => {
            if (!complaint.read && (complaint.status === 'APPROVED' || complaint.status === 'REJECTED')) {
                await markComplaintAsRead(complaint.docId);
                unreadCount--;
                console.log('Unread count before update:', unreadCount);
                updateNotificationCount(unreadCount);
                complaint.read = true; // Update the local data
            }
        });
        
        complaintsTableBody.appendChild(row);
    });

    // Update the showing entries text
    updateShowingEntries(startIndex + 1, Math.min(endIndex, complaintData.length), complaintData.length);
}

function setupPagination() {
    const totalPages = Math.ceil(complaintData.length / rowsPerPage);
    const paginationControls = document.getElementById('paginationControls');
    paginationControls.innerHTML = '';

    if (totalPages <= 1) return; // Don't show pagination if there's only one page

    // Previous button
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.classList.add('pagination-button');
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayComplaints(currentPage);
            setupPagination();
        }
    });
    paginationControls.appendChild(prevButton);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.classList.add('pagination-button');
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.addEventListener('click', () => {
            currentPage = i;
            displayComplaints(currentPage);
            setupPagination();
        });
        paginationControls.appendChild(pageButton);
    }

    // Next button
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.classList.add('pagination-button');
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayComplaints(currentPage);
            setupPagination();
        }
    });
    paginationControls.appendChild(nextButton);
}

function updateShowingEntries(start, end, total) {
    const showingEntriesDiv = document.getElementById('showingEntriesComplaints');
    showingEntriesDiv.textContent = `Showing ${start} to ${end} of ${total} entries`;
}

async function markComplaintAsRead(complaintId) {
    try {
        console.log('Marking complaint as read:', complaintId);
        await updateDoc(doc(db, 'Complaints', complaintId), {
            read: true
        });
    } catch (error) {
        console.error('Error marking complaint as read:', error);
    }
}

function updateNotificationCount(count) {
    const notificationCount = document.getElementById('notificationCount');
    console.log('notificationCount element:', notificationCount);
    console.log('Unread count:', count);
    if (notificationCount) {
        notificationCount.textContent = count;
        notificationCount.style.display = count > 0 ? 'block' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            fetchAndDisplayUserComplaints();
        } else {
            console.log('User not logged in');
            // Optionally, redirect to login page or show a message
        }
    });
});

document.querySelector('.search-button').addEventListener('click', () => {
    const searchInput = document.querySelector('.search-input').value.toLowerCase();
    const rows = document.querySelectorAll('#complaintsTable tbody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchInput) ? '' : 'none';
    });
});

// Implement clear functionality
document.querySelector('.clear-button').addEventListener('click', () => {
    document.querySelector('.search-input').value = '';
    const rows = document.querySelectorAll('#complaintsTable tbody tr');
    rows.forEach(row => row.style.display = '');
});


