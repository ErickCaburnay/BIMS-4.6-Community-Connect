// ################################ ADMIN_REQUEST_NOTIF.JS ################################

// admin_request_notif.js
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

// import { openComplaintPopup } from '../js/admin_complaints.js';

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

let notificationCount = 0;
const collections = ['brgy_clearance', 'brgy_certificate', 'brgy_indigency', 'Complaints'];
const notificationsList = new Set();

function initializeNotifications(db) {
    const notificationIcon = document.getElementById('notificationIcon');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const notificationList = document.getElementById('notificationList');

    if (!notificationIcon || !notificationDropdown || !notificationList) {
        console.error('Required notification elements not found');
        return;
    }

    // Show/hide dropdown on icon click
    notificationIcon.addEventListener('click', () => {
        notificationDropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!notificationIcon.contains(e.target)) {
            notificationDropdown.classList.remove('show');
        }
    });

    // Monitor collections including complaints
collections.forEach(collectionName => {
    const isComplaint = collectionName === 'Complaints';
    const statusCondition = isComplaint 
        ? ['Pending', 'pending']
        : ['Pending', 'PENDING'];

    let q;
    if (isComplaint) {
        // Use timestamp instead of createdAt for Complaints since we have that index
        q = query(
            collection(db, collectionName),
            where('status', 'in', statusCondition),
            orderBy('timestamp', 'desc')  // Using existing index
        );
    } else {
        // Original query for other collections
        q = query(
            collection(db, collectionName),
            where('status', 'in', statusCondition),
            orderBy('createdAt', 'desc')
        );
    }

    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                const data = {
                    ...change.doc.data(),
                    docId: change.doc.id
                };
                // For complaints, use timestamp as createdAt if needed
                if (isComplaint && !data.createdAt) {
                    data.createdAt = data.timestamp;
                }
                addNotification(collectionName, data);
            }
            if (change.type === 'modified' && 
                !statusCondition.includes(change.doc.data().status)) {
                removeNotification(isComplaint ? data.complaintId : data.transactionId);
            }
        });
        updateNotificationCount();
    }, error => {
        console.error(`Error in ${collectionName} notification snapshot:`, error);
    });
});
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleString();
}

function getRequestTypeName(collectionName) {
    return {
        'brgy_clearance': 'CLEARANCE',
        'brgy_certificate': 'CERTIFICATE',
        'brgy_indigency': 'INDIGENCY'
    }[collectionName] || 'DOCUMENT';
}

function getStatusStyle(status) {
    return status === 'Pending' || status === 'PENDING'
        ? 'color: #FFA500;' 
        : 'color: #008000;';
}

function addNotification(collectionName, data) {
    const isComplaint = collectionName === 'Complaints';
    const notificationId = isComplaint ? data.complaintId : data.transactionId;

    if (!notificationId || notificationsList.has(notificationId)) return;
    
    notificationsList.add(notificationId);
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;

    const listItem = document.createElement('li');
    const formattedTime = formatTime(data.createdAt);

    if (isComplaint) {
        // Complaint notification template
        listItem.innerHTML = `
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
    } else {
        // Document request notification template
        const requestType = getRequestTypeName(collectionName);
        listItem.innerHTML = `
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
    }

    notificationList.insertBefore(listItem, notificationList.firstChild);
    updateNotificationCount();
    // playNotificationSound();
}

function viewComplaintDetails(docId) {
    try {
        // Get complaint document
        const complaintRef = doc(db, 'Complaints', docId);
        
        // Store complaint ID and redirect if not on complaints page
        const isComplaintsPage = window.location.pathname.includes('./admin_complaints.html');
        if (!isComplaintsPage) {
            // Store complaint ID and redirect
            sessionStorage.setItem('pendingComplaintId', docId);
            window.location.href = './admin_complaints.html';
        } else {
            // If already on complaints page, just update status
            getDoc(complaintRef).then(async (complaintSnap) => {
                if (complaintSnap.exists()) {
                    const data = complaintSnap.data();
                    if (!data.read) {
                        await updateDoc(complaintRef, { read: true });
                    }
                    // You can handle opening the popup in admin_complaints.js
                }
            });
        }
    } catch (error) {
        console.error('Error viewing complaint details:', error);
        alert('Error loading complaint details. Please try again.');
    }
}

async function openComplaintPopup(complaintId) {
    console.log('Opening complaint popup for ID:', complaintId);
    
    const overlay = document.getElementById('complaintOverlay');
    const popup = document.getElementById('complaintPopupContent');
    
    if (!overlay || !popup) {
        console.error('Popup elements not found');
        return;
    }

    try {
        const complaintDoc = await getDoc(doc(db, 'Complaints', complaintId));
        
        if (complaintDoc.exists()) {
            const data = complaintDoc.data();
            const isReadOnly = isFinalStatus(data.status);
            
            overlay.style.display = 'flex';
            popup.style.display = 'block';

            popup.innerHTML = `
                <div class="blurred-background"></div>
                <button id="complaintCloseButton" class="complaint-close-button">&times;</button>
                <h2>Complaint Details</h2>
                <form id="complaintDetails">
                    <!-- Complaint Type - Full Row -->
                    <div class="form-group">
                        <label>Complaint Type:</label>
                        <p>${data.complaintType || 'N/A'}</p>
                    </div>

                    <!-- Respondent Row -->
                    <div style="display: flex; gap: 20px;">
                        <div class="form-group" style="flex: 1;">
                            <label>Respondent:</label>
                            <p>${data.respondent || 'N/A'}</p>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Respondent Address:</label>
                            <p>${data.respondentAddress || 'N/A'}</p>
                        </div>
                    </div>

                    <!-- Complainant Row -->
                    <div style="display: flex; gap: 20px;">
                        <div class="form-group" style="flex: 1;">
                            <label>Complainant:</label>
                            <p>${data.complainant || 'N/A'}</p>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Complainant Address:</label>
                            <p>${data.complainantAddress || 'N/A'}</p>
                        </div>
                    </div>

                    <!-- Assigned Officer and Date Filed Row -->
                    <div style="display: flex; gap: 20px;">
                        <div class="form-group" style="flex: 1;">
                            <label>Assigned Officer:</label>
                            ${isReadOnly ? 
                                `<p>${data.assignedOfficer || 'N/A'}</p>` :
                                `<input type="text" 
                                    id="assignedofficer-input" 
                                    class="input-group" 
                                    value="${data.assignedOfficer || ''}"
                                    required
                                >`
                            }
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Date Filed:</label>
                            <p>${formatDate(data.timestamp)}</p>
                        </div>
                    </div>

                    <!-- Status and Resolution Date Row -->
                    <div style="display: flex; gap: 20px;">
                        <div class="form-group" style="flex: 1;">
                            <label>Status:</label>
                            ${isReadOnly ?
                                `<p>${data.status}</p>` :
                                `<select id="status-select" class="form-select" required>
                                    <option value="">Select a status</option>
                                    <option value="Pending" ${data.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                    <option value="Resolved" ${data.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                                    <option value="Cancelled" ${data.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                                    <option value="Closed" ${data.status === 'Closed' ? 'selected' : ''}>Closed</option>
                                </select>`
                            }
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Resolution Date:</label>
                            <p>${data.status === 'Pending' ? 'Pending' : (data.resolutionDate ? formatDate(data.resolutionDate) : 'N/A')}</p>
                        </div>
                    </div>

                    <!-- Issue Row -->
                    <div class="form-group">
                        <label>Issue:</label>
                        <p class="readonly-textarea">${data.issue || 'N/A'}</p>
                    </div>

                    <!-- Remarks Row -->
                    <div class="form-group">
                        <label>Remarks:</label>
                        ${isReadOnly ?
                            `<p class="readonly-textarea">${data.remarks || 'No remarks'}</p>` :
                            `<textarea 
                                id="remarks-input" 
                                class="form-textarea" 
                                rows="3" 
                                placeholder="Enter additional remarks"
                                style="background-color: white; color: black; min-height: 100px; resize: vertical;"
                            >${data.remarks || ''}</textarea>`
                        }
                    </div>

                    ${!isReadOnly ? `
                        <div class="button-group" style="justify-content: center;">
                            <button type="button" id="submitButton">Submit</button>
                        </div>
                    ` : ''}
                </form>
            `;

            // Add event listeners
            const closeButton = popup.querySelector('#complaintCloseButton');
            if (closeButton) {
                closeButton.addEventListener('click', closeComplaintPopup);
            }

            if (!isReadOnly) {
                const submitButton = popup.querySelector('#submitButton');
                if (submitButton) {
                    submitButton.addEventListener('click', () => {
                        handleComplaint(complaintId, 'submit');
                    });
                }

                const statusSelect = popup.querySelector('#status-select');
                if (statusSelect) {
                    statusSelect.addEventListener('change', (e) => {
                        console.log('Status changed to:', e.target.value);
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error opening complaint popup:', error);
    }
}

// Close complaint popup
function closeComplaintPopup() {
    const overlay = document.getElementById('complaintOverlay');
    const popup = document.getElementById('complaintPopupContent');
    
    if (overlay) overlay.style.display = 'none';
    if (popup) popup.style.display = 'none';
}

function removeNotification(docId) {
    if (notificationsList.has(docId)) {
        notificationsList.delete(docId);
        updateNotificationCount();
    }
}

function updateNotificationCount() {
    const countElement = document.getElementById('notificationCount');
    if (!countElement) return;
    
    notificationCount = notificationsList.size;
    
    if (notificationCount > 0) {
        countElement.textContent = notificationCount;
        countElement.style.display = 'block';
    } else {
        countElement.style.display = 'none';
    }
}

// function playNotificationSound() {
//     try {
//         const audio = new Audio('../resources/notification-sound.mp3');
//         audio.play();
//     } catch (error) {
//         console.log('Notification sound not available');
//     }
// }

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


function showDetailsPopup(data, collectionName) {
    const popup = document.createElement('div');
    popup.className = 'document-details-popup';
    
    // Check if currently on the requests page
    const isRequestsPage = window.location.pathname.includes('./admin_requests.html');
    
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
                                onclick="window.location.href='./admin_requests.html';" 
                                class="view-btn">
                                Go to Requests
                            </button>
                        ` : ''}
                        <!-- <button onclick="updateRequestStatus('${collectionName}', '${data.transactionId}', 'Approved')" 
                                class="approve-btn ${buttonDisabledClass}">
                            Approve
                        </button>
                        <button onclick="updateRequestStatus('${collectionName}', '${data.transactionId}', 'Rejected')" 
                                class="reject-btn ${buttonDisabledClass}">
                            Reject
                        </button> -->

                        <button onclick="goToRequests('${collectionName}', '${data.transactionId}')" 
                                class="go-to-requests-btn">
                            Go To Requests
                        </button>
                    </div>
                ` : `
                    <div class="popup-footer">
                        ${!isRequestsPage ? `
                            <button 
                                onclick="window.location.href='./admin_requests.html';" 
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

window.goToRequests = function(collectionName, transactionId) {
    try {
        // Store the document details in session storage for reference
        sessionStorage.setItem('pendingDocumentDetails', JSON.stringify({
            collectionName: collectionName,
            transactionId: transactionId
        }));
        
        // Redirect to the requests page
        window.location.href = './admin_requests.html';
    } catch (error) {
        console.error('Error redirecting to requests:', error);
        alert('Error navigating to requests page. Please try again.');
    }
};

window.closePopup = function() {
    const popup = document.querySelector('.document-details-popup');
    if (popup) {
        popup.remove();
    }
};



// Function to create user notification
async function createUserNotification(uniqueId, notificationData) {
    try {
        // Create a reference to the user's notifications subcollection
        const userNotificationsRef = collection(doc(db, 'notifications', uniqueId), 'user_notifications');
        
        // Add the notification document
        await addDoc(userNotificationsRef, {
            ...notificationData,
            timestamp: serverTimestamp(),
            read: false
        });

        console.log('Notification created successfully');
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

window.viewComplaintDetails = viewComplaintDetails;

// Add this to your exports
export { 
    initializeNotifications,     
    createUserNotification,
    viewComplaintDetails 
};
