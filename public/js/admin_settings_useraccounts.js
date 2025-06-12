// ########################## ADMIN_SETTINGS_USERACCOUNTS.JS ############################## 

import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    sendEmailVerification,
    fetchSignInMethodsForEmail 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

import { 
    initializeApp 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";

import { 
    getFirestore, 
    doc, 
    setDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    orderBy,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Your Firebase configuration
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

// Initialize the primary Firebase instance
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function showLoader() {
    document.getElementById('loader-container').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loader-container').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Loading all accounts...');
    loadFilteredAccounts();
    setupFilters();
});

// Function to format timestamp to readable date
const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

let currentFilters = {
    role: 'ALL',
    search: '',
    date: ''
};

const filterUsers = async (users) => {
    const { adminUsers, regularUsers } = users;
    let filteredUsers = [];

    try {
        // Apply role filter
        if (currentFilters.role === 'ALL') {
            filteredUsers = [...adminUsers, ...regularUsers];
        } else if (currentFilters.role === 'ADMIN' || currentFilters.role === 'SUBADMIN') {
            filteredUsers = adminUsers.filter(user => {
                const userData = user.data();
                return userData.role.toUpperCase() === currentFilters.role;
            });
        } else if (currentFilters.role === 'RESIDENT') {
            filteredUsers = [...regularUsers];
        }

        // Apply search filter if exists
        if (currentFilters.search) {
            filteredUsers = filteredUsers.filter(user => {
                const userData = user.data();
                const fullName = `${userData.firstName} ${userData.lastName || ''}`.toLowerCase();
                const email = (userData.email || '').toLowerCase();
                const username = (userData.username || '').toLowerCase();
                const searchTerm = currentFilters.search.toLowerCase();

                return fullName.includes(searchTerm) || 
                       email.includes(searchTerm) || 
                       username.includes(searchTerm);
            });
        }

        // Apply date filter if exists
        if (currentFilters.date) {
            filteredUsers = filteredUsers.filter(user => {
                const userData = user.data();
                const isAdmin = adminUsers.includes(user);
                
                if (isAdmin) return true; // Skip date filter for admin users
                
                const lastLogin = formatDate(userData.lastLogin);
                return new Date(lastLogin).toLocaleDateString() === new Date(currentFilters.date).toLocaleDateString();
            });
        }

        return filteredUsers;
    } catch (error) {
        console.error('Error filtering users:', error);
        return [];
    }
};

const loadFilteredAccounts = async (page = 1, usersPerPage = 10) => {
    const tableBody = document.querySelector('.user-table tbody');
    if (!tableBody) {
        console.error('Table body element not found');
        return;
    }

    try {
        // Show loading state
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Loading...</td></tr>';

        // Get filtered users
        const { filteredUsers, adminUsers } = await getFilteredUsers();
        
        // If no users found
        if (filteredUsers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No users found</td></tr>';
            updateUserStats([]);
            
            // Update page info even when no users found
            const pageInfo = document.querySelector('.page-info');
            if (pageInfo) {
                pageInfo.textContent = 'Showing 0 of 0 users';
            }
            return;
        }

        // Update stats for filtered users
        updateUserStats(filteredUsers.map(doc => doc.data()));

        // Calculate pagination
        const startIndex = (page - 1) * usersPerPage;
        const endIndex = Math.min(startIndex + usersPerPage, filteredUsers.length);
        const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

        // Render table rows
        tableBody.innerHTML = paginatedUsers.map(user => {
            const isAdmin = adminUsers.includes(user);
            return renderTableRow(user, isAdmin ? 'admin' : 'user');
        }).join('');

        // Update page info
        const pageInfo = document.querySelector('.page-info');
        if (pageInfo) {
            pageInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${filteredUsers.length} users`;
        }

        // Setup pagination buttons
        const paginationContainer = document.querySelector('.page-buttons');
        if (paginationContainer) {
            const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
            
            let paginationHTML = `
                <button class="page-btn" ${page === 1 ? 'disabled' : ''} 
                    onclick="loadFilteredAccounts(${page - 1})">⟨⟨</button>
            `;

            // For small number of pages
            if (totalPages <= 5) {
                for (let i = 1; i <= totalPages; i++) {
                    paginationHTML += `
                        <button class="page-btn ${page === i ? 'active' : ''}" 
                            onclick="loadFilteredAccounts(${i})">${i}</button>
                    `;
                }
            } else {
                // Show first page
                if (page > 3) {
                    paginationHTML += `
                        <button class="page-btn" onclick="loadFilteredAccounts(1)">1</button>
                        <span class="page-btn">...</span>
                    `;
                }

                // Show pages around current page
                for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i++) {
                    paginationHTML += `
                        <button class="page-btn ${page === i ? 'active' : ''}" 
                            onclick="loadFilteredAccounts(${i})">${i}</button>
                    `;
                }

                // Show last page
                if (page < totalPages - 2) {
                    paginationHTML += `
                        <span class="page-btn">...</span>
                        <button class="page-btn" onclick="loadFilteredAccounts(${totalPages})">${totalPages}</button>
                    `;
                }
            }

            paginationHTML += `
                <button class="page-btn" ${page === totalPages ? 'disabled' : ''} 
                    onclick="loadFilteredAccounts(${page + 1})">⟩⟩</button>
            `;

            paginationContainer.innerHTML = paginationHTML;
        }

    } catch (error) {
        console.error('Error loading filtered accounts:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: red;">
                    Error loading accounts. Please try again later.
                </td>
            </tr>
        `;
    }
};

// Function to update stats cards
const updateUserStats = (users) => {
    try {
        const totalUsers = users.length;
        const activeUsers = users.filter(user => user.status === 'active' || user.admintrue).length;
        const inactiveUsers = totalUsers - activeUsers;

        const statsElements = document.querySelectorAll('.stat-number');
        if (statsElements.length >= 3) {
            statsElements[0].textContent = totalUsers.toLocaleString();
            statsElements[1].textContent = activeUsers.toLocaleString();
            statsElements[2].textContent = inactiveUsers.toLocaleString();
        }
    } catch (error) {
        console.error('Error updating user stats:', error);
    }
};

// Function to render table rows
const renderTableRow = (userData, collectionType = 'user') => {
    const user = userData.data();
    
    if (collectionType === 'admin') {
        // Handle both naming conventions
        const firstName = user.firstName || user.firstName || '';
        const lastName = user.lastName || user.lastName || '';
        const id = user.adminId || user.uid || 'N/A';
        const status = user.admintrue ? 'Active' : 
                      user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 
                      'Inactive';
        
        return `
            <tr data-collection="${collectionType}">
                <td>${id}</td>
                <td>${firstName} ${lastName}</td>
                <td>${user.username || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td><span class="status-badge status-${status.toLowerCase()}">${status}</span></td>
                <td>${formatDate(user.lastLogin || user.dateCreated) || 'N/A'}</td>                
            </tr>
        `;
    } else {
        // Regular user rendering
        return `
            <tr data-collection="${collectionType}">
                <td>${user.uniqueId || user.uid || 'N/A'}</td>
                <td>${user.firstName || user.firstName || ''} ${user.lastName || user.lastName || ''}</td>
                <td>${user.username || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td><span class="status-badge status-${user.status || 'inactive'}">${(user.status || 'inactive').charAt(0).toUpperCase() + (user.status || 'inactive').slice(1)}</span></td>
                <td>${formatDate(user.lastLogin || user.dateCreated) || 'N/A'}</td>
            </tr>
        `;
    }
};

// Function to fetch users from both collections
const fetchAllUsers = async () => {
    try {
        // Fetch admin accounts
        const adminRef = collection(db, 'Admin_Accounts');
        const adminQuery = query(adminRef);
        const adminSnapshot = await getDocs(adminQuery);
        const adminDocs = adminSnapshot.docs;

        // Fetch user accounts (residents)
        const userRef = collection(db, 'User_Accounts');
        const userQuery = query(userRef);
        const userSnapshot = await getDocs(userQuery);
        const userDocs = userSnapshot.docs;

        console.log('Fetched accounts:', {
            admins: adminDocs.length,
            users: userDocs.length
        });

        return {
            adminUsers: adminDocs,
            regularUsers: userDocs
        };
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
};

const getFilteredUsers = async () => {
    try {
        const { adminUsers, regularUsers } = await fetchAllUsers();
        let filteredUsers = [];

        // First apply role filter
        switch (currentFilters.role) {
            case 'ADMIN':
                filteredUsers = adminUsers.filter(user => {
                    const userData = user.data();
                    return (
                        (userData.role && userData.role.toUpperCase() === 'ADMIN') || 
                        (userData.adminId && userData.adminId.startsWith('AD-'))
                    );
                });
                break;
            case 'SUBADMIN':
                filteredUsers = adminUsers.filter(user => {
                    const userData = user.data();
                    return (
                        (userData.role && userData.role.toUpperCase() === 'SUBADMIN') || 
                        (userData.adminId && userData.adminId.startsWith('SA-'))
                    );
                });
                break;
            case 'RESIDENT':
                filteredUsers = regularUsers;
                break;
            case 'ALL':
            default:
                filteredUsers = [...adminUsers, ...regularUsers];
                break;
        }

        // Apply search filter if exists
        if (currentFilters.search) {
            const searchTerm = currentFilters.search.toLowerCase();
            filteredUsers = filteredUsers.filter(user => {
                const userData = user.data();
                const firstName = userData.firstName || userData.fname || '';
                const lastName = userData.lastName || userData.lname || '';
                const fullName = `${firstName} ${lastName}`.toLowerCase();
                const email = (userData.email || '').toLowerCase();
                const username = (userData.username || '').toLowerCase();

                return fullName.includes(searchTerm) || 
                       email.includes(searchTerm) || 
                       username.includes(searchTerm);
            });
        }

        // Apply date filter if exists
        if (currentFilters.date) {
            filteredUsers = filteredUsers.filter(user => {
                const userData = user.data();
                const isAdmin = adminUsers.includes(user);
                
                let dateToCheck;
                if (isAdmin) {
                    // For admin/subadmin users, check dateCreated
                    dateToCheck = userData.dateCreated;
                } else {
                    // For regular users, check registrationDate
                    dateToCheck = userData.registrationDate;
                }
                
                if (!dateToCheck) return false;
                
                // Convert the date to YYYY-MM-DD format for comparison
                let dateStr;
                if (dateToCheck instanceof Date) {
                    dateStr = dateToCheck.toISOString().split('T')[0];
                } else if (dateToCheck.toDate) {
                    // Handle Firestore Timestamp
                    dateStr = dateToCheck.toDate().toISOString().split('T')[0];
                } else if (typeof dateToCheck === 'string') {
                    // Handle ISO string date
                    dateStr = dateToCheck.split('T')[0];
                } else {
                    return false;
                }

                // Debug log
                console.log('Date comparison:', {
                    user: userData.username || userData.email,
                    dateStr,
                    filterDate: currentFilters.date,
                    matches: dateStr === currentFilters.date
                });

                return dateStr === currentFilters.date;
            });
        }

        // Log final results for debugging
        console.log('Final filtered results:', {
            total: filteredUsers.length,
            users: filteredUsers.map(user => {
                const userData = user.data();
                return {
                    username: userData.username,
                    email: userData.email,
                    date: userData.dateCreated || userData.registrationDate,
                    isAdmin: adminUsers.includes(user)
                };
            })
        });

        return { filteredUsers, adminUsers };
    } catch (error) {
        console.error('Error getting filtered users:', error);
        return { filteredUsers: [], adminUsers: [] };
    }
};

// Previous imports and functions remain the same up to loadAllAccounts...

const setupPagination = (totalUsers, currentPage, usersPerPage) => {
    try {
        const paginationContainer = document.querySelector('.page-buttons');
        const pageInfo = document.querySelector('.page-info');
        
        if (!paginationContainer || !pageInfo) {
            console.warn('Pagination elements not found');
            return;
        }

        const totalPages = Math.ceil(totalUsers / usersPerPage);
        
        // Update page info text
        const startIndex = (currentPage - 1) * usersPerPage + 1;
        const endIndex = Math.min(startIndex + usersPerPage - 1, totalUsers);
        pageInfo.textContent = `Showing ${startIndex}-${endIndex} of ${totalUsers} users`;

        // Generate pagination buttons with filter state
        let paginationHTML = `
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="loadFilteredAccounts(${currentPage - 1})">⟨⟨</button>
        `;

        // For small number of pages, show all
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += `
                    <button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="loadFilteredAccounts(${i})">${i}</button>
                `;
            }
        } else {
            // Always show first page
            if (currentPage > 3) {
                paginationHTML += `
                    <button class="page-btn" onclick="loadFilteredAccounts(1)">1</button>
                    <span class="page-btn">...</span>
                `;
            }

            // Show pages around current page
            for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
                paginationHTML += `
                    <button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="loadFilteredAccounts(${i})">${i}</button>
                `;
            }

            // Always show last page
            if (currentPage < totalPages - 2) {
                paginationHTML += `
                    <span class="page-btn">...</span>
                    <button class="page-btn" onclick="loadFilteredAccounts(${totalPages})">${totalPages}</button>
                `;
            }
        }

        paginationHTML += `
            <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="loadFilteredAccounts(${currentPage + 1})">⟩⟩</button>
        `;

        paginationContainer.innerHTML = paginationHTML;
    } catch (error) {
        console.error('Error setting up pagination:', error);
    }
};

// Main function to load all accounts
const loadAllAccounts = async (page = 1, usersPerPage = 10) => { // Changed default page size to 10
    const tableBody = document.querySelector('.user-table tbody');
    if (!tableBody) {
        console.error('Table body element not found');
        return;
    }

    try {
        // Show loading state
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Loading...</td></tr>';

        // Fetch all users
        const { adminUsers, regularUsers } = await fetchAllUsers();
        
        // If no users found
        if (adminUsers.length === 0 && regularUsers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No users found</td></tr>';
            updateUserStats([]);
            return;
        }

        // Combine all users for stats
        const allUsers = [...adminUsers, ...regularUsers];
        updateUserStats(allUsers.map(doc => doc.data()));

        // Calculate pagination
        const startIndex = (page - 1) * usersPerPage;
        const endIndex = startIndex + usersPerPage;
        const paginatedUsers = allUsers.slice(startIndex, endIndex);

        // Render table rows
        tableBody.innerHTML = paginatedUsers.map(user => {
            const isAdmin = adminUsers.includes(user);
            return renderTableRow(user, isAdmin ? 'admin' : 'user');
        }).join('');

        // Setup pagination
        setupPagination(allUsers.length, page, usersPerPage);

    } catch (error) {
        console.error('Error loading accounts:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: red;">
                    Error loading accounts. Please try again later.
                </td>
            </tr>
        `;
    }
};

// Enhanced filter function
const setupFilters = () => {
    const searchInput = document.querySelector('input[placeholder="Search by name or email..."]');
    const roleSelect = document.querySelector('select.filter-input');
    const dateInput = document.querySelector('input[type="date"].filter-input');

    if (!searchInput || !roleSelect || !dateInput) {
        console.warn('Filter elements not found');
        return;
    }

    const applyFilters = () => {
        currentFilters = {
            search: searchInput.value || '',
            role: roleSelect.value || 'ALL',
            date: dateInput.value || ''
        };
        
        loadFilteredAccounts(1);
    };

    // Add event listeners
    searchInput.addEventListener('input', applyFilters);
    roleSelect.addEventListener('change', applyFilters);
    dateInput.addEventListener('change', applyFilters);
};

// Initialize filters when page loads
document.addEventListener('DOMContentLoaded', setupFilters);

// Call setupFilters when the page loads
document.addEventListener('DOMContentLoaded', setupFilters);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Loading all accounts...');
    loadAllAccounts();
    setupFilters();
});

// Make functions available globally for onclick handlers
window.loadAllAccounts = loadAllAccounts;
window.loadFilteredAccounts = loadFilteredAccounts;

window.openEditModal = (userId, collectionType) => {
    console.log('Edit user:', userId, 'from collection:', collectionType);
    // Implement edit modal functionality
};

window.toggleAdminStatus = async (userId, currentStatus) => {
    try {
        const userRef = doc(db, 'Admin_Accounts', userId);
        await updateDoc(userRef, {
            admintrue: !currentStatus
        });
        loadAllAccounts(); // Reload the table
    } catch (error) {
        console.error('Error toggling admin status:', error);
        alert('Error updating admin status');
    }
};

window.toggleUserStatus = async (userId, currentStatus, collectionType) => {
    try {
        const userRef = doc(db, 'User_Accounts', userId);
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        await updateDoc(userRef, {
            status: newStatus
        });
        loadAllAccounts(); // Reload the table
    } catch (error) {
        console.error('Error toggling user status:', error);
        alert('Error updating user status');
    }
};

window.deleteUser = async (userId, collectionType) => {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            const collectionName = collectionType === 'admin' ? 'Admin_Accounts' : 'User_Accounts';
            const userRef = doc(db, collectionName, userId);
            await deleteDoc(userRef);
            loadAllAccounts(); // Reload the table
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error deleting user');
        }
    }
};

const clearFilterBtn = document.getElementById('clearFilterBtn');
const searchInput = document.querySelector('input[placeholder="Search by name or email..."]');
const roleSelect = document.querySelector('select.filter-input');

clearFilterBtn.addEventListener('click', function() {
    try {
        // Clear search
        searchInput.value = '';
        
        // Clear role
        roleSelect.value = 'ALL';
        
        // Clear date - get fresh reference each time
        const dateInput = document.querySelector('input[type="date"].filter-input');
        if (dateInput) {
            dateInput.value = '';
            
            // Trigger change event to update filters
            dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Reset filters object
        currentFilters = {
            role: 'ALL',
            search: '',
            date: ''
        };

        // Reload table
        loadFilteredAccounts(1);
        
        console.log('Filters cleared:', {
            searchValue: searchInput.value,
            roleValue: roleSelect.value,
            dateValue: dateInput ? dateInput.value : 'no date input',
            currentFilters
        });

    } catch (error) {
        console.error('Error clearing filters:', error);
    }
});

// ################################# ADMIN REGISTRATION ######################################

document.getElementById('position').addEventListener('change', function () {
    const position = this.value;  // Get selected position value
    const roleSelect = document.getElementById('role');  // Get the role select element

    if (position === 'PUNONG_BARANGAY' || position === 'SECRETARY') {
        // Set role to 'ADMIN' for Punong Barangay and Secretary
        roleSelect.value = 'ADMIN';
    } else if (position === 'OTHER') {
        // Set role to 'SUBADMIN' for other positions
        roleSelect.value = 'SUBADMIN';
    }
});


// Get DOM elements
const adminRegBtn = document.getElementById('adminRegSubmitBtn');
const adminRegModal = document.getElementById('adminRegisterModal');
const adminRegForm = document.getElementById('admin-reg-form');
const successPopup = document.getElementById('adminRegPopup');
const closePopupBtn = document.getElementById('closePopup');
const adminRegCloseBtn = document.getElementById('adminRegCloseBtn');
const adminRegOverlay = document.getElementById('adminRegOverlay');
const loaderContainer = document.getElementById('loader-container');

// Show admin registration modal and overlay
adminRegBtn.addEventListener('click', (e) => {
    e.preventDefault();
    adminRegModal.style.display = 'block';
    adminRegOverlay.style.display = 'block';
    adminRegModal.classList.add('fade-in');
});

// Function to close modal and overlay
function closeAdminRegModal() {
    adminRegModal.style.display = 'none';
    adminRegOverlay.style.display = 'none';
    // Optional: Reset form when closing
    adminRegForm.reset();
}

// Close admin registration modal
adminRegCloseBtn.addEventListener('click', closeAdminRegModal);

// // Handle form submission
// adminRegForm.addEventListener('submit', (e) => {
//     e.preventDefault();
//     // Handle your form submission logic here
    
//     // Hide registration modal, overlay and show success popup
//     adminRegModal.style.display = 'none';
//     adminRegOverlay.style.display = 'none';
//     successPopup.style.display = 'block';
//     successPopup.classList.add('fade-in');
// });

// Close success popup
closePopupBtn.addEventListener('click', () => {
    successPopup.style.display = 'none';
});

// Close modal when clicking on overlay
adminRegOverlay.addEventListener('click', closeAdminRegModal);

// ######### TOGGLE PASSWORD ##########
const togglePassword = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');
const eyeIcon = document.getElementById('eye');
const eyeSlashIcon = document.getElementById('eye-slash');

togglePassword.addEventListener('click', () => {
    // Toggle the password visibility
    const isPasswordVisible = passwordInput.type === 'password';
    passwordInput.type = isPasswordVisible ? 'text' : 'password';

    // Toggle the icons
    eyeIcon.style.display = isPasswordVisible ? 'none' : 'inline';
    eyeSlashIcon.style.display = isPasswordVisible ? 'inline' : 'none';
});

const phoneInput = document.getElementById('phone');
    
phoneInput.addEventListener('input', function (e) {
    this.value = this.value.replace(/[^0-9]/g, ''); 
});

const secondaryAuth = getAuth(initializeApp(firebaseConfig, 'secondary'));

adminRegForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        // Show loader
        showLoader();
        
        // Get form data
        const formData = {
            role: document.getElementById('role').value.toUpperCase(),
            position: document.getElementById('position').value,
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            firstName: document.getElementById('firstName').value.toUpperCase(),
            lastName: document.getElementById('lastName').value.toUpperCase(),
            email: document.getElementById('email').value.toLowerCase(),
            phone: document.getElementById('phone').value,
            birthdate: document.getElementById('birthdate').value,
        };

        // Validate form data
        validateFormData(formData);

        try {
            // Check if username exists
            const usernameExists = await checkUsernameExists(formData.username);
            if (usernameExists) {
                throw new Error('Username already exists');
            }

            // Check if email exists
            const emailExists = await checkEmailExists(formData.email);
            if (emailExists) {
                throw new Error('Email already exists');
            }
        } catch (error) {
            throw error;
        }

        // Get next available ID based on role
        const adminId = await getNextIdNumber(formData.role);

        // Create user using secondary auth instance
        const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            formData.email,
            formData.password
        );

        // Send email verification
        await sendEmailVerification(userCredential.user);

        // Hash password for storage
        const hashedPassword = hashPassword(formData.password);

        // Create admin document in Firestore with admintrue field
        const adminData = {
            adminId,
            role: formData.role,
            position: formData.position,
            username: formData.username,
            password: hashedPassword,
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            birthdate: formData.birthdate,
            dateCreated: serverTimestamp(),
            status: 'active',
            emailVerified: false,
            uid: userCredential.user.uid,
            admintrue: true  // Add this field for all admin registrations
        };

        // Add to Admin_Accounts collection using UID as document ID
        await setDoc(doc(db, 'Admin_Accounts', userCredential.user.uid), adminData);

        // Sign out from secondary auth instance
        await secondaryAuth.signOut();

        // Hide loader and modal
        loaderContainer.style.display = 'none';
        adminRegModal.style.display = 'none';
        adminRegOverlay.style.display = 'none';

        // Show success message
        successPopup.style.display = 'block';
        successPopup.classList.add('fade-in');

        // Reset form
        adminRegForm.reset();

        // Show success message
        alert('Admin registration successful! Verification email has been sent.');

    } catch (error) {
        console.error('Registration error:', error);
        loaderContainer.style.display = 'none';
        alert(error.message || 'Registration failed. Please try again.');
    }
    hideLoader();
});

// Function to get the next available ID number
async function getNextIdNumber(role) {
    try {
        const adminRef = collection(db, 'Admin_Accounts');
        const prefix = role === 'ADMIN' ? 'AD-' : 'SA-';
        
        // Query with both where and orderBy
        const q = query(
            adminRef,
            where('role', '==', role),
            orderBy('adminId', 'desc'),
            
        );
        
        try {
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                return `${prefix}0001`;
            }
            
            const latestId = querySnapshot.docs[0].data().adminId;
            const currentNumber = parseInt(latestId.slice(-4));
            const nextNumber = (currentNumber + 1).toString().padStart(4, '0');
            
            return `${prefix}${nextNumber}`;
            
        } catch (error) {
            // Handle missing index error
            if (error.code === 'failed-precondition' && error.message.includes('index')) {
                const indexUrlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
                if (indexUrlMatch) {
                    const indexUrl = indexUrlMatch[0];
                    const message = `Please create the required index by clicking the link below:\n\n${indexUrl}\n\nAfter creating the index, try registering again.`;
                    alert(message);
                    console.log('Index creation URL:', indexUrl);
                }
            }
            throw error;
        }
    } catch (error) {
        console.error('Error getting next ID:', error);
        throw error;
    }
}

// Function to hash password
function hashPassword(password) {
    return CryptoJS.SHA256(password).toString();
}



function validateFormData(formData) {
    const { username, password, firstName, lastName, phone } = formData;
    
    if (!username || username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
    }
    if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
    }
    if (!firstName || !lastName) {
        throw new Error('First and last name are required');
    }
    if (!phone) {
        throw new Error('Phone number is required');
    }
}

async function checkUsernameExists(username) {
    try {
        const adminRef = collection(db, 'Admin_Accounts');
        const q = query(adminRef, where('username', '==', username.toLowerCase()));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error('Error checking username:', error);
        throw new Error('Error checking username availability');
    }
}

// Function to check if email exists
async function checkEmailExists(email) {
    try {
        // Check in Firestore first
        const adminRef = collection(db, 'Admin_Accounts');
        const q = query(adminRef, where('email', '==', email.toLowerCase()));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            return true; // Email exists in Firestore
        }

        // Check in Firebase Auth
        try {
            const signInMethods = await fetchSignInMethodsForEmail(auth, email);
            return signInMethods.length > 0;
        } catch (error) {
            // If error code is 'auth/invalid-email', email doesn't exist
            if (error.code === 'auth/invalid-email') {
                return false;
            }
            // If it's any other error, throw it
            throw error;
        }
    } catch (error) {
        console.error('Error checking email:', error);
        throw new Error('Error checking email availability');
    }
}


