// ###################################  ADMIN_SETTINGS_TURNOVER.JS ###################################

import {
    db,
    auth,
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    Timestamp,
    deleteDoc,
    where,
    query,
    getDocs
} from './firebaseConfig.js';


function clearFormInputs(formId) {
    const form = document.getElementById(formId);
    const inputs = form.querySelectorAll('input, select');
    
    inputs.forEach(input => {
        if (input.type === 'select-one') {
            input.selectedIndex = 0;
        } else {
            input.value = '';
        }
    });
}

// Event listeners for clear buttons
document.getElementById('outClearBtn').addEventListener('click', () => {
    clearFormInputs('outgoingAdmin');
});

document.getElementById('inClearBtn').addEventListener('click', () => {
    clearFormInputs('incomingAdmin');
});

document.addEventListener('DOMContentLoaded', () => {
    // Initialize phone validations after DOM is loaded
    incomingPhoneValidation = setupPhoneValidation('inPhone');
    outgoingPhoneValidation = setupPhoneValidation('phone'); // matches your new HTML ID

    if (auth.currentUser) {
        loadDraft();
    }
});

// Get references to form elements
const outgoingForm = document.getElementById('outgoingAdmin');
const incomingForm = document.getElementById('incomingAdmin');
const saveDraftBtn = document.querySelector('.action-buttons .action-btn:first-child');
const completeTurnoverBtn = document.getElementById('completeTurnoverBtn');
// const incomingPhoneValidation = setupPhoneValidation('inPhone');
// const outgoingPhoneValidation = setupPhoneValidation('phone');

// Function to get all form input values
const getFormData = async () => {
    // Get the current admin's document
    const adminQuery = query(
        collection(db, 'Admin_Accounts'),
        where('userId', '==', auth.currentUser?.uid)
    );
    
    let adminId = null;
    try {
        const adminSnapshot = await getDocs(adminQuery);
        if (!adminSnapshot.empty) {
            adminId = adminSnapshot.docs[0].id;
        }
    } catch (error) {
        console.error('Error getting admin document:', error);
    }

    return {
        outgoing: {
            lastName: document.getElementById('lastName').value,
            firstName: document.getElementById('firstName').value,
            middleName: document.getElementById('middleName').value,
            position: document.getElementById('position').value,
            role: document.getElementById('role').value,
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            contactNumber: document.getElementById('phone').value
        },
        incoming: {
            lastName: document.getElementById('inLname').value,
            firstName: document.getElementById('inFname').value,
            middleName: document.getElementById('inMname').value,
            position: document.getElementById('positionIncoming').value,
            role: document.getElementById('roleIncoming').value,
            username: document.getElementById('inUsername').value,
            email: document.getElementById('inEmail').value,
            contactNumber: document.getElementById('inPhone').value
        },
        lastUpdated: Timestamp.now(),
        userId: auth.currentUser?.uid,
        adminId: adminId
    };
};

// Function to populate form with data
const populateForm = (data) => {
    if (!data) return;

    // Populate outgoing admin form with matching IDs
    document.getElementById('lastName').value = data.outgoing.lastName || '';
    document.getElementById('firstName').value = data.outgoing.firstName || '';
    document.getElementById('middleName').value = data.outgoing.middleName || '';
    document.getElementById('position').value = data.outgoing.position || '';
    document.getElementById('role').value = data.outgoing.role || '';
    document.getElementById('username').value = data.outgoing.username || '';
    document.getElementById('email').value = data.outgoing.email || '';
    document.getElementById('phone').value = data.outgoing.contactNumber || '';

    // Incoming form remains the same...
    document.getElementById('inLname').value = data.incoming.lastName || '';
    document.getElementById('inFname').value = data.incoming.firstName || '';
    document.getElementById('inMname').value = data.incoming.middleName || '';
    document.getElementById('positionIncoming').value = data.incoming.position || '';
    document.getElementById('roleIncoming').value = data.incoming.role || '';
    document.getElementById('inUsername').value = data.incoming.username || '';
    document.getElementById('inEmail').value = data.incoming.email || '';
    document.getElementById('inPhone').value = data.incoming.contactNumber || '';
};

const saveDraft = async () => {
    try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            console.error('User not authenticated');
            return;
        }

        // Validate phone numbers before saving
        const inPhoneValid = incomingPhoneValidation.isValid();
        const outPhoneValid = outgoingPhoneValidation.isValid();
        
        if (!inPhoneValid || !outPhoneValid) {
            let errorMessage = 'Please correct the following:\n';
            if (!inPhoneValid) errorMessage += '- Incoming admin phone number must be in format: +63 followed by 10 digits\n';
            if (!outPhoneValid) errorMessage += '- Outgoing admin phone number must be in format: +63 followed by 10 digits\n';
            alert(errorMessage);
            return;
        }

        const draftData = await getFormData();
        const draftRef = doc(collection(db, 'Turnover_Draft'), userId);
        
        await setDoc(draftRef, draftData, { merge: true });
        alert('Draft saved successfully!');
    } catch (error) {
        console.error('Error saving draft:', error);
        alert('Error saving draft. Please try again.');
    }
};

// Function to load draft
const loadDraft = async () => {
    try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            console.error('User not authenticated');
            return;
        }

        // First try to load any existing draft
        const draftRef = doc(db, 'Turnover_Draft', userId);
        const draftSnap = await getDoc(draftRef);

        if (draftSnap.exists()) {
            const draftData = draftSnap.data();
            populateForm(draftData);
        } else {
            // If no draft exists, load the current admin's data
            await loadAdminData(userId);
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
};

const loadAdminData = async (userId) => {
    try {
        console.log('Loading admin data for userId:', userId);
        const adminQuery = query(
            collection(db, 'Admin_Accounts'),
            where('uid', '==', userId)
        );
        
        const adminSnapshot = await getDocs(adminQuery);
        
        if (!adminSnapshot.empty) {
            const adminData = adminSnapshot.docs[0].data();
            console.log('Found admin data:', adminData);
            
            // IDs now match your HTML form
            document.getElementById('lastName').value = adminData.lastName || '';
            document.getElementById('firstName').value = adminData.firstName || '';
            document.getElementById('middleName').value = ''; // Middle name might not exist
            document.getElementById('position').value = adminData.position || '';
            document.getElementById('role').value = adminData.role || '';
            document.getElementById('username').value = adminData.username || '';
            document.getElementById('email').value = adminData.email || '';
            
            // Format phone number
            let formattedPhone = adminData.phone || '';
            if (formattedPhone && !formattedPhone.startsWith('+63')) {
                formattedPhone = formattedPhone.replace(/^0+/, '');
                formattedPhone = '+63' + formattedPhone;
            }
            document.getElementById('phone').value = formattedPhone;

            // Trigger validation for phone number
            const phoneInput = document.getElementById('phone');
            if (phoneInput) {
                phoneInput.dispatchEvent(new Event('input'));
            }
        } else {
            console.log('No admin data found for userId:', userId);
        }
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
};



// Load draft when page loads and when auth state changes
auth.onAuthStateChanged((user) => {
    if (user) {
        loadDraft();
    }
});

// Also load draft when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (auth.currentUser) {
        loadDraft();
    }
});

// Clear form buttons functionality
document.getElementById('outClearBtn').addEventListener('click', () => {
    outgoingForm.reset();
});

document.getElementById('inClearBtn').addEventListener('click', () => {
    incomingForm.reset();
});



const completeTurnover = async () => {
    console.log('Complete turnover clicked');
    try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            console.error('User not authenticated');
            return;
        }

        // Validate phone numbers before proceeding
        const inPhoneValid = incomingPhoneValidation.isValid();
        const outPhoneValid = outgoingPhoneValidation.isValid();
        
        if (!inPhoneValid || !outPhoneValid) {
            let errorMessage = 'Please correct the following:\n';
            if (!inPhoneValid) errorMessage += '- Incoming admin phone number must be in format: +63 followed by 10 digits\n';
            if (!outPhoneValid) errorMessage += '- Outgoing admin phone number must be in format: +63 followed by 10 digits\n';
            alert(errorMessage);
            return;
        }

        // Validate required fields
        const requiredFields = {
            outgoing: ['lastName', 'firstName', 'position', 'role', 'username', 'email'],
            incoming: ['inLname', 'inFname', 'positionIncoming', 'roleIncoming', 'inUsername', 'inEmail']
        };

        let missingFields = [];
        
        Object.entries(requiredFields).forEach(([type, fields]) => {
            fields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (!field.value.trim()) {
                    missingFields.push(`${type.charAt(0).toUpperCase() + type.slice(1)} Admin: ${field.previousElementSibling.textContent.replace('*', '').trim()}`);
                }
            });
        });

        if (missingFields.length > 0) {
            alert('Please fill in all required fields:\n' + missingFields.join('\n'));
            return;
        }

        showPasswordModal();
        console.log('Modal should be visible now');
    } catch (error) {
        console.error('Error in turnover process:', error);
        alert('Error processing turnover. Please try again.');
    }
};


document.removeEventListener('click', saveDraft);
document.removeEventListener('click', completeTurnover);


saveDraftBtn.addEventListener('click', saveDraft);
completeTurnoverBtn.addEventListener('click', completeTurnover);


// #################### PASSWORD #######################

const passwordModal = document.getElementById('passwordModal');
const closeModal = document.querySelector('.close-modal');
const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
const confirmPasswordBtn = document.getElementById('confirmPasswordBtn');
const passwordInput = document.getElementById('confirmPassword');
const passwordError = document.getElementById('passwordError');

document.getElementById("passwordToggle").addEventListener("click", function () {
    const passwordInput = document.getElementById("confirmPassword");
    const eyeIcon = document.getElementById("eyes");
    const eyeSlashIcon = document.getElementById("eyes-slash");

    // Toggle password visibility
    if (passwordInput.type === "password") {
        passwordInput.type = "text"; 
        eyeIcon.style.display = "none"; 
        eyeSlashIcon.style.display = "inline";
    } else {
        passwordInput.type = "password"; 
        eyeIcon.style.display = "inline"; 
        eyeSlashIcon.style.display = "none";
    }
});



confirmPasswordBtn.addEventListener('click', async function() {
    console.log('Confirm button clicked');
    try {
        // Revalidate phone numbers before final submission
        const inPhoneValid = incomingPhoneValidation.isValid();
        const outPhoneValid = outgoingPhoneValidation.isValid();
        
        if (!inPhoneValid || !outPhoneValid) {
            passwordError.textContent = 'Please correct the phone numbers before submitting.';
            return;
        }

        const user = auth.currentUser;
        console.log('Current user:', user);
        
        if (!user) {
            passwordError.textContent = 'No authenticated user found.';
            return;
        }

        const adminQuery = query(
            collection(db, 'Admin_Accounts'),
            where('email', '==', user.email)
        );
        
        console.log('Checking password for email:', user.email);
        
        const adminSnapshot = await getDocs(adminQuery);
        if (!adminSnapshot.empty) {
            const adminDoc = adminSnapshot.docs[0].data();
            console.log('Admin doc found:', adminDoc);
            
            if (passwordInput.value === adminDoc.password) {
                console.log('Password matched');
                const turnoverData = await getFormData();
                const finalTurnoverData = {
                    ...turnoverData,
                    status: 'pending',
                    submissionTime: Timestamp.now(),
                    turnoverDate: Timestamp.now()
                };

                const turnoverRef = doc(collection(db, 'Turnover'));
                await setDoc(turnoverRef, finalTurnoverData);

                const draftRef = doc(db, 'Turnover_Draft', user.uid);
                await deleteDoc(draftRef);

                hidePasswordModal();
                alert('Turnover completed successfully!');
                clearFormInputs('outgoingAdmin');
                clearFormInputs('incomingAdmin');
            } else {
                console.log('Password did not match');
                passwordError.textContent = 'Incorrect password. Please try again.';
                passwordInput.value = '';
                passwordInput.focus();
            }
        } else {
            console.log('No admin document found');
            passwordError.textContent = 'Admin account not found.';
        }
    } catch (error) {
        console.error('Error verifying password:', error);
        passwordError.textContent = 'An error occurred. Please try again.';
    }
});



// Function to show modal
function showPasswordModal() {
    passwordModal.style.display = 'block';
    passwordInput.value = ''; // Clear any previous input
    passwordError.textContent = ''; // Clear any previous errors
    passwordInput.focus();
}

// Function to hide modal
function hidePasswordModal() {
    passwordModal.style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === passwordModal) {
        hidePasswordModal();
    }
});

// Close modal with close button
closeModal.addEventListener('click', hidePasswordModal);
cancelPasswordBtn.addEventListener('click', hidePasswordModal);

// Handle Enter key in password input
passwordInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        confirmPasswordBtn.click();
    }
});

// ####################### PHONE # VALIDATION #########################

function validatePhoneNumber(phone) {
    const phoneRegex = /^\+63\d{10}$/;
    return phoneRegex.test(phone);
}

function setupPhoneValidation(inputId) {
    const phoneInput = document.getElementById(inputId);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.color = 'red';
    errorDiv.style.fontSize = '12px';
    phoneInput.parentNode.appendChild(errorDiv);

    // Prevent typing invalid characters
    phoneInput.addEventListener('keypress', (e) => {
        const allowedChars = /[0-9+]/;
        if (!allowedChars.test(e.key)) {
            e.preventDefault();
        }
    });

    // Handle paste events
    phoneInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const cleanedText = pastedText.replace(/[^\d+]/g, '');
        
        if (phoneInput.value.includes('+63')) {
            phoneInput.value += cleanedText;
        } else {
            phoneInput.value = cleanedText;
        }
    });

    // Add +63 prefix if not present when focusing
    phoneInput.addEventListener('focus', () => {
        if (!phoneInput.value.startsWith('+63')) {
            phoneInput.value = '+63' + phoneInput.value.replace(/^\+63/, '');
        }
    });

    // Validate on input
    phoneInput.addEventListener('input', () => {
        const isValid = validatePhoneNumber(phoneInput.value);
        errorDiv.textContent = isValid ? '' : 'Phone number must start with +63 followed by 10 digits';
        phoneInput.setAttribute('data-valid', isValid);
    });

    // Clean up on blur
    phoneInput.addEventListener('blur', () => {
        if (phoneInput.value === '+63') {
            phoneInput.value = '';
        }
    });

    return {
        isValid: () => validatePhoneNumber(phoneInput.value)
    };
}



// ##################################################