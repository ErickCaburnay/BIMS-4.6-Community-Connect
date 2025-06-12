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
const MAX_ATTEMPTS_PER_HOUR = 50; // 10
const HOUR_IN_MS = 3000; // 3600000 = 1 hour in milliseconds


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
      }, auth);  // Move auth to the third parameter

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

            let countdown = 10; //  cooldown between attempts
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
            errorMessage = error.message; // Use the custom rate limit message
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
              throw new Error('Invalid OTP');
          }
      }

      // Final login and redirect
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
  } catch (error) {
      console.error('Verification error:', error);
      if (error.code === 'auth/invalid-verification-code') {
          handleError('Invalid OTP code. Please try again.');
      } else if (error.code === 'auth/code-expired') {
          handleError('OTP code expired. Please request a new one.');
      } else {
          handleError(error.message || 'Error verifying OTP');
      }
  } finally {
      hideLoader();
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
document.addEventListener('DOMContentLoaded', async () => {
  try {
      await loadRecaptchaScript();
      // We don't initialize reCAPTCHA here anymore
  } catch (error) {
      console.error('Error in initialization:', error);
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', async () => {
  if (recaptchaVerifier) {
      try {
          await recaptchaVerifier.clear();
          recaptchaVerifier = null;
      } catch (e) {
          console.log('Clear failed:', e);
      }
  }
});