// <!-- ######## ADMIN_REQUESTS_CLEARANCE.JS ######### -->

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getFirestore, collection, addDoc, updateDoc, orderBy, getDocs, doc, getDoc, query, where, onSnapshot,serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getStorage, ref, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js';

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app)
const auth = getAuth(app);

// Add this function at the top of your file
function getMonthName(monthIndex) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
}

// Function to fetch user data when the fetch button is clicked
async function fetchClearanceUserData() {
    const uniqueId = document.getElementById('clearanceUniqueId').value.trim().toUpperCase();

    if (uniqueId) {
        try {
            const usersCollection = collection(db, 'users');
            const q = query(usersCollection, where('uniqueId', '==', uniqueId));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                console.log("Fetched user data:", userData);
                populateForm(userData);
            } else {
                console.log("No user found with this ID");
                clearForm();
                alert("No user found with this ID");
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            alert("Error fetching user data. Please try again.");
        }
    } else {
        alert("Please enter a Unique ID");
    }
}

// Function to populate the form with fetched data
function populateForm(data) {
    if (!data) {
        console.log("No data provided to populateForm");
        return;
    }

    const nameElement = document.getElementById('clearanceName');
    const ageElement = document.getElementById('clearanceAge');
    const blklotElement = document.getElementById('clearanceBlklot');
    // const streetElement = document.getElementById('clearanceStreet');

    if (nameElement) {
        const fullName = `${data.firstName || ''} ${data.middleName || ''} ${data.lastName || ''}`.trim();
        nameElement.value = fullName;
    }

    if (ageElement && data.birthdate) {
        const age = calculateAge(data.birthdate);
        ageElement.value = age;
    }

    if (blklotElement) blklotElement.value = data.blklot || '';
    // if (streetElement) streetElement.value = data.street || '';

    console.log("Form populated with data:", {
        name: nameElement?.value,
        age: ageElement?.value,
        blklot: blklotElement?.value,
        // street: streetElement?.value
    });
}

// Function to calculate age from birthdate
function calculateAge(birthdate) {
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
}

// Function to clear the form
function clearForm() {
    ['clearanceUniqueId', 'clearanceName', 'clearanceAge', 'clearanceBlklot', 'clearancePurpose', 'clearanceIssueDate'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
}



// Helper function to get ordinal suffix for the day
function getOrdinalSuffix(day) {
    if (day >= 11 && day <= 13) {
        return 'th';
    }
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

async function generateTransactionId() {
    const brgyClearanceCollection = collection(db, 'brgy_clearance');
    const snapshot = await getDocs(brgyClearanceCollection);
    const clearanceCount = snapshot.size;
    const newTransactionId = `CLRN-${(clearanceCount + 1).toString().padStart(6, '0')}`;
    return newTransactionId;
}

async function generateWordClearance(data) {
    try {
        // Update the path to match your project structure
        const response = await fetch('./public/Brgy Docs/BARANGAY-CLEARANCE-BLANK.docx');
        // or try this if the above doesn't work:
        // const response = await fetch('./public/Brgy Docs/word.docx');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const templateContent = await response.arrayBuffer();
        
        // Check if we got valid content
        if (!templateContent || templateContent.byteLength === 0) {
            throw new Error('Template file is empty');
        }

        console.log('Template loaded, size:', templateContent.byteLength);

        // Load the docx template
        const zip = new PizZip(templateContent);
        const doc = new window.docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: {
                start: '${',
                end: '}'
            }
        });

        // Set the template data
        doc.setData({
            printName: data.fullName,
            printAge: data.age,
            printBlklot: data.blockLot,
            // printStreet: data.street,
            printPurpose: data.purpose,
            printDay: new Date(data.issueDate).getDate()+ getOrdinalSuffix(new Date(data.issueDate).getDate()),
            printMonth: getMonthName(new Date(data.issueDate).getMonth()),
            printYear: new Date(data.issueDate).getFullYear(),
            printIssueDate: new Date(data.issueDate).toLocaleDateString(),
            printORNo: data.transactionId

        });

        // Render the document
        doc.render();

        // Generate and download
        const out = doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        // Trigger download
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(out);
        link.download = `Clearance_${data.transactionId}.docx`;
        link.click();
        window.URL.revokeObjectURL(link.href);

        return true;
    } catch (error) {
        console.error('Error generating document:', error);
        console.log('Template path:', '/public/Brgy Docs/BARANGAY-CLEARANCE-BLANK.docx');
        throw error;
    }
}

document.getElementById('printClearance').addEventListener('click', async (event) => { // LINE 206
    try {
        // Gather form data
        const clearanceData = {
            transactionId: await generateTransactionId(),
            fullName: document.getElementById('clearanceName').value.trim().toUpperCase(),
            age: document.getElementById('clearanceAge').value.trim(),
            blockLot: document.getElementById('clearanceBlklot').value.trim().toUpperCase(),
            // street: document.getElementById('clearanceStreet').value.trim().toUpperCase(),
            purpose: document.getElementById('clearancePurpose').value.toUpperCase(),
            issueDate: document.getElementById('clearanceIssueDate').value,
            status: 'Printed',
            createdAt: serverTimestamp(),
            issuedAt: serverTimestamp(),            
        };

        // Validate form data
        if (!clearanceData.fullName || !clearanceData.age || !clearanceData.blockLot || 
            !clearanceData.purpose || !clearanceData.issueDate) {
            alert('Please fill in all required fields');
            return;
        }

        // Generate Word document
        await generateWordClearance(clearanceData);

        // Save to Firebase
        const docRef = await addDoc(collection(db, 'brgy_clearance'), clearanceData);
        console.log("New clearance saved with ID:", docRef.id);

        // Close preview window
        const previewClearance = document.getElementById('previewClearance');
        if (previewClearance) previewClearance.style.display = 'none';

    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while generating the clearance. Please try again.');
    }
});

async function updateClearanceStatus(requestId) {
    try {
        const clearanceRef = doc(db, "brgy_clearance", requestId);
        await updateDoc(clearanceRef, { 
            status: "Printed",
            issuedAt: new Date().toISOString()
        });
        console.log("Status updated successfully");
    } catch (error) {
        console.error("Error updating document: ", error);
    }
}


function hideConfirmationPopup() {
    const confirmationPopup = document.getElementById('confirmationPopup');
    confirmationPopup.style.display = 'none';
}

function hidePreviewClearance() {
    const previewClearance = document.getElementById('previewClearance');
    if (previewClearance) previewClearance.style.display = 'none';
}


// Add event listener to the fetch button
document.addEventListener('DOMContentLoaded', function () {
    const fetchButton = document.getElementById('fetchClearanceUserData');
    if (fetchButton) {
        fetchButton.addEventListener('click', fetchClearanceUserData);
    }

    const uniqueIdInput = document.getElementById('clearanceUniqueId');
    if (uniqueIdInput) {
        uniqueIdInput.addEventListener('input', function () {
            if (this.value.length >= 13) {
                fetchClearanceUserData();
            }
        });
    }

    // Add this handler for preview button
    const previewButton = document.getElementById('clearancePreview');
    if (previewButton) {
        previewButton.addEventListener('click', function() {
            // Validate form fields
            const name = document.getElementById('clearanceName').value.trim();
            const age = document.getElementById('clearanceAge').value.trim();
            const blklot = document.getElementById('clearanceBlklot').value.trim();
            // const street = document.getElementById('clearanceStreet').value.trim();
            const purpose = document.getElementById('clearancePurpose').value;
            const issueDate = document.getElementById('clearanceIssueDate').value;

            const date = new Date(issueDate);
            const day = date.getDate();
            const ordinalDay = day + getOrdinalSuffix(day);
            const month = date.toLocaleString('default', { month: 'long' });
            const year = date.getFullYear();

            if (!name || !age || !blklot || !street || !purpose || !issueDate) {
                alert("Please fill in all required fields.");
                return;
            }

            // Format the data
            const formattedDate = new Date(issueDate).toLocaleDateString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: 'numeric'
            });

            // Populate preview content
            document.getElementById('previewName').textContent = name.toUpperCase();
            document.getElementById('previewAge').textContent = age;
            document.getElementById('previewBlklot').textContent = blklot;
            // document.getElementById('previewStreet').textContent = street;
            document.getElementById('previewPurpose').textContent = purpose.toUpperCase();
            document.getElementById('previewIssueDate').textContent = formattedDate;

            document.getElementById('printeDay').textContent = ordinalDay;
            document.getElementById('printMonth').textContent = month;
            document.getElementById('printYear').textContent = year;

            // Show preview container
            const previewClearance = document.getElementById('previewClearance');
            if (previewClearance) {
                previewClearance.style.display = 'block';
            }
        });
    }

    // Add handler for close preview button
    const closePreviewButton = document.getElementById('closePreviewClearance');
    if (closePreviewButton) {
        closePreviewButton.addEventListener('click', function() {
            const previewClearance = document.getElementById('previewClearance');
            if (previewClearance) {
                previewClearance.style.display = 'none';
            }
        });
    }

    const printButton = document.getElementById('printClearance');
    if (printButton) {
        printButton.addEventListener('click', async (event) => {
            // New Word document generation code will go here
            // This will replace the old printClearance function
        });
    }
});

window.generateWordClearance = generateWordClearance;
export { generateWordClearance };