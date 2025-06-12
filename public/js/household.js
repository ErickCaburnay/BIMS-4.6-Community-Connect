// <!-- ####### HOUSEHOLD.JS ########### -->
import { db, auth } from './firebaseConfig.js';
import { getFirestore, addDoc, doc, setDoc, getDoc, collection, deleteDoc, getDocs, query, where, orderBy, limit, startAt, endAt } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
 
function showLoader() {
    document.getElementById('loader-container').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loader-container').style.display = 'none';
}



const form = document.getElementById('household-info-form');
form.addEventListener('submit', handleSubmit);

async function handleSubmit(event) {
    event.preventDefault();
    showLoader();
  
    console.log("Starting handleSubmit");
  
    if (!auth.currentUser) {
      console.error("User not authenticated");
      hideLoader();
      return;
    }
    console.log("User authenticated:", auth.currentUser.uid);
  
    const formData = new FormData(event.target);
    const data = {
      householdNo: formData.get('household-no'),
      totalMembers: formData.get('total-members'),
      head: formData.get('head').toUpperCase(),
      totalMale: formData.get('total-male'),
      totalFemale: formData.get('total-female'),
      phone: formData.get('phone') || '',
    };
  
    try {
        const householdNo = await generateHouseholdNumber();
        data.householdNo = householdNo;
    
        await addDoc(collection(db, 'Household'), data);
    
        console.log("Document successfully written to Firestore.");
        closePopup();
        showSuccessPopup();
    
        event.target.reset();
        displayHouseholdData();
      } catch (error) {
        console.error("Error adding document: ", error);
        alert("Error adding document: " + error.message);
      }
      hideLoader();
}
  
async function generateHouseholdNumber() {
    const snapshot = await getDocs(query(collection(db, 'Household'), orderBy('householdNo', 'desc'), limit(1)));
    let householdNo = 1;
    if (!snapshot.empty) {
        const lastDoc = snapshot.docs[0];
        householdNo = lastDoc.data().householdNo + 1;
    }
    return householdNo;
    }

// async function displayHouseholdData() {
// const tableBody = document.querySelector('#householdTable tbody');
// tableBody.innerHTML = '';

// // Fetch the data from the "Household" collection
// const snapshot = await getDocs(query(collection(db, 'Household'), orderBy('householdNo')));

// // Loop through the documents and create table rows
// snapshot.forEach((doc) => {
//     const data = doc.data();
//     const row = document.createElement('tr');

//     row.innerHTML = `
//     <td>${data.householdNo}</td>
//     <td>${data.totalMembers}</td>
//     <td>${data.head}</td>
//     <td>${data.totalMale}</td>
//     <td>${data.totalFemale}</td>
//     <td>${data.phone}</td>
//     <td>
//         <button class="edit-button" data-id="${doc.id}">Edit</button>
//         <button class="delete-button" data-id="${doc.id}">Delete</button>
//     </td>
//     `;

//     tableBody.appendChild(row);
// });
// }

async function fetchAndDisplayHousehold() {
    console.log('Fetching household...');
    showLoader();

    const householdTable = document.getElementById('householdTable');
    if (!householdTable) {
        console.error('Could not find household table');
        hideLoader();
        return;
    }

    const tbody = householdTable.querySelector('tbody');
    if (!tbody) {
        console.error('Could not find table body');
        hideLoader();
        return;
    }

    tbody.innerHTML = '';

    try {
        const querySnapshot = await getDocs(query(collection(db, 'Household'), orderBy('householdNo')));
        console.log('Retrieved documents:', querySnapshot.size);

        if (querySnapshot.empty) {
            console.log('No documents found in the Household collection');
            tbody.innerHTML = '<tr><td colspan="7">No households found</td></tr>';
            hideLoader();
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const row = tbody.insertRow();

            // Populate the row with data
            row.insertCell(0).textContent = `${data.householdNo || ''}`;
            row.insertCell(1).textContent = data.totalMembers || '';
            row.insertCell(2).textContent = data.head || '';
            row.insertCell(3).textContent = data.totalMale || '';
            row.insertCell(4).textContent = data.totalFemale || '';
            row.insertCell(5).textContent = data.phone || '';

            // Create action cell with dropdown menu
            const actionCell = row.insertCell(6);
            actionCell.style.position = 'relative';

            const actionContainer = document.createElement('div');
            actionContainer.style.position = 'relative';
            actionContainer.style.display = 'inline-block';

            const actionButton = document.createElement('button');
            actionButton.textContent = 'Action';
            actionButton.className = 'action-btn';
            actionButton.onclick = (event) => showDropDown(event, doc.id);

            actionContainer.appendChild(actionButton);

            // Create dropdown menu (initially hidden)
            const dropdownMenu = document.createElement('div');
            dropdownMenu.className = 'action-dropdown-menu';
            dropdownMenu.style.display = 'none';
            dropdownMenu.innerHTML = `
                <button class="dropdown-button upd-button" onclick="updateHousehold('${doc.id}')">Update</button>
                <button class="dropdown-button del-button" onclick="deleteHousehold('${doc.id}')">Delete</button>
            `;
            actionContainer.appendChild(dropdownMenu);
            actionCell.appendChild(actionContainer);
        });
    } catch (error) {
        console.error("Error fetching documents: ", error);
        tbody.innerHTML = '<tr><td colspan="7">Error loading household</td></tr>';
    }

    hideLoader();
}

// function showDropDown(event, docId) {
//     const dropdownMenu = event.target.nextElementSibling;
//     dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
// }

function showDropDown(event, id) {
    event.stopPropagation();
    console.log("Show dropdown for household with ID:", id);

    const allDropdowns = document.querySelectorAll('.action-dropdown-menu');
    allDropdowns.forEach(dropdown => dropdown.style.display = 'none');

    const dropdown = event.target.nextElementSibling;
    if (dropdown && dropdown.classList.contains('action-dropdown-menu')) {
        const rect = event.target.getBoundingClientRect();
        const viewportWidth = window.innerWidth;

        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.top}px`;
        dropdown.style.left = `${rect.right}px`;
        dropdown.style.right = 'auto';

        // Check if dropdown would overflow to the right
        if (rect.right + dropdown.offsetWidth > viewportWidth) {
            dropdown.style.left = 'auto';
            dropdown.style.right = `${viewportWidth - rect.right}px`;
        }

        dropdown.style.display = 'block';
    }
}

// Function to close all dropdowns
function closeAllDropdowns() {
    const dropdowns = document.getElementsByClassName('action-dropdown-menu');
    for (let i = 0; i < dropdowns.length; i++) {
        dropdowns[i].style.display = 'none';
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', (event) => {
    if (!event.target.matches('.action-btn')) {
        const dropdowns = document.getElementsByClassName('action-dropdown-menu');
        for (let i = 0; i < dropdowns.length; i++) {
            dropdowns[i].style.display = 'none';
        }
    }
});

// Function to update a resident
function updateHousehold(docId) {
    // Implement the update functionality
    console.log('Update resident with ID:', docId);
}

// Function to delete a resident
function deleteHousehold(docId) {
    // Implement the delete functionality
    console.log('Delete resident with ID:', docId);
}    

// Function to show the popup
function showAddHousehold() {
    // Show the overlay
    document.getElementById('overlay').style.display = 'block';            
    document.getElementById('popupContainer').style.display = 'block';
}

function showSuccessPopup() {
    const successPopup = document.getElementById('successPopup');
    const overlay = document.getElementById('overlay');
    overlay.style.display = 'block';
    successPopup.style.display = 'block';
}

// Function to close the popup
function closePopup() {
    const successPopup = document.getElementById('successPopup');
    const popupContainer = document.getElementById('popupContainer');
    const overlay = document.getElementById('overlay');
    
    if (successPopup) successPopup.style.display = 'none';
    if (popupContainer) popupContainer.style.display = 'none';
    overlay.style.display = 'none';
}

document.getElementById('addHouseholdButton').addEventListener('click', showAddHousehold);
document.getElementById('closeButton').addEventListener('click', closePopup);
document.getElementById('overlay').addEventListener('click', closePopup);
document.getElementById('okButton').addEventListener('click', closePopup);

// Close dropdowns when clicking outside
document.addEventListener('click', (event) => {
    if (!event.target.matches('.action-btn')) {
        closeAllDropdowns();
    }
});

// Close dropdowns when pressing ESC key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeAllDropdowns();
    }
});

// Close dropdowns when scrolling
let lastScrollPosition = window.pageYOffset;
let ticking = false;

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const currentScrollPosition = window.pageYOffset;
            if (currentScrollPosition !== lastScrollPosition) {
                closeAllDropdowns();
            }
            lastScrollPosition = currentScrollPosition;
            ticking = false;
        });
        ticking = true;
    }
}, false);

fetchAndDisplayHousehold();
