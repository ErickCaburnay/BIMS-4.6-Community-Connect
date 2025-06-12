// <!-- ######## ADMIN_REQUESTS_INDIGENCY.JS ######### -->

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getFirestore, collection, addDoc, updateDoc, orderBy, getDocs, doc, getDoc, query, where, onSnapshot,serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

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

function getMonthName(monthIndex) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
}

// Function to fetch user data when the fetch button is clicked
async function fetchIndigencyUserData() {
    const uniqueId = document.getElementById('indigencyUniqueId').value.trim().toUpperCase();

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

    const nameElement = document.getElementById('indigencyName');
    const ageElement = document.getElementById('indigencyAge');
    const blklotElement = document.getElementById('indigencyBlklot');
    // const streetElement = document.getElementById('indigencyStreet');

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
    ['indigencyUniqueId', 'indigencyName', 'indigencyAge', 'indigencyBlklot', 'indigencyPurpose', 'indigencyIssueDate'].forEach(id => {
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
    const brgyIndigencyCollection = collection(db, 'brgy_indigency');
    const snapshot = await getDocs(brgyIndigencyCollection);
    const indigencyCount = snapshot.size;
    const newTransactionId = `INDG-${(indigencyCount + 1).toString().padStart(6, '0')}`;
    return newTransactionId;
}

async function updateIndigencyStatus(requestId) {
    try {
        const indigencyRef = doc(db, "brgy_indigency", requestId);
        await updateDoc(indigencyRef, { 
            status: "Printed",
            issuedAt: new Date().toISOString()
        });
        console.log("Status updated successfully");
    } catch (error) {
        console.error("Error updating document: ", error);
    }
}

async function generateWordIndigency(data) {
    try {
        // Update the path to match your project structure
        const response = await fetch('/public/Brgy Docs/BARANGAY-INDIGENCY-BLANK.docx');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const templateContent = await response.arrayBuffer();
        
        if (!templateContent || templateContent.byteLength === 0) {
            throw new Error('Template file is empty');
        }

        console.log('Template loaded, size:', templateContent.byteLength);

        const zip = new PizZip(templateContent);
        const doc = new window.docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: {
                start: '${',
                end: '}'
            }
        });

        // Set the template data using your existing IDs
        doc.setData({
            printIndigencyName1: data.fullName,
            printIndigencyName2: data.fullName,
            printIndigencyName3: data.fullName,
            printIndigencyAge: data.age,
            printIndigencyBlklot: data.blockLot,
            printIndigencyPurpose: data.purpose,
            printIndigencyDay: new Date(data.issueDate).getDate() + getOrdinalSuffix(new Date(data.issueDate).getDate()),
            printIndigencyMonth: getMonthName(new Date(data.issueDate).getMonth()),
            printIndigencyYear: new Date(data.issueDate).getFullYear(),
            printIndigencyIssueDate: new Date(data.issueDate).toLocaleDateString(),
            printIndigencyORNo: data.transactionId
        });

        doc.render();

        const out = doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(out);
        link.download = `Indigency_${data.transactionId}.docx`;
        link.click();
        window.URL.revokeObjectURL(link.href);

        return true;
    } catch (error) {
        console.error('Error generating document:', error);
        console.log('Template path:', '/public/Brgy Docs/BARANGAY-INDIGENCY-BLANK.docx');
        throw error;
    }
}

document.getElementById('printIndigency').addEventListener('click', async (event) => {
    try {
        // Gather form data
        const indigencyData = {
            transactionId: await generateTransactionId(),
            fullName: document.getElementById('indigencyName').value.trim().toUpperCase(),
            age: document.getElementById('indigencyAge').value.trim(),
            blockLot: document.getElementById('indigencyBlklot').value.trim().toUpperCase(),
            purpose: document.getElementById('indigencyPurpose').value.toUpperCase(),
            issueDate: document.getElementById('indigencyIssueDate').value,
            status: 'Printed',
            createdAt: serverTimestamp(),
            issuedAt: serverTimestamp()
        };

        // Validate form data
        if (!indigencyData.fullName || !indigencyData.age || !indigencyData.blockLot || 
            !indigencyData.purpose || !indigencyData.issueDate) {
            alert('Please fill in all required fields');
            return;
        }

        // Generate Word document
        await generateWordIndigency(indigencyData);

        // Save to Firebase
        const docRef = await addDoc(collection(db, 'brgy_indigency'), indigencyData);
        console.log("New indigency saved with ID:", docRef.id);

        // Close preview window
        const previewIndigency = document.getElementById('previewIndigency');
        if (previewIndigency) previewIndigency.style.display = 'none';

    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while generating the indigency. Please try again.');
    }
});

function handleCloseOrCancel() {
    const indigencyPopupContainer = document.getElementById('indigencyPopupContainer');
    if (indigencyPopupContainer) indigencyPopupContainer.style.display = 'none';
    clearForm();
}


function cancelPrintIndigency() {
    hideConfirmationPopup();
    hidePreviewIndigency();
}

function hideConfirmationPopup() {
    const confirmationPopup = document.getElementById('confirmationPopup');
    confirmationPopup.style.display = 'none';
}

function hidePreviewIndigency() {
    const previewIndigency = document.getElementById('previewIndigency');
    if (previewIndigency) previewIndigency.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
    const fetchButton = document.getElementById('fetchIndigencyUserData');
    if (fetchButton) {
        fetchButton.addEventListener('click', fetchIndigencyUserData);
    }

    // You can also add event listener for the Unique ID input if you want to fetch on input
    const uniqueIdInput = document.getElementById('indigencyUniqueId');
    if (uniqueIdInput) {
        uniqueIdInput.addEventListener('input', function () {
            if (this.value.length >= 13) {
                fetchIndigencyUserData();
            }
        });
    }

    const previewButton = document.getElementById('indigencyPreview');
    if (previewButton) {
        previewButton.addEventListener('click', function() {
            // Validate form fields
            const name = document.getElementById('indigencyName').value.trim();
            const age = document.getElementById('indigencyAge').value.trim();
            const blklot = document.getElementById('indigencyBlklot').value.trim();
            const purpose = document.getElementById('indigencyPurpose').value;
            const issueDate = document.getElementById('indigencyIssueDate').value;

            if (!name || !age || !blklot || !purpose || !issueDate) {
                alert("Please fill in all required fields.");
                return;
            }

            // Get the day and add ordinal suffix
            const date = new Date(issueDate);
            const day = date.getDate();
            const ordinalDay = day + getOrdinalSuffix(day);
            const month = date.toLocaleString('default', { month: 'long' });
            const year = date.getFullYear();

            // Populate preview content
            document.getElementById('printIndigencyName1').textContent = name.toUpperCase();
            document.getElementById('printIndigencyName2').textContent = name.toUpperCase();
            document.getElementById('printIndigencyName3').textContent = name.toUpperCase();
            document.getElementById('printIndigencyAge').textContent = age;
            document.getElementById('printIndigencyBlklot').textContent = blklot;
            document.getElementById('printIndigencyPurpose').textContent = purpose.toUpperCase();
            document.getElementById('printIndigencyDay').textContent = ordinalDay;
            document.getElementById('printIndigencyMonth').textContent = month;
            document.getElementById('printIndigencyYear').textContent = year;

            // Show preview container
            const previewIndigency = document.getElementById('previewIndigency');
            if (previewIndigency) {
                previewIndigency.style.display = 'block';
            }
        });
    }

    // Add event listener to close the preview
    const closePreviewButton = document.getElementById('closePreviewIndigency');
    if (closePreviewButton) {
        closePreviewButton.addEventListener('click', function () {
            const previewIndigency = document.getElementById('previewIndigency');
            if (previewIndigency) previewIndigency.style.display = 'none';
        });
    }

    const printButton = document.getElementById('printIndigency');
    if (printButton) {
        printButton.addEventListener('click', async (event) => {
            // New Word document generation code will go here
            // This will replace the old printClearance function
        });
    }
});

window.generateWordIndigency = generateWordIndigency;
export { generateWordIndigency };