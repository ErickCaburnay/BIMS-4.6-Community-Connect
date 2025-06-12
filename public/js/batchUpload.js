// ############### BATCHUPLOAD.JS ###############
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { getFunctions, httpsCallable  } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-functions.js";

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
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app);

window.auth = auth;
window.db = db;
window.functions = functions;
window.httpsCallable = httpsCallable;

async function generateCustomId() {
    const counterDoc = await getDoc(doc(db, 'counters', 'userCounter'));
    let counter = counterDoc.exists() ? counterDoc.data().count : 1;
    await setDoc(doc(db, 'counters', 'userCounter'), { count: counter + 1 });

    return `SADPI-${String(counter).padStart(6, '0')}`;
}

function excelDateToJSDate(serial) {
    const utcDays = Math.floor(serial - 25569); // Excel date is the number of days since 1900-01-01, subtract 25569 to get from 1970-01-01
    const utcValue = utcDays * 86400; // 86400 seconds in a day
    const dateInfo = new Date(utcValue * 1000); // convert to milliseconds and create the date object
    return new Date(dateInfo.getUTCFullYear(), dateInfo.getUTCMonth(), dateInfo.getUTCDate());
}

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


document.getElementById('importBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            console.log('Extracted Data:', jsonData);

            const tbody = document.querySelector('#residentsTable tbody');
            tbody.innerHTML = '';

            const headers = jsonData[0];
            const rows = jsonData.slice(1);

            // Mapping between Excel headers and Firestore fields
            const headerMapping = {
                'Unique ID': 'uniqueId',
                'Last Name': 'lastName',
                'First Name': 'firstName',
                'Middle Name': 'middleName',
                'Ext': 'suffix',
                'Blk / Lot': 'blklot',
                'Street Name': 'street',
                'Place of Birth': 'birthplace',
                'Date of Birth': 'birthdate',
                'Sex': 'gender',
                'Civil Status': 'maritalStatus',
                'Occupation': 'occupation',
                'Voter Status': 'voter',
                'Citizenship': 'citizenship',
                'Employment Status': 'employmentStatus',
                'Educational Level': 'educationalStatus',
                'Email': 'email',
                'Contact No.': 'phone',
                'PWD': 'pwd',
                'KDBM': 'kdbm',
                '4Ps': 'fourPs',
                'Solo-Parent': 'soloParent',
            };

            // Determine column indices based on the Excel headers
            const headerIndices = Object.keys(headerMapping).reduce((indices, excelHeader) => {
                const idx = headers.indexOf(excelHeader);
                if (idx !== -1) indices[headerMapping[excelHeader]] = idx; // Use Firestore field names as keys
                return indices;
            }, {});

            console.log('Header Indices:', headerIndices);

            for (const row of rows) {
                if (row.length > 0) {
                    const rowObject = {};

                    // Generate a unique ID
                    const uniqueId = await generateCustomId();
                    rowObject.uniqueId = uniqueId;

                    rowObject.lastName = (row[headerIndices.lastName] || '').toUpperCase();
                    rowObject.firstName = (row[headerIndices.firstName] || '').toUpperCase();
                    rowObject.middleName = (row[headerIndices.middleName] || '').toUpperCase();
                    rowObject.suffix = (row[headerIndices.suffix] || '').toUpperCase();
                    rowObject.birthplace = (row[headerIndices.birthplace] || '').toUpperCase();
                    rowObject.maritalStatus = (row[headerIndices.maritalStatus] || '').toUpperCase();
                    rowObject.gender = (row[headerIndices.gender] || '').toUpperCase();
                    rowObject.voter = (row[headerIndices.voter] || '').toUpperCase();
                    rowObject.blklot = (row[headerIndices.blklot] || '').toUpperCase();
                    rowObject.street = (row[headerIndices.street] || '').toUpperCase();
                    rowObject.citizenship = (row[headerIndices.citizenship] || '').toUpperCase();
                    rowObject.employmentStatus = (row[headerIndices.employmentStatus] || '').toUpperCase();
                    rowObject.educationalStatus = (row[headerIndices.educationalStatus] || '').toUpperCase();
                    rowObject.occupation = (row[headerIndices.occupation] || '').toUpperCase();
                    rowObject.email = row[headerIndices.email] || '';
                    rowObject.phone = row[headerIndices.phone] || '';;
                    rowObject.pwd = (row[headerIndices.pwd] || '').toUpperCase();
                    rowObject.kdbm = (row[headerIndices.kdbm] || '').toUpperCase();
                    rowObject.fourPs = (row[headerIndices.fourPs] || '').toUpperCase();
                    rowObject.soloParent = (row[headerIndices.soloParent] || '').toUpperCase();

                    
                    // Handle birthdate format
                    if (row[headerIndices.birthdate] != null) {
                        const birthdateValue = row[headerIndices.birthdate];
                        if (typeof birthdateValue === 'number') {
                            // Convert Excel date number to JavaScript date
                            rowObject.birthdate = excelDateToJSDate(birthdateValue).toISOString().split('T')[0]; // Format to YYYY-MM-DD
                        } else {
                            rowObject.birthdate = birthdateValue; // If it's already a string, use it as is
                        }
                    } else {
                        rowObject.birthdate = null; // Default to null if no birthdate
                    }

                    // Combine names to create fullName
                    rowObject.fullName = `${rowObject.firstName} ${rowObject.middleName ? rowObject.middleName + ' ' : ''}${rowObject.lastName} ${rowObject.suffix || ''}`.trim();

                    // Calculate age (ensure birthdate is valid before calculating)
                    if (rowObject.birthdate) {
                        rowObject.age = calculateAge(new Date(rowObject.birthdate)); // Use JavaScript Date object
                    } else {
                        rowObject.age = null; // Default to null if no birthdate
                    }

                    // Check for required fields before saving
                    if (!rowObject.fullName || !rowObject.gender || !rowObject.maritalStatus) {
                        console.warn(`Skipping user with uniqueId ${uniqueId} due to missing required fields.`);
                        continue; // Skip this entry if required fields are missing
                    }

                    // Create table row in HTML
                    const tr = document.createElement('tr');

                    // Add UNIQUE ID column
                    let tdUniqueId = document.createElement('td');
                    tdUniqueId.textContent = uniqueId;
                    tr.appendChild(tdUniqueId);

                    // Add FULL NAME column
                    let tdFullName = document.createElement('td');
                    tdFullName.textContent = rowObject.fullName;
                    tr.appendChild(tdFullName);

                    // Add AGE column
                    let tdAge = document.createElement('td');
                    tdAge.textContent = rowObject.age != null ? rowObject.age : '';
                    tr.appendChild(tdAge);

                    // Add CIVIL STATUS column
                    let tdCivilStatus = document.createElement('td');
                    tdCivilStatus.textContent = rowObject.maritalStatus != null ? rowObject.maritalStatus : '';
                    tr.appendChild(tdCivilStatus);

                    // Add GENDER column
                    let tdGender = document.createElement('td');
                    tdGender.textContent = rowObject.gender != null ? rowObject.gender : '';
                    tr.appendChild(tdGender);

                    // Add VOTER STATUS column
                    let tdVoterStatus = document.createElement('td');
                    tdVoterStatus.textContent = rowObject.voter != null ? rowObject.voter : '';
                    tr.appendChild(tdVoterStatus);

                    // Append the new row to tbody
                    tbody.appendChild(tr);

                    // Save the rowObject to Firestore
                    try {
                        await setDoc(doc(db, "users", uniqueId), rowObject); // Save the user data
                        console.log(`User ${uniqueId} saved successfully!`);
                    } catch (error) {
                        console.error("Error saving user to Firestore:", error);
                    }
                }
            }
        };

        reader.readAsArrayBuffer(file);
    } else {
        alert('Please select a file to import.');
    }
});





export { app, db, auth, storage, firebaseConfig, functions, httpsCallable };
