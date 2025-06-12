// ####################### LANDINGPAGE_ANNOUNCEMENT.JS ###########################

import {
    db,
    storage,
    collection,
    getDocs,
    query,
    orderBy,
    getDownloadURL,
    storageRef
} from './firebaseConfig.js';

// Function to format the date
const formatDate = (dateString) => {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

// Function to format the content with proper line breaks
const formatContent = (content) => {
    return content.replace(/\n/g, '<br>');
};



// Function to create image container and handle image display
const createImageContainer = (imageUrl) => {
    const container = document.createElement('div');
    container.className = 'image-container';

    const img = document.createElement('img');
    img.className = 'announcement-image loading';
    img.alt = 'Announcement image';
    img.src = imageUrl;
    
    img.onload = () => {
        img.classList.remove('loading');
        if (img.naturalWidth > container.clientWidth || 
            img.naturalHeight > container.clientHeight) {
            container.classList.add('zoomable');
        }
    };
    
    img.onerror = () => {
        container.style.display = 'none';
    };
    
    container.appendChild(img);
    return container;
};


// Function to display the announcement image
const displayAnnouncementImage = async (imageUrl) => {
    const contentContainer = document.querySelector('.announcement-content');
    const existingImage = contentContainer.querySelector('.image-container');
    
    if (existingImage) {
        existingImage.remove();
    }
    
    if (imageUrl) {
        try {
            const imageContainer = createImageContainer(imageUrl);
            // Insert the image container at the beginning of the content
            contentContainer.insertBefore(imageContainer, contentContainer.firstChild);
        } catch (error) {
            console.error('Error displaying image:', error);
        }
    }
};

// Update the displayAnnouncement function
const displayAnnouncement = async (announcement) => {
    const popupTitle = document.querySelector('.popup-title');
    const announcementDate = document.querySelector('.announcement-date');
    const announcementText = document.querySelector('.announcement-text');
    const priorityLevel = document.getElementById('priorityLevel');
    
    try {
        // Handle image first (it will be inserted at the top)
        if (announcement.imageUrl) {
            await displayAnnouncementImage(announcement.imageUrl);
        }

        // Update the rest of the content
        popupTitle.textContent = `📢 ${announcement.title}`;
        announcementDate.textContent = `Posted on ${formatDate(announcement.announcementDate)}`;
        announcementText.innerHTML = formatContent(announcement.content);

        // Handle priority level
        if (priorityLevel) {
            priorityLevel.style.display = 'block';
        }

    } catch (error) {
        console.error('Error displaying announcement:', error);
    }
};

// Function to show the popup
const showAnnouncementPopup = () => {
    const popup = document.getElementById('announcementPopup');
    if (popup) {
        popup.style.display = 'block';
    }
};

// Function to fetch and display the most recent active announcement
const fetchAndDisplayAnnouncement = async () => {
    try {
        // Show loading state if you have one
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) loadingIndicator.style.display = 'block';

        // Create a query to get all active announcements, ordered by date
        const announcementsRef = collection(db, 'Announcements');
        const q = query(
            announcementsRef,
            orderBy('createdAt', 'desc') // Get the most recent first
        );

        const querySnapshot = await getDocs(q);
        
        // Find the first active announcement
        const activeAnnouncement = querySnapshot.docs
            .find(doc => doc.data().status === 'active');

        if (activeAnnouncement) {
            const announcementData = activeAnnouncement.data();
            await displayAnnouncement(announcementData);
            showAnnouncementPopup();
        } else {
            console.log('No active announcements found');
        }

    } catch (error) {
        console.error('Error fetching announcement:', error);
    } finally {
        // Hide loading indicator if you have one
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
};

// Function to close the announcement popup
window.closeAnnouncement = () => {
    const popup = document.getElementById('announcementPopup');
    if (popup) {
        popup.style.display = 'none';
    }
};

// Add event listener to fetch announcements when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayAnnouncement();
});

export { fetchAndDisplayAnnouncement };