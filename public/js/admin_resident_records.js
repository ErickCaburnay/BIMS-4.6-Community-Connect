// ############### ADMIN_RESIDENT_RECORDS.JS #################
import { db, auth } from './firebaseConfig.js';
import { getFirestore, doc, addDoc, setDoc, getDoc, collection, deleteDoc, getDocs, query, where, orderBy, startAfter, endAt, limit, onSnapshot, Timestamp  } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";


function showLoader() {
    document.getElementById('loader-container').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loader-container').style.display = 'none';
}

//######################## SEARCH RESIDENTS ##############################

async function searchResidents() {
    const searchInput = document.getElementById('search-resident');
    const searchTerm = searchInput.value.trim().toUpperCase();

    if (searchTerm === '') {
        fetchAndDisplayResidents();
        return;
    }

    const residentsTable = document.getElementById('residentsTable');
    const tbody = residentsTable.querySelector('tbody');
    tbody.innerHTML = '';

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const matchingDocs = querySnapshot.docs.filter(doc => {
            const data = doc.data();
            const fullName = `${data.firstName || ''} ${data.middleName || ''} ${data.lastName || ''} ${data.suffix || ''}`.toUpperCase();
            const age = data.birthdate ? calculateAge(data.birthdate).toString() : '';
            const voterStatus = data.voter ? data.voter.toUpperCase() : '';
            const maritalStatus = data.maritalStatus ? data.maritalStatus.toUpperCase() : '';
            const gender = data.gender ? data.gender.toUpperCase() : '';

            return (
                fullName.includes(searchTerm) ||
                (data.uniqueId && data.uniqueId.includes(searchTerm)) ||
                age.includes(searchTerm) ||
                voterStatus.includes(searchTerm) ||
                maritalStatus.includes(searchTerm) ||
                gender.includes(searchTerm)
            );
        });

        matchingDocs.forEach(doc => {
            const data = doc.data();
            const row = tbody.insertRow();

            // Populate the row with data
            row.insertCell(0).textContent = `${data.firstName || ''} ${data.middleName || ''} ${data.lastName || ''} ${data.suffix || ''}`;
            row.insertCell(1).textContent = data.uniqueId || '';
            const age = data.birthdate ? calculateAge(data.birthdate) : '';
            row.insertCell(2).textContent = age;
            row.insertCell(3).textContent = data.maritalStatus || '';
            row.insertCell(4).textContent = data.gender || '';
            row.insertCell(5).textContent = data.voter || '';

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
                <button class="dropdown-button upd-button" onclick="updateResident('${doc.id}')">Update</button>
                <button class="dropdown-button del-button" onclick="deleteResident('${doc.id}')">Delete</button>
            `;
            actionContainer.appendChild(dropdownMenu);
            actionCell.appendChild(actionContainer);
        });

        if (matchingDocs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">No matching residents found</td></tr>';
        }
    } catch (error) {
        console.error("Error searching residents: ", error);
        tbody.innerHTML = '<tr><td colspan="7">Error searching residents</td></tr>';
    }
}


  
document.addEventListener('DOMContentLoaded', () => {

    const searchButton = document.querySelector('.search-button');
    searchButton.addEventListener('click', searchResidents);

    const searchInput = document.getElementById('search-resident');
    searchInput.addEventListener('keyup', event => {
        if (event.key === 'Enter') {
            searchResidents();
        }
    });

    const clearButton = document.querySelector('.clear-button');
    clearButton.addEventListener('click', () => {
        const searchInput = document.getElementById('search-resident');
        searchInput.value = '';
        fetchAndDisplayResidents();
    });
});

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

//######################## FETCH AND DISPLAY TO TABLE ##############################
// Global variables for pagination
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let totalPages = 1;
let allResidents = [];

async function fetchAndDisplayResidents() {
    console.log('Fetching residents...');
    showLoader();
    
    const residentsTable = document.getElementById('residentsTable');
    const tbody = residentsTable?.querySelector('tbody');

    if (!residentsTable || !tbody) {
        console.error('Could not find residents table or table body');
        hideLoader();
        return;
    }

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        console.log('Retrieved documents:', querySnapshot.size);

        if (querySnapshot.empty) {
            console.log('No documents found in the users collection');
            tbody.innerHTML = '<tr><td colspan="7">No residents found</td></tr>';
            updatePaginationControls();
            hideLoader();
            return;
        }

        // Store all residents
        allResidents = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Calculate total pages
        totalPages = Math.ceil(allResidents.length / ITEMS_PER_PAGE);
        displayResidentsPage(currentPage);
        updatePaginationControls();

    } catch (error) {
        console.error("Error fetching documents: ", error);
        tbody.innerHTML = '<tr><td colspan="7">Error loading residents</td></tr>';
    }
    hideLoader();
}

function displayResidentsPage(page) {
    const residentsTable = document.getElementById('residentsTable');
    const tbody = residentsTable.querySelector('tbody');
    tbody.innerHTML = '';

    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, allResidents.length);
    const pageResidents = allResidents.slice(startIndex, endIndex);

    pageResidents.forEach((data) => {
        const row = tbody.insertRow();

        // Add data cells
        const nameCell = row.insertCell(0);
        const fullName = `${data.firstName || ''} ${data.middleName || ''} ${data.lastName || ''} ${data.suffix || ''}`;
        nameCell.innerHTML = `
            <div class="name-container">
                ${data.role === 'head' ? '<span class="head-indicator">👑</span>' : '<span class="head-indicator-placeholder"></span>'}
                <span class="resident-name">${fullName}</span>
            </div>
        `;
        const uniqueIdCell = row.insertCell(1);
        uniqueIdCell.textContent = data.uniqueId || '';
        uniqueIdCell.classList.add('unique-id-cell');
        row.insertCell(2).textContent = data.birthdate ? calculateAge(data.birthdate) : '';
        row.insertCell(3).textContent = data.maritalStatus || '';
        row.insertCell(4).textContent = data.gender || '';
        row.insertCell(5).textContent = data.voter || '';

        // Create action cell with button
        const actionCell = row.insertCell(6);
        actionCell.innerHTML = `
            <div class="action-container">
                <button class="action-btn" data-resident-id="${data.id}">Action</button>
                <div class="action-dropdown-menu" style="display: none;">
                    <button class="dropdown-button upd-button" data-action="update">Update</button>
                    <button class="dropdown-button del-button" data-action="delete">Delete</button>
                </div>
            </div>
        `;
        if (data.role === 'head') {
            row.classList.add('household-head-row');
        }
    });

    updateShowingEntries(pageResidents.length);
}


function updatePaginationControls() {
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) return;

    const maxVisiblePages = 5;
    let paginationHTML = `
        <div class="pagination">
            <button onclick="changePage(1)" class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''}>
                First
            </button>
            <button onclick="changePage(${currentPage - 1})" class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''}>
                Prev
            </button>
    `;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="changePage(${i})" class="pagination-btn ${i === currentPage ? 'active' : ''}">
                ${i}
            </button>
        `;
    }

    paginationHTML += `
        <button onclick="changePage(${currentPage + 1})" class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''}>
            Next
        </button>
        <button onclick="changePage(${totalPages})" class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''}>
            Last
        </button>
        <span class="pagination-info">Page ${currentPage} of ${totalPages}</span>
    `;

    paginationContainer.innerHTML = paginationHTML;
}

// Function to handle page changes
window.changePage = function(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    displayResidentsPage(currentPage);
    updatePaginationControls();
};

function updateShowingEntries(pageEntries) {
    const showingEntriesElement = document.getElementById('showingEntriesResidents');
    const totalEntries = allResidents.length;
    const startEntry = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endEntry = Math.min(startEntry + pageEntries - 1, totalEntries);

    if (showingEntriesElement) {
        showingEntriesElement.textContent = `Showing ${startEntry} to ${endEntry} of ${totalEntries} entries`;
    }
}

// Add styles for pagination
const paginationStyles = document.createElement('style');
paginationStyles.textContent = `
    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        margin-top: 20px;
        margin-bottom: 20px;
    }

    .pagination-btn {
        padding: 6px 12px;
        border: 1px solid #dee2e6;
        background-color: white;
        color: #007bff;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;
    }

    .pagination-btn:hover:not([disabled]) {
        background-color: #e9ecef;
        border-color: #dee2e6;
        color: #0056b3;
    }

    .pagination-btn.active {
        background-color: #007bff;
        border-color: #007bff;
        color: white;
    }

    .pagination-btn[disabled] {
        cursor: not-allowed;
        opacity: 0.6;
    }

    .pagination-info {
        margin-left: 16px;
        color: #6c757d;
        font-size: 0.9em;
    }

    #showingEntriesResidents {
        margin: 10px 0;
        color: #6c757d;
        font-size: 0.9em;
    }
`;
document.head.appendChild(paginationStyles);

// Initialize the table
fetchAndDisplayResidents();

//############################### DISPLAY TABLE ROW DATA ####################################
document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#residentsTable tbody');
    if (tableBody) {
        tableBody.addEventListener('click', function(event) {
            // If clicking action button or dropdown, handle only that
            if (event.target.closest('.action-btn') || event.target.closest('.action-dropdown-menu')) {
                const actionBtn = event.target.closest('.action-btn');
                if (actionBtn) {
                    const dropdown = actionBtn.nextElementSibling;
                    document.querySelectorAll('.action-dropdown-menu').forEach(menu => {
                        if (menu !== dropdown) menu.style.display = 'none';
                    });
                    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                    event.stopPropagation();
                }
 
                const dropdownBtn = event.target.closest('.dropdown-button');
                if (dropdownBtn) {
                    const residentId = dropdownBtn.closest('.action-container').querySelector('.action-btn').dataset.residentId;
                    const action = dropdownBtn.dataset.action;
                    if (action === 'update') {
                        updateResident(residentId);
                    } else if (action === 'delete') {
                        deleteResident(residentId);
                    }
                }
                return;
            }
 
            // Otherwise handle row click
            const row = event.target.closest('tr');
            if (row) {
                displayRowData(row);
            }
        });
    }
 
    // Setup close button for popup
    const closeButton = document.getElementById('rowCloseDisplay');
    if (closeButton) {
        closeButton.addEventListener('click', closePopup);
    }
 });

 async function displayRowData(row) {
    const displayPopupContent = document.getElementById('displayPopupContent');
    if (!displayPopupContent) {
        console.error('Display popup content element not found');
        return;
    }
    displayPopupContent.innerHTML = 'Loading...';

    const uniqueIdCell = row.querySelector('.unique-id-cell');
    if (!uniqueIdCell) {
        console.error('Unique ID cell not found in the row');
        return;
    }
    const uniqueId = uniqueIdCell.textContent;

    try {
        // Query Firestore for user data
        const userQuerySnapshot = await getDocs(query(collection(db, "users"), where("uniqueId", "==", uniqueId)));

        if (!userQuerySnapshot.empty) {
            const userData = userQuerySnapshot.docs[0].data();
            const firstName = userData.firstName || '';
            const middleName = userData.middleName || '';
            const lastName = userData.lastName || '';
            const suffix = userData.suffix || '';
            const fullName = `${firstName} ${middleName} ${lastName} ${suffix}`.replace(/\s+/g, ' ').trim();

            // Initialize default household data
            let householdData = {
                householdId: 'N/A',
                role: 'N/A',
                members: 'Total: 0',
                address: `${userData.blklot || ''} ${userData.street || ''}`.trim(),
                ownership: 'N/A'
            };

            try {
                // MODIFIED: Simplified household query to check by householdId
                if (userData.householdId) {
                    const householdQuerySnapshot = await getDocs(query(
                        collection(db, "Household"),
                        where("householdId", "==", userData.householdId)
                    ));

                    if (!householdQuerySnapshot.empty) {
                        const household = householdQuerySnapshot.docs[0].data();
                        
                        // MODIFIED: Update householdData based on household document
                        householdData = {
                            householdId: household.householdId || 'N/A',
                            role: userData.role === 'head' ? 'Head of Household' : 'Member',
                            members: `Total: ${household.totalMembers || 0} (Male: ${household.totalMale || 0}, Female: ${household.totalFemale || 0})`,
                            address: household.address || householdData.address,
                            ownership: household.ownership || 'N/A'
                        };
                    }
                } else {
                    console.log('No household association found for user:', uniqueId);
                }
            } catch (householdError) {
                console.error("Error fetching household data: ", householdError);
            }

            // NO CHANGES: Rest of the popup content structure remains the same
            const popupContent = `
                <div class="content-wrapper">
                    <div class="header-with-qr">
                        <div class="resident-name-section">
                            <h3 class="resident-name">${fullName}</h3>
                            <div class="resident-id">${uniqueId}</div>

                            <div class="household-summary">
                                <div class="household-details">
                                    <span class="household-label">Household ID:</span>
                                    <span class="household-value">${householdData.householdId}</span>
                                </div>
                                <div class="household-details">
                                    <span class="household-label">Role:</span>
                                    <span class="household-value ${householdData.role === 'Head of Household' ? 'head-status' : ''}">${householdData.role}</span>
                                </div>
                                <div class="household-details">
                                    <span class="household-label">Members:</span>
                                    <span class="household-value">${householdData.members}</span>
                                </div>
                                <div class="household-details">
                                    <span class="household-label">Ownership:</span>
                                    <span class="household-value">${householdData.ownership}</span>
                                </div>
                            </div>
                        </div>
                        <div class="qrCodeContainer" id="qrcode">
                            <!-- QR code will be generated here -->
                        </div>
                    </div>

                    <div class="info-grid">
                        <!-- NO CHANGES: All info sections remain the same -->
                        <div class="info-section">
                            <div class="section-title">Personal Information</div>
                            <div class="info-group">
                                <div class="info-item">
                                    <span class="info-label">Birthdate</span>
                                    <span class="info-value">${userData.birthdate || ''}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Age</span>
                                    <span class="info-value">${userData.birthdate ? calculateAge(userData.birthdate) : ''}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Birthplace</span>
                                    <span class="info-value">${userData.birthplace || ''}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Gender</span>
                                    <span class="info-value">${userData.gender || ''}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Citizenship</span>
                                    <span class="info-value">${userData.citizenship || ''}</span>
                                </div>
                            </div>
                        </div>

                        <div class="info-section">
                            <div class="section-title">Contact Details</div>
                            <div class="info-group">
                                <div class="info-item">
                                    <span class="info-label">Email</span>
                                    <span class="info-value">${userData.email || ''}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Contact No.</span>
                                    <span class="info-value">${userData.phone || ''}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Address</span>
                                    <span class="info-value">Blk/Lot: ${userData.blklot || ''}, ${userData.street || ''}</span>
                                </div>
                            </div>
                        </div>

                        <div class="info-section">
                            <div class="section-title">Status Information</div>
                            <div class="info-group">
                                <div class="info-item">
                                    <span class="info-label">Voter Status</span>
                                    <span class="info-value">${userData.voter || ''}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Marital Status</span>
                                    <span class="info-value">${userData.maritalStatus || ''}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Work Status</span>
                                    <span class="info-value">${userData.employmentStatus || ''}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Educational Level</span>
                                    <span class="info-value">${userData.educationalStatus || ''}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Occupation</span>
                                    <span class="info-value">${userData.occupation || ''}</span>
                                </div>
                            </div>
                        </div>

                        <div class="info-section">
                            <div class="section-title">Benefits & Special Categories</div>
                            <div class="info-group benefits-grid">
                                <div class="benefit-item ${userData.pwd ? 'active' : ''}">
                                    <span class="benefit-label">PWD</span>
                                    <span class="benefit-value">${userData.pwd || 'N/A'}</span>
                                </div>
                                <div class="benefit-item ${userData.kdbm ? 'active' : ''}">
                                    <span class="benefit-label">KDBM</span>
                                    <span class="benefit-value">${userData.kdbm || 'N/A'}</span>
                                </div>
                                <div class="benefit-item ${userData.fourPs ? 'active' : ''}">
                                    <span class="benefit-label">4Ps</span>
                                    <span class="benefit-value">${userData.fourPs || 'N/A'}</span>
                                </div>
                                <div class="benefit-item ${userData.soloParent ? 'active' : ''}">
                                    <span class="benefit-label">Solo Parent</span>
                                    <span class="benefit-value">${userData.soloParent || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            displayPopupContent.innerHTML = popupContent;

            // NO CHANGES: QR Code generation remains the same
            const qrCodeData = {
                id: uniqueId,
                name: fullName,
                birthdate: userData.birthdate || '',
                gender: userData.gender || '',
                contact: userData.phone || '',
                email: userData.email || ''
            };
        
            const qrString = JSON.stringify(qrCodeData);
        
            try {
                new QRCode(document.getElementById("qrcode"), {
                    text: qrString.length > 500 ? 
                        JSON.stringify({ id: uniqueId, name: fullName }) : 
                        qrString,
                    width: 128,
                    height: 128,
                    correctLevel: QRCode.CorrectLevel.L
                });
            } catch (qrError) {
                console.error('Error generating QR code:', qrError);
            }

        } else {
            displayPopupContent.innerHTML = '<p>No data found for the selected row.</p>';
        }
    } catch (error) {
        console.error("Error fetching row data: ", error);
        displayPopupContent.innerHTML = '<p>Error loading row data.</p>';
    }

    const disOverlay = document.getElementById('disOverlay');
    const disPopup = document.getElementById('disPopup');
    if (disOverlay && disPopup) {
        disOverlay.style.display = 'flex';
        disPopup.style.display = 'block';
    }
}

function closePopup() {
    const disOverlay = document.getElementById('disOverlay');
    const disPopup = document.getElementById('disPopup');
    if (disOverlay && disPopup) {
        disOverlay.style.display = 'none';
        disPopup.style.display = 'none';
    }
}


function showDropDown(event, id) {
    event.stopPropagation();
    console.log("Show dropdown for resident with ID:", id);

//     const allDropdowns = document.querySelectorAll('.action-dropdown-menu');
//     allDropdowns.forEach(dropdown => dropdown.style.display = 'none');

//     const dropdown = event.target.nextElementSibling;
//     if (dropdown && dropdown.classList.contains('action-dropdown-menu')) {
//         const rect = event.target.getBoundingClientRect();
//         const viewportWidth = window.innerWidth;

//         dropdown.style.position = 'fixed';
//         dropdown.style.top = `${rect.top}px`;
//         dropdown.style.left = `${rect.right}px`;
//         dropdown.style.right = 'auto';

//         // Check if dropdown would overflow to the right
//         if (rect.right + dropdown.offsetWidth > viewportWidth) {
//             dropdown.style.left = 'auto';
//             dropdown.style.right = `${viewportWidth - rect.right}px`;
//         }

//         dropdown.style.display = 'block';
//     }
// }

const allDropdowns = document.querySelectorAll('.action-dropdown-menu');
    allDropdowns.forEach(dropdown => dropdown.style.display = 'none');

    const actionBtn = event.target;
    const dropdown = actionBtn.nextElementSibling;
    
    if (dropdown && dropdown.classList.contains('action-dropdown-menu')) {
        const rect = actionBtn.getBoundingClientRect();
        dropdown.style.display = 'block';
    }
};

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


//######################## ADD RESIDENT POPUP ##############################

window.showAddResidentPopup = () => {
    const overlay = document.getElementById('overlay');
    const popupContainer = document.getElementById('popupContainer');
    overlay.style.display = 'flex';
    popupContainer.style.display = 'block';
};



async function updateResident(id) {
    console.log("Update resident with ID:", id);

    try {
        const docRef = doc(db, "users", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Helper function to safely set input values
            const setInputValue = (id, value) => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = value || '';
                } else {
                    console.warn(`Element with id '${id}' not found`);
                }
            };

            // Pre-populate the update form fields with the existing data
            setInputValue('upd-fname', data.firstName);
            setInputValue('upd-mname', data.middleName);
            setInputValue('upd-lname', data.lastName);
            setInputValue('upd-suffix', data.suffix);
            setInputValue('upd-blklot', data.blklot);
            setInputValue('upd-street', data.street);
            setInputValue('upd-citizenship', data.citizenship);
            setInputValue('upd-birthdate', data.birthdate);
            setInputValue('upd-birthplace', data.birthplace);
            setInputValue('upd-gender', data.gender);
            setInputValue('upd-voter', data.voter);
            setInputValue('upd-email', data.email);
            setInputValue('upd-marital-status', data.maritalStatus);
            setInputValue('upd-employment-status', data.employmentStatus);
            setInputValue('upd-educational-status', data.educationalStatus);
            setInputValue('upd-phone', data.phone);
            setInputValue('upd-occupation', data.occupation);

            // Handle age calculation
            const birthdateInput = document.getElementById('upd-birthdate');
            const ageInput = document.getElementById('upd-age');

            if (birthdateInput && ageInput) {
                const updateAge = () => {
                    const birthdate = birthdateInput.value;
                    const age = birthdate ? calculateAge(birthdate) : '';
                    ageInput.value = age;
                };

                updateAge(); // Initial age calculation
                birthdateInput.addEventListener('change', updateAge);

                ageInput.readOnly = true;
            } else {
                console.warn('Birthdate or age input not found');
            }

            // Show the update resident popup
            const updOverlay = document.getElementById('updOverlay');
            const updPopupContainer = document.getElementById('updPopupContainer');
            if (updOverlay && updPopupContainer) {
                updOverlay.style.display = 'flex';
                updPopupContainer.style.display = 'block';
            } else {
                console.warn('Update popup elements not found');
            }

            // Set the resident ID as a data attribute on the update form
            const updateForm = document.getElementById('update-info-form');
            if (updateForm) {
                updateForm.setAttribute('data-resident-id', id);

                // Remove any existing event listeners on the update form
                updateForm.removeEventListener('submit', handleUpdateSubmit);

                // Add event listener to the update form submission
                updateForm.addEventListener('submit', handleUpdateSubmit);
            } else {
                console.warn('Update form not found');
            }
        } else {
            console.log("No such document!");
        }
    } catch (error) {
        console.error("Error getting document:", error);
    }
}

async function handleUpdateSubmit(event) {
    event.preventDefault();

    const updateForm = event.target;
    const residentId = updateForm.getAttribute('data-resident-id');

    if (!residentId) {
        console.error("Resident ID not found on the form");
        alert("Error: Resident ID not found. Please try again.");
        return;
    }

    const formData = new FormData(updateForm);
    const data = {
        
        firstName: formData.get('fname').toUpperCase(),
        middleName: formData.get('mname').toUpperCase() || '',
        lastName: formData.get('lname').toUpperCase(),
        suffix: formData.get('suffix').toUpperCase() || '',
        email: formData.get('email') || '',
        phone: formData.get('phone').toUpperCase() || '',
        birthdate: formData.get('birthdate'),
        birthplace: formData.get('birthplace').toUpperCase() || '',
        citizenship: formData.get('citizenship').toUpperCase(),
        gender: formData.get('gender').toUpperCase(),
        voter: formData.get('voter').toUpperCase(),
        maritalStatus: formData.get('marital-status').toUpperCase(),
        employmentStatus: formData.get('employment-status').toUpperCase(),
        educationalStatus: formData.get('educational-status') || '',
        occupation: formData.get('occupation').toUpperCase() || '',
        blklot: formData.get('blklot').toUpperCase(),
        street: formData.get('street').toUpperCase() || '',
        pwd: formData.get('pwd') || '',
        kdbm: formData.get('kdbm') || '',
        fourPs: formData.get('fourPs') || '',
        soloParent: formData.get('soloParent') || '',
        role: "N/A"
    };

    try {
        await setDoc(doc(db, 'users', residentId), data, { merge: true });
        console.log("Document successfully updated!");

        const logEntry = {
            userId: user.uid,
            email: user.email,
            action: `Resident ${originalFullName} has been updated`,
            role: 'Admin',
            details: {
                residentId: residentId,
                updatedBy: user.email,
                originalName: originalFullName,
                updatedName: updatedFullName
            },
            timestamp: Timestamp.fromDate(new Date())
        };

        await addDoc(collection(db, 'activity_logs'), logEntry);

        // Close the update resident popup
        closeUpdatePopup();

        // Refresh the residents table
        await fetchAndDisplayResidents();

        alert("Resident information updated successfully!");
    } catch (error) {
        console.error("Error updating document: ", error);
        alert("Error updating resident information: " + error.message);
    }
}

function closeUpdatePopup() {
    const updOverlay = document.getElementById('updOverlay');
    const updPopupContainer = document.getElementById('updPopupContainer');
    if (updOverlay && updPopupContainer) {
        updOverlay.style.display = 'none';
        updPopupContainer.style.display = 'none';
    } else {
        console.warn('Update popup elements not found when trying to close');
    }
}

async function deleteResident(id) {
    const docRef = doc(db, "users", id);
    const docSnap = await getDoc(docRef);
    let residentName = "";
    
    if (docSnap.exists()) {
        const data = docSnap.data();
        residentName = `${data.firstName} ${data.lastName}`;
    }

    const deleteResidentOverlay = document.getElementById('deleteResidentOverlay');
    const confirmDeleteBtn = document.getElementById('confirmDeleteResident');
    const cancelDeleteBtn = document.getElementById('cancelDeleteResident');
    deleteResidentOverlay.classList.remove('hidden');

    return new Promise((resolve) => {
        const handleConfirm = async () => {
            try {
                if (docSnap.exists()) {
                    const residentData = docSnap.data();
                    
                    // Fetch admin username
                    const adminEmail = auth.currentUser.email;
                    const adminQuery = query(
                        collection(db, "Admin_Accounts"),
                        where("email", "==", adminEmail)
                    );
                    const adminSnapshot = await getDocs(adminQuery);
                    const adminUsername = !adminSnapshot.empty ? 
                        adminSnapshot.docs[0].data().username : 
                        'unknown';

                    const archivedData = {
                        ...residentData,
                        archivedAt: new Date().toISOString(),
                        originalId: id,
                        archivedBy: adminUsername
                    };

                    await setDoc(doc(db, "archived_residents", id), archivedData);
                    await deleteDoc(doc(db, "users", id));

                    // Log deletion activity
                    const logEntry = {
                        userId: auth.currentUser.uid,
                        email: auth.currentUser.email,
                        action: `Resident ${residentName} has been deleted`,
                        role: 'Admin',
                        details: {
                            residentName,
                            residentId: id,
                            deletedBy: auth.currentUser.email,
                            deletedByUsername: adminUsername
                        },
                        timestamp: Timestamp.fromDate(new Date())
                    };

                    fetchAndDisplayResidents();
                    
                    alert(`${residentName} has been archived and removed successfully.`);
                } else {
                    alert("Error: Resident not found");
                }
            } catch (error) {
                console.error("Error in delete/archive process: ", error);
                alert("Error processing deletion: " + error.message);
            }
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            confirmDeleteBtn.removeEventListener('click', handleConfirm);
            cancelDeleteBtn.removeEventListener('click', handleCancel);
            deleteResidentOverlay.classList.add('hidden');
        };

        confirmDeleteBtn.addEventListener('click', handleConfirm);
        cancelDeleteBtn.addEventListener('click', handleCancel);
        deleteResidentOverlay.addEventListener('click', (e) => {
            if (e.target === deleteResidentOverlay) handleCancel();
        });
        
        const handleEscKey = (e) => {
            if (e.key === 'Escape') {
                handleCancel();
                document.removeEventListener('keydown', handleEscKey);
            }
        };
        document.addEventListener('keydown', handleEscKey);
    });
}

async function handleSubmit(event) {
    event.preventDefault();
    showLoader();
    console.log("Starting handleSubmit");

    if (!auth.currentUser) {
        console.error("User not authenticated");
        hideLoader();
        return;
    }

    const formData = collectFormData(event);
    try {
        const customId = await generateCustomId();
        await saveDataToFirestore(formData, customId);
        
        // Log the addition activity
        const logEntry = {
            userId: auth.currentUser.uid,
            email: auth.currentUser.email,
            action: `${auth.currentUser.email} has added a new resident`,
            role: 'Admin',
            details: {
                residentId: customId,
                residentName: `${formData.firstName} ${formData.middleName} ${formData.lastName} ${formData.suffix}`.trim(),
                addedBy: auth.currentUser.email
            },
            timestamp: Timestamp.fromDate(new Date())
        };
        
        await addDoc(collection(db, 'activity_logs'), logEntry);
        
        console.log("Resident added and activity logged successfully!");
        showSubPopup(formData, customId);
        closeAddResidentPopup();
        event.target.reset();
        
        // Refresh the residents table
        await fetchAndDisplayResidents();
    } catch (error) {
        handleError(error);
    } finally {
        hideLoader();
    }
}

function collectFormData(event) {
    const formData = new FormData(event.target);
    return {
        firstName: formData.get('fname').toUpperCase(),
        middleName: formData.get('mname').toUpperCase() || '',
        lastName: formData.get('lname').toUpperCase(),
        suffix: formData.get('suffix').toUpperCase() || '',
        email: formData.get('email') || '',
        phone: formData.get('phone').toUpperCase() || '',
        birthdate: formData.get('birthdate'),
        birthplace: formData.get('birthplace').toUpperCase() || '',
        citizenship: formData.get('citizenship').toUpperCase(),
        age: formData.get('age'),
        gender: formData.get('gender').toUpperCase(),
        voter: formData.get('voter').toUpperCase(),
        maritalStatus: formData.get('marital-status').toUpperCase(),
        employmentStatus: formData.get('employment-status').toUpperCase(),
        educationalStatus: formData.get('educational-status') || '',
        occupation: formData.get('occupation').toUpperCase() || '',
        blklot: formData.get('blklot').toUpperCase(),
        street: formData.get('street').toUpperCase() || '',
        pwd: formData.get('pwd').toUpperCase() || '',
        kdbm: formData.get('kdbm').toUpperCase() || '',
        fourPs: formData.get('fourPs').toUpperCase() || '',
        soloParent: formData.get('soloParent').toUpperCase() || '',
        householdId: null,
        role: null
    };
}

async function generateCustomId() {
    const counterDoc = await getDoc(doc(db, 'counters', 'userCounter'));
    let counter = counterDoc.exists() ? counterDoc.data().count : 1;
    await setDoc(doc(db, 'counters', 'userCounter'), { count: counter + 1 });

    return `SADPI-${String(counter).padStart(6, '0')}`;
}

async function saveDataToFirestore(data, customId) {
    data.uniqueId = customId;

    const finalData = {
        ...data,
        uniqueId: customId,
        householdId: null, 
        role: null      
    };

    console.log("Data being sent:", finalData);
    await setDoc(doc(db, 'users', customId), finalData);
    console.log("Document successfully written to Firestore:", customId);
}

function handleError(error) {
    console.error("Error adding document:", error);
    alert("Error adding document: " + error.message);
}

// function showSubPopup(data, docId) {
//     const subOverlay = document.getElementById('subOverlay');
//     const subPopup = document.getElementById('subPopup');
//     const subPopupContent = document.getElementById('subPopupContent');
//     const qrCodeContainer = document.getElementById('qrCodeContainer');

//     if (subPopupContent && qrCodeContainer) {
//         subPopupContent.innerHTML = generatePopupContent(data, docId);
//         generateQRCode('qrCodeContainer', data, docId);
//         subOverlay.style.display = 'flex';
//         subPopup.classList.add('active');
//     } else {
//         console.error("Popup elements not found in the DOM.");
//     }
// }

function showSubPopup(data, docId) {
    const subOverlay = document.getElementById('subOverlay');
    const subPopup = document.getElementById('subPopup');
    const subPopupContent = document.getElementById('subPopupContent');
    const qrCodeContainer = document.getElementById('qrCodeContainer');

    if (subPopupContent && qrCodeContainer) {
        subPopupContent.innerHTML = generatePopupContent(data, docId);
        generateQRCode('qrCodeContainer', data, docId);
        subOverlay.style.display = 'flex';
        subPopup.classList.add('active');

        // Attach click event to the OK button
        const okButton = document.getElementById('ok');
        if (okButton) {
            okButton.onclick = closeSubPopup;
        }
    } else {
        console.error("Popup elements not found in the DOM.");
    }
}

function closeSubPopup() {
    const subOverlay = document.getElementById('subOverlay');
    const subPopup = document.getElementById('subPopup');

    // Hide the overlay and popup
    subOverlay.style.display = 'none';
    subPopup.classList.remove('active');
}


function generatePopupContent(data, docId) {
    const fullName = formatFullName(data);
    return `
        <div class="display-row">
                    <p class="popup-value">${fullName}</p>
            <div class="row-popup-content">
                <div class="row-column">
                    <p class="popup-value">${data.uniqueId ? `Document ID: ${data.uniqueId}` : ''}</p>
                    <p class="popup-value">${data.blklot ? `Blk/Lot: ${data.blklot}` : ''}</p>
                    <p class="popup-value">${data.street ? `Street: ${data.street}` : ''}</p>
                    <p class="popup-value">${data.birthdate ? `Birthdate: ${data.birthdate}` : ''}</p>
                    <p class="popup-value">${data.birthdate ? `Age: ${calculateAge(data.birthdate)}` : ''}</p>
                    <p class="popup-value">${data.birthplace ? `Birthplace: ${data.birthplace}` : ''}</p>
                    <p class="popup-value">${data.email ? `Email: ${data.email}` : ''}</p>
                </div>
                <div class="row-column">
                    <p class="popup-value">${data.phone ? `Contact No.: ${data.phone}` : ''}</p>
                    <p class="popup-value">${data.citizenship ? `Citizenship: ${data.citizenship}` : ''}</p>
                    <p class="popup-value">${data.gender ? `Gender: ${data.gender}` : ''}</p>
                    <p class="popup-value">${data.voter ? `Voter Status: ${data.voter}` : ''}</p>
                    <p class="popup-value">${data.maritalStatus ? `Marital Status: ${data.maritalStatus}` : ''}</p>
                    <p class="popup-value">${data.employmentStatus ? `Work Status: ${data.employmentStatus}` : ''}</p>
                    <p class="popup-value">${data.educationalStatus ? `Educational Level: ${data.educationalStatus}` : ''}</p>
                    <p class="popup-value">${data.occupation ? `Occupation: ${data.occupation}` : ''}</p>
                </div>
                <div class="row-column">
                    <p class="popup-value">${data.pwd ? `PWD: ${data.pwd}` : ''}</p>
                    <p class="popup-value">${data.kdbm ? `KDBM: ${data.kdbm}` : ''}</p>
                    <p class="popup-value">${data.fourPs ? `4 Ps: ${data.fourPs}` : ''}</p>
                    <p class="popup-value">${data.soloParent ? `Solo-Parent: ${data.soloParent}` : ''}</p>
                </div>
                <div class="row-column">
                    <div id="qrCodeContainer" class="qr-code-container"></div>
                </div>
            </div>
        </div>
    `;
}

function generateQRCode(containerId, data, docId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`QR code container with id '${containerId}' not found`);
        return;
    }

    const qrData = prepareQrData(data, docId);
    try {
        $(container).empty();
        $(container).qrcode({ text: qrData, width: 200, height: 200, correctLevel: 3 });
        console.log("QR code generated successfully");
    } catch (error) {
        console.error("Error generating QR code:", error);
    }
}

function prepareQrData(data, docId) {
    const fullName = formatFullName(data);
    const qrDataObject = {
        Full_Name: fullName,
        Birthdate: data.birthdate || '',
        Gender: data.gender || '',
        Age: data.age || '',
        Email: data.email || '',
        Contact_No: data.phone || ''
    };

    return JSON.stringify(qrDataObject);
}

function formatFullName(data) {
    return [
        data.firstName,
        data.middleName,
        data.lastName,
        data.suffix
    ].filter(Boolean).join(' ');
}

function closeAddResidentPopup() {
    const overlay = document.getElementById('overlay');
    const popupContainer = document.getElementById('popupContainer');
    overlay.style.display = 'none';
    popupContainer.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');

    const addResidentButton = document.querySelector('.add-resident-button');
    addResidentButton.addEventListener('click', showAddResidentPopup);

    const infoForm = document.getElementById('personal-info-form');
    infoForm.addEventListener('submit', handleSubmit);

    //event listener for close button
    const closeButton = document.getElementById('closeButton');
    if (closeButton) {
        closeButton.addEventListener('click', closeAddResidentPopup);
    } else {
        console.error("Close button not found");
    }

    const updCloseButton = document.getElementById('updCloseButton');
    if (updCloseButton) {
        updCloseButton.addEventListener('click', closeUpdatePopup);
    } else {
        console.error("Update close button not found");
    }

    fetchAndDisplayResidents();

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
});

window.updateResident = updateResident;
window.deleteResident = deleteResident;

async function loadResidentsData() {
    try {
      const querySnapshot = await db.collection('users').get();
      const tableBody = document.querySelector('#residentsTable tbody');
      tableBody.innerHTML = ''; // Clear existing rows
  
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const row = `
          <tr>
            <td>${userData.fullName || 'N/A'}</td>
            <td>${userData.uniqueId || 'N/A'}</td>
            <td>${userData.age || 'N/A'}</td>
            <td>${userData.civilStatus || 'N/A'}</td>
            <td>${userData.gender || 'N/A'}</td>
            <td>${userData.voterStatus || 'N/A'}</td>
            <td>
              <button onclick="editResident('${doc.id}')">Edit</button>
              <button onclick="deleteResident('${doc.id}')">Delete</button>
            </td>
          </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
      });
  
      console.log('Residents data loaded successfully');
    } catch (error) {
      console.error('Error loading residents data:', error);
    }
  }
  // Call this function when the page loads
  document.addEventListener('DOMContentLoaded', loadResidentsData);

  function exportToExcel(filteredUsers) {
    // Create header row with desired columns
    const headers = [
        'Full Name',
        'ID Number',
        'Age',
        'Gender',
        'Address',
        'Contact',
        'Email',
        'Birthdate',
        'Birthplace',
        'Civil Status',
        'Voter Status',
        'Educational Status',
        'Employment Status',
        'Occupation'
    ];

    // Create array of arrays with data
    const data = filteredUsers.map(user => [
        `${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''} ${user.suffix || ''}`.trim(),
        user.uniqueId || '',
        user.birthdate ? calculateAge(user.birthdate) : '',
        user.gender || '',
        `${user.blklot || ''} ${user.street || ''}`.trim(),
        user.phone || '',
        user.email || '',
        user.birthdate || '',
        user.birthplace || '',
        user.maritalStatus || '',
        user.voter || '',
        user.educationalStatus || '',
        user.employmentStatus || '',
        user.occupation || ''
    ]);

    // Add headers to beginning of data array
    data.unshift(headers);

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Create workbook and add worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Residents');

    // Get current date for filename
    const date = new Date().toISOString().split('T')[0];
    
    // Get category name for filename
    const categorySelect = document.getElementById('category-group');
    const categoryText = categorySelect.options[categorySelect.selectedIndex].text;

    // Generate filename
    const filename = `Residents_${categoryText}_${date}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
}


document.getElementById('category-group').addEventListener('change', async function() {
    const selectedCategory = this.value;
    const tbody = document.querySelector('#residentsTable tbody');
    
    try {
        const usersRef = collection(db, "users");
        let filteredUsers = [];
        
        const querySnapshot = await getDocs(usersRef);
        const allUsers = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        switch(selectedCategory) {
            case 'senior_citizen':
                filteredUsers = allUsers.filter(user => {
                    const age = calculateAge(user.birthdate);
                    return age >= 60;
                });
                break;

            case 'minors':
                filteredUsers = allUsers.filter(user => {
                    const age = calculateAge(user.birthdate);
                    return age < 18;
                });
                break;

            case 'head':
                filteredUsers = allUsers.filter(user => 
                    user.role === 'head'
                );
                break;

            case 'voters':
                filteredUsers = allUsers.filter(user => user.voter === 'VOTER');
                break;

            case 'non_voters':
                filteredUsers = allUsers.filter(user => user.voter === 'NON-VOTER');
                break;

            case 'no_formal_education':
                filteredUsers = allUsers.filter(user => 
                    user.educationalStatus === 'NO_FORMAL_EDUCATION');
                break;

            case 'elementary':
                filteredUsers = allUsers.filter(user => 
                    user.educationalStatus === 'ELEMENTARY');
                break;

            case 'highschool':
                filteredUsers = allUsers.filter(user => 
                    user.educationalStatus === 'HIGH_SCHOOL');
                break;

            case 'college':
                filteredUsers = allUsers.filter(user => 
                    user.educationalStatus === 'COLLEGE');
                break;

            default:
                filteredUsers = allUsers;
                break;
        }

        // Clear existing table content
        tbody.innerHTML = '';

        // Display filtered results
        filteredUsers.forEach(data => {
            const row = tbody.insertRow();
            
            // Add data cells
            row.insertCell(0).textContent = `${data.firstName || ''} ${data.middleName || ''} ${data.lastName || ''} ${data.suffix || ''}`;
            const uniqueIdCell = row.insertCell(1);
            uniqueIdCell.textContent = data.uniqueId || '';
            uniqueIdCell.classList.add('unique-id-cell');
            row.insertCell(2).textContent = data.birthdate ? calculateAge(data.birthdate) : '';
            row.insertCell(3).textContent = data.maritalStatus || '';
            row.insertCell(4).textContent = data.gender || '';
            row.insertCell(5).textContent = data.voter || '';

            // Create action cell with button
            const actionCell = row.insertCell(6);
            actionCell.innerHTML = `
                <div class="action-container">
                    <button class="action-btn" data-resident-id="${data.id}">Action</button>
                    <div class="action-dropdown-menu" style="display: none;">
                        <button class="dropdown-button upd-button" data-action="update">Update</button>
                        <button class="dropdown-button del-button" data-action="delete">Delete</button>
                    </div>
                </div>
            `;
        });

        // Update pagination if using it
        if (typeof updatePaginationControls === 'function') {
            currentPage = 1;
            allResidents = filteredUsers;
            totalPages = Math.ceil(allResidents.length / ITEMS_PER_PAGE);
            updatePaginationControls();
            displayResidentsPage(currentPage);
        }

        if (filteredUsers.length > 0) {
            // Remove existing export button if any
            const existingBtn = document.getElementById('exportButton');
            if (existingBtn) existingBtn.remove();

            // Create new export button
            const exportBtn = document.createElement('button');
            exportBtn.id = 'exportButton';
            exportBtn.className = 'export-btn';
            Object.assign(exportBtn.style, {
                position: 'relative',
                color: '#cdcdcd',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                display: 'block',  
                margin: '0 auto',                 
            });
            exportBtn.innerHTML = 'Export to Excel';
            exportBtn.onclick = () => exportToExcel(filteredUsers);

            // Add button after the table
            const table = document.getElementById('residentsTable');
            table.parentNode.insertBefore(exportBtn, table.nextSibling);
        }

    } catch (error) {
        console.error("Error filtering residents:", error);
        tbody.innerHTML = '<tr><td colspan="7">Error filtering residents</td></tr>';
    }
});

export { fetchAndDisplayResidents, updateResident, deleteResident, displayResidentsPage };



// DO NOT DELETE THIS!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// async function updateResident(id) {
//     console.log("Update resident with ID:", id);

//     try {
//         const docRef = doc(db, "users", id);
//         const docSnap = await getDoc(docRef);

//         if (docSnap.exists()) {
//             const data = docSnap.data();

//             const setInputValue = (id, value) => {
//                 const element = document.getElementById(id);
//                 if (element) {
//                     element.value = value || '';
//                 } else {
//                     console.warn(`Element with id '${id}' not found`);
//                 }
//             };

//             // Pre-populate the update form fields with the existing data
//             document.getElementById('upd-fname').value = data.firstName || '';
//             document.getElementById('upd-mname').value = data.middleName || '';
//             document.getElementById('upd-lname').value = data.lastName || '';
//             document.getElementById('upd-suffix').value = data.suffix || '';
//             document.getElementById('upd-blklot').value = data.blklot || '';
//             document.getElementById('upd-street').value = data.street || '';
//             document.getElementById('upd-citizenship').value = data.citizenship || '';

//             const age = data.birthdate ? calculateAge(data.birthdate) : '';
//             setInputValue('upd-age', age);

//             const ageInput = document.getElementById('upd-age');
//             if (ageInput) {
//                 ageInput.readOnly = true;
//             }

//             document.getElementById('upd-birthdate').value = data.birthdate || '';
//             document.getElementById('upd-birthplace').value = data.birthplace || '';
//             document.getElementById('upd-gender').value = data.gender || '';
//             document.getElementById('upd-voter').value = data.voter || '';
//             document.getElementById('upd-email').value = data.email || '';
//             document.getElementById('upd-marital-status').value = data.maritalStatus || '';
//             document.getElementById('upd-employment-status').value = data.employmentStatus || '';
//             document.getElementById('upd-phone').value = data.phone || '';
//             document.getElementById('upd-occupation').value = data.occupation || '';


//             const birthdateInput = document.getElementById('upd-birthdate');
//             if (birthdateInput) {
//                 birthdateInput.addEventListener('change', function() {
//                     const birthdate = this.value;
//                     const age = birthdate ? calculateAge(birthdate) : '';
//                     setInputValue('upd-age', age);
//                 });
//             }

//             // Show the update resident popup
//             const updOverlay = document.getElementById('updOverlay');
//             const updPopupContainer = document.getElementById('updPopupContainer');
//             updOverlay.style.display = 'flex';
//             updPopupContainer.style.display = 'block';

//             // Set the resident ID as a data attribute on the update form
//             const updateForm = document.getElementById('update-info-form');
//             updateForm.setAttribute('data-resident-id', id);

//             // Add event listener to the update form submission
//             updateForm.addEventListener('submit', handleUpdateSubmit);
//         } else {
//             console.log("No such document!");
//         }
//     } catch (error) {
//         console.error("Error getting document:", error);
//     }
// }

// async function handleUpdateSubmit(event) {
//     event.preventDefault();

//     const residentId = event.target.getAttribute('data-resident-id');

//     const formData = new FormData(event.target);
//     const data = {
//         firstName: formData.get('fname').toUpperCase(),
//         middleName: formData.get('mname').toUpperCase() || '',
//         lastName: formData.get('lname').toUpperCase(),
//         suffix: formData.get('suffix').toUpperCase() || '',
//         email: formData.get('email').toUpperCase() || '',
//         phone: formData.get('phone').toUpperCase() || '',
//         birthdate: formData.get('birthdate'),
//         birthplace: formData.get('birthplace').toUpperCase() || '',
//         citizenship: formData.get('citizenship').toUpperCase(),
//         // age: formData.get('age'),
//         gender: formData.get('gender'),
//         voter: formData.get('voter'),
//         maritalStatus: formData.get('marital-status'),
//         employmentStatus: formData.get('employment-status'),
//         occupation: formData.get('occupation').toUpperCase() || '',
//         blklot: formData.get('blklot').toUpperCase(),
//         street: formData.get('street').toUpperCase() || ''
//     };

//     try {
//         await setDoc(doc(db, 'users', residentId), data, { merge: true });

//         console.log("Document successfully updated!");

//         // Close the update resident popup
//         const updOverlay = document.getElementById('updOverlay');
//         const updPopupContainer = document.getElementById('updPopupContainer');
//         updOverlay.style.display = 'flex';
//         updPopupContainer.style.display = 'block';

//         const updateForm = document.getElementById('update-info-form');
//             updateForm.setAttribute('data-resident-id', id);

//             // Remove any existing event listeners on the update form
//             updateForm.removeEventListener('submit', handleUpdateSubmit);

//             // Add event listener to the update form submission
//             updateForm.addEventListener('submit', handleUpdateSubmit);

//         // Refresh the residents table
//         fetchAndDisplayResidents();
//     } catch (error) {
//         console.error("Error updating document: ", error);
//     }
// }

// function closeUpdatePopup() {
//     const updOverlay = document.getElementById('updOverlay');
//     const updPopupContainer = document.getElementById('updPopupContainer');
//     if (updOverlay && updPopupContainer) {
//         updOverlay.style.display = 'none';
//         updPopupContainer.style.display = 'none';
//     }
// }