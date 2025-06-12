// ############## ADMIN_SETTINGS_ANNOUNCEMENT.JS ###################

import {
    db,
    doc,
    query,    
    collection,
    getDocs,
    deleteDoc,
    addDoc,
    getDoc,
    updateDoc,
    orderBy,
    where,
    Timestamp,
    serverTimestamp,
    storage,
    storageRef,
    uploadBytes,
    getDownloadURL
} from './firebaseConfig.js';

// Helper Functions
function formatDate(timestamp) {
    if (!timestamp || !timestamp.toDate) {
        return 'Date not available';
    }
    
    try {
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Date format error';
    }
}
// ############### POSTING OF ANNOUNCEMENTS ##################

// Function to validate the announcement form data
const validateAnnouncementData = (title, content, date, expirationDate) => {
    if (!title.trim()) {
        throw new Error('Title is required');
    }
    if (!content.trim()) {
        throw new Error('Content is required');
    }
    if (!date) {
        throw new Error('Start date is required');
    }
    if (!expirationDate) {
        throw new Error('Expiration date is required');
    }
    
    // Convert dates to compare them
    const startDate = new Date(date);
    const endDate = new Date(expirationDate);
    
    if (endDate <= startDate) {
        throw new Error('Expiration date must be after the start date');
    }
};

// Function to handle image upload
const uploadImage = async (imageFile) => {
    if (!imageFile) return null;

    try {
        // Create a unique filename using timestamp and original file name
        const timestamp = new Date().getTime();
        const fileName = `${timestamp}_${imageFile.name}`;

        // Create a reference to 'Announcement Images' folder in Firebase Storage
        const imageRef = storageRef(storage, `Announcement Images/${fileName}`);

        // Upload the file
        const snapshot = await uploadBytes(imageRef, imageFile);
        console.log('Image uploaded successfully');

        // Get the download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;

    } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error('Failed to upload image');
    }
};


// First, let's ensure we only create the image preview element once
let announcementImagePreview;

const initializeImagePreview = () => {
    // Check if preview already exists
    const existingPreview = document.querySelector('.announcement-img-preview-container');
    if (existingPreview) {
        announcementImagePreview = existingPreview;
        return;
    }

    // Add CSS only once
    if (!document.getElementById('announcement-preview-styles')) {
        const style = document.createElement('style');
        style.id = 'announcement-preview-styles';
        style.textContent = `
            .announcement-img-preview-container {
                margin-top: 10px;
                width: 100%;
                height: 120px;
                display: flex;
                justify-content: center;
                align-items: center;
                border: 2px dashed #2196f3;
                background-color: #ffffff;
                color: #666;
                font-size: 12px;
            }

            .announcement-img-preview-container img {
                max-width: 100%;
                max-height: 116px;
                width: auto;
                height: auto;
                object-fit: contain;
            }

            .announcement-img-preview-container.preview-loading {
                position: relative;
            }

            .announcement-img-preview-container.preview-loading::after {
                content: 'Loading...';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }

            .announcement-img-preview-container:empty {
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .announcement-img-preview-container:empty::after {
                content: 'No image selected';
                color: #666;
                font-size: 12px;
            }

            
        `;
        document.head.appendChild(style);
    }

    // Create preview container
    announcementImagePreview = document.createElement('div');
    announcementImagePreview.className = 'announcement-img-preview-container';
    
    // Get the image input element
    const announcementImageInput = document.getElementById('announcement-image');
    if (announcementImageInput && announcementImageInput.parentNode) {
        announcementImageInput.parentNode.appendChild(announcementImagePreview);
    }
};

// Function to handle image preview
const handleImagePreview = (file) => {
    if (!announcementImagePreview) return;

    if (!file) {
        announcementImagePreview.innerHTML = '';
        return;
    }

    // Add loading state
    announcementImagePreview.classList.add('preview-loading');
    announcementImagePreview.innerHTML = '';
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
            if (announcementImagePreview) {
                announcementImagePreview.classList.remove('preview-loading');
                announcementImagePreview.innerHTML = '';
                announcementImagePreview.appendChild(img);
            }
        };
        
        img.onerror = () => {
            if (announcementImagePreview) {
                announcementImagePreview.classList.remove('preview-loading');
                announcementImagePreview.innerHTML = 'Error loading image';
            }
        };
        
        img.src = e.target.result;
    };
    
    reader.onerror = () => {
        if (announcementImagePreview) {
            announcementImagePreview.classList.remove('preview-loading');
            announcementImagePreview.innerHTML = 'Error reading file';
        }
    };
    
    reader.readAsDataURL(file);
};

// Modified clear form function
const clearForm = () => {
    document.getElementById('announcement-title').value = '';
    document.getElementById('announcement-content').value = '';
    document.getElementById('announcement-date').value = '';
    document.getElementById('announcement-exp-date').value = '';
    document.getElementById('announcement-image').value = '';
    
    // Clear preview safely
    if (announcementImagePreview) {
        announcementImagePreview.innerHTML = '';
    }
};

// Initialize everything in DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize image preview
    initializeImagePreview();
    
    // Set up image input listener
    const announcementImageInput = document.getElementById('announcement-image');
    if (announcementImageInput) {
        announcementImageInput.addEventListener('change', (e) => {
            handleImagePreview(e.target.files[0]);
        });
    }
    
    // Rest of your initialization code...
});

const checkAndArchiveExpiredAnnouncements = async () => {
    try {
        const announcementsRef = collection(db, 'Announcements');
        const archivedAnnouncementsRef = collection(db, 'archived_announcements');
        
        // Get current date at midnight for accurate comparison
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        // Query for expired announcements
        const q = query(
            announcementsRef,
            where('status', '==', 'active')
        );

        const querySnapshot = await getDocs(q);

        for (const document of querySnapshot.docs) {
            const announcement = document.data();
            const expirationDate = new Date(announcement.expirationDate);
            
            if (expirationDate <= currentDate) {
                try {
                    // Add to archived collection
                    await addDoc(archivedAnnouncementsRef, {
                        ...announcement,
                        archivedAt: serverTimestamp(),
                        originalId: document.id
                    });

                    // Delete from active announcements
                    await deleteDoc(doc(announcementsRef, document.id));

                    console.log(`Archived announcement: ${document.id}`);
                } catch (error) {
                    console.error(`Error archiving announcement ${document.id}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('Error checking for expired announcements:', error);
    }
};

setInterval(checkAndArchiveExpiredAnnouncements, 1000 * 60 * 60); // Check every hour

// Logging function for tracking user activities
async function logActivity(action, details = {}) {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.error("No user is currently logged in");
            return;
        }

        const logData = {
            userId: user.uid,
            email: user.email,
            action: action,
            details: details,
            role: 'Admin', // You might want to fetch this dynamically
            timestamp: serverTimestamp()
        };

        await addDoc(collection(db, 'activity_logs'), logData);
        console.log('Activity logged successfully:', action);
    } catch (error) {
        console.error("Error logging activity:", error);
    }
}

// Function to handle the announcement submission
const handleAnnouncementSubmission = async () => {
    try {
        // Get form values
        const title = document.getElementById('announcement-title').value;
        const content = document.getElementById('announcement-content').value;
        const date = document.getElementById('announcement-date').value;
        const expirationDate = document.getElementById('announcement-exp-date').value;
        const imageFile = document.getElementById('announcement-image').files[0];

        // Validate the form data
        validateAnnouncementData(title, content, date, expirationDate);

        // Upload image if one was selected
        let imageUrl = null;
        if (imageFile) {
            imageUrl = await uploadImage(imageFile);
        }

        // Create the announcement object
        const announcementData = {
            title: title.trim(),
            content: content.trim(),
            announcementDate: date,
            expirationDate: expirationDate,
            createdAt: serverTimestamp(),
            status: 'active',
            imageUrl: imageUrl
        };

        // Add the document to Firebase
        const announcementsRef = collection(db, 'Announcements');
        const docRef = await addDoc(announcementsRef, announcementData);

        // Log successful announcement creation only
        await logActivity('ANNOUNCEMENT_CREATED', {
            announcementId: docRef.id,
            title: title.trim(),
            announcementDate: date
        });
        
        console.log('Announcement added successfully with ID:', docRef.id);
        clearForm();
        alert('Announcement posted successfully!');

    } catch (error) {
        console.error('Error posting announcement:', error);
        alert(`Error posting announcement: ${error.message}`);
    }
};

// Add event listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add click event listener to the post button
    const postButton = document.querySelector('.post-button');
    postButton.addEventListener('click', handleAnnouncementSubmission);

    // Add click event listener to the clear button
    const clearButton = document.querySelector('.clear-button');
    clearButton.addEventListener('click', clearForm);

    // Add change event listener to image input for preview (optional)
    const imageInput = document.getElementById('announcement-image');
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // You could add image preview functionality here if desired
            console.log('Image selected:', file.name);
        }
    });
});



// ################# RECENT ANNOUNCEMENT LIST ###############

// Create announcement element helper function
// In admin_settings_announcements.js

// Update the createAnnouncementElement function to include the popup content structure
const createAnnouncementElement = (announcement, docId) => {
    const announcementDiv = document.createElement('div');
    announcementDiv.className = 'announcement-item';
    
    // Add the image preview if available
    const imagePreview = announcement.imageUrl ? 
        `<div class="announcement-image-preview">
            <img src="${announcement.imageUrl}" alt="Announcement image">
         </div>` : '';
    
    const statusClass = announcement.status === 'active' ? 'status-active' : 'status-inactive';
    const statusText = announcement.status === 'active' ? 'Active' : 'Inactive';
    
    announcementDiv.innerHTML = `
        <div class="announcement-header">
            <h4 class="announcement-title">${announcement.title}</h4>
            <span class="status-badge ${statusClass}">
                <i class="fas fa-circle"></i> ${statusText}
            </span>
        </div>
        ${imagePreview}
        <div class="announcement-meta">
            <span class="announcement-date">
                Posted: ${formatDate(announcement.createdAt)}
            </span>
            <span class="announcement-scheduled-date">
                Scheduled: ${announcement.announcementDate}
            </span>
            <span class="announcement-expiration-date">
                Expires: ${announcement.expirationDate}
            </span>
        </div>
        <div class="announcement-content-preview">
            ${announcement.content.substring(0, 150)}${announcement.content.length > 150 ? '...' : ''}
        </div>
        <div class="announcement-actions">
            <button class="edit-btn" data-id="${docId}">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="delete-btn" data-id="${docId}">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;

    // Add styles for the image preview
    const style = document.createElement('style');
    style.textContent = `
        .announcement-image-preview {
            width: 100%;
            max-height: 200px;
            overflow: hidden;
            margin: 10px 0;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 8px;
            background-color: #f5f5f5;
        }

        .announcement-image-preview img {
            max-width: 100%;
            max-height: 200px;
            object-fit: contain;
        }

        .announcement-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .announcement-title {
            margin: 0;
            font-size: 1.2em;
            font-weight: bold;
            color: #333;
        }

        .announcement-content-preview {
            margin-top: 10px;
            line-height: 1.5;
        }
    `;
    document.head.appendChild(style);

    // Add event listeners
    const deleteBtn = announcementDiv.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => handleDelete(docId));

    const editBtn = announcementDiv.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => handleEdit(docId));

    return announcementDiv;
};

// Update the displayAnnouncement function for the popup
const displayAnnouncement = (announcement) => {
    const popup = document.getElementById('announcementPopup');
    if (!popup) return;

    const popupContent = popup.querySelector('.popup-content');
    
    // Update popup structure to show title and image at the top
    popupContent.innerHTML = `
        <div class="popup-header">
            <h2 class="popup-title">${announcement.title}</h2>
            <button class="popup-close" onclick="closeAnnouncement()">&times;</button>
        </div>
        ${announcement.imageUrl ? `
            <div class="announcement-image-container">
                <img src="${announcement.imageUrl}" alt="Announcement image">
            </div>
        ` : ''}
        <div class="popup-body">
            <div class="announcement-content">
                <span class="announcement-priority-badge priority-high" id="priorityLevel">ATTENTION!!!</span>
                <div class="announcement-date">${new Date(announcement.announcementDate).toLocaleDateString()}</div>
                <p class="announcement-text">${announcement.content}</p>
            </div>
        </div>
        <div class="popup-footer">
            <label class="dont-show-again">
                <input type="checkbox" class="dont-show-checkbox">
                Don't show this again today
            </label>
        </div>
    `;

    // Add styles for the image container in popup
    const style = document.createElement('style');
    style.textContent = `
        .announcement-image-container {
            width: 100%;
            max-height: 300px;
            overflow: hidden;
            margin-bottom: 15px;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #f5f5f5;
            border-radius: 8px;
        }

        .announcement-image-container img {
            max-width: 100%;
            max-height: 300px;
            object-fit: contain;
        }

        .popup-title {
            margin: 0;
            padding: 10px 0;
            font-size: 1.5em;
            color: #333;
        }
    `;
    document.head.appendChild(style);

    popup.style.display = 'flex';
};

// Delete handler
const handleDelete = async (docId) => {
    if (!docId) {
        console.error('No document ID provided for deletion');
        return;
    }

    if (confirm('Are you sure you want to delete this announcement?')) {
        try {
            // Get references
            const announcementsRef = collection(db, 'Announcements');
            const archivedAnnouncementsRef = collection(db, 'archived_announcements');
            const announcementDocRef = doc(announcementsRef, docId);

            // Get the announcement data first
            const docSnap = await getDoc(announcementDocRef);
            
            if (!docSnap.exists()) {
                throw new Error('Announcement not found');
            }

            // Get the announcement data
            const announcementData = docSnap.data();

            // Create the archive document
            const archiveData = {
                ...announcementData,
                originalId: docId,
                archivedAt: serverTimestamp(),
                archiveReason: 'deleted',
                deletedAt: serverTimestamp()
            };

            try {
                // First, add to archived collection
                await addDoc(archivedAnnouncementsRef, archiveData);
                console.log('Announcement archived successfully');

                // Then delete from active announcements
                await deleteDoc(announcementDocRef);
                console.log('Announcement deleted successfully');

                // Refresh the announcements list
                await loadAnnouncements();
                
                alert('Announcement successfully archived and deleted');
            } catch (archiveError) {
                console.error('Error during archive/delete process:', archiveError);
                throw new Error('Failed to archive/delete announcement');
            }

        } catch (error) {
            console.error('Error processing announcement deletion:', error);
            alert(`Error deleting announcement: ${error.message}`);
        }
    }
};

// Edit handler (placeholder)
const handleEdit = async (docId) => {
    try {
         console.log('Edit announcement:', docId);
        // Log edit attempt
        await logActivity('ANNOUNCEMENT_EDIT_ATTEMPTED', {
            announcementId: docId
        });
        console.log('Edit attempt logged successfully.');

        // Get the current announcement data
        const announcementRef = doc(db, 'Announcements', docId);
        const announcementSnap = await getDoc(announcementRef);

        if (!announcementSnap.exists()) {
            console.error('Announcement not found:', docId);
            throw new Error('Announcement not found in Firestore.');
        }

        const announcementData = announcementSnap.data();
        console.log('Fetched announcement data:', announcementData);

        // Log the current state of the announcement for tracking
        await logActivity('ANNOUNCEMENT_EDIT_DATA_FETCHED', {
            announcementId: docId,
            title: announcementData?.title || 'Unknown',
            createdAt: announcementData?.createdAt,
            announcementDate: announcementData?.announcementDate,
            hadImage: !!announcementData?.imageUrl
        });
        console.log('Announcement data logged successfully.');

        // Example: Opening an edit form (replace this with your actual implementation)
        openEditForm({
            id: docId,
            ...announcementData
        });

        // Log that the edit form was opened
        await logActivity('ANNOUNCEMENT_EDIT_FORM_OPENED', {
            announcementId: docId
        });
        console.log('Edit form opened and logged.');

    } catch (error) {
        console.error('Error in handleEdit function:', error);

        // Log the failure of the edit process
        await logActivity('ANNOUNCEMENT_EDIT_FAILED', {
            announcementId: docId,
            error: error.message
        });

        alert('Error editing announcement. Please try again.');
    }
};

// Main function to load announcements
const loadAnnouncements = async (searchTerm = '') => {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const announcementsContainer = document.getElementById('announcementsContainer');
    const noAnnouncementsMessage = document.getElementById('noAnnouncementsMessage');

    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    if (announcementsContainer) announcementsContainer.innerHTML = '';
    if (noAnnouncementsMessage) noAnnouncementsMessage.style.display = 'none';

    try {
        const announcementsRef = collection(db, 'Announcements');
        const q = query(announcementsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        // Handle archiving and filtering
        const activeAnnouncements = [];
        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            const needsArchiving = await handleAnnouncementCleanup(data, doc.id);
            if (!needsArchiving) {
                activeAnnouncements.push(doc);
            }
        }

        // Filter by search term if provided
        let announcements = searchTerm ? 
            filterAnnouncements(activeAnnouncements, searchTerm) : 
            activeAnnouncements;

        if (loadingIndicator) loadingIndicator.style.display = 'none';

        if (announcements.length === 0) {
            if (noAnnouncementsMessage) {
                noAnnouncementsMessage.style.display = 'block';
                noAnnouncementsMessage.textContent = 'No announcements found.';
            }
            return;
        }

        announcements.forEach(doc => {
            if (announcementsContainer) {
                const announcementElement = createAnnouncementElement(doc.data(), doc.id);
                announcementsContainer.appendChild(announcementElement);
            }
        });

    } catch (error) {
        console.error('Error loading announcements:', error);
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (noAnnouncementsMessage) {
            noAnnouncementsMessage.style.display = 'block';
            noAnnouncementsMessage.textContent = 'Error loading announcements. Please try again.';
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Load announcements initially
    loadAnnouncements();

    // Set up search with debouncing
    const searchBox = document.querySelector('.search-box');
    let debounceTimeout;

    searchBox.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            loadAnnouncements(e.target.value);
        }, 300);
    });
});

// Add event listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add click event listener to the post button
    const postButton = document.querySelector('.post-button');
    postButton.addEventListener('click', handleAnnouncementSubmission);

    // Add click event listener to the clear button
    const clearButton = document.querySelector('.clear-button');
    clearButton.addEventListener('click', clearForm);
});

const isAnnouncementExpired = (expirationDate) => {
    const currentDate = new Date();
    const expDate = new Date(expirationDate);
    return expDate <= currentDate;
};

const shouldArchiveAnnouncement = (announcement) => {
    if (!announcement) return false;
    
    // Check expiration
    if (announcement.expirationDate) {
        const expirationDate = new Date(announcement.expirationDate);
        const currentDate = new Date();
        if (expirationDate <= currentDate) return true;
    }

    // Check status
    if (announcement.status === 'inactive') return true;

    return false;
};

// Function to archive an announcement
const archiveAnnouncement = async (announcement, docId, reason = 'expired') => {
    try {
        const archivedAnnouncementsRef = collection(db, 'archived_announcements');
        const announcementsRef = collection(db, 'Announcements');

        // Prepare archive data
        const archiveData = {
            ...announcement,
            originalId: docId,
            archivedAt: serverTimestamp(),
            archiveReason: reason
        };

        // Add to archived collection
        const archiveDoc = await addDoc(archivedAnnouncementsRef, archiveData);
        
        if (!archiveDoc) {
            throw new Error('Failed to create archive document');
        }

        // Delete from active announcements
        await deleteDoc(doc(announcementsRef, docId));

        console.log(`Announcement archived successfully: ${docId}`);
        return true;

    } catch (error) {
        console.error('Error archiving announcement:', error);
        throw error; // Rethrow to handle in calling function
    }
};

const showAnnouncementPopup = (announcement) => {
    const popup = document.getElementById('announcementPopup');
    if (popup) {
        displayAnnouncement(announcement);
        popup.style.display = 'flex';
    }
};

// Function to handle announcement cleanup
const handleAnnouncementCleanup = async (announcement, docId) => {
    if (!announcement || !docId) return false;

    try {
        if (shouldArchiveAnnouncement(announcement)) {
            const reason = isAnnouncementExpired(announcement.expirationDate) ? 'expired' : 'inactive';
            await archiveAnnouncement(announcement, docId, reason);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error during announcement cleanup:', error);
        return false;
    }
};

const fetchAndDisplayAnnouncement = async () => {
    try {
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }

        const announcementsRef = collection(db, 'Announcements');
        const q = query(
            announcementsRef,
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        let activeAnnouncementFound = false;

        for (const doc of querySnapshot.docs) {
            const announcementData = doc.data();
            
            if (!isAnnouncementExpired(announcementData.expirationDate) && 
                announcementData.status === 'active') {
                showAnnouncementPopup(announcementData);
                activeAnnouncementFound = true;
                break;
            } else {
                // Archive if expired
                await handleAnnouncementCleanup(announcementData, doc.id);
            }
        }

        if (!activeAnnouncementFound) {
            console.log('No active announcements found');
            const popup = document.getElementById('announcementPopup');
            if (popup) {
                popup.style.display = 'none';
            }
        }

    } catch (error) {
        console.error('Error fetching announcement:', error);
    } finally {
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
};

// Function to periodically check for expired announcements
const startExpirationCheck = () => {
    // Check every hour
    setInterval(() => {
        fetchAndDisplayAnnouncement();
    }, 1000 * 60 * 60); // 1 hour interval
};

// Modified close announcement function with optional archiving
window.closeAnnouncement = async (docId) => {
    const popup = document.getElementById('announcementPopup');
    if (popup) {
        popup.style.display = 'none';
    }
};

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayAnnouncement();
    startExpirationCheck(); // Start periodic checking
});

// Add event listener for storage changes (in case admin deletes an announcement)
window.addEventListener('storage', (e) => {
    if (e.key === 'announcementUpdated') {
        fetchAndDisplayAnnouncement();
    }
});

export {
    clearForm, 
    loadAnnouncements,
    handleAnnouncementSubmission,     
    checkAndArchiveExpiredAnnouncements,
    handleAnnouncementCleanup,
    fetchAndDisplayAnnouncement,
    archiveAnnouncement
};