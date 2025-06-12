// <!-- ####### ADMIN_HOUSEHOLD.JS ########### -->
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    updateDoc, 
    deleteDoc, 
    setDoc, 
    addDoc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit, 
    Timestamp 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";


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
const auth = getAuth();


function showLoader() {
    document.getElementById('loader-container').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loader-container').style.display = 'none';
}


async function handleSubmit(event) {
    event.preventDefault();
    showLoader();

    try {
        console.log("Starting form submission...");
        
        if (!auth.currentUser) {
            console.error("User not authenticated");
            hideLoader();
            return;
        }

        const formData = new FormData(event.target);
        const headNameFromForm = formData.get('head').toUpperCase();

        // Validate head name
        const isValidHead = await validateHeadName(headNameFromForm);
        console.log("Head validation result:", isValidHead);

        if (!isValidHead) {
            hideLoader();
            const headInput = document.getElementById('head');
            let tooltip = headInput.parentElement.querySelector('.validation-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.className = 'validation-tooltip';
                headInput.parentElement.appendChild(tooltip);
            }
            tooltip.textContent = 'This resident does not exist in the system. Please select an existing resident.';
            tooltip.style.display = 'block';
            headInput.classList.add('invalid-input');
            
            setTimeout(() => {
                tooltip.style.display = 'none';
            }, 3000);
            
            return;
        }

        // Check if head is already a household head
        const headCheck = await isExistingHouseholdHead(headNameFromForm);
        if (headCheck.exists) {
            hideLoader();
            showExistingHeadError(headNameFromForm, headCheck);
            return;
        }

        // Generate household ID
        const householdId = await generateHouseholdId();

        // Get member IDs from the container
        const memberContainer = document.getElementById('householdMembersContainer');
        const memberDivs = memberContainer.querySelectorAll('.member-display-item');
        const memberIds = Array.from(memberDivs).map(div => {
            const detailsText = div.querySelector('.member-details').textContent;
            return detailsText.split('ID: ')[1].split(' |')[0];
        });

        // Update all members in Firebase
        const addressParts = formData.get('address').toUpperCase().split(' ');
        const blklot = addressParts[0];
        const street = addressParts.slice(1).join(' ');

        const memberUpdates = memberIds.map(async (memberId) => {
            const memberRef = doc(db, 'users', memberId);
            return updateDoc(memberRef, {
                householdId: householdId,
                role: 'member',
                blklot: blklot,
                street: street
            });
        });

        // Wait for all member updates
        await Promise.all(memberUpdates);

        // Create household data
        const data = {
            householdId: householdId,
            ownership: formData.get('ownership'),
            totalMembers: formData.get('total-members'),
            head: headNameFromForm,
            address: formData.get('address').toUpperCase(),
            totalMale: formData.get('total-male'),
            totalFemale: formData.get('total-female'),
            phone: formData.get('phone') || '',
            householdMembers: memberIds,
            createdAt: new Date(),
            createdBy: auth.currentUser.uid
        };

        // Add to Firestore
        await addDoc(collection(db, 'Household'), data);

        // Create activity log entry
        const logEntry = {
            userId: auth.currentUser.uid,
            email: auth.currentUser.email,
            action: `${auth.currentUser.email} has added a new household`,
            role: 'Admin',
            details: {
                householdId: householdId,
                householdHead: headNameFromForm,
                address: data.address,
                totalMembers: data.totalMembers,
                modifiedBy: auth.currentUser.email,
                modificationType: 'added'
            },
            timestamp: Timestamp.fromDate(new Date())
        };

        // Save log entry
        await addDoc(collection(db, 'activity_logs'), logEntry);
        console.log("Household added and activity logged successfully!");

        try {
            console.log("Starting head update for:", headNameFromForm);
            
            // Split name properly handling multiple word first names
            const nameParts = headNameFromForm.split(' ');
            let firstName, middleName, lastName;
            
            // Handle multiple word first names
            if (nameParts.length === 4) {
                // For names like "JOSE ANTONIO PEREZ DELA CRUZ"
                firstName = nameParts[0] + ' ' + nameParts[1];
                middleName = nameParts[2];
                lastName = nameParts[3];
            } else if (nameParts.length === 5) {
                // For names with two-word last names like "DELA CRUZ"
                firstName = nameParts[0] + ' ' + nameParts[1];
                middleName = nameParts[2];
                lastName = nameParts[3] + ' ' + nameParts[4];
            } else {
                // Default case
                firstName = nameParts[0];
                middleName = nameParts[1];
                lastName = nameParts[2];
            }
        
            console.log("Searching for resident with:", { firstName, middleName, lastName });
            
            // Query with the correctly parsed name parts
            const headQuery = await getDocs(query(
                collection(db, "users"),
                where("firstName", "==", firstName),
                where("middleName", "==", middleName),
                where("lastName", "==", lastName)
            ));
            
            console.log("Head query result:", headQuery.docs.map(doc => doc.data()));
            
            if (!headQuery.empty) {
                const userData = headQuery.docs[0].data();
                const residentUniqueId = userData.uniqueId;
                
                console.log("Found resident uniqueId:", residentUniqueId);
                console.log("Updating with householdId:", householdId);
        
                // Create direct reference to the user document
                const userRef = doc(db, 'users', residentUniqueId);
                
                const updateData = {
                    role: "head",
                    householdId: householdId,
                    blklot: blklot,
                    street: street
                };
                
                console.log("Updating document with data:", updateData);
                
                // Update the document
                await updateDoc(userRef, updateData);
                
                // Verify the update
                const updatedDoc = await getDoc(userRef);
                console.log("Document after update:", updatedDoc.data());
            } else {
                console.error("No resident found with name parts:", { firstName, middleName, lastName });
                // Try a more flexible query
                const flexibleQuery = await getDocs(query(
                    collection(db, "users"),
                    where("firstName", "==", firstName)
                ));
                console.log("Flexible query results:", flexibleQuery.docs.map(doc => doc.data()));
            }
        } catch (error) {
            console.error("Error updating head's role:", error, error.stack);
            throw error;
        }

        console.log("Document successfully written to Firestore.");
        closePopup();
        showSuccessPopup();

        event.target.reset();
        await fetchAndDisplayHousehold();

    } catch (error) {
        console.error("Error in form submission:", error);
        alert("Error adding household: " + error.message);
    } finally {
        hideLoader();
    }
}

// Add styles for the error popup
const style = document.createElement('style');
style.textContent = `
    .error-overlay {
        animation: fadeIn 0.3s ease-out;
    }
    
    .error-popup {
        animation: slideIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideIn {
        from { 
            opacity: 0;
            transform: translateY(-20px);
        }
        to { 
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .error-popup button:hover {
        background: #bb2d3b !important;
    }
`;
document.head.appendChild(style);

async function isExistingHouseholdHead(headName) {
    try {
        const householdRef = collection(db, 'Household');
        const headQuery = query(householdRef, where('head', '==', headName.toUpperCase()));
        const querySnapshot = await getDocs(headQuery);

        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const householdData = doc.data();
            return {
                exists: true,
                householdId: householdData.householdId,
                address: householdData.address
            };
        }
        return { exists: false };
    } catch (error) {
        console.error('Error checking household head:', error);
        throw new Error('Failed to check household head status');
    }
}

function showExistingHeadError(headName, headCheck) {
    const errorOverlay = document.createElement('div');
    errorOverlay.className = 'error-overlay';
    errorOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    const errorPopup = document.createElement('div');
    errorPopup.className = 'error-popup';
    errorPopup.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    `;

    errorPopup.innerHTML = `
        <h3 style="color: #dc3545; margin-bottom: 15px;">Cannot Add Household Head</h3>
        <p>${headName} is already registered as a head of household:</p>
        <p><strong>Household ID:</strong> ${headCheck.householdId}</p>
        <p><strong>Address:</strong> ${headCheck.address}</p>
        <button style="
            background: #dc3545;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            margin-top: 15px;
            cursor: pointer;
        ">Close</button>
    `;

    errorOverlay.appendChild(errorPopup);
    document.body.appendChild(errorOverlay);

    const closeButton = errorPopup.querySelector('button');
    closeButton.onclick = () => {
        document.body.removeChild(errorOverlay);
    };

    errorOverlay.onclick = (e) => {
        if (e.target === errorOverlay) {
            document.body.removeChild(errorOverlay);
        }
    };
}

// Add form submit listener
const form = document.getElementById('household-info-form');
if (form) {
    form.addEventListener('submit', handleSubmit);
}


// Add these global variables at the top of your file
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let totalPages = 1;
let allHouseholds = [];

// Modify your fetchAndDisplayHousehold function to include pagination
async function fetchAndDisplayHousehold(searchQuery = '', page = 1) {
    console.log('Fetching and displaying household data...');
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
        let querySnapshot;
        if (typeof searchQuery === 'string' && searchQuery.trim() !== '') {
            const searchUpperCase = searchQuery.trim().toUpperCase();
            querySnapshot = await getDocs(query(
                collection(db, 'Household'),
                where('head', '>=', searchUpperCase),
                where('head', '<=', searchUpperCase + '\uf8ff'),
                orderBy('head')
            ));
        } else {
            querySnapshot = await getDocs(query(
                collection(db, 'Household'),
                orderBy('householdId', 'desc')
            ));
        }

        // Store all households and handle pagination
        const uniqueHouseholds = new Map();
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (!uniqueHouseholds.has(data.householdId)) {
                uniqueHouseholds.set(data.householdId, { ...data, docId: doc.id });
            }
        });

        // Convert to array and sort
        allHouseholds = Array.from(uniqueHouseholds.values())
            .sort((a, b) => a.householdId.localeCompare(b.householdId));

        // Calculate pagination
        totalPages = Math.ceil(allHouseholds.length / ITEMS_PER_PAGE);
        currentPage = Math.min(Math.max(1, page), totalPages);

        // Get current page items
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, allHouseholds.length);
        const currentPageItems = allHouseholds.slice(startIndex, endIndex);

        if (currentPageItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8">No households found</td></tr>';
            hideLoader();
            return;
        }

        // Display current page items
        currentPageItems.forEach((data) => {
            const row = tbody.insertRow();
            row.insertCell(0).textContent = data.householdId || '';
            row.insertCell(1).textContent = data.totalMembers || '';
            row.insertCell(2).textContent = data.head || '';
            row.insertCell(3).textContent = data.address || '';
            row.insertCell(4).textContent = data.totalMale || '';
            row.insertCell(5).textContent = data.totalFemale || '';
            row.insertCell(6).textContent = data.phone || '';

            const actionCell = row.insertCell(7);
            actionCell.innerHTML = `
                <div class="action-container">
                    <button class="action-btn" onclick="showDropDown(event, '${data.docId}')">Action</button>
                    <div class="action-dropdown-menu" style="display: none;">
                        <button class="dropdown-button upd-button" onclick="updateHousehold('${data.docId}')">Update</button>
                        <button class="dropdown-button del-button" onclick="deleteHousehold('${data.docId}')">Delete</button>
                    </div>
                </div>
            `;

            row.addEventListener('click', function(event) {
                if (!event.target.classList.contains('action-btn') && !event.target.classList.contains('dropdown-button')) {
                    showHouseholdDetails(data);
                }
            });
        });

        // Update pagination controls
        updatePaginationControls();

    } catch (error) {
        console.error('Error fetching documents:', error);
        tbody.innerHTML = '<tr><td colspan="8">Error loading households: ' + error.message + '</td></tr>';
    }

    hideLoader();
}

// Function to update pagination controls
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

// Function to change page
window.changePage = function(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    fetchAndDisplayHousehold('', page);
};


document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('householdSearchInput');
    const clearButton = document.querySelector('.clear-button');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(function (event) {
            const searchQuery = event.target.value.trim();
            fetchAndDisplayHousehold(searchQuery);
        }, 300)); 
    }

    if (clearButton) {
        clearButton.addEventListener('click', function () {
            if (searchInput) {
                searchInput.value = '';
                fetchAndDisplayHousehold();
            }
        });
    }
});

async function fetchUserData() {
    const headInput = document.getElementById('head');
    const addressInput = document.getElementById('address');
    const phoneInput = document.getElementById('phone');
    const fetchButton = document.getElementById('fetchUserData');

    fetchButton.addEventListener('click', async function () {
        const searchName = headInput.value.trim().toUpperCase();
        if (searchName.length < 3) {
            alert("Please enter at least 3 characters for the search.");
            return;
        }

        try {
            const db = getFirestore();
            const usersRef = collection(db, 'users');

            // Create queries for firstName, middleName, and lastName
            const firstNameQuery = query(usersRef, where('firstName', '>=', searchName), where('firstName', '<=', searchName + '\uf8ff'));
            const middleNameQuery = query(usersRef, where('middleName', '>=', searchName), where('middleName', '<=', searchName + '\uf8ff'));
            const lastNameQuery = query(usersRef, where('lastName', '>=', searchName), where('lastName', '<=', searchName + '\uf8ff'));

            // Execute all queries
            const [firstNameSnapshot, middleNameSnapshot, lastNameSnapshot] = await Promise.all([
                getDocs(firstNameQuery),
                getDocs(middleNameQuery),
                getDocs(lastNameQuery)
            ]);

            // Combine results
            const allResults = [...firstNameSnapshot.docs, ...middleNameSnapshot.docs, ...lastNameSnapshot.docs];

            if (allResults.length > 0) {
                // Find the best match
                const bestMatch = allResults.find(doc => {
                    const data = doc.data();
                    const fullName = `${data.firstName} ${data.middleName} ${data.lastName}`.toUpperCase();
                    return fullName.includes(searchName);
                });

                if (bestMatch) {
                    const userData = bestMatch.data();
                    const fullName = `${userData.firstName} ${userData.middleName} ${userData.lastName}`.trim();
                    headInput.value = fullName;
                    const address = `${userData.blklot || ''} ${userData.street || ''}`.trim();
                    addressInput.value = address;
                    phoneInput.value = userData.phone || '';
                    console.log('User data fetched and populated');
                } else {
                    console.log('No exact matching user found');
                    alert("No user found with this name. Please check the spelling and try again.");
                }
            } else {
                console.log('No matching users found');
                alert("No users found with similar names. Please check the spelling and try again.");
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            alert("An error occurred while fetching user data. Please try again.");
        }
    });
}

async function initializeHeadAutocomplete() {
    const headInput = document.getElementById('head');
    const addressInput = document.getElementById('address');
    const phoneInput = document.getElementById('phone');

    // Create wrapper div if it doesn't exist
    if (!headInput.parentElement.classList.contains('autocomplete-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'autocomplete-wrapper';
        headInput.parentNode.insertBefore(wrapper, headInput);
        wrapper.appendChild(headInput);

        // Create suggestions container
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'suggestions-container';
        wrapper.appendChild(suggestionsContainer);

        // Add necessary styles dynamically
        const style = document.createElement('style');
        style.textContent = `
            .autocomplete-wrapper {
                position: relative;
                width: 100%;
            }
            
            .suggestions-container {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                max-height: 200px;
                overflow-y: auto;
                background-color: white;
                border: 1px solid #ddd;
                border-radius: 4px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                z-index: 1000;
                display: none;
                margin-top: 2px;
            }
            
            .suggestion-item {
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid #eee;
            }
            
            .suggestion-item:hover,
            .suggestion-item.active {
                background-color: #f5f5f5;
            }
            
            .suggestion-name {
                font-weight: 500;
                margin-bottom: 4px;
            }
            
            .suggestion-details {
                font-size: 0.9em;
                color: #666;
            }
        `;
        document.head.appendChild(style);
    }

    const suggestionsContainer = headInput.parentElement.querySelector('.suggestions-container');

    async function fetchSuggestions(searchTerm) {
        if (searchTerm.length < 2) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        try {
            const searchTermUpper = searchTerm.toUpperCase();
            const usersRef = collection(db, 'users');

            // Query for first, middle, and last names
            const [firstNameSnapshot, middleNameSnapshot, lastNameSnapshot] = await Promise.all([
                getDocs(query(usersRef,
                    where('firstName', '>=', searchTermUpper),
                    where('firstName', '<=', searchTermUpper + '\uf8ff'),
                    limit(5)
                )),
                getDocs(query(usersRef,
                    where('middleName', '>=', searchTermUpper),
                    where('middleName', '<=', searchTermUpper + '\uf8ff'),
                    limit(5)
                )),
                getDocs(query(usersRef,
                    where('lastName', '>=', searchTermUpper),
                    where('lastName', '<=', searchTermUpper + '\uf8ff'),
                    limit(5)
                ))
            ]);

            // Combine and deduplicate results
            const results = new Map();
            [...firstNameSnapshot.docs, ...middleNameSnapshot.docs, ...lastNameSnapshot.docs].forEach(doc => {
                const data = doc.data();
                results.set(doc.id, data);
            });

            // Clear previous suggestions
            suggestionsContainer.innerHTML = '';

            if (results.size === 0) {
                suggestionsContainer.style.display = 'none';
                return;
            }

            // Format date function
            function formatDate(dateValue) {
                if (!dateValue) return 'No birthdate';
                try {
                    // Handle Firestore Timestamp
                    if (dateValue && dateValue.toDate) {
                        return dateValue.toDate().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                    }
                    // Handle regular date string
                    const date = new Date(dateValue);
                    if (isNaN(date.getTime())) return 'Invalid date';
                    return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                } catch (error) {
                    console.error('Error formatting date:', error);
                    return 'Invalid date';
                }
            }

            // Create suggestion items
            Array.from(results.values()).forEach(userData => {
                const suggestionItem = document.createElement('div');
                suggestionItem.className = 'suggestion-item';

                const fullName = `${userData.firstName || ''} ${userData.middleName || ''} ${userData.lastName || ''}`.trim();
                const birthDate = formatDate(userData.birthdate || userData.birthDate); // Check both possible field names

                suggestionItem.innerHTML = `
                    <div class="suggestion-name">${fullName}</div>
                    <div class="suggestion-details">Birth Date: ${birthDate}</div>
                `;

                suggestionItem.addEventListener('click', () => {
                    headInput.value = fullName;
                    const address = `${userData.blklot || ''} ${userData.street || ''}`.trim();
                    addressInput.value = address;
                    phoneInput.value = userData.phone || '';
                    suggestionsContainer.style.display = 'none';
                });

                suggestionsContainer.appendChild(suggestionItem);
            });

            suggestionsContainer.style.display = 'block';

        } catch (error) {
            console.error('Error fetching suggestions:', error);
            suggestionsContainer.style.display = 'none';
        }
    }

    // Add debounced input event listener
    const debouncedFetch = debounce(fetchSuggestions, 300);
    headInput.addEventListener('input', (e) => debouncedFetch(e.target.value));

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!headInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
        }
    });

    // Handle keyboard navigation
    headInput.addEventListener('keydown', (e) => {
        const items = suggestionsContainer.getElementsByClassName('suggestion-item');
        const activeItem = suggestionsContainer.querySelector('.suggestion-item.active');

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!activeItem && items.length > 0) {
                    items[0].classList.add('active');
                } else if (activeItem && activeItem.nextElementSibling) {
                    activeItem.classList.remove('active');
                    activeItem.nextElementSibling.classList.add('active');
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (activeItem && activeItem.previousElementSibling) {
                    activeItem.classList.remove('active');
                    activeItem.previousElementSibling.classList.add('active');
                }
                break;

            case 'Enter':
                if (activeItem) {
                    e.preventDefault();
                    activeItem.click();
                }
                break;

            case 'Escape':
                suggestionsContainer.style.display = 'none';
                break;
        }
    });
}

// Initialize the autocomplete when the document is loaded
document.addEventListener('DOMContentLoaded', initializeHeadAutocomplete);


async function autoPopulateUserData() {
    const headInput = document.getElementById('head');
    const addressInput = document.getElementById('address');
    const phoneInput = document.getElementById('phone');

    headInput.addEventListener('input', debounce(async function () {
        const name = headInput.value.trim().toUpperCase();
        if (name.length < 10) return; 

        try {
            const db = getFirestore();
            const usersRef = collection(db, 'users');
            const nameParts = name.split(' ').filter(part => part.length > 0);

            if (nameParts.length === 0) return;

            // Query Firestore using the first name
            const q = query(usersRef, where('firstName', '==', nameParts[0]), limit(5));
            const querySnapshot = await getDocs(q);

            let isMatchFound = false;

            querySnapshot.forEach(doc => {
                const userData = doc.data();
                const fullNameVariations = normalizeName(userData);

                // Check if any variation matches the input name
                if (fullNameVariations.includes(name)) {
                    addressInput.value = userData.address || '';
                    phoneInput.value = userData.phone || '';
                    console.log('User data auto-populated:', userData);
                    isMatchFound = true;
                }
            });

            if (!isMatchFound) {
                console.log('No matching user found');
                // Optionally clear fields if no match is found
                // addressInput.value = '';
                // phoneInput.value = '';
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    }, 300)); // 300ms debounce
}


// #################################################

// Make sure this function is called when the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    autoPopulateUserData();
    fetchUserData();
});

// Debounce function to limit how often fetchAndDisplayHousehold is called
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}



async function showHouseholdDetails(data) {
    console.log('Showing household details:', data);
    const overlay = document.getElementById('householdOverlay');
    const popup = document.getElementById('householdDetailsPopup');
    const closeBtn = popup.querySelector('.close-household');

    // Populate the popup with household data
    document.getElementById('popupHouseholdId').textContent = data.householdId || '';
    document.getElementById('popupOwnership').textContent = data.ownership || '';
    document.getElementById('popupTotalMembers').textContent = data.totalMembers || '';
    document.getElementById('popupHead').textContent = data.head || '';
    document.getElementById('popupAddress').textContent = data.address || '';
    document.getElementById('popupTotalMale').textContent = data.totalMale || '';
    document.getElementById('popupTotalFemale').textContent = data.totalFemale || '';
    document.getElementById('popupPhone').textContent = data.phone || '';

    // Display household members with additional information
    const membersContainer = document.getElementById('popupHouseholdMembers');
    if (membersContainer) {
        membersContainer.innerHTML = '<div class="loading-members">Loading member details...</div>';

        if (data.householdMembers && data.householdMembers.length > 0) {
            try {
                // Fetch details for each member
                const memberPromises = data.householdMembers.map(async (memberId) => {
                    const memberDoc = await getDoc(doc(db, "users", memberId));
                    if (memberDoc.exists()) {
                        return memberDoc.data();
                    }
                    return null;
                });

                const memberDetails = await Promise.all(memberPromises);
                
                // Create styled container for members
                const membersList = document.createElement('div');
                membersList.className = 'household-members-list';
                
                // Add styles if not already present
                if (!document.querySelector('#household-members-styles')) {
                    const styles = document.createElement('style');
                    styles.id = 'household-members-styles';
                    styles.textContent = `
                        .household-members-list {
                            margin-top: 10px;
                        }
                        .member-card {
                            background: rgba(255, 255, 255, 0.1);
                            border-radius: 4px;
                            padding: 10px;
                            margin-bottom: 8px;
                        }
                        .member-name {
                            font-weight: 500;
                            color: #ffffff;
                            margin-bottom: 4px;
                        }
                        .member-details {
                            font-size: 0.9em;
                            color: #cdcdcd;
                        }
                        .member-id {
                            font-family: monospace;
                            color: #a0a0a0;
                        }
                        .loading-members {
                            color: #cdcdcd;
                            text-align: center;
                            padding: 10px;
                        }
                    `;
                    document.head.appendChild(styles);
                }

                // Display each member's details
                memberDetails.forEach(member => {
                    if (member) {
                        const memberCard = document.createElement('div');
                        memberCard.className = 'member-card';
                        
                        // Format full name
                        const fullName = `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''} ${member.suffix || ''}`.trim();
                        
                        // Format birthdate
                        let birthdateDisplay = '';
                        if (member.birthdate) {
                            const birthdate = new Date(member.birthdate);
                            birthdateDisplay = birthdate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });
                        }

                        memberCard.innerHTML = `
                            <div class="member-name">${fullName}</div>
                            <div class="member-details">
                                <div class="member-id">${member.uniqueId}</div>
                                <div>Birthdate: ${birthdateDisplay || 'Not specified'}</div>
                            </div>
                        `;
                        
                        membersList.appendChild(memberCard);
                    }
                });

                // Clear loading message and display members
                membersContainer.innerHTML = '';
                membersContainer.appendChild(membersList);

            } catch (error) {
                console.error('Error fetching member details:', error);
                membersContainer.innerHTML = '<div class="error-message">Error loading member details</div>';
            }
        } else {
            membersContainer.innerHTML = '<div class="no-members">No members listed</div>';
        }
    } else {
        console.error('popupHouseholdMembers element not found');
    }

    // Show the popup
    overlay.style.display = 'block';
    popup.style.display = 'block';

    function closePopup() {
        overlay.style.display = 'none';
        popup.style.display = 'none';
    }

    closeBtn.onclick = closePopup;

    // Close the popup when clicking outside of it
    overlay.onclick = closePopup;

    // Prevent closing when clicking inside the popup
    popup.onclick = function (event) {
        event.stopPropagation();
    };
}

document.addEventListener('DOMContentLoaded', fetchAndDisplayHousehold);



async function generateHouseholdId() {
    const householdCollection = collection(db, "Household");
    const householdSnapshot = await getDocs(householdCollection);
    let maxCounter = 0;

    householdSnapshot.forEach((doc) => {
        const householdId = doc.data().householdId;
        const match = householdId.match(/^HH-(\d{6})$/);
        if (match) {
            const counter = parseInt(match[1], 10);
            if (counter > maxCounter) {
                maxCounter = counter;
            }
        }
    });

    const newCounter = maxCounter + 1;
    const paddedCounter = String(newCounter).padStart(6, "0");
    return `HH-${paddedCounter}`;
}

// Helper function to format dates - Move this to the top
function formatDate(dateValue) {
    if (!dateValue) return 'No birthdate';
    try {
        // Handle Firestore Timestamp
        if (dateValue && dateValue.toDate) {
            return dateValue.toDate().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        // Handle regular date string
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return 'Invalid date';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid date';
    }
}

// Add styles for member suggestions
const memberStyles = document.createElement('style');
memberStyles.textContent = `
    .member-autocomplete-wrapper {
        position: relative;
        width: 100%;
    }
    
    .member-suggestions-container {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        max-height: 200px;
        overflow-y: auto;
        background-color: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        z-index: 1000;
        display: none;
        margin-top: 2px;
    }
    
    .member-suggestion-item {
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid #eee;
    }
    
    .member-suggestion-item:hover,
    .member-suggestion-item.active {
        background-color: #f5f5f5;
    }
    
    .member-suggestion-name {
        font-weight: 500;
        margin-bottom: 4px;
    }
    
    .member-suggestion-details {
        font-size: 0.9em;
        color: #666;
    }

    .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
    }

    .remove-member {
        margin-left: 8px;
    }
`;
document.head.appendChild(memberStyles);


// function showDropDown(event, docId) {
//     const dropdownMenu = event.target.nextElementSibling;
//     dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
// }

// function showDropDown(event, id) {
//     event.stopPropagation();
//     console.log("Show dropdown for household with ID:", id);

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
    document.getElementById('householdPopupContainer').style.display = 'block';
}

function showSuccessPopup() {
    const successPopup = document.getElementById('successPopup');
    const overlay = document.getElementById('overlay');
    overlay.style.display = 'block';
    successPopup.style.display = 'block';
}


document.getElementById('addHouseholdButton').addEventListener('click', showAddHousehold);
document.getElementById('overlay').addEventListener('click', closePopup);
document.getElementById('okButton').addEventListener('click', closePopup);
document.getElementById('householdCloseButton').addEventListener('click', closeHouseholdPopup);

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

window.showDropDown = function(event, id) {
    event.stopPropagation();
    console.log("Show dropdown for household with ID:", id);

    const allDropdowns = document.querySelectorAll('.action-dropdown-menu');
    allDropdowns.forEach(dropdown => dropdown.style.display = 'none');

    const actionBtn = event.target;
    const dropdown = actionBtn.nextElementSibling;
    
    if (dropdown && dropdown.classList.contains('action-dropdown-menu')) {
        const rect = actionBtn.getBoundingClientRect();
        dropdown.style.display = 'block';
    }
};

// #################################### UPDATE HOUSEHOLD ################################################

// Make the function globally accessible
window.updateHousehold = async function(docId) {
    try {
        showLoader();
        
        // Fetch the household data
        const householdDoc = await getDoc(doc(db, 'Household', docId));
        if (!householdDoc.exists()) {
            hideLoader();
            alert('Household not found');
            return;
        }

        const data = householdDoc.data();
        
        // Populate the update form
        
        document.getElementById('upd-householdId').value = data.householdId || '';
        document.getElementById('upd-ownership').value = data.ownership || '';
        document.getElementById('upd-head').value = data.head || '';
        document.getElementById('upd-totalMembers').value = data.totalMembers || '';
        document.getElementById('upd-address').value = data.address || '';
        document.getElementById('upd-totalMale').value = data.totalMale || '';
        document.getElementById('upd-totalFemale').value = data.totalFemale || '';
        document.getElementById('upd-phone').value = data.phone || '';

        // Populate household members
        const membersContainer = document.getElementById('upd-householdMembersContainer');
        membersContainer.innerHTML = ''; // Clear existing members

        if (data.householdMembers && data.householdMembers.length > 0) {
            data.householdMembers.forEach((member, index) => {
                const memberDiv = document.createElement('div');
                memberDiv.className = 'input-group member-input-group';
                memberDiv.innerHTML = `
                    <div class="input-wrapper">
                        <input type="text" name="householdMembers[]" class="upd-householdMember"
                            value="${member}" placeholder="Member name">
                        <button type="button" class="remove-member" ${index === 0 ? 'style="display:none;"' : ''}>&times;</button>
                    </div>
                `;
                membersContainer.appendChild(memberDiv);

                // Initialize autocomplete for this member input
                const memberInput = memberDiv.querySelector('.upd-householdMember');
                initializeMemberAutocomplete(memberInput);
            });
        }

        // Show the update popup
        document.getElementById('upd-overlay').style.display = 'block';
        document.getElementById('upd-householdPopupContainer').style.display = 'block';

        // Set up form submission handler
        const updateForm = document.getElementById('upd-household-info-form');
        updateForm.onsubmit = async (e) => handleUpdateSubmit(e, docId);

        // Set up close button handler
        document.getElementById('upd-householdCloseButton').onclick = closeUpdatePopup;
        
        // Initialize member addition functionality
        document.getElementById('upd-addMemberBtn').onclick = addUpdateMember;

        hideLoader();
    } catch (error) {
        console.error('Error in updateHousehold:', error);
        hideLoader();
        alert('Error loading household data: ' + error.message);
    }
};

// Handle update form submission
async function handleUpdateSubmit(event, docId) {
    event.preventDefault();
    showLoader();

    try {
        const formData = new FormData(event.target);
        
        // Collect all household members
        const memberInputs = event.target.querySelectorAll('.upd-householdMember');
        const householdMembers = [];
        memberInputs.forEach(input => {
            if (input.value.trim()) {
                householdMembers.push(input.value.trim().toUpperCase());
            }
        });

        // Create update data object
        const updateData = {
            head: (formData.get('head') || '').toUpperCase(),
            ownership: (formData.get('ownership') || '').toUpperCase(),
            totalMembers: parseInt(formData.get('total-members')) || 0,
            address: (formData.get('address') || '').toUpperCase(),
            totalMale: parseInt(formData.get('total-male')) || 0,
            totalFemale: parseInt(formData.get('total-female')) || 0,
            phone: formData.get('phone') || '',
            householdMembers: householdMembers,
            lastUpdated: new Date(),
            updatedBy: auth.currentUser.uid
        };

        // Update the document
        await updateDoc(doc(db, 'Household', docId), updateData);

        // Add to logs
        await addDoc(collection(db, 'Logs'), {
            action: 'HOUSEHOLD_UPDATED',
            householdId: formData.get('householdId'),
            updatedBy: auth.currentUser.uid,
            timestamp: new Date(),
            changes: updateData
        });

        // Create detailed log entry
        const logEntry = {
            userId: auth.currentUser.uid,
            email: auth.currentUser.email,
            action: `${auth.currentUser.email} has updated a household`,
            role: 'Admin',
            details: {
                householdId: formData.get('householdId'),
                previousHead: (await getDoc(householdRef)).data().head,
                newHead: updateData.head,
                address: updateData.address,
                totalMembers: updateData.totalMembers,
                modifiedBy: auth.currentUser.email,
                modificationType: 'updated'
            },
            timestamp: Timestamp.fromDate(new Date()),
            changes: updateData  // Include full changes for comprehensive logging
        };

        // Save log entry
        await addDoc(collection(db, 'activity_logs'), logEntry);
        console.log("Household updated and activity logged successfully!");

        // Show success message and refresh
        alert('Household updated successfully');
        closeUpdatePopup();
        await fetchAndDisplayHousehold();

    } catch (error) {
        console.error('Error updating household:', error);
        alert('Error updating household: ' + error.message);
    }

    hideLoader();
}

// Function to add new member field in update form
function addUpdateMember() {
    const membersContainer = document.getElementById('upd-householdMembersContainer');
    const newField = document.createElement('div');
    newField.className = 'input-group member-input-group';
    newField.innerHTML = `
        <div class="input-wrapper">
            <input type="text" name="householdMembers[]" class="upd-householdMember" placeholder="Member name">
            <button type="button" class="remove-member">&times;</button>
        </div>
    `;
    
    const memberInput = newField.querySelector('.upd-householdMember');
    initializeMemberAutocomplete(memberInput);
    
    membersContainer.appendChild(newField);
    updateRemoveButtons(membersContainer);
}

// Function to close update popup
function closeUpdatePopup() {
    document.getElementById('upd-overlay').style.display = 'none';
    document.getElementById('upd-householdPopupContainer').style.display = 'none';
    document.getElementById('upd-household-info-form').reset();
}

// Function to update remove buttons visibility
function updateRemoveButtons(container) {
    const removeButtons = container.querySelectorAll('.remove-member');
    removeButtons.forEach((button, index) => {
        button.style.display = index === 0 && removeButtons.length === 1 ? 'none' : 'inline-block';
    });
}

// Add this event listener for remove buttons in update form
document.getElementById('upd-householdMembersContainer')?.addEventListener('click', function(e) {
    if (e.target.classList.contains('remove-member')) {
        const memberGroup = e.target.closest('.member-input-group');
        if (memberGroup) {
            memberGroup.remove();
            updateRemoveButtons(this);
        }
    }
});

// Style additions for the update popup
const updateStyles = document.createElement('style');
updateStyles.textContent = `
    #upd-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        z-index: 1000;
    }

    #upd-householdPopupContainer {        
        display: none;
        z-index: 1000;
    }

    .upd-householdMember {
        /* Same styles as householdMember */
    }
`;
document.head.appendChild(updateStyles);

// Make the delete function globally accessible
window.deleteHousehold = async function(docId) {
    try {
        // Show confirmation dialog
        const confirmDelete = await showDeleteConfirmation();
        if (!confirmDelete) return;

        showLoader();

        // Get the household document
        const householdDoc = await getDoc(doc(db, 'Household', docId));
        if (!householdDoc.exists()) {
            hideLoader();
            alert('Household not found');
            return;
        }

        const householdData = householdDoc.data();

        // Reset roles for head and members in users collection
        const headQuery = await getDocs(query(
            collection(db, "users"),
            where("firstName", "==", householdData.head.split(' ')[0])
        ));

        if (!headQuery.empty) {
            await updateDoc(doc(db, "users", headQuery.docs[0].id), {
                role: "N/A"
            });
        }

        // Reset roles for members
        for (const member of householdData.householdMembers) {
            const memberName = member.split(' ')[0];
            const memberQuery = await getDocs(query(
                collection(db, "users"),
                where("firstName", "==", memberName)
            ));

            if (!memberQuery.empty) {
                await updateDoc(doc(db, "users", memberQuery.docs[0].id), {
                    role: "N/A"
                });
            }
        }

        // Prepare archive data with additional metadata
        const archiveData = {
            ...householdData,
            archivedAt: new Date(),
            archivedBy: auth.currentUser.uid,
            originalDocId: docId,
            archiveReason: 'User Deleted'
        };

        // First, add to archived_household collection
        await addDoc(collection(db, 'archived_household'), archiveData);

        // Then delete from Household collection
        await deleteDoc(doc(db, 'Household', docId));

        // Add to logs
        // await addDoc(collection(db, 'Logs'), {
        //     action: 'HOUSEHOLD_ARCHIVED',
        //     householdId: householdData.householdId,
        //     deletedBy: auth.currentUser.uid,
        //     timestamp: new Date(),
        //     details: {
        //         head: householdData.head,
        //         totalMembers: householdData.totalMembers,
        //         address: householdData.address
        //     }
        // });

        // Show success message
        showSuccessToast('Household successfully archived and deleted');

        // Refresh the table
        await fetchAndDisplayHousehold();

    } catch (error) {
        console.error('Error in deleteHousehold:', error);
        showErrorToast('Error deleting household: ' + error.message);
    } finally {
        hideLoader();
    }
};

// Function to show delete confirmation dialog
function showDeleteConfirmation() {
    return new Promise((resolve) => {
        const confirmationDialog = document.createElement('div');
        confirmationDialog.className = 'confirmation-dialog-overlay';
        
        confirmationDialog.innerHTML = `
            <div class="confirmation-dialog">
                <h3>Confirm Deletion</h3>
                <p>Are you sure you want to delete this household?</p>
                <p class="warning-text">This action will move the household to archives.</p>
                <div class="confirmation-buttons">
                    <button class="cancel-btn">Cancel</button>
                    <button class="confirm-btn">Delete</button>
                </div>
            </div>
        `;

        document.body.appendChild(confirmationDialog);

        // Add event listeners
        const confirmBtn = confirmationDialog.querySelector('.confirm-btn');
        const cancelBtn = confirmationDialog.querySelector('.cancel-btn');
        const dialog = confirmationDialog.querySelector('.confirmation-dialog');

        confirmBtn.onclick = () => {
            document.body.removeChild(confirmationDialog);
            resolve(true);
        };

        cancelBtn.onclick = () => {
            document.body.removeChild(confirmationDialog);
            resolve(false);
        };

        // Close if clicking outside the dialog
        confirmationDialog.onclick = (e) => {
            if (e.target === confirmationDialog) {
                document.body.removeChild(confirmationDialog);
                resolve(false);
            }
        };
    });
}

// Function to show toast messages
function showSuccessToast(message) {
    showToast(message, 'success');
}

function showErrorToast(message) {
    showToast(message, 'error');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());

    document.body.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Add styles for the confirmation dialog and toast ##################
const deleteStyles = document.createElement('style');
deleteStyles.textContent = `
    .confirmation-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1100;
        animation: fadeIn 0.3s ease-out;
        backdrop-filter: blur(2px);
    }

    .confirmation-dialog {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        max-width: 400px;
        width: 90%;
         z-index: 1101;
        animation: slideIn 0.3s ease-out;
    }

    .confirmation-dialog h3 {
        color: #dc3545;
        margin-bottom: 15px;
    }

    .warning-text {
        color: #856404;
        background-color: #fff3cd;
        padding: 8px;
        border-radius: 4px;
        margin: 10px 0;
        font-size: 0.9em;
    }

    .confirmation-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
    }

    .confirmation-buttons button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    }

    .cancel-btn {
        background: #6c757d;
        color: white;
    }

    .confirm-btn {
        background: #dc3545;
        color: white;
    }

    .cancel-btn:hover {
        background: #5a6268;
    }

    .confirm-btn:hover {
        background: #c82333;
    }

    .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 4px;
        color: white;
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
    }

    .toast-success {
        background: #28a745;
    }

    .toast-error {
        background: #dc3545;
    }

    .toast-info {
        background: #17a2b8;
    }

    .toast-fade-out {
        animation: fadeOut 0.3s ease-out;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes slideIn {
        from { 
            opacity: 0;
            transform: translateY(-20px);
        }
        to { 
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(deleteStyles);

function normalizeName(data) {
    const dbFirstName = (data.firstName || '').toUpperCase().trim();
    const dbMiddleName = (data.middleName || '').toUpperCase().trim();
    const dbLastName = (data.lastName || '').toUpperCase().trim();

    return [
        `${dbFirstName} ${dbMiddleName} ${dbLastName}`.trim(),
        `${dbFirstName} ${dbLastName}`.trim(),
        dbFirstName
    ];
}


async function validateHeadName(name) {
    if (!name.trim()) return false;

    const searchName = name.trim().toUpperCase();
    console.log('Validating name:', searchName);

    try {
        const db = getFirestore();
        const usersRef = collection(db, 'users');
        
        // Split the full name into parts
        const nameParts = searchName.split(' ').filter(part => part.length > 0);
        
        // Try different queries to find the user
        let querySnapshot;
        
        // First try: Query by exact full name match across first, middle, and last name fields
        querySnapshot = await getDocs(query(
            usersRef,
            where('firstName', '==', nameParts[0]),
            where('middleName', '==', nameParts[1] || ''),
            where('lastName', '==', nameParts[2] || '')
        ));

        if (querySnapshot.empty && nameParts.length > 3) {
            // Second try: Handle compound first names
            const firstName = nameParts.slice(0, 2).join(' ');
            querySnapshot = await getDocs(query(
                usersRef,
                where('firstName', '==', firstName),
                where('middleName', '==', nameParts[2] || ''),
                where('lastName', '==', nameParts[3] || '')
            ));
        }

        if (querySnapshot.empty) {
            // Third try: More flexible query using just the first word of firstName
            querySnapshot = await getDocs(query(
                usersRef,
                where('firstName', '>=', nameParts[0]),
                where('firstName', '<=', nameParts[0] + '\uf8ff')
            ));
        }

        let isValid = false;
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const dbFirstName = (data.firstName || '').toUpperCase();
            const dbMiddleName = (data.middleName || '').toUpperCase();
            const dbLastName = (data.lastName || '').toUpperCase();
            const dbSuffix = (data.suffix || '').toUpperCase();

            // Construct full name variations
            const dbFullName = `${dbFirstName} ${dbMiddleName} ${dbLastName} ${dbSuffix}`.replace(/\s+/g, ' ').trim();
            const dbFullNameNoSuffix = `${dbFirstName} ${dbMiddleName} ${dbLastName}`.replace(/\s+/g, ' ').trim();

            console.log('Comparing with database name:', dbFullName);

            // Check for matches
            if (dbFullName === searchName || dbFullNameNoSuffix === searchName) {
                console.log('Found exact match:', dbFullName);
                isValid = true;
            }
        });

        console.log('Final validation result:', isValid);
        return isValid;

    } catch (error) {
        console.error('Error in validateHeadName:', error);
        return false;
    }
}



// Add form submit listener
form.addEventListener('submit', handleSubmit);

// Add styles for validation
const validationStyles = document.createElement('style');
validationStyles.textContent = `
    .validation-tooltip {
        position: absolute;
        background-color: #dc3545;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 14px;
        z-index: 1000;
        display: none;
        width: max-content;
        max-width: 250px;
        border-bottom: 2px solid #dc3545;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        top: 100%;
        left: 0;
        margin-top: 4px;
    }

    .validation-tooltip::before {
        content: '';
        position: absolute;
        top: -6px;
        left: 10px;
        border-width: 0 6px 6px 6px;
        border-style: solid;
        border-color: transparent transparent #dc3545 transparent;
    }

    .input-wrapper {
        position: relative;
    }

    .invalid-input {
        border-color: #dc3545 !important;
        background-color: transparent !important;
    }
`;
document.head.appendChild(validationStyles);


let tooltipTimeout;

document.getElementById('head').addEventListener('input', debounce(async function(event) {
    const headInput = event.target;
    const headName = headInput.value.trim().toUpperCase();
    
    if (headName.length < 3) return;
    
    try {
        const isValidHead = await validateHeadName(headName);
        let tooltip = headInput.parentElement.querySelector('.validation-tooltip');
        
        // Clear any existing timeout
        if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
        }
        
        if (!isValidHead) {
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.className = 'validation-tooltip';
                headInput.parentElement.appendChild(tooltip);
            }
            tooltip.textContent = 'This resident does not exist.';
            tooltip.style.display = 'block';
            headInput.classList.add('invalid-input');
            
            // Set new timeout and store its ID
            tooltipTimeout = setTimeout(() => {
                if (tooltip) tooltip.style.display = 'none';
            }, 3000);
        } else {
            if (tooltip) tooltip.style.display = 'none';
            headInput.classList.remove('invalid-input');
        }
    } catch (error) {
        console.error('Error validating head:', error);
    }
}, 500));

document.getElementById('fetchUserData').addEventListener('click', function() {
    const headInput = document.getElementById('head');
    const tooltip = headInput.parentElement.querySelector('.validation-tooltip');
    if (tooltip) tooltip.style.display = 'none';
    headInput.classList.remove('invalid-input');
});

// ######### RESETS THE FORM #####################

// Function to reset the form completely
function resetHouseholdForm() {
    const form = document.getElementById('household-info-form');
    if (!form) return;

    // Reset the form using the built-in reset method
    form.reset();

    // Clear validation states
    const headInput = document.getElementById('head');
    if (headInput) {
        headInput.classList.remove('invalid-input');
        const tooltip = headInput.parentElement.querySelector('.validation-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    }

    // Reset address and phone fields
    const addressInput = document.getElementById('address');
    const phoneInput = document.getElementById('phone');
    if (addressInput) addressInput.value = '';
    if (phoneInput) phoneInput.value = '';

    // Reset household members
    const membersContainer = document.getElementById('householdMembersContainer');
    if (membersContainer) {
        // Keep only the first member input and clear it
        const memberInputs = membersContainer.querySelectorAll('.member-input-group');
        memberInputs.forEach((input, index) => {
            if (index === 0) {
                input.querySelector('input').value = '';
            } else {
                input.remove();
            }
        });
    }

    // Reset select elements
    const ownershipSelect = document.getElementById('ownership');
    if (ownershipSelect) {
        ownershipSelect.selectedIndex = 0;
    }

    // Reset number inputs
    const numberInputs = ['totalMembers', 'totalMale', 'totalFemale'];
    numberInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });
}

// Update the close popup function 2
function closeHouseholdPopup() {
    const popupContainer = document.getElementById('householdPopupContainer');
    const overlay = document.getElementById('overlay');
    
    if (popupContainer) {
        popupContainer.style.display = 'none';
        resetHouseholdForm();
    }
    if (overlay) overlay.style.display = 'none';
}

// Add ESC key handler
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const popupContainer = document.getElementById('householdPopupContainer');
        if (popupContainer && popupContainer.style.display === 'block') {
            closeHouseholdPopup();
        }
    }
});

// Update existing click handlers
document.getElementById('householdCloseButton').addEventListener('click', closeHouseholdPopup);
document.getElementById('overlay').addEventListener('click', function(e) {
    if (e.target === this) {
        closeHouseholdPopup();
    }
});

// Also update the success popup close handler
function closePopup() {
    const successPopup = document.getElementById('successPopup');
    const popupContainer = document.getElementById('householdPopupContainer');
    const overlay = document.getElementById('overlay');

    if (successPopup) successPopup.style.display = 'none';
    if (popupContainer) {
        popupContainer.style.display = 'none';
        resetHouseholdForm();
    }
    if (overlay) overlay.style.display = 'none';
}

// Add styles for smooth transitions
const resetStyles = document.createElement('style');
resetStyles.textContent = `
    .household-popup-container {
        transition: opacity 0.3s ease-out;
    }

    .household-popup-container.hiding {
        opacity: 0;
    }

    .overlay {
        transition: opacity 0.3s ease-out;
    }

    .overlay.hiding {
        opacity: 0;
    }
`;
document.head.appendChild(resetStyles);


function resetUpdateHouseholdForm() {
    const form = document.getElementById('upd-household-info-form');
    if (!form) return;

    // Reset the form using the built-in reset method
    form.reset();

    // Clear validation states
    const headInput = document.getElementById('upd-head');
    if (headInput) {
        headInput.classList.remove('invalid-input');
        const tooltip = headInput.parentElement.querySelector('.validation-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    }

    // Reset address and phone fields
    const addressInput = document.getElementById('upd-address');
    const phoneInput = document.getElementById('upd-phone');
    if (addressInput) addressInput.value = '';
    if (phoneInput) phoneInput.value = '';

    // Reset household members
    const membersContainer = document.getElementById('upd-householdMembersContainer');
    if (membersContainer) {
        // Keep only the first member input and clear it
        const memberInputs = membersContainer.querySelectorAll('.member-input-group');
        memberInputs.forEach((input, index) => {
            if (index === 0) {
                input.querySelector('input').value = '';
            } else {
                input.remove();
            }
        });
    }

    // Reset select elements
    const ownershipSelect = document.getElementById('upd-ownership');
    if (ownershipSelect) {
        ownershipSelect.selectedIndex = 0;
    }

    // Reset number inputs
    const numberInputs = ['upd-totalMembers', 'upd-totalMale', 'upd-totalFemale'];
    numberInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });
}

// Function to show confirmation dialog before clearing
function showClearConfirmation(formType) {
    return new Promise((resolve) => {
        const confirmationDialog = document.createElement('div');
        confirmationDialog.className = 'confirmation-dialog-overlay';
        
        confirmationDialog.innerHTML = `
            <div class="confirmation-dialog">
                <h3>Confirm Clear</h3>
                <p>Are you sure you want to clear all fields?</p>
                <p class="warning-text">This action cannot be undone.</p>
                <div class="confirmation-buttons">
                    <button class="cancel-btn">Cancel</button>
                    <button class="confirm-btn">Clear</button>
                </div>
            </div>
        `;

        document.body.appendChild(confirmationDialog);

        const confirmBtn = confirmationDialog.querySelector('.confirm-btn');
        const cancelBtn = confirmationDialog.querySelector('.cancel-btn');

        confirmBtn.onclick = () => {
            document.body.removeChild(confirmationDialog);
            resolve(true);
        };

        cancelBtn.onclick = () => {
            document.body.removeChild(confirmationDialog);
            resolve(false);
        };

        confirmationDialog.onclick = (e) => {
            if (e.target === confirmationDialog) {
                document.body.removeChild(confirmationDialog);
                resolve(false);
            }
        };
    });
}

// Add event listeners for clear buttons
document.addEventListener('DOMContentLoaded', function() {
    // Clear button for add household form
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', async function() {
            const shouldClear = await showClearConfirmation('add');
            if (shouldClear) {
                resetHouseholdForm();
                // Show success toast
                const toast = document.createElement('div');
                toast.className = 'toast toast-success';
                toast.textContent = 'Form cleared successfully';
                document.body.appendChild(toast);
                setTimeout(() => {
                    toast.remove();
                }, 3000);
            }
        });
    }

    // Clear button for update household form
    const updClearBtn = document.getElementById('upd-clear-btn');
    if (updClearBtn) {
        updClearBtn.addEventListener('click', async function() {
            const shouldClear = await showClearConfirmation('update');
            if (shouldClear) {
                resetUpdateHouseholdForm();
                // Show success toast
                const toast = document.createElement('div');
                toast.className = 'toast toast-success';
                toast.textContent = 'Form cleared successfully';
                document.body.appendChild(toast);
                setTimeout(() => {
                    toast.remove();
                }, 3000);
            }
        });
    }
});

// Add additional styles for toast messages
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 4px;
        color: white;
        z-index: 1200;
        animation: slideIn 0.3s ease-out;
    }

    .toast-success {
        background: #28a745;
    }

    @keyframes slideIn {
        from { 
            opacity: 0;
            transform: translateX(100%);
        }
        to { 
            opacity: 1;
            transform: translateX(0);
        }
    }

    .confirmation-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease-out;
    }

    

    .warning-text {
        color: #856404;
        background-color: #fff3cd;
        padding: 8px;
        border-radius: 4px;
        margin: 10px 0;
    }

    .confirmation-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
    }

    .confirmation-buttons button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .cancel-btn {
        background: #6c757d;
        color: white;
    }

    .confirm-btn {
        background: #dc3545;
        color: white;
    }
`;
document.head.appendChild(additionalStyles);


// Add this to your JavaScript file
document.addEventListener('DOMContentLoaded', function() {
    const addMemberBtn = document.getElementById('addMemberBtn');
    const addMemberOverlay = document.getElementById('addMemberOverlay');
    const addMemberPopupContainer = document.getElementById('addMemberPopupContainer');
    const addMemberCloseButton = document.getElementById('addMemberCloseButton');

    // Open popup when Add Member button is clicked
    addMemberBtn.addEventListener('click', function() {
        addMemberOverlay.style.display = 'block';
        addMemberPopupContainer.style.display = 'block';
    });

    // Close popup when close button is clicked
    addMemberCloseButton.addEventListener('click', function() {
        addMemberOverlay.style.display = 'none';
        addMemberPopupContainer.style.display = 'none';
    });

    // Close popup when clicking outside
    addMemberOverlay.addEventListener('click', function(e) {
        if (e.target === addMemberOverlay) {
            addMemberOverlay.style.display = 'none';
            addMemberPopupContainer.style.display = 'none';
        }
    });
});

// ####################### HOUSEHOLD MEMBER SUBMISSION ############################
async function generateCustomId() {
    const counterDoc = await getDoc(doc(db, 'counters', 'userCounter'));
    let counter = counterDoc.exists() ? counterDoc.data().count : 1;
    await setDoc(doc(db, 'counters', 'userCounter'), { count: counter + 1 });

    return `SADPI-${String(counter).padStart(6, '0')}`;
}

// Add submit event listener to member form
const memberForm = document.getElementById('member-info-form');
memberForm.addEventListener('submit', handleMemberSubmit);

async function handleMemberSubmit(event) {
    event.preventDefault();

    // Show confirmation dialog
    const confirmed = await showConfirmDialog('Are you sure you want to submit this member information?');
    
    if (!confirmed) return;

    try {
        const uniqueId = await generateCustomId();
        const formData = new FormData(event.target);
        
        // Create member data object
        const memberData = {
            uniqueId: uniqueId,
            firstName: formData.get('fname').toUpperCase(),
            middleName: formData.get('mname').toUpperCase() || '',
            lastName: formData.get('lname').toUpperCase(),
            suffix: formData.get('suffix').toUpperCase() || '',
            blklot: formData.get('blklot').toUpperCase(),
            street: formData.get('street').toUpperCase(),
            citizenship: formData.get('citizenship').toUpperCase(),
            birthdate: formData.get('birthdate'),
            birthplace: formData.get('birthplace').toUpperCase(),
            gender: formData.get('gender'),
            voter: formData.get('voter'),
            maritalStatus: formData.get('marital-status'),
            employmentStatus: formData.get('employment-status'),
            educationalStatus: formData.get('educational-status'),
            kdbm: formData.get('kdbm') || 'NO',
            pwd: formData.get('pwd') || 'NO',
            fourPs: formData.get('fourPs') || 'NO',
            soloParent: formData.get('soloParent') || 'NO',
            phone: formData.get('phone') || '',
            email: formData.get('email') || '',
            occupation: formData.get('occupation') || '',
            role: '',
            householdId: '',
            createdAt: new Date(),
            createdBy: auth.currentUser.uid
        };

        // Add to Firebase
        await setDoc(doc(db, 'users', uniqueId), memberData);

        // Create member display element
        const memberContainer = document.getElementById('householdMembersContainer');
        const memberDiv = document.createElement('div');
        memberDiv.className = 'member-display-item';
        
        // Format the full name
        const fullName = `${memberData.firstName} ${memberData.middleName} ${memberData.lastName}`.trim();
        // Format the birthdate
        const birthdate = new Date(formData.get('birthdate')).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        memberDiv.innerHTML = `
            <div class="member-info">
                <p class="member-name">${fullName}</p>
                <p class="member-details">ID: ${uniqueId} | Birthdate: ${birthdate}</p>
            </div>
        `;

        memberContainer.appendChild(memberDiv);

        const style = document.createElement('style');
        style.textContent = `
            .member-display-item {
                background: rgba(255, 255, 255, 0.1);
                padding: 10px;
                margin: 5px 0;
                border-radius: 4px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            }

            .member-info {
                color: #f0f0f0;
            }

            .member-name {
                font-size: 16px;
                margin: 0;
                font-weight: 500;
            }

            .member-details {
                font-size: 14px;
                margin: 5px 0 0 0;
                color: #cdcdcd;
            }
        `;
        document.head.appendChild(style);

        showToast('Member added successfully!', 'success');
        event.target.reset();

        closeMemberPopup();

    } catch (error) {
        console.error('Error adding member:', error);
        showToast('Error adding member: ' + error.message, 'error');
    }
}

function closeMemberPopup() {
    document.getElementById('addMemberOverlay').style.display = 'none';
    document.getElementById('addMemberPopupContainer').style.display = 'none';
    document.getElementById('member-info-form').reset();
}

function showConfirmDialog(message) {
    return new Promise((resolve) => {
        const confirmationDialog = document.createElement('div');
        confirmationDialog.className = 'confirmation-dialog-overlay';
        
        confirmationDialog.innerHTML = `
            <div class="confirmation-dialog">
                <h3>Confirm Submission</h3>
                <p>${message}</p>
                <div class="confirmation-buttons">
                    <button class="cancel-btn">Cancel</button>
                    <button class="confirm-btn">Yes, Submit</button>
                </div>
            </div>
        `;

        document.body.appendChild(confirmationDialog);

        const confirmBtn = confirmationDialog.querySelector('.confirm-btn');
        const cancelBtn = confirmationDialog.querySelector('.cancel-btn');

        confirmBtn.onclick = () => {
            document.body.removeChild(confirmationDialog);
            resolve(true);
        };

        cancelBtn.onclick = () => {
            document.body.removeChild(confirmationDialog);
            resolve(false);
        };

        confirmationDialog.onclick = (e) => {
            if (e.target === confirmationDialog) {
                document.body.removeChild(confirmationDialog);
                resolve(false);
            }
        };
    });
}

// ############################### ADD HOUSEHOLD (EXISTING) ###################################

// Wait for DOM content to be loaded
document.addEventListener('DOMContentLoaded', function() {
    // Create and inject the popup HTML if it doesn't exist
    const existingMemberStyles = document.createElement('style');
existingMemberStyles.textContent = `
    #existingMemberOverlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 1100;
        backdrop-filter: blur(2px);
        animation: fadeIn 0.3s ease-out;
    }

    #existingMemberPopup {
        background: white;
        padding: 20px;
        border-radius: 8px;
        width: 90%;
        max-width: 500px;
        position: relative;
        z-index: 999;
    }

    #existingMemberPopup .blurred-background {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
        to bottom right,
        #042136,
        #07385c,
        #094d7f,
        #0c6bb1,
        #1095f7
    );
    background-size: cover;
    background-position: center center;
    background-repeat: no-repeat;
    filter: blur(5px);
    z-index: -1;
}

    .existing-member-header {
        display: block;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .existing-member-header h3 {
        font-size: 24px;
        font-weight: bold;
        color: #cdcdcd;
        margin-bottom: 10px;
        text-align: center;
    }

    .close-existing-member {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #666;
    }

    .member-search-container {
        margin-bottom: 20px;
    }

    .member-search-container input {
        width: 70%;
        padding: 8px;
        margin-right: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        color: #cdcdcd;
        background: transparent;
        border: none;
        border-bottom: 1px solid #cdcdcd;
        border-radius: 20px;
    }

    .fetch-member-btn {
        padding: 8px 16px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .member-details-container {
        display: none;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 4px;
        margin-bottom: 20px;
    }

    .member-detail-item {
        margin-bottom: 10px;
    }

    .member-detail-label {
        font-weight: bold;
        color: #555;
    }

    .popup-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }

    .popup-buttons button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .cancel-btn {
        background: #6c757d;
        color: white;
    }

    .ok-btn {
        background: #28a745;
        color: white;
    }

    .error-message {
        color: #dc3545;
        margin-top: 5px;
        display: none;
    }
`;
document.head.appendChild(existingMemberStyles);

    if (!document.getElementById('existingMemberOverlay')) {
        const popupHTML = `
    <div id="existingMemberOverlay">
        <div id="existingMemberPopup">
        <div class="blurred-background"></div>
            <div class="existing-member-header">
                <h3>Add Existing Member</h3>
                <button class="close-existing-member">&times;</button>
            </div>
            <div class="member-search-container">
                <input type="text" id="memberIdInput" placeholder="Enter Member ID">
                <button class="fetch-member-btn">Fetch</button>
                <div class="error-message"></div>
            </div>
            <div class="member-details-container">
                <div class="member-detail-item">
                    <span class="member-detail-label">Member ID:</span>
                    <span id="displayMemberId"></span>
                </div>
                <div class="member-detail-item">
                    <span class="member-detail-label">Full Name:</span>
                    <span id="displayMemberName"></span>
                </div>
                <div class="member-detail-item">
                    <span class="member-detail-label">Birthdate:</span>
                    <span id="displayMemberBirthdate"></span>
                </div>
            </div>
            <div class="popup-buttons">
                <button class="cancel-btn">Cancel</button>
                <button class="ok-btn">OK</button>
            </div>
        </div>
    </div>

        `;
        document.body.insertAdjacentHTML('beforeend', popupHTML);
    }

    let currentMemberData = null;

    // Add button click handler
    const addExistingMemberBtn = document.getElementById('addExistingMemberBtn');
    if (addExistingMemberBtn) {
        addExistingMemberBtn.addEventListener('click', () => {
            const overlay = document.getElementById('existingMemberOverlay');
            if (overlay) {
                overlay.style.display = 'flex';
            }
        });
    }

    // Fetch button click handler
    const fetchButton = document.querySelector('.fetch-member-btn');
    if (fetchButton) {
        fetchButton.addEventListener('click', async () => {
            const memberId = document.getElementById('memberIdInput').value.trim().toUpperCase();
            const errorMessage = document.querySelector('.error-message');
            const detailsContainer = document.querySelector('.member-details-container');

            // Clear previous states
            errorMessage.style.display = 'none';
            detailsContainer.style.display = 'none';

            if (!memberId) {
                errorMessage.textContent = 'Please enter a Member ID';
                errorMessage.style.display = 'block';
                return;
            }

            try {
                // Show loading state
                fetchButton.disabled = true;
                fetchButton.textContent = 'Fetching...';

                console.log('Fetching member with ID:', memberId); // Debug log

                const memberDoc = await getDoc(doc(db, 'users', memberId));
                
                console.log('Query result:', memberDoc.exists(), memberDoc.data()); // Debug log

                if (!memberDoc.exists()) {
                    errorMessage.textContent = 'Member not found';
                    errorMessage.style.display = 'block';
                    return;
                }

                const memberData = memberDoc.data();
                currentMemberData = memberData;

                // Format full name
                const fullName = `${memberData.firstName} ${memberData.middleName} ${memberData.lastName}`.trim();
                
                // Format birthdate
                const birthdate = new Date(memberData.birthdate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                // Display member details
                document.getElementById('displayMemberId').textContent = memberId;
                document.getElementById('displayMemberName').textContent = fullName;
                document.getElementById('displayMemberBirthdate').textContent = birthdate;

                detailsContainer.style.display = 'block';

            } catch (error) {
                console.error('Error fetching member:', error);
                errorMessage.textContent = 'Error fetching member data';
                errorMessage.style.display = 'block';
            } finally {
                // Reset button state
                fetchButton.disabled = false;
                fetchButton.textContent = 'Fetch';
            }
        });
    }

    // OK button click handler
    const okButton = document.querySelector('.ok-btn');
    if (okButton) {
        okButton.addEventListener('click', () => {
            if (currentMemberData) {
                const memberContainer = document.getElementById('householdMembersContainer');
                if (memberContainer) {
                    const memberDiv = document.createElement('div');
                    memberDiv.className = 'member-display-item';
                    
                    const fullName = `${currentMemberData.firstName} ${currentMemberData.middleName} ${currentMemberData.lastName}`.trim();
                    const birthdate = new Date(currentMemberData.birthdate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });

                    memberDiv.innerHTML = `
                        <div class="member-info">
                            <p class="member-name">${fullName}</p>
                            <p class="member-details">ID: ${currentMemberData.uniqueId} | Birthdate: ${birthdate}</p>
                        </div>
                    `;

                    memberContainer.appendChild(memberDiv);
                    
                    closeExistingMemberPopup();
                    showToast('Member added successfully!', 'success');
                }
            }
        });
    }

    // Close popup handlers
    function closeExistingMemberPopup() {
        const overlay = document.getElementById('existingMemberOverlay');
        const detailsContainer = document.querySelector('.member-details-container');
        const errorMessage = document.querySelector('.error-message');
        const input = document.getElementById('memberIdInput');

        if (overlay) overlay.style.display = 'none';
        if (detailsContainer) detailsContainer.style.display = 'none';
        if (errorMessage) errorMessage.style.display = 'none';
        if (input) input.value = '';
        currentMemberData = null;
    }

    // Attach close handlers
    const closeButton = document.querySelector('.close-existing-member');
    if (closeButton) {
        closeButton.addEventListener('click', closeExistingMemberPopup);
    }

    const cancelButton = document.querySelector('.cancel-btn');
    if (cancelButton) {
        cancelButton.addEventListener('click', closeExistingMemberPopup);
    }

    const overlay = document.getElementById('existingMemberOverlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeExistingMemberPopup();
            }
        });
    }
});