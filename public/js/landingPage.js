// ################# LANDINGPAGE.JS ###################
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getFirestore, collection, doc, updateDoc, deleteDoc, setDoc, addDoc, getDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);


// Define the positions we want to fetch and their corresponding image IDs
const positionMap = {
    "PUNONG BARANGAY": "official-image-pb",
    "SECRETARY": "official-image-sc",
    "TREASURER": "official-image-tr",
    "SK CHAIRMAN": "official-image-sk",
    "KONSEHAL": "official-image"
};

// Fetch the officials' data from Firestore
async function fetchOfficialsData() {
    console.log("Fetching officials data...");
    try {
        const officialsCol = collection(db, "Barangay_Officials");
        const allOfficialsSnapshot = await getDocs(officialsCol);
        
        console.log(`Total documents in Barangay_Officials: ${allOfficialsSnapshot.size}`);
        
        // Separate officials by position
        const officials = {
            regular: [],
            konsehal: []
        };

        allOfficialsSnapshot.forEach(doc => {
            const officialData = doc.data();
            // Normalize position to uppercase for comparison
            const position = officialData.position?.toUpperCase() || '';
            
            if (position === 'KONSEHAL') {
                officials.konsehal.push(officialData);
            } else {
                officials.regular.push(officialData);
            }
        });

        // Process regular positions first
        officials.regular.forEach(officialData => {
            if (officialData.position && positionMap.hasOwnProperty(officialData.position.toUpperCase())) {
                console.log(`Updating ${officialData.position} info:`, officialData);
                updateOfficialInfo(officialData.position.toUpperCase(), officialData);
            }
        });

        // Process Konsehal positions
        officials.konsehal.forEach((officialData, index) => {
            updateKonsehalInfo(officialData, index + 1);
        });

    } catch (error) {
        console.error("Error getting documents:", error);
    }
}

function updateKonsehalInfo(officialData, konsehalNumber) {
    if (!officialData) {
        console.error(`Missing official data for Konsehal ${konsehalNumber}`);
        return;
    }

    console.log(`Updating Konsehal ${konsehalNumber} info:`, officialData);

    // Find the specific Konsehal container
    const konsehalContainer = document.querySelector(`.member[data-konsehal="${konsehalNumber}"]`);

    if (!konsehalContainer) {
        console.error(`Container not found for Konsehal ${konsehalNumber}`);
        return;
    }

    // Update the elements
    const fullNameElement = konsehalContainer.querySelector('.full-name span:last-child');
    const positionElement = konsehalContainer.querySelector('.position');
    const profileImageElement = konsehalContainer.querySelector('img');

    if (!fullNameElement || !positionElement || !profileImageElement) {
        console.error(`Required elements not found for Konsehal ${konsehalNumber}`);
        return;
    }

    // Construct full name
    const fullName = [
        officialData.firstName || '',
        officialData.middleName || '',
        officialData.lastName || '',
        officialData.suffix || ''
    ].filter(Boolean).join(' ');

    fullNameElement.textContent = fullName;

    // Update position
    positionElement.textContent = officialData.position || 'Konsehal';

    // Update profile image with fallback
    if (officialData.profileImageUrl) {
        profileImageElement.src = officialData.profileImageUrl;
        setFallbackImage(profileImageElement, './resources/default-profile.png');
    } else {
        console.warn(`Profile image URL missing for Konsehal ${konsehalNumber}`);
        profileImageElement.src = './resources/default-profile.png';
    }

    console.log(`Successfully updated Konsehal ${konsehalNumber}`);
}

function setFallbackImage(imageElement, fallbackUrl) {
    imageElement.onerror = () => {
        console.warn(`Image not found: ${imageElement.src}. Loading fallback.`);
        imageElement.src = fallbackUrl;
    };
}


// Helper function to normalize position strings
function normalizePosition(position) {
    return position?.toUpperCase().trim() || '';
}

async function checkExistingPosition(position) {
    const normalizedPosition = normalizePosition(position);
    
    // If it's a Konsehal, check the count
    if (normalizedPosition === 'KONSEHAL') {
        const q = query(collection(db, 'Barangay_Officials'), 
                       where("position", "==", "KONSEHAL"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.size >= 7; // Return true if max Konsehals reached
    }
    
    // For other positions, check if they exist
    const uniquePositions = ["PUNONG BARANGAY", "SECRETARY", "TREASURER", "SK CHAIRMAN"];
    if (!uniquePositions.includes(normalizedPosition)) {
        return false;
    }
    
    const q = query(collection(db, 'Barangay_Officials'), 
                   where("position", "==", normalizedPosition));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
}

async function updateOfficialInfo(position, officialData) {
    console.log(`Updating official info for position: ${position}`);
    
    if (position === "KONSEHAL") {
        // Get all existing Konsehal entries
        const konsehalEntries = await getAllKonsehals();
        const konsehalIndex = konsehalEntries.length;
        
        // Find the corresponding Konsehal container (1-7)
        const konsehalContainers = document.querySelectorAll(`#officialsRow .member img[id^="official-image"][alt^="Konsehal"]`);
        
        if (konsehalIndex < konsehalContainers.length) {
            const container = konsehalContainers[konsehalIndex].closest('.member');
            if (container) {
                const fullNameElement = container.querySelector('.full-name span:last-child');
                const positionElement = container.querySelector('.position');
                const profileImageElement = container.querySelector('img');

                if (fullNameElement && positionElement && profileImageElement) {
                    // Update the official's full name
                    const fullName = `${officialData.firstName || ''} ${officialData.middleName || ''} ${officialData.lastName || ''} ${officialData.suffix || ''}`.trim();
                    fullNameElement.textContent = fullName;

                    // Update the position
                    positionElement.textContent = "Konsehal";

                    // Update the profile image
                    if (officialData.profileImageUrl) {
                        profileImageElement.src = officialData.profileImageUrl;
                    } else {
                        await getProfileImage(officialData.firstName + "_" + officialData.lastName, profileImageElement);
                    }
                }
            }
        }
    } else {
        // Handle other positions as before
        const imageId = positionMap[position];
        if (!imageId) {
            console.error(`No image ID mapping found for position: ${position}`);
            return;
        }

        const container = document.querySelector(`#officialsRow .member img[id="${imageId}"]`)?.closest('.member');
        if (!container) {
            console.error(`Container not found for ${position} (Image ID: ${imageId})`);
            return;
        }

        const fullNameElement = container.querySelector('.full-name span:last-child');
        const positionElement = container.querySelector('.position');
        const profileImageElement = container.querySelector('img');

        if (!fullNameElement || !positionElement || !profileImageElement) {
            console.error(`One or more HTML elements not found for ${position}`);
            return;
        }

        // Update the official's full name
        const fullName = `${officialData.firstName || ''} ${officialData.middleName || ''} ${officialData.lastName || ''} ${officialData.suffix || ''}`.trim();
        fullNameElement.textContent = fullName;

        // Update the position
        positionElement.textContent = position;

        // Update the profile image
        if (officialData.profileImageUrl) {
            profileImageElement.src = officialData.profileImageUrl;
        } else {
            await getProfileImage(officialData.firstName + "_" + officialData.lastName, profileImageElement);
        }
    }
}

async function getAllKonsehals() {
    const q = query(collection(db, 'Barangay_Officials'), 
                   where("position", "==", "KONSEHAL"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

async function getProfileImage(filename, imgElement) {
    console.log("Getting profile image for:", filename);
    try {
        const imageRef = ref(storage, `Profile_Images/${filename}`);
        const url = await getDownloadURL(imageRef);
        imgElement.src = url;
        console.log("Image URL fetched:", url);
    } catch (error) {
        console.error("Error fetching image:", error);
        // Set a default image or hide the image element
        imgElement.style.display = 'none';
    }
}

// Ensure the DOM is fully loaded before running our script
document.addEventListener('DOMContentLoaded', (event) => {
    console.log("DOM fully loaded and parsed");
    fetchOfficialsData();
});

// Fix for pagination error
function fixPaginationError() {
    if (typeof updatePagination === 'function') {
        const originalUpdatePagination = updatePagination;
        window.updatePagination = function(...args) {
            const paginationContainer = document.querySelector('.pagination-container');
            if (paginationContainer) {
                originalUpdatePagination(...args);
            } else {
                console.log('Pagination container not found. Skipping pagination update.');
            }
        };
    }
}

// Run the fix after the DOM is loaded
document.addEventListener('DOMContentLoaded', (event) => {
    fixPaginationError();
});

