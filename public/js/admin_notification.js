// ################ ADMIN_NOTIFICATION.JS #################
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { 
    collection, 
    updateDoc, 
    setDoc, 
    addDoc, 
    orderBy,
    getDocs, 
    doc, 
    getDoc, 
    query, 
    where, 
    onSnapshot, 
    deleteDoc, 
    Timestamp, 
    serverTimestamp 
} from '../js/firebaseConfig.js';

import { openComplaintPopup, markComplaintAsRead } from './admin_complaints.js'; 


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


function formatDate(dateField) {
    if (dateField instanceof Timestamp) {
        return dateField.toDate().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    } else if (dateField instanceof Date) {
        return dateField.toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    } else if (typeof dateField === 'string') {
        return dateField;
    } else {
        return 'N/A';
    }
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

function viewComplaintDetails(complaintId) {
    closeDropdown();

    const isComplaintsPage = window.location.pathname.includes('admin_complaints.html');
    
    if (isComplaintsPage) {
        // If we're on the complaints page, just open the popup
        openComplaintPopup(complaintId);
        markComplaintAsRead(complaintId);
    } else {
        // If we're on another page, store complaint ID and redirect
        sessionStorage.setItem('pendingComplaintId', complaintId);
        window.location.href = '/public/adminPage/admin_complaints.html';
    }

    const notificationItem = document.querySelector(`[data-item-id="${complaintId}"]`);
    if (notificationItem) {
        notificationItem.classList.remove('unread');
        notificationItem.classList.add('read');
    }

    // Decrease notification count immediately
    const currentCount = parseInt(document.querySelector('.notification-count').textContent) || 0;
    if (currentCount > 0) {
        updateNotificationCount(currentCount - 1);
    }
    openComplaintPopup(complaintId);
    markComplaintAsRead(complaintId);
}


// Function to create notification item
function createNotificationItem(data, collectionName) {
    const li = document.createElement('li');
    li.className = data.isRead ? 'notification-item read' : 'notification-item unread';
    
    const itemId = collectionName === 'Profile_Update' ? data.uniqueId : data.transactionId;
    li.setAttribute('data-item-id', itemId || 'undefined');
    
    const getStatusStyle = (status) => {
        const styles = {
            'PENDING': 'color: #ffa500;',
            'Pending': 'color: #ffa500;',
            'APPROVED': 'color: #008000;',
            'Approved': 'color: #008000;',
            'REJECTED': 'color: #ff0000;',
            'Rejected': 'color: #ff0000;',
            'PRINTED': 'color: #0000ff;',
            'Printed': 'color: #0000ff;',
            'Resolved': 'color: #008000;',
            'Cancelled': 'color: #ff0000;',
            'Closed': 'color: #0000ff;'
        };
        return styles[status] || 'color: #ffa500;';
    };
    
    const timestamp = data.timestamp || data.createdAt;
    const formattedTime = timestamp ? formatTimestamp(timestamp) : 'Unknown';
    
    let content = '';
    
    if (collectionName === 'Profile_Update' && data.transactionNo && data.fullName) {
        content = `
            <div class="notification-content">
                <div class="notification-text">
                    <strong>PROFILE UPDATE Request #${data.transactionNo}</strong>
                    <p>From: ${data.fullName}</p>
                    <p>Date: ${formattedTime}</p>
                    <p>Status: <span style="${getStatusStyle(data.status)}">${data.status || 'PENDING'}</span></p>
                </div>
                <div class="notification-actions">
                    <button class="view-request-btn" onclick="viewProfileUpdateDetails('${data.uniqueId}')">
                        View Details
                    </button>
                    <span class="viewed-indicator">✓</span>
                </div>
            </div>
        `;
    } else if (collectionName === 'Complaints') {
        content = `
            <div class="notification-content">
                <div class="notification-text">
                    <strong>COMPLAINT ${data.complaintId} REQUEST</strong>
                    <p>From: ${data.complainant}</p>
                    <p>Date: ${formattedTime}</p>
                    <p>Status: <span style="${getStatusStyle(data.status)}">${data.status || 'Pending'}</span></p>
                </div>
                <div class="notification-actions">
                    <button class="view-request-btn" onclick="viewComplaintDetails('${data.docId}')">
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
                    <p>Date: ${formattedTime}</p>
                    <p>Status: <span style="${getStatusStyle(data.status)}">${data.status || 'PENDING'}</span></p>
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
        return null;
    }
    
    li.innerHTML = content;
    return li;
}

function setupCollectionListeners() {
    const collections = ['brgy_clearance', 'brgy_certificate', 'brgy_indigency', 'Profile_Update'];
    
    // Clear existing notifications first
    if (notificationList) {
        notificationList.innerHTML = '';
    }
    if (notificationCount) {
        notificationCount.style.display = 'none';
    }

    // Create an array to store all notifications
    let allNotifications = [];

    collections.forEach((collectionName) => {
        // Use different orderBy field based on collection type
        const orderByField = collectionName === 'Profile_Update' ? 'timestamp' : 'createdAt';
        
        const q = query(
            collection(db, collectionName),
            orderBy(orderByField, 'desc')  // Order by timestamp/createdAt in descending order
        );

        onSnapshot(q, (snapshot) => {
            // Remove existing notifications for this collection from allNotifications
            allNotifications = allNotifications.filter(
                notification => notification.collection !== collectionName
            );

            snapshot.forEach((doc) => {
                const data = doc.data();
                
                // Only process if data exists and has required fields
                if (
                    !data || 
                    (collectionName === 'Profile_Update' && !data.uniqueId) || 
                    (collectionName !== 'Profile_Update' && !data.transactionId)
                ) {
                    return;
                }

                // Add notification to array with timestamp and collection info
                allNotifications.push({
                    data: data,
                    timestamp: data[orderByField],
                    collection: collectionName
                });
            });

            // Sort all notifications by timestamp (newest first)
            allNotifications.sort((a, b) => {
                const timeA = a.timestamp?.toMillis() || 0;
                const timeB = b.timestamp?.toMillis() || 0;
                return timeB - timeA;
            });

            // Clear the notification list
            if (notificationList) {
                notificationList.innerHTML = '';
            }

            // Display only the 20 most recent notifications
            allNotifications.slice(0, 20).forEach(notification => {
                const notificationItem = createNotificationItem(
                    notification.data, 
                    notification.collection
                );
                if (notificationItem) {
                    notificationItem.setAttribute('data-collection', notification.collection);
                    notificationList.appendChild(notificationItem);
                }
            });

            updateNotificationCount();
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
    
    const showButtons = data.status === 'PENDING';

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
    
    document.body.appendChild(popup);
}

// In admin_notification.js, update this function:
window.updateProfileStatus = async function(uniqueId, newStatus) {
    // Disable approve/reject buttons immediately
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
    }
};

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
            
            // Only update isRead if it's not already read
            if (!data.isRead) {
                await updateDoc(docRef, { isRead: true });
            }
            
            showProfileUpdatePopup(data);
        }
    } catch (error) {
        console.error("Error getting profile update document:", error);
    }
};

// Function to view request details
window.viewRequestDetails = async function(collectionName, transactionId) {
    try {
        const q = query(
            collection(db, collectionName),
            where('transactionId', '==', transactionId)
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref;
            const data = snapshot.docs[0].data();

            // First show the popup
            showDetailsPopup(data, collectionName);

            // Add event listener specifically for approve button in this popup
            const approveBtn = document.querySelector('.approve-btn');
            if (approveBtn) {
                approveBtn.addEventListener('click', async () => {
                    try {
                        // Update status first
                        await updateDoc(docRef, {
                            status: 'Printed',
                            processedAt: serverTimestamp(),
                            issuedAt: serverTimestamp(),
                            isRead: true
                        });

                        // Generate document based on type
                        const docType = collectionName.replace('brgy_', '').toLowerCase();
                        switch (docType) {
                            case 'clearance':
                                await generateWordClearance({
                                    fullName: data.fullName,
                                    age: data.age,
                                    blockLot: data.blockLot,
                                    purpose: data.purpose,
                                    issueDate: new Date().toISOString().split('T')[0],
                                    transactionId: data.transactionId
                                });
                                break;
                                
                            case 'certificate':
                                await generateWordCertificate({
                                    fullName: data.fullName,
                                    age: data.age,
                                    blockLot: data.blockLot,
                                    purpose: data.purpose,
                                    issueDate: new Date().toISOString().split('T')[0],
                                    transactionId: data.transactionId,
                                    civilStatus: data.civilStatus,
                                    nationality: data.nationality
                                });
                                break;
                                
                            case 'indigency':
                                await generateWordIndigency({
                                    fullName: data.fullName,
                                    age: data.age,
                                    blockLot: data.blockLot,
                                    purpose: data.purpose,
                                    issueDate: new Date().toISOString().split('T')[0],
                                    transactionId: data.transactionId,
                                    familyIncome: data.familyIncome
                                });
                                break;
                        }

                        // Create notification for the user
                        await createUserNotification(data.uniqueId, {
                            type: collectionName.toUpperCase(),
                            title: `${collectionName.replace('brgy_', '').toUpperCase()} Ready for Pickup ✅`,
                            message: `Your ${collectionName.replace('brgy_', '')} request (#${transactionId}) has been processed and is ready for pickup.`,
                            status: 'Printed'
                        });

                        // Close popup and refresh table
                        closePopup();
                        // fetchAndDisplayBarangayRequests();

                    } catch (error) {
                        console.error('Error processing document:', error);
            
                        // Show an error in the popup (or console only)
                        const errorContainer = document.querySelector('.error-message');
                        if (errorContainer) {
                            errorContainer.textContent = 'Error generating document. Please try again.';
                            errorContainer.style.display = 'block'; // Ensure it's visible
                        }
                    }
                });
            }

            // Mark as read if it's not already
            if (!data.isRead) {
                await updateDoc(docRef, { isRead: true });
            }
        }
    } catch (error) {
        console.error("Error getting document:", error);
    }
};

window.updateRequestStatus = async function(collectionName, transactionId, newStatus) {
    try {
        if (!collectionName || !transactionId || !newStatus) {
            throw new Error('Missing required parameters');
        }

        const q = query(
            collection(db, collectionName),
            where('transactionId', '==', transactionId)
        );
        
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            throw new Error(`No document found with transactionId: ${transactionId}`);
        }

        const docRef = snapshot.docs[0].ref;
        const documentData = snapshot.docs[0].data();

        if (newStatus === 'Approved') {
            // Check if we're on the requests page
            const isRequestsPage = window.location.pathname.includes('admin_requests.html');
            if (!isRequestsPage) {
                // Update status before redirecting
                await updateDoc(docRef, {
                    status: 'Approved',
                    processedAt: serverTimestamp(),
                    isRead: true
                });

                // Send notification
                await createUserNotification(documentData.uniqueId, {
                    type: collectionName.toUpperCase(),
                    title: `${collectionName.replace('brgy_', '').toUpperCase()} Request Approved ✅`,
                    message: getNotificationMessage(collectionName, transactionId, 'Approved'),
                    status: 'Approved',
                    timestamp: serverTimestamp()
                });

                closePopup();
                // Store the document info in sessionStorage before redirecting
                sessionStorage.setItem('pendingDocumentDetails', JSON.stringify({
                    collectionName: collectionName,
                    transactionId: transactionId
                }));
                
                // Redirect to requests page
                window.location.href = '/public/adminPage/admin_requests.html';
                return; // Stop execution here as we're redirecting
            }
        } else if (newStatus === 'Rejected') {
            await updateDoc(docRef, {
                status: 'Rejected',
                processedAt: serverTimestamp(),
                isRead: true
            });

            await createUserNotification(documentData.uniqueId, {
                type: collectionName.toUpperCase(),
                title: `${collectionName.replace('brgy_', '').toUpperCase()} Request Rejected ❌`,
                message: getNotificationMessage(collectionName, transactionId, 'Rejected'),
                status: 'Rejected',
                timestamp: serverTimestamp()
            });

            closePopup();
        }

        // Set up real-time listener for this specific document
        onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                const updatedData = doc.data();
                // Update UI if needed
                updateUIForDocument(updatedData);
            }
        });

    } catch (error) {
        console.error('Error in updateRequestStatus:', error);
        alert(`Error processing request: ${error.message}. Please try again.`);
    }
};

async function updateComplaintStatusAndNotify(complaintId, newStatus) {
    try {
        // Get the complaint document
        const complaintRef = doc(db, 'complaints', complaintId);
        const complaintSnap = await getDoc(complaintRef);
        
        if (!complaintSnap.exists()) {
            console.error('Complaint not found');
            return;
        }

        const complaintData = complaintSnap.data();
        const uniqueId = complaintData.uniqueId; // This should be the resident's uniqueId

        // Update the complaint status
        await updateDoc(complaintRef, {
            status: newStatus,
            previousStatus: complaintData.status,
            updatedAt: serverTimestamp()
        });

        // Create notification if status changed from Pending to a final status
        if (complaintData.status === 'Pending' && 
            ['Closed', 'Cancelled', 'Resolved'].includes(newStatus)) {
            
            let statusEmoji = {
                'Closed': '🔒',
                'Cancelled': '❌',
                'Resolved': '✅'
            }[newStatus];

            // Use the existing createUserNotification function
            await createUserNotification(uniqueId, {
                type: collectionName.toUpperCase(),
                title: `Complaint ${newStatus} ${statusEmoji}`,
                message: `Your complaint (${complaintData.complaintType}) has been marked as ${newStatus}. ${
                    newStatus === 'Resolved' ? 'The issue has been successfully addressed.' :
                    newStatus === 'Closed' ? 'The case has been closed.' :
                    'The complaint has been cancelled.'
                }`,
                status: newStatus
            });

            console.log('Complaint status updated and notification sent');
        }

    } catch (error) {
        console.error('Error updating complaint status:', error);
        throw error;
    }
}

// Helper function to update UI for a specific document
function updateUIForDocument(documentData) {
    // Find and update the corresponding row in the table
    const row = document.querySelector(`tr[data-transaction-id="${documentData.transactionId}"]`);
    if (row) {
        // Update status cell
        const statusCell = row.querySelector('.status-cell');
        if (statusCell) {
            statusCell.textContent = documentData.status;
            // Update status styling
            statusCell.className = `status-cell status-${documentData.status.toLowerCase()}`;
        }

        // Update other cells if needed
        const issuedAtCell = row.querySelector('.issued-at-cell');
        if (issuedAtCell && documentData.issuedAt) {
            issuedAtCell.textContent = new Date(documentData.issuedAt.toDate()).toLocaleDateString();
        }
    }
}

function getNotificationMessage(collectionName, transactionId, status) {
    const docType = collectionName.replace('brgy_', '');
    switch(status) {
        case 'Approved':
            return `Your ${docType} request (#${transactionId}) has been approved and is ready for processing.`;
        case 'Rejected':
            return `Your ${docType} request (#${transactionId}) has been rejected. Please contact the barangay office for clarification.`;
        case 'Printed':
            return `Your ${docType} request (#${transactionId}) has been processed and is ready for pickup.`;
        default:
            return `Your ${docType} request (#${transactionId}) status has been updated to ${status}.`;
    }
}

// Add these styles to your CSS
const styles = `
.status-pending { color: #ffa500; font-weight: bold; }
.status-approved { color: #008000; font-weight: bold; }
.status-rejected { color: #ff0000; font-weight: bold; }
.status-printed { color: #0000ff; font-weight: bold; }
`;

// Add the styles to the document
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

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
    
    // Check if currently on the requests page
    const isRequestsPage = window.location.pathname.includes('admin_requests.html');
    
    const requestType = data.requestType || collectionName.replace('brgy_', '').toUpperCase();
    const isStatusPending = data.status === 'Pending';
    const buttonDisabledClass = isStatusPending ? '' : 'disabled-button';

    const statusClass = {
        'Pending': 'status-pending',
        'Approved': 'status-approved',
        'Rejected': 'status-rejected',
        'Printed': 'status-printed'
    }[status] || 'status-pending';
    
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

                ${isStatusPending ? `
                    <div class="popup-footer">
                        ${!isRequestsPage ? `
                            <button 
                                onclick="window.location.href='/public/adminPage/admin_requests.html';" 
                                class="view-btn">
                                Go to Requests
                            </button>
                        ` : ''}
                        <button onclick="updateRequestStatus('${collectionName}', '${data.transactionId}', 'Approved')" 
                                class="approve-btn ${buttonDisabledClass}">
                            Approve
                        </button>
                        <button onclick="updateRequestStatus('${collectionName}', '${data.transactionId}', 'Rejected')" 
                                class="reject-btn ${buttonDisabledClass}">
                            Reject
                        </button>
                    </div>
                ` : `
                    <div class="popup-footer">
                        ${!isRequestsPage ? `
                            <button 
                                onclick="window.location.href='/public/adminPage/admin_requests.html';" 
                                class="view-btn">
                                Go to Requests
                            </button>
                        ` : ''}
                    </div>
                `}
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
}

// Function to show document preview for printing REMOVED
// function getDocumentTemplate(type, data, day, month, year) {



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
        closePopup();
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

// In admin_notification.js

// Add this function to handle complaint notifications
function listenForComplaintNotifications() {
    const complaintsRef = collection(db, 'Complaints');
    const q = query(
        complaintsRef,
        where('status', '==', 'Pending'),
        where('read', '==', false),
        orderBy('timestamp', 'desc')
    );

    let unreadNotifications = 0;

    onSnapshot(q, (snapshot) => {
        try {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const complaint = {
                        ...change.doc.data(),
                        docId: change.doc.id
                    };

                    // Create notification item
                    const notificationItem = createNotificationItem(complaint, 'Complaints');
                    
                    if (notificationItem) {
                        const notificationList = document.getElementById('notificationList');
                        if (!notificationList) {
                            console.error('Notification list element not found');
                            return;
                        }

                        // Insert at the beginning for newest notifications
                        if (notificationList.firstChild) {
                            notificationList.insertBefore(notificationItem, notificationList.firstChild);
                        } else {
                            notificationList.appendChild(notificationItem);
                        }

                        // Update unread count
                        if (!complaint.read) {
                            unreadNotifications++;
                        }
                    }
                } else if (change.type === "modified") {
                    // Handle modified complaints
                    const updatedComplaint = change.doc.data();
                    const existingItem = document.querySelector(`[data-item-id="${updatedComplaint.complaintId}"]`);
                    
                    if (existingItem) {
                        if (updatedComplaint.read) {
                            existingItem.classList.remove('unread');
                            existingItem.classList.add('read');
                            if (unreadNotifications > 0) unreadNotifications--;
                        }
                    }
                } else if (change.type === "removed") {
                    // Handle removed complaints
                    const removedComplaint = change.doc.data();
                    const itemToRemove = document.querySelector(`[data-item-id="${removedComplaint.complaintId}"]`);
                    
                    if (itemToRemove) {
                        itemToRemove.remove();
                        if (!removedComplaint.read && unreadNotifications > 0) {
                            unreadNotifications--;
                        }
                    }
                }
            });

            // Update notification badge count
            updateNotificationCount(unreadNotifications);

            // Update empty state if needed
            const notificationList = document.getElementById('notificationList');
            if (notificationList && notificationList.children.length === 0) {
                notificationList.innerHTML = '<li class="no-notifications">No new notifications</li>';
            }

        } catch (error) {
            console.error('Error in complaint notification listener:', error);
        }
    }, (error) => {
        console.error('Error listening to complaints:', error);
    });

    // Return unsubscribe function for cleanup
    return () => {
        unreadNotifications = 0;
        updateNotificationCount(0);
    };
}

// Modify your existing updateNotificationUI function to handle complaint notifications
function updateNotificationUI(notifications) {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;

    notifications.forEach(notification => {
        const li = document.createElement('li');
        li.className = 'notification-item';

        if (notification.type === 'COMPLAINT') {
            li.innerHTML = `
                <div class="notification-content">
                    <div class="notification-header">
                        COMPLAINT ${notification.complaintId} REQUEST
                    </div>
                    <div class="notification-details">
                        From: ${notification.from}
                        Date: ${formatDate(notification.timestamp)}
                        Status: <span class="status-pending">Pending</span>
                    </div>
                    <button class="view-details-btn" onclick="viewComplaintDetails('${notification.id}')">View Details</button>
                </div>
            `;
        } else {
            // Your existing notification type handlers
            // (for documents, profile updates, etc.)
        }

        notificationList.appendChild(li);
    });
}


function closeAllPopups() {
    const popups = document.querySelectorAll('.document-preview-popup, .document-details-popup');
    popups.forEach(popup => {
        if (popup) {
            popup.remove();
        }
    });
}

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

async function handleComplaint(complaintId, action) {
    try {
        const popup = document.getElementById('complaintPopupContent');
        const statusSelect = popup.querySelector('#status-select');
        const assignedOfficerInput = popup.querySelector('#assignedofficer-input');
        const remarksInput = popup.querySelector('#remarks-input');

        if (!statusSelect || !statusSelect.value) {
            alert('Please select a status');
            return;
        }

        showLoader();
        
        // Get the complaint document first to check status change
        const complaintRef = doc(db, 'Complaints', complaintId);
        const complaintSnap = await getDoc(complaintRef);
        const complaintData = complaintSnap.data();
        
        // Debug log to see what data we have
        console.log('Complaint Data:', complaintData);

        // Check if we have userId
        if (!complaintData.userId) {
            console.error('No userId found in complaint data');
            alert('Error: Could not find user information');
            return;
        }

        const oldStatus = complaintData.status;
        const newStatus = statusSelect.value;

        const updateData = {
            status: newStatus,
            assignedOfficer: assignedOfficerInput ? assignedOfficerInput.value.trim() : '',
            remarks: remarksInput ? remarksInput.value.trim() : '',
            resolutionDate: newStatus !== 'Pending' ? Timestamp.now() : null
        };

        // Update the complaint
        await updateDoc(complaintRef, updateData);

        // If status changed from Pending to a final status, create notification
        if (oldStatus === 'Pending' && ['Closed', 'Cancelled', 'Resolved'].includes(newStatus)) {
            let statusEmoji = {
                'Closed': '🔒',
                'Cancelled': '❌',
                'Resolved': '✅'
            }[newStatus];

            // Get user's uniqueId from users collection
            const userQuery = query(
                collection(db, 'users'),
                where('userId', '==', complaintData.userId)
            );
            
            const userSnapshot = await getDocs(userQuery);
            if (userSnapshot.empty) {
                console.error('User document not found');
                return;
            }

            const userData = userSnapshot.docs[0].data();
            const uniqueId = userData.uniqueId; // Get the uniqueId from user document

            // Create notification in user's subcollection
            await createUserNotification(uniqueId, {
                type: 'COMPLAINTS', 
                title: `Complaint ${newStatus} ${statusEmoji}`,
                message: `Your complaint (${complaintData.complaintType}) has been marked as ${newStatus}. ${
                    newStatus === 'Resolved' ? 'The issue has been successfully addressed.' :
                    newStatus === 'Closed' ? 'The case has been closed.' :
                    'The complaint has been cancelled.'
                }`,
                status: newStatus,
                timestamp: serverTimestamp()
            });
        }
        
        console.log('Update successful');
        alert(`Complaint successfully updated to ${updateData.status}`);
        closeComplaintPopup();
        
    } catch (error) {
        console.error('Error updating complaint:', error);
        alert(`Failed to update complaint: ${error.message}`);
    } finally {
        hideLoader();
    }
}

window.handleComplaintStatusUpdate = async function(complaintId, newStatus) {
    try {
        await updateComplaintStatusAndNotify(complaintId, newStatus);
        closePopup(); // Close any open popup
        // Refresh your complaints list if needed
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to update complaint status. Please try again.');
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
    listenForComplaintNotifications();

    const pendingComplaintId = sessionStorage.getItem('pendingComplaintId');
    if (pendingComplaintId) {
        // Clear the stored ID immediately
        sessionStorage.removeItem('pendingComplaintId');
        
        // Add a small delay to ensure the table is rendered
        setTimeout(() => {
            openComplaintPopup(pendingComplaintId);
            markComplaintAsRead(pendingComplaintId);
        }, 500);
    }
});

// Export any functions that need to be accessed globally
window.viewComplaintDetails = viewComplaintDetails;
window.viewRequestDetails = viewRequestDetails;
window.closePopup = closePopup;
window.viewProfileUpdateDetails = viewProfileUpdateDetails;
window.updateProfileStatus = updateProfileStatus;
window.closeDropdown = closeDropdown;

export function initializeNotifications() {
    // Set up complaint notifications listener
    const unsubscribeComplaints = listenForComplaintNotifications();

    // Cleanup function
    return () => {
        if (unsubscribeComplaints) unsubscribeComplaints();
    };
}

export { 
    markNotificationsAsRead,
    setupCollectionListeners,
    createUserNotification,
    listenForComplaintNotifications
 };
 