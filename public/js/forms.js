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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let userData = null;

function calculateAge(birthdate) {
    if (!birthdate) return '';
    const today = new Date();
    const birth = new Date(birthdate);
    if (isNaN(birth.getTime())) return '';
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

function fetchUserData() {
    const uniqueId = document.getElementById('uniqueId').value;
    
    if (uniqueId) {
        const uppercaseUniqueId = uniqueId.toUpperCase();
        db.collection("users").where("uniqueId", "==", uppercaseUniqueId).get()
            .then((querySnapshot) => {
                if (!querySnapshot.empty) {
                    userData = querySnapshot.docs[0].data();
                    console.log("Fetched user data:", userData);
                    populateForm(userData);
                } else {
                    console.log("No user found with this ID");
                   
                }
            })
            .catch((error) => {
                console.error("Error fetching user data: ", error);
                
            });
    }
}

function clearUniqueIdField() {
    document.getElementById('uniqueId').value = '';
}

function clearAllFormFields() {
    const formFields = ['uniqueId', 'name', 'age', 'blklot', 'street', 'issueDate'];
    formFields.forEach(fieldId => {
        document.getElementById(fieldId).value = '';
    });
}


function populateForm(data) {
if (!data) {
console.log("No data provided to populateForm");
return;
}

console.log("Raw data received in populateForm:", data);

const nameElement = document.getElementById('name');
const ageElement = document.getElementById('age');
const blklotElement = document.getElementById('blklot');
const streetElement = document.getElementById('street');

if (nameElement) {
const fullName = `${data.firstName || ''} ${data.middleName || ''} ${data.lastName || ''}`.trim();
nameElement.value = fullName;
console.log("Name populated:", fullName);
}

if (ageElement) {
const age = calculateAge(data.birthdate);
ageElement.value = age !== '' ? age : '';
console.log("Age populated:", age);
}

if (blklotElement) {
blklotElement.value = data.blklot || '';
console.log("Blklot populated:", data.blklot);
} else {
console.log("Blklot element not found in the form");
}

if (streetElement) {
streetElement.value = data.street || '';
console.log("Street populated:", data.street);
}

console.log("Populated form data:", {
name: nameElement?.value,
age: ageElement?.value,
blklot: blklotElement?.value,
street: streetElement?.value
});
}

// function clearForm() {
//     ['uniqueId', 'name', 'age', 'blklot', 'street', 'issueDate'].forEach(id => {
//         const element = document.getElementById(id);
//         if (element) element.value = '';
//     });
//     userData = null;
// }

function showPreview() {
    const nameElement = document.getElementById('name');
    const ageElement = document.getElementById('age');
    const blklotElement = document.getElementById('blklot');
    const streetElement = document.getElementById('street');
    const issueDateElement = document.getElementById('issueDate');

    const name = nameElement?.value.trim() || '';
    const age = ageElement?.value.trim() || '';
    const blklot = blklotElement?.value.trim() || '';
    const street = streetElement?.value.trim() || '';
    const issueDate = issueDateElement?.value || '';

    console.log("Preview check:", { name, age, blklot, street, issueDate });

    if (!name || !blklot || !street || !issueDate) {
        alert("Please fill in all required fields (Name, Block/Lot, Street, and Issue Date).");
        return;
    }

    const elements = {
        'printName': name,
        'printAge': age,
        'printBlklot': blklot,
        'printStreet': street
    };

    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    if (issueDate) {
        const date = new Date(issueDate);
        if (!isNaN(date.getTime())) {
            const printDayElement = document.getElementById('printDay');
            const printMonthElement = document.getElementById('printMonth');
            const printYearElement = document.getElementById('printYear');
            const printIssueDateElement = document.getElementById('printIssueDate');

            if (printDayElement) printDayElement.textContent = date.getDate();
            if (printMonthElement) printMonthElement.textContent = date.toLocaleString('default', { month: 'long' });
            if (printYearElement) printYearElement.textContent = date.getFullYear();
            if (printIssueDateElement) printIssueDateElement.textContent = date.toLocaleDateString();
        }
    }

    const previewWindow = document.getElementById('previewWindow');
    if (previewWindow) previewWindow.style.display = 'block';
}

function closePreview() {
    const previewWindow = document.getElementById('previewWindow');
    if (previewWindow) previewWindow.style.display = 'none';
}

function printClearance() {
    showPreview();
    window.print();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const uniqueIdElement = document.getElementById('uniqueId');
if (uniqueIdElement) {
    uniqueIdElement.addEventListener('input', function(e) {
        console.log("Unique ID changed:", e.target.value);
        fetchUserData();
    });
}

    ['name', 'age', 'blklot', 'street', 'issueDate'].forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.addEventListener('input', function() {
                console.log(`${fieldId} changed:`, this.value);
            });
        }
    });

    const previewButton = document.querySelector('button[onclick="showPreview()"]');
    if (previewButton) previewButton.addEventListener('click', showPreview);

    const printButton = document.querySelector('.print-btn');
    if (printButton) printButton.addEventListener('click', printClearance);

    const closeButton = document.querySelector('.close-btn');
    if (closeButton) closeButton.addEventListener('click', closePreview);

    document.getElementById('clearField').addEventListener('click', clearUniqueIdField);
    document.getElementById('clearForm').addEventListener('click', clearAllFormFields);
});