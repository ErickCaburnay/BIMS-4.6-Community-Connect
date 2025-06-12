// ################### ADMIN_SETTINGS_ARCHIVES.JS ####################

import {
    db,
    collection,
    getDocs,
    deleteDoc,
    updateDoc,
    setDoc,
    doc,
    query,
    orderBy,
    limit as firestoreLimit,
    startAfter,
    endBefore
} from './firebaseConfig.js';

// #############################  #######################################

// Initialize the category functionality
function initializeCategories() {
    const categoryButtons = document.querySelectorAll('.category-button');

    categoryButtons.forEach(button => {
        const countSpan = button.querySelector('.category-count');
        if (countSpan) {
            countSpan.style.opacity = '0'; // Hide initially
        }
    });

    // Immediately fetch and update the counts
    updateArchiveCounts().then(() => {
        // Show the counts after they're updated
        categoryButtons.forEach(button => {
            const countSpan = button.querySelector('.category-count');
            if (countSpan) {
                countSpan.style.opacity = '1';
                countSpan.style.transition = 'opacity 0.3s';
            }
        });
    });
    
    const categoryMappings = {
        'Admin Accounts': 'adminAccounts', // Make sure this matches your HTML id
        'Officials': 'officials',
        'Announcements': 'announcements',
        'Resident Records': 'resident-records',
        'Barangay Documents': 'clearances',
        'Complaints': 'complaints',
        'Reports': 'reports'
    };

    // Hide all content areas initially
    document.querySelectorAll('.category-content').forEach(content => {
        content.classList.remove('active');
    });

    // Show admin accounts by default (or whichever category you want to show first)
    const defaultContent = document.getElementById('adminAccounts');
    if (defaultContent) {
        defaultContent.classList.add('active');
    }

    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons and content
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.category-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get the category name and corresponding content id
            const categoryName = this.textContent.trim().split('\n')[0].trim();
            const contentId = categoryMappings[categoryName];
            
            // Show the selected content
            if (contentId) {
                const selectedContent = document.getElementById(contentId);
                if (selectedContent) {
                    selectedContent.classList.add('active');
                    
                    // Load specific content based on category
                    if (contentId === 'officials') {
                        displayOfficials(1);
                    } else if (contentId === 'resident-records') {
                        loadArchivedResidents(1);
                    }
                }
            }
        });
    });
}

// ################################## ADMIN ACCOUNTS ARCHIVE #########################################

async function displayAdminAccounts(page = 1, itemsPerPage = 10) {
    try {
        // Get DOM elements - Add logging to debug
        const tableBody = document.querySelector('.adminAccounts-table tbody');
        const showingEntriesDiv = document.getElementById('showingEntriesAdminAccounts');
        const paginationDiv = document.getElementById('paginationControlsAdminAccounts');
        
        console.log('Elements:', {
            tableBody: !!tableBody,
            showingEntriesDiv: !!showingEntriesDiv,
            paginationDiv: !!paginationDiv
        });

        if (!tableBody || !showingEntriesDiv || !paginationDiv) {
            console.error('Required elements not found:', {
                tableBody: !!tableBody,
                showingEntriesDiv: !!showingEntriesDiv,
                paginationDiv: !!paginationDiv
            });
            return;
        }

        // Show loading state
        tableBody.innerHTML = '<tr><td colspan="6" class="loading">Loading admin accounts data...</td></tr>';
        showingEntriesDiv.textContent = 'Loading...';
        paginationDiv.innerHTML = '';

        // Get the filter values
        const searchQuery = document.querySelector('.search-input')?.value || '';
        const dateRangeSelect = document.querySelector('.filter-select')?.value || '';
        const sortBySelect = document.querySelectorAll('.filter-select')[1]?.value || '';

        // Build the query
        let q = collection(db, 'archived_admin_accounts');
        
        if (sortBySelect) {
            switch (sortBySelect) {
                case 'date':
                    q = query(q, orderBy('archivedDate', 'desc'));
                    break;
                case 'name':
                    q = query(q, orderBy('lastName'));
                    break;
            }
        }

        const querySnapshot = await getDocs(q);
        let allAdmins = [];
        
        querySnapshot.forEach(doc => {
            allAdmins.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Apply search filter
        if (searchQuery) {
            allAdmins = allAdmins.filter(admin => 
                admin.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                admin.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                admin.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                admin.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply date range filter
        if (dateRangeSelect) {
            const today = new Date();
            const filterDate = new Date();
            
            switch (dateRangeSelect) {
                case 'today':
                    filterDate.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    filterDate.setDate(today.getDate() - 7);
                    break;
                case 'month':
                    filterDate.setMonth(today.getMonth() - 1);
                    break;
                case 'year':
                    filterDate.setFullYear(today.getFullYear() - 1);
                    break;
            }

            allAdmins = allAdmins.filter(admin => 
                new Date(admin.archivedDate) >= filterDate
            );
        }

        const totalDocs = allAdmins.length;
        const totalPages = Math.ceil(totalDocs / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const adminsToShow = allAdmins.slice(startIndex, endIndex);

        // Clear the table
        tableBody.innerHTML = '';

        // Show no results message if no data
        if (adminsToShow.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No admin accounts found</td></tr>';
            showingEntriesDiv.textContent = 'Showing 0 entries';
            paginationDiv.innerHTML = '';
            return;
        }

        // Populate table
        adminsToShow.forEach(admin => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${admin.adminId || 'N/A'}</td>
                <td>${admin.username || 'N/A'}</td>
                <td>${admin.email || 'N/A'}</td>
                <td>${admin.role || 'N/A'}</td>
                <td>${formatDate(admin.archivedDate) || 'N/A'}</td>
                <td>${admin.archivedBy || 'N/A'}</td>
            `;
            tableBody.appendChild(row);
        });

        // Update showing entries info
        const startEntry = startIndex + 1;
        const endEntry = Math.min(endIndex, totalDocs);
        showingEntriesDiv.textContent = `Showing ${startEntry} to ${endEntry} of ${totalDocs} entries`;

        // Update pagination controls
        let paginationHTML = '';
        
        if (totalPages > 1) {
            // Previous button
            paginationHTML += `
                <button 
                    onclick="displayAdminAccounts(${page - 1}, ${itemsPerPage})" 
                    class="pagination-btn"
                    ${page === 1 ? 'disabled' : ''}
                >Previous</button>
            `;
            
            // Page numbers
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += `
                    <button 
                        onclick="displayAdminAccounts(${i}, ${itemsPerPage})" 
                        class="pagination-btn ${i === page ? 'active' : ''}"
                    >${i}</button>
                `;
            }
            
            // Next button
            paginationHTML += `
                <button 
                    onclick="displayAdminAccounts(${page + 1}, ${itemsPerPage})" 
                    class="pagination-btn"
                    ${page === totalPages ? 'disabled' : ''}
                >Next</button>
            `;
        }
        
        paginationDiv.innerHTML = paginationHTML;

        // Log the final state
        console.log('Display completed:', {
            totalDocs,
            totalPages,
            currentPage: page,
            entriesShowing: adminsToShow.length
        });

    } catch (error) {
        console.error('Error fetching admin accounts:', error);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="6" class="error-message">Error loading admin accounts data: ${error.message}</td></tr>`;
        }
        showingEntriesDiv.textContent = 'Error loading entries';
        paginationDiv.innerHTML = '';
    }
}

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
}

// Make the function globally available for pagination
window.displayAdminAccounts = displayAdminAccounts;

// Initialize when document loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing Admin Accounts');
    
    // Initial load
    displayAdminAccounts();

    // Search input handler with debounce
    const searchInput = document.querySelector('.search-input');
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                displayAdminAccounts(1); // Reset to first page when searching
            }, 300);
        });
    }

    // Filter handlers
    const filterSelects = document.querySelectorAll('.filter-select');
    filterSelects.forEach(select => {
        select.addEventListener('change', () => {
            displayAdminAccounts(1); // Reset to first page when filtering
        });
    });
});

// Add these styles to ensure the elements are visible
const styles = `
    .showingEntries {
        margin-top: 1rem;
        color: #cdcdcd;
        padding: 0.5rem;
    }

    .pagination {
        margin-top: 1rem;
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        padding: 1rem;
    }

    .pagination-btn {
        padding: 0.5rem 1rem;
        border: 1px solid #095387;
        background-color: #08416b;
        color: #cdcdcd;
        cursor: pointer;
        border-radius: 4px;
    }

    .pagination-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .pagination-btn.active {
        background-color: #095387;
        border-color: #cdcdcd;
    }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// ################################## RESIDENTS ARCHIVE #########################################
let allResidents = [];

// Function to fetch and display archived residents
async function loadArchivedResidents(page = 1) {
    try {
        const tableBody = document.querySelector('#resident-records tbody');
        if (!tableBody) {
            console.error('Table body not found');
            return;
        }
        
        const itemsPerPage = 10;
        
        // Update the table headers
        const tableHeaders = document.querySelector('#resident-records thead tr');
        if (tableHeaders) {
            tableHeaders.innerHTML = `
                <th>Unique ID</th>
                <th>Name</th>
                <th>Address</th>
                <th>Contact Info</th>
                <th>Archived Info</th>
                <th>Actions</th>
            `;
        }
        
        // Create query ordered by archivedAt to show most recent first
        const archiveRef = collection(db, 'archived_residents');
        const q = query(archiveRef, orderBy('archivedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        // Convert query snapshot to array for pagination
        allResidents = []; 
        querySnapshot.forEach((doc) => {
            allResidents.push({ id: doc.id, ...doc.data() });
        });
        
        // Calculate pagination
        const totalPages = Math.ceil(allResidents.length / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const residentsToShow = allResidents.slice(startIndex, endIndex);
        
        // Clear existing table content
        tableBody.innerHTML = '';
        
        // Add residents to table
        residentsToShow.forEach((resident) => {
            const fullName = `${resident.lastName}, ${resident.firstName} ${resident.middleName} ${resident.suffix}`.trim();
            const address = `${resident.blklot} ${resident.street}`.trim();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${resident.uniqueId || '-'}</td>
                <td>${fullName || '-'}</td>
                <td>${address || '-'}</td>
                <td>
                    <div>📱 ${resident.phone || '-'}</div>
                    <div>✉️ ${resident.email || '-'}</div>
                </td>
                <td>
                    <div>${resident.archivedBy || '-'}</div>
                    <div>${new Date(resident.archivedAt).toLocaleDateString()}</div>
                </td>
                <td>
                    <button 
                        class="restore-btn"
                        onclick="handleRestoreClick('${resident.uniqueId}')"
                    >
                        Restore
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Rest of the pagination code remains the same...
        if (allResidents.length > 0) {
            createPaginationControls(page, totalPages);
            
            const recordsInfo = document.createElement('div');
            recordsInfo.className = 'records-info';
            recordsInfo.textContent = `Showing ${startIndex + 1}-${Math.min(endIndex, allResidents.length)} of ${allResidents.length} records`;
            
            let recordsInfoContainer = document.querySelector('.records-info-container');
            if (!recordsInfoContainer) {
                recordsInfoContainer = document.createElement('div');
                recordsInfoContainer.className = 'records-info-container';
                document.querySelector('#resident-records').appendChild(recordsInfoContainer);
            }
            recordsInfoContainer.innerHTML = '';
            recordsInfoContainer.appendChild(recordsInfo);
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        No archived residents found
                    </td>
                </tr>
            `;
        }
        
    } catch (error) {
        console.error("Error loading archived residents:", error);
        const tableBody = document.querySelector('#resident-records tbody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="error-message">
                    Error loading archived residents: ${error.message}
                </td>
            </tr>
        `;
    }
}

function createPaginationControls(currentPage, totalPages) {
    let paginationContainer = document.querySelector('.pagination-controls');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-controls';
        document.querySelector('#resident-records').appendChild(paginationContainer);
    }
    
    paginationContainer.innerHTML = `
        <button 
            class="pagination-btn" 
            ${currentPage === 1 ? 'disabled' : ''}
            onclick="loadArchivedResidents(${currentPage - 1})"
        >
            ⟨⟨
        </button>
        <span class="page-info">Page ${currentPage} of ${totalPages}</span>
        <button 
            class="pagination-btn" 
            ${currentPage === totalPages ? 'disabled' : ''}
            onclick="loadArchivedResidents(${currentPage + 1})"
        >
            ⟩⟩
        </button>
    `;
}

// Make the loadArchivedResidents function globally available for pagination
window.loadArchivedResidents = loadArchivedResidents;

// Make restore function globally available
window.handleRestoreClick = function(residentId) {
    if (confirm('Are you sure you want to restore this resident?')) {
        const residentToRestore = allResidents.find(r => r.uniqueId === residentId);
        if (residentToRestore) {
            restoreResident(residentToRestore);
        } else {
            alert('Resident data not found');
        }
    }
};

async function restoreResident(residentData) {
    try {
        // First, add to users collection
        const userRef = doc(db, 'users', residentData.uniqueId);
        
        // Remove fields that shouldn't be in the users collection
        const userData = { ...residentData };
        delete userData.archivedAt;
        delete userData.archivedBy;
        
        // Add to users collection
        await setDoc(userRef, userData);
        
        // Then delete from archived_residents
        const archivedRef = doc(db, 'archived_residents', residentData.uniqueId);
        await deleteDoc(archivedRef);

        await updateArchiveCounts();
        
        // Show success message
        alert(`Successfully restored resident ${residentData.firstName} ${residentData.lastName}`);
        
        // Reload the table
        loadArchivedResidents(1);
        
    } catch (error) {
        console.error("Error restoring resident:", error);
        alert("Error restoring resident. Please try again.");
    }
}

async function updateArchiveCounts() {
    try {
        // Fetch residents count
        const residentsRef = collection(db, 'archived_residents');
        const residentsSnapshot = await getDocs(residentsRef);
        const residentsCount = residentsSnapshot.size;

        // Fetch officials count
        const officialsRef = collection(db, 'archived_officials');
        const officialsSnapshot = await getDocs(officialsRef);
        const officialsCount = officialsSnapshot.size;

        // Update the count displays using a more compatible selector approach
        const categoryButtons = document.querySelectorAll('.category-button');
        
        categoryButtons.forEach(button => {
            const buttonText = button.textContent.trim().split('\n')[0].trim();
            const countSpan = button.querySelector('.category-count');
            
            if (countSpan) {
                if (buttonText === 'Resident Records') {
                    countSpan.textContent = residentsCount;
                } else if (buttonText === 'Officials') {
                    countSpan.textContent = officialsCount;
                }
            }
        });
        return { residentsCount, officialsCount };
    } catch (error) {
        console.error("Error updating archive counts:", error);
    }
}

export function refreshArchiveCounts() {
    updateArchiveCounts();
}

// Single DOMContentLoaded listener that initializes everything
document.addEventListener('DOMContentLoaded', () => {
    initializeCategories();
    updateArchiveCounts();
    
    // Load resident data if we're on the resident records tab
    if (document.querySelector('#resident-records.category-content.active')) {
        loadArchivedResidents(1);
    }
});



// ############################# OFFICIALS ARCHIVE #######################################
document.addEventListener('DOMContentLoaded', () => {
    // Show officials tab by default if no other tab is active
    const activeTab = document.querySelector('.category-content.active');
    if (!activeTab) {
        const officialsTab = document.getElementById('officials');
        if (officialsTab) {
            officialsTab.classList.add('active');
        }
    }
});

// Store officials data globally
async function displayOfficials(page = 1, itemsPerPage = 10) {
    try {
        const tableBody = document.querySelector('#officials .official-table tbody');
        const showingEntriesDiv = document.getElementById('showingEntriesOfficials');
        const paginationDiv = document.getElementById('paginationControlsOfficials');
        
        if (!tableBody) {
            console.error('Officials table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="7" class="loading">Loading officials data...</td></tr>';

        const archiveRef = collection(db, 'archived_officials');
        const querySnapshot = await getDocs(archiveRef);
        
        const allOfficials = [];
        querySnapshot.forEach(doc => {
            allOfficials.push({
                id: doc.id,
                ...doc.data()
            });
        });

        const totalDocs = allOfficials.length;
        const totalPages = Math.ceil(totalDocs / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const officialsToShow = allOfficials.slice(startIndex, endIndex);

        tableBody.innerHTML = '';

        if (officialsToShow.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No officials found</td></tr>';
            return;
        }

        officialsToShow.forEach(data => {
            const row = document.createElement('tr');
            
            const fullName = `${data.firstName || ''} ${data.middleName ? data.middleName + ' ' : ''}${data.lastName || ''}${data.suffix ? ' ' + data.suffix : ''}`.trim() || 'N/A';
            const startDate = data.termStart ? new Date(data.termStart).toLocaleDateString() : 'N/A';
            const endDate = data.termEnd ? new Date(data.termEnd).toLocaleDateString() : 'Present';
            
            row.innerHTML = `
                <td>${fullName}</td>
                <td>${data.position || 'N/A'}</td>
                <td>${data.chair || 'N/A'}</td>
                <td>${startDate}</td>
                <td>${endDate}</td>
                <td>${data.status || 'N/A'}</td>
                <td style="white-space: pre-line">${data.archivedBy || 'N/A'}</td>
            `;
            
            tableBody.appendChild(row);
        });
        
        if (showingEntriesDiv) {
            const startEntry = startIndex + 1;
            const endEntry = Math.min(endIndex, totalDocs);
            showingEntriesDiv.textContent = `Showing ${startEntry} to ${endEntry} of ${totalDocs} entries`;
        }
        
        if (paginationDiv && totalPages > 1) {
            let paginationHTML = '';
            
            paginationHTML += `
                <button 
                    onclick="displayOfficials(${page - 1}, ${itemsPerPage})" 
                    class="pagination-btn"
                    ${page === 1 ? 'disabled' : ''}
                >Previous</button>
            `;
            
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += `
                    <button 
                        onclick="displayOfficials(${i}, ${itemsPerPage})" 
                        class="pagination-btn ${i === page ? 'active' : ''}"
                    >${i}</button>
                `;
            }
            
            paginationHTML += `
                <button 
                    onclick="displayOfficials(${page + 1}, ${itemsPerPage})" 
                    class="pagination-btn"
                    ${page === totalPages ? 'disabled' : ''}
                >Next</button>
            `;
            
            paginationDiv.innerHTML = paginationHTML;
        }
        
    } catch (error) {
        console.error('Error fetching officials:', error);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="7" class="error-message">Error loading officials data: ${error.message}</td></tr>`;
        }
    }
}

// Make the function globally available for pagination
window.displayOfficials = displayOfficials;

// Initialize when document loads
document.addEventListener('DOMContentLoaded', () => {
    initializeCategories();
});

export { displayOfficials };