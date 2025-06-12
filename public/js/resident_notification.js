//  ####################################### RESIDENT_NOTIFICATION.JS ##########################################

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getFirestore, collection, addDoc, orderBy, getDocs, doc, getDoc, query, where, onSnapshot, updateDoc, deleteDoc, Timestamp, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js';
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

const db = getFirestore();
const auth = getAuth();

// Get references to DOM elements
const notificationIcon = document.getElementById('notificationIcon');
const notificationDropdown = document.getElementById('notificationDropdown');
const notificationList = document.getElementById('notificationList');
const notificationCount = document.getElementById('notificationCount');

function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown time';
    try {
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
    } catch (error) {
        console.error('Error formatting timestamp:', error);
        return 'Invalid date';
    }
}

function listenToComplaintUpdates(userId) {
    console.log('Starting listenToComplaintUpdates for userId:', userId);

    const complaintsQuery = query(
        collection(db, 'complaints'),
        where('userId', '==', userId)
    );

    onSnapshot(complaintsQuery, async (snapshot) => {
        console.log('Complaints updates snapshot received:', snapshot.size);

        snapshot.docChanges().forEach(async (change) => {
            const complaintData = change.doc.data();
            console.log('Complaint update data:', complaintData);
            
            if (change.type === 'modified') {
                const oldStatus = change.doc.data().previousStatus || 'Pending';
                const newStatus = complaintData.status;

                // Check if status changed from Pending to a final status
                if (oldStatus === 'Pending' && 
                    ['Closed', 'Cancelled', 'Resolved'].includes(newStatus)) {
                    
                    let statusEmoji = {
                        'Closed': '🔒',
                        'Cancelled': '❌',
                        'Resolved': '✅'
                    }[newStatus];

                    const notificationData = {
                        userId: userId,
                        timestamp: serverTimestamp(),
                        read: false,
                        type: 'COMPLAINT_UPDATE',
                        title: `Complaint ${newStatus} ${statusEmoji}`,
                        message: `Your complaint (${complaintData.complaintType}) has been marked as ${newStatus}. ${
                            newStatus === 'Resolved' ? 'The issue has been successfully addressed.' :
                            newStatus === 'Closed' ? 'The case has been closed.' :
                            'The complaint has been cancelled.'
                        }`,
                        status: newStatus
                    };

                    try {
                        const notifRef = await addDoc(collection(db, 'notifications'), notificationData);
                        console.log('Created complaint notification with ID:', notifRef.id);
                    } catch (error) {
                        console.error('Error creating complaint notification:', error);
                    }
                }
            }
        });
    });
}

// Function to toggle notification dropdown
function toggleNotificationDropdown(event) {
    event.stopPropagation();
    const isVisible = window.getComputedStyle(notificationDropdown).display === 'block';
    notificationDropdown.style.display = isVisible ? 'none' : 'block';
}

// Close dropdown when clicking outside
function handleClickOutside(event) {
    if (!notificationDropdown.contains(event.target) && !notificationIcon.contains(event.target)) {
        notificationDropdown.style.display = 'none';
    }
}

// Function to listen for profile update status changes
function listenToProfileUpdates(userId) {
    console.log('Starting listenToProfileUpdates for userId:', userId);

    const profileUpdatesQuery = query(
        collection(db, 'Profile_Update'),
        where('userId', '==', userId)
    );

    onSnapshot(profileUpdatesQuery, async (snapshot) => {
        console.log('Profile updates snapshot received:', snapshot.size);

        snapshot.docChanges().forEach(async (change) => {
            const updateData = change.doc.data();
            console.log('Profile update data:', updateData);
            
            if (change.type === 'modified') {
                if (updateData.status === 'Approved' || updateData.status === 'Reject') {
                    const notificationData = {
                        userId: userId, // Use auth uid directly
                        timestamp: serverTimestamp(),
                        read: false,
                        type: 'PROFILE_UPDATE',
                        title: `Profile Update ${updateData.status} ${updateData.status === 'Approved' ? '✅' : '❌'}`,
                        message: updateData.status === 'Approved'
                            ? 'Good news! Your profile update request has been approved. Your information has been successfully updated.'
                            : `Your profile update request was not approved. For clarification, please contact the barangay office.`,
                        status: updateData.status
                    };

                    try {
                        const notifRef = await addDoc(collection(db, 'notifications'), notificationData);
                        console.log('Created notification with ID:', notifRef.id);
                    } catch (error) {
                        console.error('Error creating notification:', error);
                    }
                }
            }
        });
    });
}

// In resident_notification.js, update this function:
function displayNotifications(userId) {
    console.log('Starting displayNotifications for userId:', userId);

    // Get user's uniqueId first
    const userQuery = query(
        collection(db, 'users'),
        where('userId', '==', userId)
    );

    getDocs(userQuery).then((userSnapshot) => {
        if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            const uniqueId = userData.uniqueId;

            // Reference to user's notifications subcollection
            const userNotificationsRef = collection(doc(db, 'notifications', uniqueId), 'user_notifications');
            
            // Query the user's notifications subcollection
            const notificationsQuery = query(
                userNotificationsRef,
                orderBy('timestamp', 'desc')
            );

            onSnapshot(notificationsQuery, (snapshot) => {
                console.log('Notifications snapshot received:', snapshot.size);
                notificationList.innerHTML = '';
                let unreadCount = 0;

                if (snapshot.empty) {
                    const emptyMessage = document.createElement('li');
                    emptyMessage.style.padding = '10px';
                    emptyMessage.style.textAlign = 'center';
                    emptyMessage.textContent = 'No notifications yet';
                    notificationList.appendChild(emptyMessage);
                } else {
                    snapshot.forEach((notificationDoc) => {
                        const notification = { id: notificationDoc.id, ...notificationDoc.data() };
                        console.log('Processing notification:', notification);

                        const li = document.createElement('li');
                        li.className = notification.read ? 'notification-item read' : 'notification-item unread';
                        li.setAttribute('data-notification-id', notification.id);
                        
                        const statusColor = notification.status === 'Approved' ? '#4CAF50' : '#f44336';
                        const checkIcon = notification.read ? '✓' : '';
                        
                        li.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: start; padding: 10px;">
                                <div style="flex-grow: 1;">
                                    <div style="font-weight: ${notification.read ? 'normal' : 'bold'}; color: ${statusColor};">
                                        ${notification.title}
                                    </div>
                                    <div style="color: #666; margin-top: 5px;">
                                        ${notification.message}
                                    </div>
                                    <div style="font-size: 0.8em; color: #999; margin-top: 5px;">
                                        ${formatTimestamp(notification.timestamp)}
                                    </div>
                                </div>
                                <div class="check-icon" style="color: #4CAF50; font-weight: bold; font-size: 1.2em; margin-left: 10px;">
                                    ${checkIcon}
                                </div>
                            </div>
                        `;
                        
                        if (!notification.read) {
                            unreadCount++;
                            li.addEventListener('click', async () => {
                                try {
                                    // Correctly reference the document in the subcollection
                                    const notificationDocRef = doc(db, 'notifications', uniqueId, 'user_notifications', notification.id);
                                    
                                    // Update the notification as read
                                    await updateDoc(notificationDocRef, {
                                        read: true,
                                        readAt: serverTimestamp()
                                    });

                                    // Update UI
                                    li.classList.remove('unread');
                                    li.classList.add('read');
                                    li.querySelector('div > div:first-child').style.fontWeight = 'normal';
                                    
                                    // Add check icon
                                    li.querySelector('.check-icon').textContent = '✓';
                                    
                                    // Update counter
                                    unreadCount--;
                                    if (unreadCount > 0) {
                                        notificationCount.textContent = unreadCount;
                                        notificationCount.style.display = 'block';
                                    } else {
                                        notificationCount.style.display = 'none';
                                    }

                                    console.log('Notification marked as read:', notification.id);
                                } catch (error) {
                                    console.error('Error marking notification as read:', error);
                                }
                            });
                        }
                        
                        notificationList.appendChild(li);
                    });
                }

                // Update notification count
                if (unreadCount > 0) {
                    notificationCount.textContent = unreadCount;
                    notificationCount.style.display = 'block';
                } else {
                    notificationCount.style.display = 'none';
                }
            });
        }
    }).catch(error => {
        console.error('Error getting user document:', error);
    });
}

// Update notification read status
async function markNotificationAsRead(notificationId) {
    try {
        const notificationRef = doc(db, 'notifications', notificationId);
        await updateDoc(notificationRef, {
            read: true,
            readAt: serverTimestamp()
        });
        console.log('Marked notification as read:', notificationId); // Debug log
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
}

// Function to update notification count
function updateNotificationCount(count) {
    if (count > 0) {
        notificationCount.textContent = count;
        notificationCount.style.display = 'block';
    } else {
        notificationCount.style.display = 'none';
    }
}


// Update the initializeNotifications function to include the new listener
function initializeNotifications() {
    console.log('Initializing notifications...');
    
    if (!notificationIcon || !notificationDropdown || !notificationList || !notificationCount) {
        console.error('Required notification elements not found');
        return;
    }

    notificationIcon.addEventListener('click', toggleNotificationDropdown);
    document.addEventListener('click', handleClickOutside);

    onAuthStateChanged(auth, (user) => {
        console.log('Auth state changed. User:', user?.uid);
        if (user) {
            console.log('User is authenticated, setting up notifications for:', user.uid);
            displayNotifications(user.uid);
            listenToProfileUpdates(user.uid);
            listenToComplaintUpdates(user.uid);
            listenToDocumentRequests(user.uid); // Add this line
        } else {
            console.log('User is not authenticated');
            notificationList.innerHTML = '';
            notificationCount.style.display = 'none';
        }
    });
}

// Call initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeNotifications);

function listenToDocumentRequests(userId) {
    console.log('Starting listenToDocumentRequests for userId:', userId);

    const userQuery = query(
        collection(db, 'users'),
        where('userId', '==', userId)
    );

    getDocs(userQuery).then((userSnapshot) => {
        if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            const uniqueId = userData.uniqueId;
            console.log('Found uniqueId for document requests:', uniqueId);

            const collections = ['brgy_clearance', 'brgy_certificate', 'brgy_indigency'];
            
            collections.forEach(collectionName => {
                const requestsQuery = query(
                    collection(db, collectionName),
                    where('uniqueId', '==', uniqueId)
                );

                onSnapshot(requestsQuery, async (snapshot) => {
                    console.log(`${collectionName} updates snapshot received:`, snapshot.size);

                    snapshot.docChanges().forEach(async (change) => {
                        const requestData = change.doc.data();
                        console.log(`${collectionName} update data:`, requestData);

                        if (change.type === 'modified') {
                            const newStatus = requestData.status;
                            
                            if (['Approved', 'Printed', 'Rejected'].includes(newStatus)) {
                                let statusEmoji = {
                                    'Approved': '✅',
                                    'Printed': '🖨️',
                                    'Rejected': '❌'
                                }[newStatus];

                                // Extract transaction ID from the document
                                const transactionId = requestData.transactionId || 
                                (collectionName === 'brgy_clearance' ? requestData.clearanceId :
                                collectionName === 'brgy_certificate' ? requestData.certificateId :
                                requestData.indigencyId);

                                // Construct message based on document type and status
                                let messageText = '';
                                const documentType = collectionName.replace('brgy_', '');

                                if (newStatus === 'Approved') {
                                messageText = `Your ${documentType} request (#${transactionId}) has been approved.`;
                                } else if (newStatus === 'Printed') {
                                messageText = `Your ${documentType} request (#${transactionId}) has been processed and is ready for pickup.`;
                                } else if (newStatus === 'Rejected') {
                                messageText = `Your ${documentType} request (#${transactionId}) has been rejected. Please contact the barangay office for more information.`;
                                }

                                const notificationData = {
                                    timestamp: serverTimestamp(),
                                    read: false,
                                    type: collectionName.toUpperCase(),
                                    title: `${documentType.toUpperCase()} ${newStatus} ${statusEmoji}`,
                                    message: messageText,
                                    status: newStatus
                                };

                                try {
                                    const userNotificationsRef = collection(db, 'notifications', uniqueId, 'user_notifications');
                                    const notifRef = await addDoc(userNotificationsRef, notificationData);
                                    console.log(`Created ${collectionName} notification with ID:`, notifRef.id);
                                } catch (error) {
                                    console.error(`Error creating ${collectionName} notification:`, error);
                                }
                            }
                        }
                    });
                });
            });
        }
    }).catch(error => {
        console.error('Error getting user document for document requests:', error);
    });
}



// Don't forget to export the new function
export {
    toggleNotificationDropdown,
    handleClickOutside,
    markNotificationAsRead,
    displayNotifications,
    initializeNotifications,
    listenToProfileUpdates,
    listenToComplaintUpdates,
    listenToDocumentRequests
};

