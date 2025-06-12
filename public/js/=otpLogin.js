// ################### OTPLOGIN.JS ####################

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
    getAuth, signInWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber,
    PhoneAuthProvider, signInWithCredential, sendEmailVerification
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-functions.js";

const firebaseConfig = {
    apiKey: "AIzaSyBDp03_t7kWck8XTT9iqv3SIX8UqFp_C6w",
    authDomain: "bims-9aaa7.firebaseapp.com",
    databaseURL: "https://bims-9aaa7-default-rtdb.firebaseio.com",
    projectId: "bims-9aaa7",
    storageBucket: "bims-9aaa7.appspot.com",
    messagingSenderId: "323333588672",
    appId: "1:323333588672:web:cfb7ea2dff4d9eb2004f25",
    measurementId: "G-RQJBMNMFQ8",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app, 'asia-southeast1');

// Global variables
let tempEmail = '';
let tempPassword = '';
let verificationId = '';
let selectedOTPMethod = '';
let recaptchaVerifier = null;
let recaptchaResolved = false;

// Initialize UI elements
const loginForm = document.getElementById('login-form');
const otpMethodContainer = document.getElementById('otp-method-container');
const otpForm = document.getElementById('otp-form');
const emailOtpBtn = document.getElementById('email-otp');
const phoneOtpBtn = document.getElementById('phone-otp');
const phoneInput = document.getElementById('phone-input');
const errorMessage = document.getElementById('error-message');

const RATE_LIMIT_STORAGE_KEY = 'otpAttempts';
const MAX_ATTEMPTS_PER_HOUR = 10;
const HOUR_IN_MS = 3600000; // 1 hour in milliseconds


// Function to load reCAPTCHA script
function loadRecaptchaScript() {
    return new Promise((resolve, reject) => {
        if (window.grecaptcha) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js';
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Initialize reCAPTCHA verifier
async function initializeRecaptcha() {
  try {
      // If there's an existing recaptchaVerifier, clear it first
      if (recaptchaVerifier) {
          try {
              await recaptchaVerifier.clear();
              recaptchaVerifier = null;
          } catch (e) {
              console.log('Failed to clear existing reCAPTCHA:', e);
          }
      }

      // Clear the container
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (recaptchaContainer) {
          recaptchaContainer.innerHTML = '';
      }

      // Create new reCAPTCHA verifier - FIXED constructor call
      recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
          size: 'invisible',
          callback: () => {
              console.log('reCAPTCHA resolved');
              recaptchaResolved = true;
          },
          'expired-callback': () => {
              console.log('reCAPTCHA expired');
              recaptchaResolved = false;
          }
      }, auth);

      return recaptchaVerifier;
  } catch (error) {
      console.error('Error initializing reCAPTCHA:', error);
      throw error;
  }
}

phoneOtpBtn.addEventListener('click', async () => {
  selectedOTPMethod = 'phone';
  phoneInput.style.display = 'block';
});

// Initial login form submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showLoader();

  tempEmail = document.getElementById('email').value;
  tempPassword = document.getElementById('password').value;

  try {
      const userCredential = await signInWithEmailAndPassword(auth, tempEmail, tempPassword);
      
      if (!userCredential.user.emailVerified) {
          handleError('Please verify your email before logging in.');
          hideLoader();
          return;
      }

      await auth.signOut();
      loginForm.style.display = 'none';
      otpMethodContainer.style.display = 'block';
  } catch (error) {
      console.error('Login error:', error);
      handleError('Invalid email or password');
  } finally {
      hideLoader();
  }
});

// Email OTP button click handler
emailOtpBtn.addEventListener('click', async () => {
  selectedOTPMethod = 'email';
  showLoader();

  try {
      const sendOTP = httpsCallable(functions, 'sendOTP');
      const result = await sendOTP({ email: tempEmail });

      if (result.data.success) {
          otpMethodContainer.style.display = 'none';
          otpForm.style.display = 'block';
          handleSuccess(`OTP sent to ${tempEmail}`);
      } else {
          throw new Error('Failed to send OTP');
      }
  } catch (error) {
      console.error('Email OTP error:', error);
      handleError(error.message || 'Error sending OTP');
  } finally {
      hideLoader();
  }
});

// Phone OTP button click handler
phoneOtpBtn.addEventListener('click', () => {
  selectedOTPMethod = 'phone';
  phoneInput.style.display = 'block';
});

function manageOTPAttempts(phoneNumber) {
    try {
        // Get stored attempts
        let attempts = JSON.parse(localStorage.getItem(RATE_LIMIT_STORAGE_KEY) || '{}');
        const now = Date.now();

        // Clean up old attempts (older than 1 hour)
        Object.keys(attempts).forEach(key => {
            if (now - attempts[key].timestamp > HOUR_IN_MS) {
                delete attempts[key];
            }
        });

        // Check attempts for this phone number
        if (attempts[phoneNumber]) {
            if (attempts[phoneNumber].count >= MAX_ATTEMPTS_PER_HOUR) {
                const timeLeft = Math.ceil((HOUR_IN_MS - (now - attempts[phoneNumber].timestamp)) / 60000);
                throw new Error(`Too many attempts. Please wait ${timeLeft} minutes before trying again.`);
            }
            attempts[phoneNumber].count++;
        } else {
            attempts[phoneNumber] = {
                count: 1,
                timestamp: now
            };
        }

        // Save updated attempts
        localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(attempts));
        return true;
    } catch (error) {
        throw error;
    }
}

// Send phone OTP button handler
document.getElementById('send-phone-otp').addEventListener('click', async () => {
    const phoneNumber = document.getElementById('phone').value.trim();
    
    // Enhanced phone validation
    if (!phoneNumber.match(/^\+63[9]\d{9}$/)) {
        handleError('Please enter a valid Philippine phone number in format: +639123456789');
        showPopup('Invalid phone number format. Must start with +639', 'error');
        return;
    }

    try {
        // Check rate limits before proceeding
        manageOTPAttempts(phoneNumber);
        showLoader();
        console.log('Attempting to send OTP to:', phoneNumber);

        // Clear any existing reCAPTCHA
        if (recaptchaVerifier) {
            try {
                await recaptchaVerifier.clear();
                recaptchaVerifier = null;
            } catch (e) {
                console.log('Failed to clear existing reCAPTCHA:', e);
            }
        }

        // Create new reCAPTCHA verifier
        recaptchaVerifier = new RecaptchaVerifier(
            'recaptcha-wrapper',
            {
                size: 'invisible',
                callback: (response) => {
                    console.log('reCAPTCHA verified successfully:', !!response);
                    recaptchaResolved = true;
                    showPopup('Security verification completed', 'success');
                },
                'expired-callback': () => {
                    console.log('reCAPTCHA expired');
                    recaptchaResolved = false;
                    showPopup('Security verification expired. Please try again.', 'error');
                }
            },
            auth
        );

        await recaptchaVerifier.render();
        console.log('reCAPTCHA rendered successfully');

        // Add small delay for stability
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Send verification code
        const confirmationResult = await signInWithPhoneNumber(
            auth,
            phoneNumber,
            recaptchaVerifier
        );
        
        console.log('SMS verification request sent successfully');
        verificationId = confirmationResult.verificationId;

        if (verificationId) {
            otpMethodContainer.style.display = 'none';
            otpForm.style.display = 'block';
            
            // Show remaining attempts
            const attempts = JSON.parse(localStorage.getItem(RATE_LIMIT_STORAGE_KEY) || '{}');
            const remainingAttempts = MAX_ATTEMPTS_PER_HOUR - (attempts[phoneNumber]?.count || 0);
            
            handleSuccess(`OTP sent! You should receive it within 1 minute.`);
            showPopup(`OTP sent successfully to ${phoneNumber}!\nRemaining attempts: ${remainingAttempts}`, 'success');

            // Add countdown for next attempt
            const timerDiv = document.createElement('div');
            timerDiv.id = 'attempt-timer';
            timerDiv.style.marginTop = '10px';
            otpForm.appendChild(timerDiv);

            let countdown = 60;
            const timer = setInterval(() => {
                if (countdown <= 0) {
                    clearInterval(timer);
                    timerDiv.innerHTML = `
                        <button class="otp-button" onclick="location.reload()">
                            Didn't receive the code? Try Again
                        </button>`;
                    showPopup('You can now request a new OTP code', 'info');
                } else {
                    timerDiv.textContent = `You can request another code in ${countdown} seconds`;
                    countdown--;
                }
            }, 1000);
        }
    } catch (error) {
        console.error('Failed to send OTP:', error);
        let errorMessage = '';
        
        // Enhanced error handling
        if (error.message?.includes('Too many attempts')) {
            errorMessage = error.message;
            showPopup(`Rate limit exceeded: ${error.message}`, 'error');
        } else {
            switch(error.code) {
                case 'auth/invalid-app-credential':
                    errorMessage = 'Security verification failed. Please reload the page and try again.';
                    showPopup('Security check failed. Please refresh the page.', 'error');
                    break;
                case 'auth/invalid-phone-number':
                    errorMessage = 'Invalid phone number format. Please check and try again.';
                    showPopup('Invalid phone number format', 'error');
                    break;
                case 'auth/captcha-check-failed':
                    errorMessage = 'Security verification failed. Please try again.';
                    showPopup('Security verification failed', 'error');
                    break;
                case 'auth/quota-exceeded':
                    errorMessage = 'Daily quota exceeded. Please try again tomorrow.';
                    showPopup('Daily limit reached. Please try again tomorrow.', 'error');
                    break;
                case 'auth/too-many-requests':
                    errorMessage = `Rate limit exceeded. Please:
                        1. Try again in 1 hour
                        2. Use a different phone number
                        3. Contact support if urgent`;
                    showPopup('Too many attempts. Please wait 1 hour.', 'error');
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your internet connection.';
                    showPopup('Network error. Please check your connection.', 'error');
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'Phone authentication is not enabled. Please contact support.';
                    showPopup('Service not available. Please contact support.', 'error');
                    break;
                default:
                    errorMessage = error.message || 'Unknown error occurred';
                    showPopup('An error occurred. Please try again.', 'error');
            }
        }
        
        handleError(errorMessage);
        
        try {
            if (recaptchaVerifier) {
                await recaptchaVerifier.clear();
                recaptchaVerifier = null;
            }
        } catch (e) {
            console.log('Cleanup after error failed:', e);
        }
    } finally {
        hideLoader();
    }
});

// Add this function near your other utility functions
function showPopup(message, type = 'error') {
    const popup = document.getElementById('popup');
    popup.textContent = message;
    popup.className = `popup ${type}`;
    popup.style.display = 'block';

    // Add animation
    popup.style.animation = 'slideIn 0.5s ease-out';

    // Automatically hide after 3 seconds
    setTimeout(() => {
        popup.style.animation = 'fadeOut 0.5s ease-out';
        setTimeout(() => {
            popup.style.display = 'none';
        }, 500);
    }, 3000);
}

// OTP verification form submission handler
otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();

    const otpCode = document.getElementById('otp').value;

    try {
        if (selectedOTPMethod === 'phone') {
            if (!verificationId) {
                throw new Error('Verification session expired. Please try again.');
            }
            
            const credential = PhoneAuthProvider.credential(verificationId, otpCode);
            await signInWithCredential(auth, credential);
            handleSuccess('Phone number verified successfully!');
        } else {
            const verifyOTP = httpsCallable(functions, 'verifyOTP');
            const result = await verifyOTP({ 
                email: tempEmail,
                code: otpCode
            });

            if (!result.data.success) {
                showOtpErrorPopup(result.data.message);
                throw new Error(result.data.message);
            }

            // If OTP verification is successful, proceed with login
            const userCredential = await signInWithEmailAndPassword(auth, tempEmail, tempPassword);
            const user = userCredential.user;

            const adminDoc = await getDoc(doc(db, 'Admin_Accounts', user.uid));
            if (adminDoc.exists()) {
                window.location.href = './adminPage/admin_resident_records.html';
            } else {
                const userDoc = await getDoc(doc(db, 'User_Accounts', user.uid));
                if (userDoc.exists()) {
                    window.location.href = './residentsPage/resident_personal_info.html';
                } else {
                    throw new Error('Invalid account type');
                }
            }
        }
    } catch (error) {
        let errorMessage = '';
        if (error.message.includes('Incorrect OTP') || error.message.includes('Invalid OTP')) {
            errorMessage = 'Incorrect OTP code. Please try again.';
            showOtpErrorPopup(errorMessage);
        } else if (error.message.includes('expired')) {
            errorMessage = 'OTP has expired. Please request a new one.';
            showOtpErrorPopup(errorMessage);
        } else if (error.message.includes('Too many invalid attempts')) {
            errorMessage = 'Too many invalid attempts. Please request a new OTP.';
            showOtpErrorPopup(errorMessage);
        } else {
            errorMessage = error.message || 'Error verifying OTP';
            showOtpErrorPopup(errorMessage);
        }
        handleError(errorMessage);
    } finally {
        hideLoader();
    }
});



// Function to show error message
function showErrorMessage(message) {
    const errorElement = document.getElementById('otp-error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function showOtpErrorPopup(message) {
    const overlay = document.getElementById('otpErrorOverlay');
    const errorMessageElement = overlay.querySelector('h2');
    
    // Set a user-friendly message regardless of the error type
    const userFriendlyMessage = 'The verification code you entered is incorrect. Please try again.';
    
    if (errorMessageElement) {
        errorMessageElement.textContent = userFriendlyMessage;
    }
    
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function closeOtpErrorPopup() {
    const overlay = document.getElementById('otpErrorOverlay');
    const otpInput = document.getElementById('otp');
    
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    // Clear the OTP input field
    if (otpInput) {
        otpInput.value = '';
        otpInput.focus(); // Optional: focus on the input field for better UX
    }
}

async function verifyOTPCode(email, code) {
    const verifyOTPFunction = httpsCallable(functions, 'verifyOTP');
    
    try {
        const result = await verifyOTPFunction({ email, code });
        
        if (!result.data.success) {
            showOtpErrorPopup(result.data.message);
            throw new Error('Verification failed'); 
        }
        
        return result.data;
    } catch (error) {
        // Convert internal error to user-friendly message
        showOtpErrorPopup('Verification failed');
        
        // For development purposes, still log the actual error to console
        console.error('Debug error:', error);
        
        throw new Error('Verification failed');
    }
}

// Event listener for the OTP form
// document.getElementById('otp-form').addEventListener('submit', async (e) => {
//     e.preventDefault();
    
//     const email = document.getElementById('email').value;
//     const otpCode = document.getElementById('otp').value;
//     const errorElement = document.getElementById('otp-error-message');
    
//     try {
//         const result = await verifyOTPCode(email, otpCode);
        
//         if (result.success) {
//             // Clear any existing error messages
//             if (errorElement) {
//                 errorElement.style.display = 'none';
//             }
            
//             // Redirect on success
//             window.location.href = '/public/residentsPage/resident_personal_info.html';
//         }
//     } catch (error) {
//         if (errorElement) {
//             // Set user-friendly error message in the form
//             errorElement.textContent = 'Unable to verify the code. Please try again.';
//             errorElement.style.display = 'block';
//         }
//     }
// });

  
    
  // Close popup when clicking outside the error box
  document.getElementById('otpErrorOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'otpErrorOverlay') {
      closeOtpErrorPopup();
    }
  });
  
  // Close popup when pressing Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeOtpErrorPopup();
    }
  });


function showLoader() {
  document.getElementById('loader-container').style.display = 'flex';
}

function hideLoader() {
  document.getElementById('loader-container').style.display = 'none';
}

function handleError(message) {
  const errorElement = document.getElementById('error-message');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  errorElement.style.color = 'red';
}

function handleSuccess(message) {
  const errorElement = document.getElementById('error-message');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  errorElement.style.color = 'green';
}



// Page load initialization
document.addEventListener('DOMContentLoaded', () => {
    // Load reCAPTCHA script
    loadRecaptchaScript().catch((error) => {
      console.error('Error in initialization:', error);
    });
  
    // Close OTP error popup on overlay click
    const overlay = document.getElementById('otpErrorOverlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeOtpErrorPopup();
        }
      });
    }
  
    // Close OTP error popup on escape key press
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeOtpErrorPopup();
      }
    });

    const otpInput = document.getElementById('otp');
    if (otpInput) {
        // Prevent non-numeric input
        otpInput.addEventListener('keypress', function(e) {
            if (e.key < '0' || e.key > '9') {
                e.preventDefault();
            }
        });

        // Clean input (removes non-numeric characters)
        otpInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '');
            
            // Ensure maximum length
            if (this.value.length > 6) {
                this.value = this.value.slice(0, 6);
            }
        });

        // Handle paste event
        otpInput.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const numbers = pastedText.replace(/[^0-9]/g, '').slice(0, 6);
            this.value = numbers;
        });
    }
});

// Cleanup on page unload (not async due to browser limitations with beforeunload)
window.addEventListener('beforeunload', () => {
if (recaptchaVerifier) {
    try {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
    } catch (e) {
    console.log('Clear failed:', e);
    }
}
});
  

window.closeOtpErrorPopup = closeOtpErrorPopup;
















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

// Get references to form elements
const outgoingForm = document.getElementById('outgoingAdmin');
const incomingForm = document.getElementById('incomingAdmin');
const saveDraftBtn = document.querySelector('.action-buttons .action-btn:first-child');

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
            adminId = adminSnapshot.docs[0].id; // Get the adminId
        }
    } catch (error) {
        console.error('Error getting admin document:', error);
    }

    return {
        outgoing: {
            lastName: document.getElementById('outLname').value,
            firstName: document.getElementById('outFname').value,
            middleName: document.getElementById('outMname').value,
            position: document.getElementById('positionOutgoing').value,
            role: document.getElementById('roleOutgoing').value,
            username: document.getElementById('outUsername').value,
            email: document.getElementById('outEmail').value,
            contactNumber: document.getElementById('outPhone').value
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
        adminId: adminId // Add the adminId to the draft data
    };
};

// Function to populate form with data
const populateForm = (data) => {
    if (!data) return;

    // Populate outgoing admin form
    document.getElementById('outLname').value = data.outgoing.lastName || '';
    document.getElementById('outFname').value = data.outgoing.firstName || '';
    document.getElementById('outMname').value = data.outgoing.middleName || '';
    document.getElementById('positionOutgoing').value = data.outgoing.position || '';
    document.getElementById('roleOutgoing').value = data.outgoing.role || '';
    document.getElementById('outUsername').value = data.outgoing.username || '';
    document.getElementById('outEmail').value = data.outgoing.email || '';
    document.getElementById('outPhone').value = data.outgoing.contactNumber || '';

    // Populate incoming admin form
    document.getElementById('inLname').value = data.incoming.lastName || '';
    document.getElementById('inFname').value = data.incoming.firstName || '';
    document.getElementById('inMname').value = data.incoming.middleName || '';
    document.getElementById('positionIncoming').value = data.incoming.position || '';
    document.getElementById('roleIncoming').value = data.incoming.role || '';
    document.getElementById('inUsername').value = data.incoming.username || '';
    document.getElementById('inEmail').value = data.incoming.email || '';
    document.getElementById('inPhone').value = data.incoming.contactNumber || '';
};

// Function to save draft
const saveDraft = async () => {
    try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            console.error('User not authenticated');
            return;
        }

        const draftData = await getFormData(); // Note: now awaiting getFormData
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

        // Get the document directly using the userId as the document ID
        const draftRef = doc(db, 'Turnover_Draft', userId);
        const draftSnap = await getDoc(draftRef);

        if (draftSnap.exists()) {
            const draftData = draftSnap.data();
            populateForm(draftData);
        }
    } catch (error) {
        console.error('Error loading draft:', error);
    }
};

// Event Listeners
saveDraftBtn.addEventListener('click', saveDraft);

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



confirmPasswordBtn.addEventListener('click', async () => {
    try {
        const user = auth.currentUser;
        if (!user) {
            passwordError.textContent = 'No authenticated user found.';
            return;
        }

        // Get admin document to check password
        const adminQuery = query(
            collection(db, 'Admin_Accounts'),
            where('userId', '==', user.uid)
        );
        
        const adminSnapshot = await getDocs(adminQuery);
        if (!adminSnapshot.empty) {
            const adminDoc = adminSnapshot.docs[0].data();
            
            // Compare passwords (assuming password is stored in admin document)
            if (passwordInput.value === adminDoc.password) {
                hidePasswordModal();
                // Proceed with turnover
                await handleTurnoverSubmission();
            } else {
                passwordError.textContent = 'Incorrect password. Please try again.';
                passwordInput.value = '';
                passwordInput.focus();
            }
        }
    } catch (error) {
        console.error('Error verifying password:', error);
        passwordError.textContent = 'An error occurred. Please try again.';
    }
});

async function handleTurnoverSubmission() {
    try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            console.error('User not authenticated');
            return;
        }

        // Get the current form data
        const turnoverData = await getFormData();
        
        // Add additional fields for the turnover document
        const finalTurnoverData = {
            ...turnoverData,
            status: 'pending',
            submissionTime: Timestamp.now(),
            turnoverDate: Timestamp.now()
        };

        // Save to Turnover collection
        const turnoverRef = doc(collection(db, 'Turnover'));
        await setDoc(turnoverRef, finalTurnoverData);

        // Delete the draft
        const draftRef = doc(db, 'Turnover_Draft', userId);
        await deleteDoc(draftRef);

        alert('Turnover completed successfully!');
        
        // Clear the forms
        clearFormInputs('outgoingAdmin');
        clearFormInputs('incomingAdmin');

    } catch (error) {
        console.error('Error completing turnover:', error);
        alert('Error completing turnover. Please try again.');
    }
}

// Function to complete turnover
const completeTurnover = async () => {
    try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            console.error('User not authenticated');
            return;
        }

        // Get the current form data
        const turnoverData = await getFormData();
        
        // Add additional fields for the turnover document
        const finalTurnoverData = {
            ...turnoverData,
            status: 'pending',
            submissionTime: Timestamp.now(),
            turnoverDate: Timestamp.now()
        };

        // First, save to Turnover collection
        const turnoverRef = doc(collection(db, 'Turnover'));
        await setDoc(turnoverRef, finalTurnoverData);

        // Then, delete the draft
        const draftRef = doc(db, 'Turnover_Draft', userId);
        await deleteDoc(draftRef);

        alert('Turnover completed successfully!');
        
        // Optional: Clear the form after successful submission
        clearFormInputs('outgoingAdmin');
        clearFormInputs('incomingAdmin');

    } catch (error) {
        console.error('Error completing turnover:', error);
        alert('Error completing turnover. Please try again.');
    }
};


// #################### PASSWORD #######################

// Get modal elements
const passwordModal = document.getElementById('passwordModal');
const closeModal = document.querySelector('.close-modal');
const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
const confirmPasswordBtn = document.getElementById('confirmPasswordBtn');
const passwordInput = document.getElementById('confirmPassword');
const passwordError = document.getElementById('passwordError');
const togglePassword = document.querySelector('.toggle-password');

// Show/Hide password functionality
togglePassword.addEventListener('click', function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    // Toggle eye icon
    const icon = this.querySelector('i');
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
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