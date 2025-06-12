// ################ ADMIN_NOTIFICATION.JS #################
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getFirestore, collection, updateDoc, setDoc, addDoc, orderBy, getDocs, doc, getDoc, query, where, onSnapshot, deleteDoc, Timestamp, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js';
// import { generateWordClearance } from './admin_requests_clearance.js';
// import { generateWordCertificate } from './admin_requests_certificate.js';
// import { generateWordIndigency } from './admin_requests_indigency.js';

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

let loadingTasks = 0;

function showLoader() {
    loadingTasks++;
    const loader = document.getElementById('loader-container');
    if (loader) {
        loader.style.display = 'flex';
    }
}

function hideLoader() {
    loadingTasks--;
    if (loadingTasks <= 0) {
        loadingTasks = 0;
        const loader = document.getElementById('loader-container');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

const documentStyles = `
<style>
.document-preview-popup {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 20px;
    overflow-y: auto;
}

/* Shared styles for all document types */
.preview-clearance,
.preview-certificate,
.preview-indigency {
    background: white;
    width: 8.5in;
    min-height: 11in;
    padding: 0.5in;
    margin: auto;
    position: relative;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.clearance-container,
.certificate-container,
.indigency-container {
    border: 2px solid #000080;
    padding: 40px;
    min-height: 10in;
    position: relative;
    background: white;
}

.clearance-background,
.certificate-background,
.indigency-background {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    opacity: 0.1;
    width: 60%;
    pointer-events: none;
}

/* Header styles */
.clearance-header,
.certificate-header,
.indigency-header {
    text-align: center;
    margin-bottom: 30px;
}

.clearance-logo,
.certificate-logo,
.indigency-logo {
    width: 80px;
    height: 80px;
    margin: 0 auto 20px;
}

.clearance-logo img,
.certificate-logo img,
.indigency-logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

/* Common header text styles */
.clearance-header h2,
.certificate-header h2,
.indigency-header h2 {
    margin: 5px 0;
    color: #000080;
    font-size: 16px;
    font-weight: bold;
}

.clearance-header h1,
.certificate-header h1,
.indigency-header h1 {
    margin: 20px 0;
    font-size: 24px;
    color: #000080;
    font-weight: bold;
}

/* Body styles */
.clearance-body,
.certificate-body,
.indigency-body {
    line-height: 1.6;
    text-align: justify;
}

.clearance-body h2,
.certificate-body h2,
.indigency-body h2 {
    margin: 20px 0;
    font-size: 16px;
    font-weight: bold;
}

.indent {
    text-indent: 50px;
    margin: 20px 0;
}

/* Signature styles */
.signature-line {
    position: absolute;
    right: 100px;
    bottom: 150px;
    text-align: center;
}

.signature-line__line {
    border-top: 1px solid black;
    width: 200px;
    margin-bottom: 5px;
}

.brgyCaptain {
    font-weight: bold;
    font-size: 14px;
}

/* Footer styles */
.clearance-footer {
    position: absolute;
    bottom: 40px;
    left: 40px;
}

.clearance-footer p {
    margin: 5px 0;
    font-size: 14px;
}

/* Button styles */
.close-btn,
.close-certificate-btn,
.close-indigency-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 24px;
    cursor: pointer;
    color: #000080;
    z-index: 1;
}

.print-btn-container {
    text-align: center;
    margin-top: 20px;
}

.print-btn {
    background-color: #000080;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    transition: background-color 0.3s;
}

.print-btn:hover {
    background-color: #00004d;
}

@media print {
    .document-preview-popup {
        position: absolute;
        background: none;
        padding: 0;
        margin: 0;
        height: 100%;
    }

    .preview-clearance,
    .preview-certificate,
    .preview-indigency {
        box-shadow: none;
        padding: 0;
        margin: 0;
    }

    .close-btn,
    .close-certificate-btn,
    .close-indigency-btn,
    .print-btn-container {
        display: none !important;
    }

    .clearance-container,
    .certificate-container,
    .indigency-container {
        border: none;
    }
}
</style>
`;

function formatDateToDDMMYYYY(dateString) {
    const date = new Date(dateString); 
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatTimestamp(timestamp) {
    const date = timestamp.toDate();
    const options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false
    };
    return date.toLocaleString('en-US', options).replace(',', '');
}

function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return day + 'th';
    switch (day % 10) {
        case 1: return day + 'st';
        case 2: return day + 'nd';
        case 3: return day + 'rd';
        default: return day + 'th';
    }
}

// Helper functions for document handling
function formatDateWithOrdinal(date) {
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    return {
        day: getOrdinalSuffix(day),
        month,
        year
    };
}

// Get DOM elements
const notificationIcon = document.getElementById('notificationIcon');
const notificationDropdown = document.getElementById('notificationDropdown');
const notificationCount = document.getElementById('notificationCount');
const notificationList = document.getElementById('notificationList');

// Toggle dropdown when bell is clicked
if (notificationIcon) {
    notificationIcon.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        if (notificationDropdown) {
            notificationDropdown.classList.toggle('show');
            console.log('Dropdown toggled');
        }
    });
}

// Modified document click listener
document.addEventListener('click', function(event) {
    if (notificationDropdown && notificationIcon) {
        if (!notificationDropdown.contains(event.target) && 
            !notificationIcon.contains(event.target)) {
            notificationDropdown.classList.remove('show');
        }
    }
});

// Function to mark notifications as read
function markNotificationsAsRead() {
    const unreadNotifications = document.querySelectorAll('.notification-item.unread');
    unreadNotifications.forEach(notification => {
        notification.classList.remove('unread');
        notification.classList.add('read');
    });
    updateNotificationCount();
}

// Function to update notification count
function updateNotificationCount() {
    if (notificationCount) {
        const unreadCount = notificationList.querySelectorAll('.notification-item.unread').length;
        notificationCount.textContent = unreadCount;
        notificationCount.style.display = unreadCount > 0 ? 'block' : 'none';
        // console.log('Updated notification count:', unreadCount);
    }
}

function closeDropdown() {
    if (notificationDropdown) {
        notificationDropdown.classList.remove('show');
    }
}

// Function to create notification item
function createNotificationItem(data, collectionName) {
    const li = document.createElement('li');
    li.className = data.isRead ? 'notification-item read' : 'notification-item unread';
    
    // Set the appropriate ID based on collection type
    const itemId = collectionName === 'Profile_Update' ? data.uniqueId : data.transactionId;
    li.setAttribute('data-item-id', itemId || 'undefined');
    
    let content = '';
    
    if (collectionName === 'Profile_Update' && data.transactionNo && data.fullName) {
        content = `
            <div class="notification-content">
                <div class="notification-text">
                    <strong>PROFILE UPDATE Request #${data.transactionNo}</strong>
                    <p>From: ${data.fullName}</p>
                    <p>Date: ${data.timestamp ? formatTimestamp(data.timestamp) : 'Unknown'}</p>
                </div>
                <div class="notification-actions">
                    <button class="view-request-btn" onclick="viewProfileUpdateDetails('${data.uniqueId}')">
                        View Details
                    </button>
                    <span class="viewed-indicator">✓</span>
                </div>
            </div>
        `;
    } else if (data.fullName && data.transactionId) {
        const requestType = collectionName.replace('brgy_', '').toUpperCase();
        content = `
            <div class="notification-content">
                <div class="notification-text">
                    <strong>${requestType} ${data.transactionId} REQUEST</strong> 
                    <p>From: ${data.fullName}</p>
                    <p>Date: ${data.createdAt ? formatTimestamp(data.createdAt) : 'Unknown'}</p>
                </div>
                <div class="notification-actions">
                    <button class="view-request-btn" onclick="viewRequestDetails('${collectionName}', '${data.transactionId}')">
                        View Details
                    </button>
                    <span class="viewed-indicator">✓</span>
                </div>
            </div>
        `;
    } else {
        // Handle invalid data
        return null;
    }
    
    li.innerHTML = content;
    return li;
}

// Function to set up real-time listeners for collections
function setupCollectionListeners() {
    console.log("Setup started");
    console.log("setupCollectionListeners called");
    const notificationList = document.getElementById('notificationList');
    console.log("notificationList element:", notificationList);
    const collections = ['brgy_clearance', 'brgy_certificate', 'brgy_indigency', 'Profile_Update'];
    
    // Clear existing notifications first
    if (notificationList) {
        notificationList.innerHTML = '';
    }
    if (notificationCount) {
        notificationCount.style.display = 'none';
    }
    
    collections.forEach(collectionName => {
        // Use different orderBy field based on collection type
        const orderByField = collectionName === 'Profile_Update' ? 'timestamp' : 'createdAt';
        
        const q = query(
            collection(db, collectionName),
            // where('status', '==', 'PENDING'),
            where('status', '==', collectionName === 'Profile_Update' ? 'PENDING' : 'Pending'),
            orderBy(orderByField, 'desc')
        );

        console.log(`Setting up listener for ${collectionName}`);
        
        onSnapshot(q, (snapshot) => {
            console.log(`Got ${snapshot.size} documents from ${collectionName}`);

            console.log(`Got update from ${collectionName}:`, snapshot.size);

            // If collection is empty, remove any existing notifications for this collection
            if (snapshot.empty) {
                const existingNotifications = document.querySelectorAll(`[data-collection="${collectionName}"]`);
                existingNotifications.forEach(node => node.remove());
                return;
            }

            snapshot.docChanges().forEach((change) => {
                console.log(`Document ${change.doc.id} ${change.type}`);

                const data = change.doc.data();
                
                // Only process if data exists and has required fields
                if (!data || (collectionName === 'Profile_Update' && !data.uniqueId) || 
                    (collectionName !== 'Profile_Update' && !data.transactionId)) {
                    return;
                }

                const itemId = collectionName === 'Profile_Update' ? data.uniqueId : data.transactionId;
                const existingItem = document.querySelector(`.notification-item[data-item-id="${itemId}"]`);

                if (change.type === "removed") {
                    // Remove notification if document is deleted or status changes from 'Pending'
                    if (existingItem) {
                        existingItem.remove();
                    }
                } else if (change.type === "added" && !existingItem) {
                    // Only add if it doesn't exist and status is 'Pending'
                    const notificationItem = createNotificationItem(data, collectionName);
                    notificationItem.setAttribute('data-collection', collectionName);
                    notificationList.insertBefore(notificationItem, notificationList.firstChild);
                } else if (change.type === "modified" && existingItem) {
                    // Update existing notification only if status is still 'Pending'
                    if (data.status === 'Pending') {
                        existingItem.className = data.isRead ? 'notification-item read' : 'notification-item unread';
                        existingItem.innerHTML = createNotificationItem(data, collectionName).innerHTML;
                    } else {
                        existingItem.remove();
                    }
                }

                updateNotificationCount();
            });
        }, (error) => {
            console.error(`Error setting up listener for ${collectionName}:`, error);
        });
    });
}

window.viewProfileUpdateDetails = async function(uniqueId) {
    try {
        closeDropdown();
        const q = query(
            collection(db, 'Profile_Update'),
            where('uniqueId', '==', uniqueId)
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref;
            const data = snapshot.docs[0].data();
            showProfileUpdatePopup(data);

            // Mark the notification as read in the database
            await updateDoc(docRef, { 
                isRead: true,
                status: data.status // preserve existing status
            });
        }
    } catch (error) {
        console.error("Error getting profile update document:", error);
    }
};

// Function to show profile update popup
function showProfileUpdatePopup(data) {
    console.log('Request status:', data.status);
    const popup = document.createElement('div');
    popup.className = 'document-details-popup';

    showLoader();
    
    // const showButtons = data.status === 'PENDING';
    const showButtons = data.status === 'Pending' || data.status === 'PENDING';

    popup.innerHTML = `
        <div class="document-details-popup">
    <div class="document-details-content">
        <span class="close" onclick="closePopup()">&times;</span>
        <h2>Profile Update Request #${data.transactionNo}</h2>
        <div class="popup-body">
            <div class="details-sections">
                <!-- Personal Information Section -->
                <div class="details-section">
                    <h3>Personal Information</h3>
                    <div class="two-column-grid">
                        <p><span class="label">Full Name:</span> <span class="value">${data.fullName}</span></p>
                        <p><span class="label">Gender:</span> <span class="value">${data.gender}</span></p>
                        <p><span class="label">Birthdate:</span> <span class="value">${data.birthdate}</span></p>
                        <p><span class="label">Birthplace:</span> <span class="value">${data.birthplace}</span></p>
                        <p><span class="label">Citizenship:</span> <span class="value">${data.citizenship}</span></p>
                        <p><span class="label">Occupation:</span> <span class="value">${data.occupation}</span></p>
                    </div>
                </div>

                <!-- Contact Information Section -->
                <div class="details-section">
                    <h3>Contact & Address</h3>
                    <div class="two-column-grid">
                        <p><span class="label">Email:</span> <span class="value">${data.email}</span></p>
                        <p><span class="label">Phone:</span> <span class="value">${data.phone}</span></p>
                        <p><span class="label">Address:</span> <span class="value">${data.blklot}, ${data.street}</span></p>
                    </div>
                </div>

                <!-- Status Information Section -->
                <div class="details-section">
                    <h3>Status & Benefits</h3>
                    <div class="two-column-grid">
                        <p><span class="label">Employment:</span> <span class="value">${data.employmentStatus || 'N/A'}</span></p>
                        <p><span class="label">Marital Status:</span> <span class="value">${data.maritalStatus || 'N/A'}</span></p>
                        <p><span class="label">Voter:</span> <span class="value">${data.voter}</span></p>
                        <p><span class="label">4Ps:</span> <span class="value">${data.fourPs}</span></p>
                        <p><span class="label">PWD:</span> <span class="value">${data.pwd}</span></p>
                        <p><span class="label">Solo Parent:</span> <span class="value">${data.soloParent}</span></p>
                    </div>
                </div>

                <!-- Request Details Section -->
                <div class="details-section">
                    <h3>Request Details</h3>
                    <div class="two-column-grid">
                        <p><span class="label">Transaction #:</span> <span class="value">${data.transactionNo}</span></p>
                        <p><span class="label">Resident ID:</span> <span class="value">${data.uniqueId}</span></p>
                        <p><span class="label">Status:</span> <span class="value">${data.status}</span></p>
                        <p><span class="label">Date:</span> <span class="value">${formatTimestamp(data.timestamp)}</span></p>
                    </div>
                </div>
            </div>

            ${showButtons ? `
                <div class="popup-footer">
                    <button onclick="updateProfileStatus('${data.uniqueId}', 'Approved')" 
                            class="approve-btn">
                        Approve
                    </button>
                    <button onclick="updateProfileStatus('${data.uniqueId}', 'Rejected')" 
                            class="reject-btn">
                        Reject
                    </button>
                </div>
            ` : ''}
        </div>
    </div>
`;
    hideLoader();
    document.body.appendChild(popup);
}

// In admin_notification.js, update this function:
window.updateProfileStatus = async function(uniqueId, newStatus) {
    // Disable approve/reject buttons immediately
    showLoader();
    const popup = document.querySelector('.document-details-popup');
    if (popup) {
        popup.remove();
    }

    const approveBtn = document.querySelector('.approve-btn');
    const rejectBtn = document.querySelector('.reject-btn');
    if (approveBtn) approveBtn.disabled = true;
    if (rejectBtn) rejectBtn.disabled = true;

    try {
        // First check if this update has already been processed
        const q = query(
            collection(db, 'Profile_Update'),
            where('uniqueId', '==', uniqueId)
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref;
            const requestData = snapshot.docs[0].data();

            // If status is already set to the new status, don't process again
            if (requestData.status === newStatus) {
                console.log('Status already updated to:', newStatus);
                closePopup();
                return;
            }

            // If status is approved, update the user's data in users collection
            if (newStatus === 'Approved') {
                const {
                    status, 
                    timestamp, 
                    transactionNo, 
                    isRead,
                    ...userUpdateData
                } = requestData;

                // Update the user document
                const userRef = doc(db, 'users', uniqueId);
                await setDoc(userRef, userUpdateData, { merge: true });
                console.log("User data updated successfully");
            }

            // Create notification in user's subcollection
            const userNotificationsRef = collection(doc(db, 'notifications', uniqueId), 'user_notifications');
            
            // Add notification to user's subcollection
            await addDoc(userNotificationsRef, {
                timestamp: serverTimestamp(),
                read: false,
                type: 'PROFILE_UPDATE',
                title: `Profile Update ${newStatus === 'Approved' ? 'Approved ✅' : 'Rejected ❌'}`,
                message: newStatus === 'Approved'
                    ? 'Good news! Your profile update request has been approved. Your information has been successfully updated.'
                    : `Your profile update request was not approved. For clarification, please contact the barangay office.`,
                status: newStatus
            });

            // Update the status in Profile_Update collection
            await updateDoc(docRef, {
                status: newStatus,
                timestamp: serverTimestamp(),
                isRead: true,
                processedAt: serverTimestamp() // Add this to track when it was processed
            });

            console.log("Profile update status changed and notification created");
            closePopup();
            
            if (typeof fetchPendingRequests === 'function') {
                fetchPendingRequests();
            }
        }
    } catch (error) {
        console.error("Error updating profile status:", error);
        alert("Error updating profile status. Please try again.");
        
        // Re-enable buttons in case of error
        if (approveBtn) approveBtn.disabled = false;
        if (rejectBtn) rejectBtn.disabled = false;
    } finally {
        hideLoader();
    }

    const confirmationPopup = document.createElement('div');
    confirmationPopup.className = 'confirmation-popup';
    
    confirmationPopup.innerHTML = `
        <div class="confirmation-content">
            <h3>Confirm Action</h3>
            <p>Are you sure you want to ${newStatus.toLowerCase()} this profile update request?</p>
            <div class="confirmation-buttons">
                <button onclick="confirmStatusUpdate('${uniqueId}', '${newStatus}', true)" 
                        class="confirm-btn">Yes</button>
                <button onclick="confirmStatusUpdate('${uniqueId}', '${newStatus}', false)" 
                        class="cancel-btn">No</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmationPopup);
};

window.confirmStatusUpdate = async function(uniqueId, newStatus, confirmed) {
    // Remove confirmation popup
    const confirmationPopup = document.querySelector('.confirmation-popup');
    if (confirmationPopup) {
        confirmationPopup.remove();
    }

    if (!confirmed) {
        return; // Do nothing if not confirmed
    }

    // Proceed with the update if confirmed
    // Close the original popup
    const popup = document.querySelector('.document-details-popup');
    if (popup) {
        popup.remove();
    }

    try {
        const q = query(
            collection(db, 'Profile_Update'),
            where('uniqueId', '==', uniqueId)
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref;
            const requestData = snapshot.docs[0].data();

            if (requestData.status === newStatus) {
                console.log('Status already updated to:', newStatus);
                return;
            }

            if (newStatus === 'Approved') {
                const {
                    status, 
                    timestamp, 
                    transactionNo, 
                    isRead,
                    ...userUpdateData
                } = requestData;

                const userRef = doc(db, 'users', uniqueId);
                await setDoc(userRef, userUpdateData, { merge: true });
                console.log("User data updated successfully");
            }

            const userNotificationsRef = collection(doc(db, 'notifications', uniqueId), 'user_notifications');
            
            await addDoc(userNotificationsRef, {
                timestamp: serverTimestamp(),
                read: false,
                type: 'PROFILE_UPDATE',
                title: `Profile Update ${newStatus === 'Approved' ? 'Approved ✅' : 'Rejected ❌'}`,
                message: newStatus === 'Approved'
                    ? 'Good news! Your profile update request has been approved. Your information has been successfully updated.'
                    : `Your profile update request was not approved. For clarification, please contact the barangay office.`,
                status: newStatus
            });

            await updateDoc(docRef, {
                status: newStatus,
                timestamp: serverTimestamp(),
                isRead: true,
                processedAt: serverTimestamp()
            });

            console.log("Profile update status changed and notification created");
            
            if (typeof fetchPendingRequests === 'function') {
                fetchPendingRequests();
            }
        }
    } catch (error) {
        console.error("Error updating profile status:", error);
        alert("Error updating profile status. Please try again.");
    }
};

window.viewProfileUpdateDetails = async function(uniqueId) {
    showLoader();
    try {
        closeDropdown();
        const q = query(
            collection(db, 'Profile_Update'),
            where('uniqueId', '==', uniqueId)
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref;
            const data = snapshot.docs[0].data();
            
            // Only update isRead if it's not already read
            if (!data.isRead) {
                await updateDoc(docRef, { isRead: true });
            }
            
            showProfileUpdatePopup(data);
        }
    } catch (error) {
        console.error("Error getting profile update document:", error);
    }
    hideLoader();
};

// Function to view request details
window.viewRequestDetails = async function(collectionName, transactionId) {
    showLoader();
    try {
        closeDropdown(); // Close dropdown when viewing details
        const q = query(
            collection(db, collectionName),
            where('transactionId', '==', transactionId)
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref;
            const data = snapshot.docs[0].data();
            showDetailsPopup(data, collectionName);

            // Mark the notification as read in the database
            await updateDoc(docRef, { isRead: true });
        }
    } catch (error) {
        console.error("Error getting document:", error);
    }
    hideLoader();
};

window.updateRequestStatus = async function(collectionName, transactionId, newStatus) {
    try {
        console.log('Starting updateRequestStatus:', { collectionName, transactionId, newStatus });
        
        if (!collectionName || !transactionId || !newStatus) {
            throw new Error('Missing required parameters');
        }

        const q = query(
            collection(db, collectionName),
            where('transactionId', '==', transactionId)
        );
        
        console.log('Fetching document...');
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            throw new Error(`No document found with transactionId: ${transactionId}`);
        }

        const docRef = snapshot.docs[0].ref;
        const documentData = snapshot.docs[0].data();
        console.log('Document data:', documentData);

        if (newStatus === 'Approved') {
            try {
                closePopup(); // Close the details popup first

                // Format data for document generation
                const formattedData = {
                    fullName: documentData.fullName,
                    age: documentData.age,
                    blockLot: documentData.blockLot || documentData.blklot,
                    purpose: documentData.purpose,
                    transactionId: documentData.transactionId,
                    issueDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
                    status: 'Printed'
                };

                // Only handle clearance for now
                if (collectionName === 'brgy_clearance') {
                    await generateWordClearance(formattedData);
                } else if (collectionName === 'brgy_certificate') {
                    await generateWordCertificate(formattedData);
                } else if (collectionName === 'brgy_indigency') {
                    await generateWordIndigency(formattedData); 
                } else {    
                    // For other document types, just show an alert for now
                    alert(`Document generation for ${collectionName.replace('brgy_', '').toUpperCase()} will be implemented soon.`);
                }

                // Update document status
                await updateDoc(docRef, {
                    status: 'Printed',
                    processedAt: serverTimestamp(),
                    issuedAt: serverTimestamp(),
                    isRead: true
                });

                // Create notification for user
                const uniqueId = documentData.uniqueId;
                if (!uniqueId) {
                    throw new Error('uniqueId is missing from document data');
                }

                // Create user notification
                await createUserNotification(uniqueId, {
                    type: collectionName.toUpperCase(),
                    title: `${collectionName.replace('brgy_', '').toUpperCase()} Request Ready for Pickup ✅`,
                    message: `Your ${collectionName.replace('brgy_', '')} request (#${transactionId}) has been processed and is ready for pickup.`,
                    status: 'Printed'
                });

            } catch (error) {
                console.error('Error in document generation:', error);
                alert(`Error generating document: ${error.message}`);
                throw error;
            }
        } else if (newStatus === 'Rejected') {
            // Update document status for rejected requests
            await updateDoc(docRef, {
                status: 'Rejected',
                processedAt: serverTimestamp(),
                isRead: true
            });

            const uniqueId = documentData.uniqueId;
            if (!uniqueId) {
                throw new Error('uniqueId is missing from document data');
            }

            // Create rejection notification
            await createUserNotification(uniqueId, {
                type: collectionName.toUpperCase(),
                title: `${collectionName.replace('brgy_', '').toUpperCase()} Request Rejected ❌`,
                message: `Your ${collectionName.replace('brgy_', '')} request (#${transactionId}) has been rejected. Please contact the barangay office for clarification.`,
                status: 'Rejected'
            });
        }

        closePopup();
        
        // Refresh the requests display if the function exists
        if (typeof fetchAndDisplayBarangayRequests === 'function') {
            console.log('Refreshing requests display...');
            fetchAndDisplayBarangayRequests();
        }

    } catch (error) {
        console.error('Detailed error in updateRequestStatus:', {
            message: error.message,
            stack: error.stack,
            collectionName,
            transactionId,
            newStatus
        });
        
        alert(`Error updating request status: ${error.message}. Please check the console for details and try again.`);
        throw error;
    }
};

function showDocumentPreview(data, collectionName) {
    try {
        console.log('Preview data:', data);
        const documentType = collectionName.replace('brgy_', '').toUpperCase();
        const currentDate = new Date();
        const { day, month, year } = formatDateWithOrdinal(currentDate);

        // Remove any existing preview
        const existingPreview = document.querySelector('.document-preview-popup');
        if (existingPreview) {
            existingPreview.remove();
        }

        // Check if data has required fields
        if (!data.fullName || !data.transactionId) {
            throw new Error('Missing required data fields for preview');
        }

        // Create preview container
        const previewContainer = document.createElement('div');
        previewContainer.className = 'document-preview-popup';
        
        // Get the appropriate template
        const templateContent = getDocumentTemplate(documentType, data, day, month, year);
        if (!templateContent) {
            throw new Error(`No template available for document type: ${documentType}`);
        }
        
        previewContainer.innerHTML = templateContent;
        
        // Add to document and display
        document.body.appendChild(previewContainer);
        
        console.log('Preview created successfully');
    } catch (error) {
        console.error('Error in showDocumentPreview:', error);
        throw error;
    }
}



// Function to show details popup // JUST LIKE THE clearancePreview in ADMIN_REQUESTS_CLEARANCE.JS
function showDetailsPopup(data, collectionName) {
    const popup = document.createElement('div');
    popup.className = 'document-details-popup';
    
    // Get the requestType from the data object
    const requestType = data.requestType || collectionName.replace('brgy_', '').toUpperCase(); 
    const isBarangayDoc = ['brgy_clearance', 'brgy_certificate', 'brgy_indigency'].includes(collectionName);
    // Determine if buttons should be enabled based on status
    const isStatusPending = data.status === 'Pending';
    const buttonDisabledClass = isStatusPending ? '' : 'disabled-button';

    const isPending = data.status === 'Pending';
    // const isPrinted = data.status === 'Printed' || data.status === 'printed';
    
    popup.innerHTML = `
        <div class="document-details-content">
            <span class="close" onclick="closePopup()">&times;</span>
            <h2>${requestType} Request #${data.transactionId}</h2>
            <div class="popup-body">
                <div class="details-sections">
                    <!-- Request Information -->
                    <div class="details-section">
                        <h3>Request Details</h3>
                        <div class="two-column-grid">
                            <p><span class="label">Transaction #:</span> <span class="value">${data.transactionId}</span></p>
                            <p><span class="label">Status:</span> <span class="value">${data.status}</span></p>
                            <p><span class="label">Date:</span> <span class="value">${formatTimestamp(data.createdAt)}</span></p>
                            <p><span class="label">Purpose:</span> <span class="value">${data.purpose}</span></p>
                        </div>
                    </div>

                    <!-- Resident Information -->
                    <div class="details-section">
                        <h3>Resident Information</h3>
                        <div class="two-column-grid">
                            <p><span class="label">Full Name:</span> <span class="value">${data.fullName}</span></p>
                            <p><span class="label">Block/Lot:</span> <span class="value">${data.blockLot}</span></p>
                            <p><span class="label">Street:</span> <span class="value">${data.street}</span></p>
                        </div>
                    </div>
                </div>

                ${isBarangayDoc ? `
                    <div class="popup-footer">
                        ${isPending ? `
                            <button onclick="updateRequestStatus('${collectionName}', '${data.transactionId}', 'Approved')" 
                                    class="approve-btn">
                                Approve
                            </button>
                            <button onclick="updateRequestStatus('${collectionName}', '${data.transactionId}', 'Rejected')" 
                                    class="reject-btn">
                                Reject
                            </button>
                        ` : ''}
                        <button onclick="downloadDocument('${collectionName}', '${data.transactionId}')" 
                                class="download-btn">
                            Download Document
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
}

// Function to show document preview for printing
function getDocumentTemplate(type, data, day, month, year) {
    switch(type) {
        case 'CLEARANCE':
            return `
                ${documentStyles}
                <div class="preview-clearance">
                    <div class="clearance-container">
                        <span class="close-btn" onclick="closePopup()">&times;</span>
                        <img src="/public/resources/logo.png" alt="Background" class="watermark">
                        <div class="clearance-background"></div>

                        <div class="clearance-header">
                            <div class="clearance-logo">
                                <img src="/public/resources/logo.png" alt="Barangay Logo">
                            </div>
                            <h2>Republic of the Philippines</h2>
                            <h2>Province of Cavite</h2>
                            <h2>City of Dasmariñas</h2>
                            <h2>Barangay San Antonio De Padua I</h2>
                            <br>
                            <h1>BARANGAY CLEARANCE</h1>
                        </div>

                        <div class="clearance-body">
                            <h2>TO WHOM IT MAY CONCERN:</h2>
                            
                            <p class="indent">
                                This is to certify that <strong>${data.fullName}</strong>, 
                                ${data.age || ''} years old, residing at ${data.blockLot || data.blklot}, ${data.street}, 
                                San Antonio De Padua I, is known to be of good moral character and a law-abiding citizen in the community.
                            </p>
                            
                            <p class="indent">
                                To certify further, that he/she has no derogatory and/or criminal records filed in this barangay.
                            </p>
                            
                            <p class="indent">
                                ISSUED this ${day} day of ${month}, ${year} at Barangay San Antonio De Padua I, 
                                Dasmariñas, Cavite upon request of the interested party for ${data.purpose} purposes.
                            </p>
                        </div>

                        <div class="signature-line">
                            <div class="signature-line__line"></div>
                            <span class="brgyCaptain">Barangay Captain</span>
                        </div>

                        <div class="clearance-footer">
                            <p>O.R. No.: ${data.transactionId}</p>
                            <p>Date Issued: ${new Date().toLocaleDateString()}</p>
                            <p>Doc. Stamp: Paid</p>
                        </div>
                    </div>

                    <div class="print-btn-container">
                        <button onclick="handlePrintDocument('${data.transactionId}', 'brgy_clearance')" class="print-btn">
                            Print Clearance
                        </button>
                    </div>
                </div>
            `;

            case 'CERTIFICATE':
                return `
                    ${documentStyles}
                    <div class="preview-certificate">
                        <div class="certificate-container">
                            <span class="close-certificate-btn" onclick="closePopup()">&times;</span>
                            <img src="/public/resources/logo.png" alt="Background" class="watermark">
                            <div class="certificate-background"></div>
    
                            <div class="certificate-header">
                                <div class="certificate-logo">
                                    <img src="/public/resources/logo.png" class="logo">
                                </div>
                                <h2>Republic of the Philippines</h2>
                                <h2>Province of Cavite</h2>
                                <h2>City of Dasmariñas</h2>
                                <h2>Barangay San Antonio De Padua I</h2>
                                <br>
                                <h1>BARANGAY CERTIFICATE</h1>
                            </div>
    
                            <div class="certificate-body">
                                <h2>TO WHOM IT MAY CONCERN:</h2>
                                
                                <p class="indent">
                                    This is to certify that <strong>${data.fullName}</strong>, 
                                    ${data.age || ''} years old, residing at ${data.blockLot || data.blklot}, 
                                    ${data.street}, San Antonio De Padua I, is known to us and has been residing 
                                    in this barangay since ${data.dateOfResidency || 'birth'}.
                                </p>
    
                                <p class="indent">
                                    This certificate is issued upon the request of <strong>${data.fullName}</strong>
                                    for ${data.purpose} purposes.
                                </p>
    
                                <p class="indent">
                                    ISSUED this ${day} day of ${month}, ${year} at Barangay San Antonio De Padua I, 
                                    Dasmariñas, Cavite.
                                </p>
                            </div>
    
                            <div class="signature-line">
                                <div class="signature-line__line"></div>
                                <span class="brgyCaptain">Barangay Captain</span>
                            </div>
    
                            <div class="clearance-footer">
                                <p>O.R. No.: ${data.transactionId}</p>
                                <p>Date Issued: ${new Date().toLocaleDateString()}</p>
                                <p>Doc. Stamp: Paid</p>
                            </div>
                        </div>
    
                        <div class="print-btn-container">
                            <button onclick="handlePrintDocument('${data.transactionId}', 'brgy_certificate')" class="print-btn">
                                Print Certificate
                            </button>
                        </div>
                    </div>
                `;
    
                case 'INDIGENCY':
                    return `
                        ${documentStyles}
                        <div class="preview-indigency">
                            <div class="indigency-container">
                                <span class="close-indigency-btn" onclick="closePopup()">&times;</span>
                                <img src="/public/resources/logo.png" alt="Background" class="watermark">
                                <div class="indigency-background"></div>
        
                                <div class="indigency-header">
                                    <div class="indigency-logo">
                                        <img src="/public/resources/logo.png" class="logo">
                                    </div>
                                    <h2>Republic of the Philippines</h2>
                                    <h2>Province of Cavite</h2>
                                    <h2>City of Dasmariñas</h2>
                                    <h2>Barangay San Antonio De Padua I</h2>
                                    <br>
                                    <h1>BARANGAY INDIGENCY</h1>
                                </div>
        
                                <div class="indigency-body">
                                    <h2>TO WHOM IT MAY CONCERN:</h2>
                                    
                                    <p class="indent">
                                        This is to certify that <strong>${data.fullName}</strong>, 
                                        ${data.age || ''} years old, residing at ${data.blockLot || data.blklot}, 
                                        ${data.street}, San Antonio De Padua I. This certification is issued
                                        to attest to the financial status of <strong>${data.fullName}</strong> who is currently
                                        in need of financial assistance.
                                    </p>
        
                                    <p class="indent">
                                        This certificate is issued upon the request of <strong>${data.fullName}</strong>
                                        for ${data.purpose} purposes.
                                    </p>
        
                                    <p class="indent">
                                        ISSUED this ${day} day of ${month}, ${year} at Barangay San Antonio De Padua I, 
                                        Dasmariñas, Cavite.
                                    </p>
                                </div>
        
                                <div class="signature-line">
                                    <div class="signature-line__line"></div>
                                    <span class="brgyCaptain">Barangay Captain</span>
                                </div>
        
                                <div class="clearance-footer">
                                    <p>O.R. No.: ${data.transactionId}</p>
                                    <p>Date Issued: ${new Date().toLocaleDateString()}</p>
                                    <p>Doc. Stamp: Paid</p>
                                </div>
                            </div>
        
                            <div class="print-btn-container">
                                <button onclick="handlePrintDocument('${data.transactionId}', 'brgy_indigency')" class="print-btn">
                                    Print Indigency
                                </button>
                            </div>
                        </div>
                    `;
        
                default:
                    return '';
            }
        }


async function createUserNotification(uniqueId, notificationData) {
    try {
        // Create a reference to the user's notifications subcollection
        const userNotificationsRef = collection(doc(db, 'notifications', uniqueId), 'user_notifications');
        
        // Add the notification document
        await addDoc(userNotificationsRef, {
            ...notificationData,
            timestamp: serverTimestamp(),
            read: false,
            createdAt: serverTimestamp()
        });

        console.log('Notification created successfully');
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error; // Rethrow the error to be handled by the calling function
    }
}

// Update the print handling function
window.handlePrintDocument = async function(transactionId, collectionName) {
    try {
        // Update the document status before printing
        const q = query(
            collection(db, collectionName),
            where('transactionId', '==', transactionId)
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref;
            const documentData = snapshot.docs[0].data();

            // Update status
            await updateDoc(docRef, {
                status: 'Printed',
                issuedAt: Timestamp.fromDate(new Date())
            });

            // Create notification for the resident
            try {
                await createUserNotification(documentData.uniqueId, {
                    type: collectionName.toUpperCase(),
                    title: `${collectionName.replace('brgy_', '').toUpperCase()} Ready for Pickup ✅`,
                    message: `Your ${collectionName.replace('brgy_', '')} request (#${transactionId}) has been processed and is ready for pickup.`,
                    status: 'Printed'
                });
            } catch (notificationError) {
                console.error('Error creating notification:', notificationError);
                // Continue with printing even if notification fails
            }

            // Print the document
            window.print();

            // Close preview after printing
            const preview = document.querySelector('.document-preview-popup');
            if (preview) {
                preview.remove();
            }

            // Close any other popups that might be open
            closePopup();

            // Refresh the requests display
            if (typeof fetchAndDisplayBarangayRequests === 'function') {
                fetchAndDisplayBarangayRequests();
            }
        } else {
            throw new Error('Document not found');
        }
    } catch (error) {
        console.error("Error handling document printing:", error);
        alert("Error processing document. Please try again.");
    }
};



function closeAllPopups() {
    const popups = document.querySelectorAll('.document-preview-popup, .document-details-popup');
    popups.forEach(popup => {
        if (popup) {
            popup.remove();
        }
    });
}

window.closePopupAndUpdateStatus = async function(uniqueId, newStatus) {
    // Close the popup first
    const popup = document.querySelector('.document-details-popup');
    if (popup) {
        popup.remove();
    }
    
    // Then update the status
    await updateProfileStatus(uniqueId, newStatus);
};

// Update the closePopup function to be more thorough
window.closePopup = function() {
    // Remove all possible popup types
    const popups = document.querySelectorAll('.document-details-popup, .document-preview-popup');
    popups.forEach(popup => {
        if (popup) {
            popup.remove();
        }
    });
};

window.closePopup = function() {
    closeAllPopups();
};

// Function to close popup
window.closePopup = function() {
    const popup = document.querySelector('.document-details-popup');
    if (popup) {
        popup.remove();
    }
};

window.addEventListener('beforeprint', () => {
    // Any preparation needed before printing
    document.body.classList.add('printing');
});

window.addEventListener('afterprint', () => {
    // Cleanup after printing
    document.body.classList.remove('printing');
    closeAllPopups();
});

// Initialize the notification system
document.addEventListener('DOMContentLoaded', function() {
    setupCollectionListeners();
});

// Export any functions that need to be accessed globally
window.viewRequestDetails = viewRequestDetails;
window.closePopup = closePopup;
window.viewProfileUpdateDetails = viewProfileUpdateDetails;
window.updateProfileStatus = updateProfileStatus;
window.closeDropdown = closeDropdown;
window.downloadDocument = function(collectionName, transactionId) {
    viewRequestDetails(collectionName, transactionId);
};

export { setupCollectionListeners };