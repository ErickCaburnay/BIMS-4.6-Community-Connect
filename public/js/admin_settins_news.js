// ############## ADMIN_SETTINGS_NEWS.JS ###################
import { 
    db,
    storage,
    collection,
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc, 
    doc,
    serverTimestamp,
    Timestamp, 
    storageRef,
    uploadBytes,
    getDownloadURL,
    query,
    orderBy
} from './firebaseConfig.js';

import { auth } from './firebaseConfig.js';


// Get DOM elements
const newsModal = document.getElementById('newsModal');
const newsForm = document.querySelector('.modal-form');
const closeBtn = document.getElementById('closeAddModal');
const addNewsBtn = document.getElementById('addNewsBtn');

// Add click event listener to the Add News button
addNewsBtn.addEventListener('click', openNewsModal);
closeBtn.addEventListener('click', closeNewsModal);

// Function to open the news modal
function openNewsModal() {
    newsModal.style.display = 'block';
    // Only reset the form if we're not editing
    if (!currentEditId) {
        newsForm.reset();
    }
}

// Modify closeNewsModal function
function closeNewsModal() {
    newsModal.style.display = 'none';
    currentEditId = null;
    newsForm.reset();
    
    // Remove any existing image preview
    const imagePreview = document.querySelector('.current-image-preview');
    if (imagePreview) {
        imagePreview.remove();
    }

    updateModalTitle(false);
}


// Close modal when clicking outside of it
window.addEventListener('click', (event) => {
    if (event.target === newsModal) {
        closeNewsModal();
    }
});

// Function to refresh news list
async function refreshNewsList() {
    try {
        const newsQuery = query(collection(db, 'News_Updates'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(newsQuery);
        
        const newsContainer = document.getElementById('newsContainer');
        if (newsContainer) {
            newsContainer.innerHTML = '';
            
            querySnapshot.forEach((doc) => {
                const newsData = {
                    id: doc.id,  // Include the document ID
                    ...doc.data()
                };
                const newsElement = createNewsElement(newsData);
                newsContainer.appendChild(newsElement);
            });
        }
    } catch (error) {
        console.error('Error refreshing news list:', error);
    }
}

function createNewsElement(newsData) {
    const div = document.createElement('div');
    div.className = 'news-item';
    
    // Get category class
    const categoryClass = `category-${newsData.category.toLowerCase()}`;
    
    const formattedDate = new Date(newsData.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    div.innerHTML = `
        <div class="news-item-image">
            ${newsData.imageUrl 
                ? `<img src="${newsData.imageUrl}" alt="${newsData.title}">` 
                : '<img src="/public/resources/placeholder.jpg" alt="News placeholder">'
            }
        </div>
        <div class="news-item-content">
            <div class="news-item-header">
                <h4 class="news-item-title">${newsData.title}</h4>
                <span class="news-item-category ${categoryClass}">${newsData.category}</span>
            </div>
            <p class="news-item-date">${formattedDate}</p>
            <p class="news-item-description">${truncateText(newsData.description, 150)}</p>
            <div class="news-item-actions">
                <button class="action-button edit-btn" onclick="handleEdit('${newsData.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-button delete-btn" onclick="handleDelete('${newsData.id}')">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </div>
        </div>
    `;

    return div;
}

// Add this helper function if not already present
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

// Handle form submission
newsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        // Check if user is authenticated
        if (!auth.currentUser) {
            console.error("User not authenticated");
            alert('You must be logged in to perform this action');
            return;
        }

        const title = document.getElementById('news-title').value;
        const category = document.getElementById('news-category').value;
        const date = document.getElementById('news-date').value;
        const description = document.getElementById('news-description').value;
        const imageFile = document.getElementById('news-image').files[0];

        let imageUrl = null;
        let newsRef;
        let newsId = currentEditId;

        if (currentEditId) {
            newsRef = doc(db, 'News_Updates', currentEditId);
            const currentDoc = await getDoc(newsRef);
            
            if (currentDoc.exists()) {
                imageUrl = currentDoc.data().imageUrl;
            }
        }

        if (imageFile) {
            const fileName = `${Date.now()}_${imageFile.name}`;
            const imageRef = storageRef(storage, `news_images/${fileName}`);
            const uploadResult = await uploadBytes(imageRef, imageFile);
            imageUrl = await getDownloadURL(uploadResult.ref);
        }

        const newsData = {
            title,
            category,
            date,
            description,
            imageUrl,
            updatedAt: serverTimestamp()
        };

        // Handle update or create new document
        if (currentEditId) {
            await updateDoc(doc(db, 'News_Updates', currentEditId), newsData);
        } else {
            newsData.createdAt = serverTimestamp();
            const docRef = await addDoc(collection(db, 'News_Updates'), newsData);
            newsId = docRef.id; // Get the new document ID
        }

        // Create activity log entry
        const logEntry = {
            userId: auth.currentUser.uid,
            email: auth.currentUser.email,
            action: `${auth.currentUser.email} has ${currentEditId ? 'updated' : 'added'} a news article`,
            role: 'Admin', // Adjust based on your user role logic
            details: {
                newsId: newsId,
                newsTitle: title,
                category: category,
                modifiedBy: auth.currentUser.email,
                modificationType: currentEditId ? 'update' : 'create'
            },
            timestamp: Timestamp.fromDate(new Date())
        };

        // Add log entry to activity_logs collection
        await addDoc(collection(db, 'activity_logs'), logEntry);

        console.log(`News ${currentEditId ? 'updated' : 'added'} and activity logged successfully!`);
        alert(currentEditId ? 'News updated successfully!' : 'News added successfully!');
        closeNewsModal();
        await refreshNewsList();
    } catch (error) {
        console.error('Error saving news:', error);
        alert('Failed to save news. Please try again.');
    }
});



// Validation code remains the same...
document.getElementById('news-title').addEventListener('input', function() {
    if (this.value.length > 100) {
        this.value = this.value.slice(0, 100);
        alert('Title cannot be longer than 100 characters');
    }
});

document.getElementById('news-description').addEventListener('input', function() {
    if (this.value.length > 1000) {
        this.value = this.value.slice(0, 1000);
        alert('Description cannot be longer than 1000 characters');
    }
});

// Validate image size and type
document.getElementById('news-image').addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size should not exceed 5MB');
            this.value = '';
            return;
        }

        // Check file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload only JPEG, PNG, or GIF images');
            this.value = '';
            return;
        }
    }
});

// Initial load of news list
refreshNewsList();
//  #################### UPDATE EXISTING NEWS AND UPDATES ###############

let currentEditId = null;

// Update modal title based on mode
function updateModalTitle(isEditing) {
    const modalTitle = document.querySelector('.modal-content h3');
    if (modalTitle) {
        modalTitle.textContent = isEditing ? 'Edit News' : 'Add News';
    }
}

// Function to open modal for editing
async function openEditModal(newsId) {
    try {
        if (!auth.currentUser) {
            console.error("User not authenticated");
            alert('You must be logged in to perform this action');
            return;
        }

        currentEditId = newsId;
        const newsRef = doc(db, 'News_Updates', newsId);
        const newsDoc = await getDoc(newsRef);
        
        if (!newsDoc.exists()) {
            alert('News not found');
            return;
        }

        const newsData = newsDoc.data();

        // Log the edit modal access
        const logEntry = {
            userId: auth.currentUser.uid,
            email: auth.currentUser.email,
            action: `${auth.currentUser.email} accessed news edit modal`,
            role: 'Admin',
            details: {
                newsId: newsId,
                newsTitle: newsData.title,
                category: newsData.category,
                accessedBy: auth.currentUser.email
            },
            timestamp: Timestamp.fromDate(new Date())
        };

        await addDoc(collection(db, 'activity_logs'), logEntry);

        document.getElementById('news-title').value = newsData.title || '';
        document.getElementById('news-category').value = newsData.category || '';
        document.getElementById('news-date').value = newsData.date.split('T')[0];
        document.getElementById('news-description').value = newsData.description || '';
        
        if (newsData.imageUrl) {
            const imagePreview = document.createElement('div');
            imagePreview.className = 'current-image-preview';
            imagePreview.innerHTML = `
                <div class="image-container">
                    <img src="${newsData.imageUrl}" alt="Current image">
                </div>
                <p>Current image will be kept if no new image is selected</p>
            `;
            const imageInput = document.getElementById('news-image');
            imageInput.parentNode.insertBefore(imagePreview, imageInput);
        }
        
        updateModalTitle(true);
        openNewsModal();
    } catch (error) {
        console.error('Error opening edit modal:', error);
        alert('Error opening edit form. Please try again.');
    }
};


window.handleEdit = async function(newsId) {
    try {
        if (!auth.currentUser) {
            console.error("User not authenticated");
            alert('You must be logged in to perform this action');
            return;
        }

        currentEditId = newsId;
        const newsRef = doc(db, 'News_Updates', newsId);
        const newsDoc = await getDoc(newsRef);
        
        if (!newsDoc.exists()) {
            alert('News not found');
            return;
        }

        const newsData = newsDoc.data();

        // Log the view/edit attempt
        const logEntry = {
            userId: auth.currentUser.uid,
            email: auth.currentUser.email,
            action: `${auth.currentUser.email} opened news article for editing`,
            role: 'Admin',
            details: {
                newsId: newsId,
                newsTitle: newsData.title,
                category: newsData.category,
                accessedBy: auth.currentUser.email
            },
            timestamp: Timestamp.fromDate(new Date())
        };

        await addDoc(collection(db, 'activity_logs'), logEntry);

        updateModalTitle(true);
        openNewsModal();
        
        setTimeout(() => {
            document.getElementById('news-title').value = newsData.title || '';
            document.getElementById('news-category').value = newsData.category || '';
            document.getElementById('news-date').value = newsData.date || '';
            document.getElementById('news-description').value = newsData.description || '';
            
            if (newsData.imageUrl) {
                const existingPreview = document.querySelector('.current-image-preview');
                if (existingPreview) existingPreview.remove();
                
                const imagePreview = document.createElement('div');
                imagePreview.className = 'current-image-preview';
                imagePreview.innerHTML = `
                    <div class="image-container">
                        <img src="${newsData.imageUrl}" alt="Current image">
                    </div>
                    <p>Current image will be kept if no new image is selected</p>
                `;
                
                const imageInput = document.getElementById('news-image');
                if (imageInput && imageInput.parentNode) {
                    imageInput.parentNode.insertBefore(imagePreview, imageInput);
                }
            }
        }, 100);
    } catch (error) {
        console.error('Error handling edit:', error);
        alert('Error opening edit form. Please try again.');
    }
};

window.handleDelete = async function(newsId) {
    if (!confirm('Are you sure you want to delete this news item?')) {
        return;
    }

    try {
        // Get news data first
        const newsRef = doc(db, 'News_Updates', newsId);
        const newsSnap = await getDoc(newsRef);
        const newsData = newsSnap.data();

        // Delete the news
        await deleteDoc(newsRef);

        // Log the activity
        const logEntry = {
            userId: auth.currentUser.uid,
            email: auth.currentUser.email,
            action: `${auth.currentUser.email} has deleted a news article`,
            role: 'Admin',
            details: {
                newsId: newsId,
                newsTitle: newsData?.title || 'Unknown',
                deletedBy: auth.currentUser.email
            },
            timestamp: Timestamp.fromDate(new Date())
        };
        
        await addDoc(collection(db, 'activity_logs'), logEntry);
        
        // Refresh the list
        await refreshNewsList();
        alert('News deleted successfully!');
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to delete news. Please try again.');
    }
};

window.openEditModal = openEditModal;
