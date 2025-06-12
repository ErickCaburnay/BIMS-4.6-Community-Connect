// <!-- ######## ADMIN_REQUEST.JS ######### -->

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getFirestore, collection, addDoc, orderBy, getDocs, doc, getDoc, query, where, onSnapshot, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { generateWordClearance } from './admin_requests_clearance.js';
import { generateWordCertificate } from './admin_requests_certificate.js';
import { generateWordIndigency } from './admin_requests_indigency.js';
import { setupCollectionListeners } from './admin_notification.js';

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

let requestsTableInitialized = false;

let currentSortColumn = 'createdAt'; 
let currentSortOrder = 'desc'; 
let allRequests = [];
let currentPage = 1;
const rowsPerPage = 10;

// Add this function at the top of your file
function getMonthName(monthIndex) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
}

function formatDate(timestamp) {
    if (!timestamp || !timestamp.toDate) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function sortRequests(requests, column, order) {
    return [...requests].sort((a, b) => {
        let aValue = a[column];
        let bValue = b[column];

        // Handle timestamps
        if (column === 'createdAt' || column === 'issuedAt') {
            aValue = aValue ? aValue.toDate().getTime() : 0;
            bValue = bValue ? bValue.toDate().getTime() : 0;
        }

        // Handle null/undefined values
        if (!aValue) aValue = '';
        if (!bValue) bValue = '';

        // Compare values
        if (aValue < bValue) {
            return order === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return order === 'asc' ? 1 : -1;
        }
        return 0;
    });
}

async function fetchAndDisplayBarangayRequests() {
    const collections = ['brgy_clearance', 'brgy_certificate', 'brgy_indigency'];
    allRequests = []; // Using the existing global variable

    try {
        const tableBody = document.querySelector('#requestsTable tbody');
        if (!tableBody) {
            console.error('Table body element not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';

        // Initialize table headers only once
        if (!requestsTableInitialized) {
            initializeTableHeaders();
            requestsTableInitialized = true;
        }

        console.log('Fetching data from collections:', collections);

        // Fetch data from all collections
        for (const collectionName of collections) {
            try {
                const querySnapshot = await getDocs(collection(db, collectionName));
                console.log(`Fetched ${querySnapshot.size} documents from ${collectionName}`);
                
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    allRequests.push({
                        id: doc.id,
                        type: collectionName.replace('brgy_', '').charAt(0).toUpperCase() + 
                              collectionName.replace('brgy_', '').slice(1), // Capitalize first letter
                        createdAt: data.createdAt,
                        issuedAt: data.issuedAt,
                        fullName: data.fullName || '',
                        purpose: data.purpose || '',
                        status: data.status || '',
                        transactionId: data.transactionId || '',
                        ...data
                    });
                });
            } catch (error) {
                console.error(`Error fetching data from ${collectionName}:`, error);
            }
        }

        console.log('Total requests fetched:', allRequests.length);

        if (allRequests.length > 0) {
            renderRequestsTable();
        } else {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No requests found</td></tr>';
        }

    } catch (error) {
        console.error("Error in fetchAndDisplayBarangayRequests:", error);
        const tableBody = document.querySelector('#requestsTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Error loading data. Please try again.</td></tr>';
        }
    }
}

// Add this new function to initialize table headers
function initializeTableHeaders() {
    const thead = document.querySelector('#requestsTable thead');
    if (!thead) {
        console.error('Table header element not found');
        return;
    }

    thead.innerHTML = `
        <tr>
            <th class="sortable" data-column="transactionId">Transaction No</th>
            <th class="sortable" data-column="createdAt">Date Filed</th>
            <th class="sortable" data-column="fullName">Name of Applicant</th>
            <th class="sortable" data-column="purpose">Purpose</th>
            <th class="sortable" data-column="type">Type</th>
            <th class="sortable" data-column="status">Status</th>
            <th class="sortable" data-column="issuedAt">Date Issued</th>
            <th>Action</th>
        </tr>
    `;

    // Add click handlers to sortable headers
    thead.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            if (currentSortColumn === column) {
                currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumn = column;
                currentSortOrder = 'asc';
            }
            renderRequestsTable();
        });
    });
}

// Modified renderRequestsTable function with better error handling
function renderRequestsTable() {
    try {
        const tableBody = document.querySelector('#requestsTable tbody');
        if (!tableBody) {
            console.error('Table body element not found');
            return;
        }

        // Sort the requests
        const sortedRequests = sortRequests(allRequests, currentSortColumn, currentSortOrder);
        
        // Calculate pagination
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedRequests = sortedRequests.slice(startIndex, endIndex);

        tableBody.innerHTML = '';

        if (paginatedRequests.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No requests found</td></tr>';
            return;
        }

        // Create table rows
        paginatedRequests.forEach((request) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            row.innerHTML = `
                <td class="p-2 border">${request.transactionId || ''}</td>
                <td class="p-2 border">${formatDate(request.createdAt)}</td>
                <td class="p-2 border">${request.fullName || ''}</td>
                <td class="p-2 border">${request.purpose || ''}</td>
                <td class="p-2 border">${request.type || ''}</td>
                <td class="p-2 border">${request.status || ''}</td>
                <td class="p-2 border">${formatDate(request.issuedAt)}</td>
                <td class="p-2 border">
                    <button 
                        class="action-btn"
                        data-id="${request.id}"
                        data-type="${request.type.toLowerCase()}"
                    >
                        Download &nbsp;
                        <img src="../icons/download-icon.png" alt="Action Icon" class="download-icon" />
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });

        updatePaginationControls();

    } catch (error) {
        console.error("Error in renderRequestsTable:", error);
        const tableBody = document.querySelector('#requestsTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Error displaying data. Please refresh the page.</td></tr>';
        }
    }
}

// Initialize event listeners after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing event listeners');
    
    // Initialize search functionality
    const searchInput = document.getElementById('search-requests');
    const searchButton = document.querySelector('.search-button');
    const clearButton = document.querySelector('.clear-button');
    
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            handleSearch(searchInput.value);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                handleSearch(searchInput.value);
            }
        });
    }

    if (clearButton) {
        clearButton.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            fetchAndDisplayBarangayRequests();
            currentPage = 1;
        });
    }

    // Initialize sort order handling
    const sortOrderSelect = document.getElementById('sortOrder');
    if (sortOrderSelect) {
        sortOrderSelect.addEventListener('change', (e) => {
            currentSortOrder = e.target.value;
            currentPage = 1;
            renderRequestsTable();
        });
    }

    // Fetch initial data
    fetchAndDisplayBarangayRequests();
});

function updatePaginationControls() {
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(allRequests.length / rowsPerPage);
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

    // Update showing entries text
    const startEntry = (currentPage - 1) * rowsPerPage + 1;
    const endEntry = Math.min(currentPage * rowsPerPage, allRequests.length);
    const showingEntries = document.getElementById('showingEntries');
    if (showingEntries) {
        showingEntries.textContent = `Showing ${startEntry} to ${endEntry} of ${allRequests.length} entries`;
    }
}

// Add page change function
window.changePage = function(page) {
    const totalPages = Math.ceil(allRequests.length / rowsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderRequestsTable();
};

// Add pagination styles
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

    #showingEntries {
        display: block;
        margin: 10px 0;
        color: #6c757d;
        font-size: 0.9em;
    }
`;
document.head.appendChild(paginationStyles);



// Modify the search functionality to reset pagination
function handleSearch(searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    
    // Filter the allRequests array based on search term
    const filteredRequests = allRequests.filter(request => {
        return (
            request.transactionId?.toLowerCase().includes(searchLower) ||
            request.fullName?.toLowerCase().includes(searchLower) ||
            request.purpose?.toLowerCase().includes(searchLower) ||
            request.type?.toLowerCase().includes(searchLower) ||
            request.status?.toLowerCase().includes(searchLower)
        );
    });
    
    allRequests = filteredRequests;
    currentPage = 1; // Reset to first page when searching
    renderRequestsTable();
}
// Add search event listeners
const searchInput = document.getElementById('search-requests');
const searchButton = document.querySelector('.search-button');
const clearButton = document.querySelector('.clear-button');

searchButton.addEventListener('click', () => {
    handleSearch(searchInput.value);
});

searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        handleSearch(searchInput.value);
    }
});

clearButton.addEventListener('click', () => {
    searchInput.value = '';
    fetchAndDisplayBarangayRequests(); // Reset to original data
    currentPage = 1; // Reset to first page
});

// Modify sort order handling
document.getElementById('sortOrder').addEventListener('change', (e) => {
    currentSortOrder = e.target.value;
    currentPage = 1; // Reset to first page when changing sort order
    renderRequestsTable();
});

// Call the function to fetch and display data
fetchAndDisplayBarangayRequests();

// ADD this new function for Word document generation
async function generateWordDocument(data) {
    // Create document template
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Clearance No.: ${data.transactionId}`,
                            bold: true
                        })
                    ]
                }),
                // Add more paragraphs for your template
            ]
        }]
    });

    // Generate and download the document
    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Clearance_${data.transactionId}.docx`;
    link.click();
    window.URL.revokeObjectURL(url);
}

document.querySelector('#requestsTable tbody').addEventListener('click', async (e) => {
    // Check if clicked element is a download button
    if (e.target.closest('.action-btn')) {
        const button = e.target.closest('.action-btn');
        const requestId = button.dataset.id;
        const requestType = button.dataset.type;
        
        // Disable the button while processing
        button.disabled = true;
        button.innerHTML = 'Processing...';
        
        try {
            // Determine the collection name based on request type
            let collectionName;
            switch (requestType.toLowerCase()) {
                case 'clearance':
                    collectionName = 'brgy_clearance';
                    break;
                case 'certificate':
                    collectionName = 'brgy_certificate';
                    break;
                case 'indigency':
                    collectionName = 'brgy_indigency';
                    break;
                default:
                    throw new Error('Invalid document type');
            }

            // Get the document data from Firestore
            const docRef = doc(db, collectionName, requestId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                throw new Error('Document not found');
            }

            const data = docSnap.data();
            
            // Generate and download the appropriate document based on type
            switch (requestType.toLowerCase()) {
                case 'clearance':
                    await generateWordClearance({
                        fullName: data.fullName,
                        age: data.age,
                        blockLot: data.blockLot,
                        purpose: data.purpose,
                        issueDate: data.issueDate,
                        transactionId: data.transactionId
                    });
                    break;
                    
                case 'certificate':
                    await generateWordCertificate({
                        fullName: data.fullName,
                        age: data.age,
                        blockLot: data.blockLot,
                        purpose: data.purpose,
                        issueDate: data.issueDate,
                        transactionId: data.transactionId,
                        civilStatus: data.civilStatus,
                        nationality: data.nationality
                    });
                    break;
                    
                case 'indigency':
                    await generateWordIndigency({
                        fullName: data.fullName,
                        age: data.age,
                        blockLot: data.blockLot,
                        purpose: data.purpose,
                        issueDate: data.issueDate,
                        transactionId: data.transactionId,
                        familyIncome: data.familyIncome
                    });
                    break;
                    
                default:
                    throw new Error('Unsupported document type');
            }
            
            // Update the document status after successful download
            await updateDoc(docRef, {
                status: 'Printed',
                issuedAt: serverTimestamp()
            });
            
            // Update the UI to reflect the new status
            const row = button.closest('tr');
            row.querySelector('.status-cell').textContent = 'Printed';
            row.querySelector('.issued-at-cell').textContent = new Date().toLocaleDateString();

        } catch (error) {
            console.error('Error generating document:', error);
            alert(`Error generating document: ${error.message}`);
        } finally {
            // Re-enable the button and restore original text
            button.disabled = false;
            button.innerHTML = `Download &nbsp;
                <img src="../icons/download-icon.png" alt="Action Icon" class="download-icon" />`;
        }
    }
});

// Optional: Add error event listener for network issues
window.addEventListener('unhandledrejection', event => {
    console.error('Network or system error:', event.reason);
    alert('A network error occurred. Please check your connection and try again.');
});

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the notification system
    setupCollectionListeners();

    const pendingDocument = sessionStorage.getItem('pendingDocumentDetails');
    if (pendingDocument) {
        const { collectionName, transactionId } = JSON.parse(pendingDocument);
        
        // Clear the stored data immediately
        sessionStorage.removeItem('pendingDocumentDetails');
        
        // Wait a short moment for the page to fully load
        setTimeout(() => {
            viewRequestDetails(collectionName, transactionId);
        }, 500);
    }

    const searchInput = document.getElementById('search-requests');
    const searchButton = document.querySelector('.search-button');
    const clearButton = document.querySelector('.clear-button');
    
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            handleSearch(searchInput.value);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                handleSearch(searchInput.value);
            }
        });
    }

    if (clearButton) {
        clearButton.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            fetchAndDisplayBarangayRequests(); // Reset to original data
            currentPage = 1;
        });
    }

    fetchAndDisplayBarangayRequests();
});

document.getElementById('closePreviewClearance').addEventListener('click', () => {
    document.getElementById('previewClearance').style.display = 'none';
});

document.getElementById('closePreviewCertificate').addEventListener('click', () => {
    document.getElementById('previewCertificate').style.display = 'none';
});

document.getElementById('closePreviewIndigency').addEventListener('click', () => {
    document.getElementById('previewIndigency').style.display = 'none';
});


// Helper function to update pagination info
