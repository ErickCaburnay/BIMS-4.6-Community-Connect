// ############## ADMIN_SETTINGS_PORTFOLIO.JS ###################
import { 
    db,
    storage,
    collection,
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    doc,
    serverTimestamp,
    storageRef,
    uploadBytes,
    getDownloadURL,
    query,
    orderBy
} from './firebaseConfig.js';

// Global variables
let selectedImage = null;
const fileInput = document.querySelector('input[name="profileImage"]'); // Updated selector

// Modified handleImagePreview function
function handleImagePreview() {
    if (!fileInput) {
        console.error('File input element not found');
        return;
    }

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                fileInput.value = '';
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                fileInput.value = '';
                return;
            }

            try {
                // Resize the image
                const resizedImage = await resizeImage(file);
                selectedImage = resizedImage;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    updatePreviewWithImage(event.target.result);
                };
                reader.readAsDataURL(resizedImage);
            } catch (error) {
                console.error('Error processing image:', error);
                alert('Error processing image. Please try again.');
                fileInput.value = '';
                selectedImage = null;
            }
        }
    });
}

const MAX_IMAGE_WIDTH = 500; 
const MAX_IMAGE_HEIGHT = 500; 

function resizeImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Calculate new dimensions while maintaining aspect ratio
            if (width > height) {
                if (width > MAX_IMAGE_WIDTH) {
                    height = height * (MAX_IMAGE_WIDTH / width);
                    width = MAX_IMAGE_WIDTH;
                }
            } else {
                if (height > MAX_IMAGE_HEIGHT) {
                    width = width * (MAX_IMAGE_HEIGHT / height);
                    height = MAX_IMAGE_HEIGHT;
                }
            }
            
            // Set minimum dimensions while maintaining aspect ratio
            const aspectRatio = img.width / img.height;
            if (width < MAX_IMAGE_WIDTH) {
                width = MAX_IMAGE_WIDTH;
                height = width / aspectRatio;
            }
            if (height < MAX_IMAGE_HEIGHT) {
                height = MAX_IMAGE_HEIGHT;
                width = height * aspectRatio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            // Make background transparent
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                resolve(new File([blob], file.name, {
                    type: 'image/png', // Changed to PNG to support transparency
                    lastModified: Date.now()
                }));
            }, 'image/png', 1.0); // Changed to PNG format with full quality
        };
        
        img.onerror = reject;
    });
}

function updatePreviewWithImage(imageUrl) {
    const previewContent = document.getElementById('portfolioPreview');
    if (previewContent) {
        previewContent.innerHTML = `
            <div class="preview-header">
                <h2 class="preview-title">Portfolio Preview</h2>
            </div>
            <div class="preview-body">
                <img src="${imageUrl}" alt="Profile Preview" 
                    style="max-width: ${MAX_IMAGE_WIDTH}px; max-height: ${MAX_IMAGE_HEIGHT}px; 
                    object-fit: contain; border-radius: 8px; margin-bottom: 15px;">
                <h3>${document.querySelector('input[name="firstName"]').value || ''} ${document.querySelector('input[name="middleName"]').value || ''} ${document.querySelector('input[name="lastName"]').value || ''}</h3>
                <p class="slogan">${document.querySelector('input[name="slogan"]').value || ''}</p>
                <blockquote>${document.querySelector('textarea[name="quote"]').value || ''}</blockquote>
                <p class="description">${document.querySelector('textarea[name="description"]').value || ''}</p>
            </div>
        `;
    }
}


// Function to handle live preview updates for text inputs
function handleLivePreview() {
    const form = document.getElementById('portfolioForm');
    
    form.addEventListener('input', (e) => {
        if (e.target.type !== 'file') {
            updatePreview();
        }
    });
}

// Function to update preview content
function updatePreview() {
    const formData = {
        firstName: document.querySelector('input[name="firstName"]').value,
        middleName: document.querySelector('input[name="middleName"]').value,
        lastName: document.querySelector('input[name="lastName"]').value,
        fullName: `${document.querySelector('input[name="firstName"]').value} ${document.querySelector('input[name="middleName"]').value} ${document.querySelector('input[name="lastName"]').value}`,
        slogan: document.querySelector('input[name="slogan"]').value,
        quote: document.querySelector('textarea[name="quote"]').value,
        description: document.querySelector('textarea[name="description"]').value
    };

    const previewContent = document.getElementById('portfolioPreview');
    
    // Get current image if it exists
    const existingImage = previewContent.querySelector('img');
    const imageHtml = selectedImage 
        ? `<img src="${URL.createObjectURL(selectedImage)}" alt="Profile Preview" style="max-width: 200px; border-radius: 8px;">`
        : (existingImage ? existingImage.outerHTML : '');

    previewContent.innerHTML = `
        <div class="preview-header">
            <h2 class="preview-title">Portfolio Preview</h2>
        </div>
        <div class="preview-body">
            ${imageHtml}
            <h3>${formData.fullName || 'Full Name'}</h3>
            <p class="slogan">${formData.slogan || 'Slogan/Tagline'}</p>
            <blockquote>${formData.quote || 'Leadership Quote'}</blockquote>
            <p class="description">${formData.description || 'Description'}</p>
        </div>
    `;
}

function initializeButtons() {
    const saveButton = document.getElementById('btn-save');
    const submitButton = document.getElementById('btn-submit');
    const form = document.getElementById('portfolioForm');

    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            // Clear existing preview before updating
            const previewContent = document.getElementById('portfolioPreview');
            if (previewContent) {
                previewContent.innerHTML = '';
            }
            updatePreview();
            alert('Changes saved successfully!');
        });
    }

    if (submitButton) {
        submitButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const confirmed = await showConfirmationDialog(Object.fromEntries(formData));
            if (confirmed) {
                form.dispatchEvent(new Event('submit'));
            }
        });
    }
}

// Function to handle form submission
async function handleFormSubmit() {
    const form = document.getElementById('portfolioForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const submitBtn = document.getElementById('btn-submit');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
            }

            let uploadedImageUrl = '';
            if (selectedImage) {
                try {
                    const timestamp = new Date().getTime();
                    const fileName = `profile_${timestamp}_${selectedImage.name}`;
                    const imageStorageRef = storageRef(storage, `Portfolio Profile Image/${fileName}`);
                    const snapshot = await uploadBytes(imageStorageRef, selectedImage);
                    uploadedImageUrl = await getDownloadURL(snapshot.ref);
                } catch (error) {
                    console.error('Error uploading image:', error);
                    alert('Error uploading image. Please try again.');
                    return;
                }
            }

            const portfolioData = {
                firstName: form.querySelector('input[name="firstName"]').value.trim(),
                middleName: form.querySelector('input[name="middleName"]').value.trim(),
                lastName: form.querySelector('input[name="lastName"]').value.trim(),
                fullName: `${form.querySelector('input[name="firstName"]').value.trim()} ${form.querySelector('input[name="middleName"]').value.trim()} ${form.querySelector('input[name="lastName"]').value.trim()}`,
                slogan: form.querySelector('input[name="slogan"]').value.trim(),
                quote: form.querySelector('textarea[name="quote"]').value.trim(),
                description: form.querySelector('textarea[name="description"]').value.trim(),
                imageUrl: uploadedImageUrl,
                createdAt: serverTimestamp(),
                updatedBy: sessionStorage.getItem('adminName') || 'Unknown Admin'
            };

            try {
                const portfolioRef = collection(db, 'Portfolio');
                await addDoc(portfolioRef, portfolioData);
                clearForm();
                alert('Portfolio submitted successfully!');
                
            } catch (error) {
                console.error('Error saving to database:', error);
                alert('Error saving data. Please try again.');
            }

        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        } finally {
            const submitBtn = document.getElementById('btn-submit');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit';
            }
        }
    });
}

function showConfirmationDialog(formData) {
    return new Promise((resolve) => {
        const confirmMessage = `Please confirm the following details:
        
        Full Name: ${formData.firstName} ${formData.middleName} ${formData.lastName}
        Slogan: ${formData.slogan || 'None'}
        Quote: ${formData.quote || 'None'}
        Image: ${selectedImage ? 'Yes' : 'No'}

        Do you want to submit this portfolio?`;

        if (confirm(confirmMessage)) {
            resolve(true);
        } else {
            resolve(false);
        }
    });
}

// Function to handle form clearing
function clearForm() {
    const form = document.getElementById('portfolioForm');
    
    // Reset the form
    form.reset();
    
    // Clear the image selection
    selectedImage = null;
    if (fileInput) {
        fileInput.value = '';
    }

    // Clear any image preview
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) {
        imagePreview.style.backgroundImage = '';
        imagePreview.innerHTML = '<span>Image Preview</span>';
    }
    
    // Reset the preview section
    const previewContent = document.getElementById('portfolioPreview');
    if (previewContent) {
        previewContent.innerHTML = `
            <div class="preview-placeholder">
                <p>Portfolio preview will appear here...</p>
            </div>
        `;
    }
}

function handleFormClear() {
    const clearButton = document.querySelector('.btn-clear');
    
    clearButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all fields?')) {
            clearForm();
        }
    });
}

async function loadExistingPortfolio() {
    try {
        const portfolioRef = collection(db, 'Portfolio');
        const querySnapshot = await getDocs(portfolioRef);
        
        if (!querySnapshot.empty) {
            const data = querySnapshot.docs[0].data();
            
            // Populate form fields
            const fields = ['firstName', 'middleName', 'lastName', 'slogan', 'quote', 'description'];
            fields.forEach(field => {
                const element = document.querySelector(`[name="${field}"]`);
                if (element) element.value = data[field] || '';
            });
            
            // Update preview with existing data including image
            if (data.imageUrl) {
                updatePreviewWithImage(data.imageUrl);
            }
            
            return data;
        }
        return null;
    } catch (error) {
        console.error('Error loading portfolio:', error);
        alert('Error loading existing portfolio data');
        return null;
    }
}




// Initialize all functionality
document.addEventListener('DOMContentLoaded', () => {
    handleImagePreview();
    handleLivePreview();
    initializeButtons();
    handleFormSubmit();
    handleFormClear();
    showConfirmationDialog();
    loadExistingPortfolio();
});