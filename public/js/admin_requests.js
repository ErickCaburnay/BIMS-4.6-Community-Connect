// ########################## ADMIN_REQUESTS.JS #########################
import { 
    db,
    collection,
    query,
    where,
    orderBy,
    getDocs,
    doc,
    addDoc,
    getDoc,
    updateDoc,
    serverTimestamp,
    limit,
    storage,
    storageRef,
    getDownloadURL,
} from './firebaseConfig.js';

let loadingTasks = 0;

function showLoader() {
    loadingTasks++;
    const loader = document.getElementById('loader-container');
    if (loader) {
        loader.style.display = 'flex';
    }
}

function hideLoader() {
    loadingTasks--;
    if (loadingTasks <= 0) {
        loadingTasks = 0;
        const loader = document.getElementById('loader-container');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

// Configuration constants
const CONFIG = {
    ROWS_PER_PAGE: 10,
    COLLECTIONS: {
        CLEARANCE: 'brgy_clearance',
        CERTIFICATE: 'brgy_certificate',
        INDIGENCY: 'brgy_indigency'
    }
};

// State management
let state = {
    currentPage: 1,
    sortColumn: 'createdAt',
    sortOrder: 'desc',
    allRequests: [],
    searchTerm: '',
    isLoading: false
};

// Utility functions
const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return '';
    return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input
        .replace(/[<>]/g, '')
        .trim();
};

// Main data fetching function
async function fetchAndDisplayBarangayRequests() {
    try {
        state.isLoading = true;
        updateLoadingState(true);
        
        const collections = Object.values(CONFIG.COLLECTIONS);
        state.allRequests = [];

        // Fetch data from all collections
        for (const collectionName of collections) {
            try {
                const querySnapshot = await getDocs(
                    query(
                        collection(db, collectionName),
                        orderBy(state.sortColumn, state.sortOrder)
                    )
                );

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    state.allRequests.push({
                        id: doc.id,
                        type: collectionName.replace('brgy_', '')
                            .charAt(0).toUpperCase() + 
                            collectionName.replace('brgy_', '').slice(1),
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
                console.error(`Error fetching ${collectionName}:`, error);
                showToast(`Error fetching ${collectionName}`, 'error');
            }
        }

        // Apply search filter if exists
        if (state.searchTerm) {
            handleSearch(state.searchTerm);
        } else {
            renderRequestsTable();
        }

    } catch (error) {
        console.error("Error in fetchAndDisplayBarangayRequests:", error);
        showToast('Error loading requests', 'error');
    } finally {
        state.isLoading = false;
        updateLoadingState(false);
    }
}

// Pagination functions
function updatePaginationControls() {
    const totalPages = Math.ceil(state.allRequests.length / CONFIG.ROWS_PER_PAGE);
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) return;

    const maxVisiblePages = 5;
    let paginationHTML = `
        <div class="pagination">
            <button onclick="changePage(1)" class="pagination-btn" ${state.currentPage === 1 ? 'disabled' : ''}>
                First
            </button>
            <button onclick="changePage(${state.currentPage - 1})" class="pagination-btn" ${state.currentPage === 1 ? 'disabled' : ''}>
                Prev
            </button>
    `;

    let startPage = Math.max(1, state.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="changePage(${i})" class="pagination-btn ${i === state.currentPage ? 'active' : ''}">
                ${i}
            </button>
        `;
    }

    paginationHTML += `
        <button onclick="changePage(${state.currentPage + 1})" class="pagination-btn" ${state.currentPage === totalPages ? 'disabled' : ''}>
            Next
        </button>
        <button onclick="changePage(${totalPages})" class="pagination-btn" ${state.currentPage === totalPages ? 'disabled' : ''}>
            Last
        </button>
        <span class="pagination-info">Page ${state.currentPage} of ${totalPages}</span>
    `;

    paginationContainer.innerHTML = paginationHTML;
}

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

    #showingEntriesRequests {
        margin: 10px 0;
        color: #6c757d;
        font-size: 0.9em;
    }
`;
document.head.appendChild(paginationStyles);

function updateShowingEntries() {
    const showingEntriesElement = document.getElementById('showingEntriesRequests');
    const totalEntries = state.allRequests.length;
    const startEntry = (state.currentPage - 1) * CONFIG.ROWS_PER_PAGE + 1;
    const endEntry = Math.min(startEntry + CONFIG.ROWS_PER_PAGE - 1, totalEntries);

    if (showingEntriesElement) {
        showingEntriesElement.textContent = `Showing ${startEntry} to ${endEntry} of ${totalEntries} entries`;
    }
}


window.changePage = function(page) {
    const totalPages = Math.ceil(state.allRequests.length / CONFIG.ROWS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    state.currentPage = page;
    renderRequestsTable();
    updatePaginationControls();
};

// Table rendering
function renderRequestsTable() {
    const tableBody = document.querySelector('#requestsTable tbody');
    if (!tableBody) return;

    const sortedRequests = sortRequests(state.allRequests, state.sortColumn, state.sortOrder);
    const startIndex = (state.currentPage - 1) * CONFIG.ROWS_PER_PAGE;
    const endIndex = startIndex + CONFIG.ROWS_PER_PAGE;
    const paginatedRequests = sortedRequests.slice(startIndex, endIndex);

    if (paginatedRequests.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No requests found</td></tr>';
        return;
    }

    tableBody.innerHTML = paginatedRequests.map(request => `
        <tr class="hover:bg-gray-50">
            <td class="p-2 border">${sanitizeInput(request.transactionId || '')}</td>
            <td class="p-2 border">${formatDate(request.createdAt)}</td>
            <td class="p-2 border">${sanitizeInput(request.fullName || '')}</td>
            <td class="p-2 border">${sanitizeInput(request.purpose || '')}</td>
            <td class="p-2 border">${sanitizeInput(request.type || '')}</td>
            <td class="p-2 border">${sanitizeInput(request.status || '')}</td>
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
        </tr>
    `).join('');

    updatePaginationControls();
    updateShowingEntries();
}

// Sorting function
function sortRequests(requests, column, order) {
    return [...requests].sort((a, b) => {
        let aValue = a[column];
        let bValue = b[column];

        // Handle timestamps
        if (column === 'createdAt' || column === 'issuedAt') {
            aValue = aValue ? aValue.toDate().getTime() : 0;
            bValue = bValue ? bValue.toDate().getTime() : 0;
        }

        if (!aValue) aValue = '';
        if (!bValue) bValue = '';

        return order === 'asc' 
            ? (aValue < bValue ? -1 : 1)
            : (aValue > bValue ? -1 : 1);
    });
}

// Search functionality
function handleSearch(searchTerm) {
    state.searchTerm = searchTerm.toLowerCase();
    
    const filteredRequests = state.allRequests.filter(request => 
        request.transactionId?.toLowerCase().includes(state.searchTerm) ||
        request.fullName?.toLowerCase().includes(state.searchTerm) ||
        request.purpose?.toLowerCase().includes(state.searchTerm) ||
        request.type?.toLowerCase().includes(state.searchTerm) ||
        request.status?.toLowerCase().includes(state.searchTerm)
    );
    
    state.allRequests = filteredRequests;
    state.currentPage = 1;
    renderRequestsTable();
}


async function processDocument(id, type) {
    try {
        showLoader();
        const collectionName = CONFIG.COLLECTIONS[type.toUpperCase()];
        if (!collectionName) {
            throw new Error(`Invalid document type: ${type}`);
        }

        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error('Document not found');
        }

        const data = docSnap.data();
        
        // Generate and download document
        await generateDocument(type, {
            fullName: data.fullName,
            age: data.age,
            blockLot: data.blockLot,
            purpose: data.purpose,
            issueDate: data.issueDate || new Date().toISOString(),
            transactionId: data.transactionId,
            ...data
        });
        
        // Update document status
        await updateDoc(docRef, {
            status: 'Printed',
            issuedAt: serverTimestamp()
        });

        showToast('Document processed successfully', 'success');
        // await fetchAndDisplayBarangayRequests();
        
    } catch (error) {
        console.error('Error processing document:', error);
        showToast(`Error: ${error.message}`, 'error');
        throw error;
    } finally {
        hideLoader();
    }
}

// UI Helper Functions
function showToast(message, type = 'info') {
    // Remove any existing toasts first
    const existingToasts = document.querySelectorAll('.toast-message');
    existingToasts.forEach(toast => toast.remove());

    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast-message fixed top-4 left-1/2 transform -translate-x-1/2 p-4 rounded shadow-lg z-50 ${
        type === 'error' ? 'bg-red-500' : 'bg-green-500'
    } text-white`;
    toast.textContent = message;
    
    // Add some basic styles to ensure visibility
    toast.style.cssText = `
        position: fixed;
        color: #cdcdcd;
        top: 1rem;
        left: 50%;
        transform: translateX(-50%);
        padding: 1rem;
        border-radius: 0.375rem;
        z-index: 9999;
        min-width: 250px;
        opacity: 0;
        transition: opacity 0.3s ease-in;
        text-align: center;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
        background-color: rgba(0, 128, 0, 0.8);
        border: 2px solid rgba(0, 256, 0);
    `;

    document.body.appendChild(toast);

    // Fade in
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);

    // Remove after delay
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


function updateLoadingState(isLoading) {
    const loader = document.getElementById('loader-container');
    if (loader) {
        loader.style.display = isLoading ? 'flex' : 'none';
    }
}

// Month name utility
function getMonthName(monthIndex) {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[monthIndex];
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
  
    // Initialize table headers
    const thead = document.querySelector('#requestsTable thead');
    if (thead) {
        thead.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.column;
                state.sortOrder = state.sortColumn === column && state.sortOrder === 'asc' ? 'desc' : 'asc';
                state.sortColumn = column;
                renderRequestsTable();
            });
        });
    }

    // Initialize search
    const searchInput = document.getElementById('search-requests');
    if (searchInput) {
        const searchButton = searchInput.nextElementSibling?.querySelector('.search-button');
        const clearButton = searchInput.nextElementSibling?.querySelector('.clear-button');
        
        if (searchButton) {
            searchButton.addEventListener('click', () => handleSearch(searchInput.value));
        }
        
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                searchInput.value = '';
                state.searchTerm = '';
                // fetchAndDisplayBarangayRequests();
            });
        }
        
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') handleSearch(searchInput.value);
        });
    }

    // Document action listeners
    const requestsTable = document.querySelector('#requestsTable');
    if (requestsTable) {
        requestsTable.addEventListener('click', async (e) => {
            const button = e.target.closest('.action-btn');
            if (button) {
                e.preventDefault();
                e.stopPropagation();
                
                const { id, type } = button.dataset;
                try {
                    showLoader(); // Show loader before processing
                    await processDocument(id, type);
                } catch (error) {
                    console.error('Error processing document:', error);
                    showToast('Error processing document', 'error');
                } finally {
                    hideLoader(); // Hide loader after processing
                }
            }
        });
    }

    window.changePage = changePage;
    fetchAndDisplayBarangayRequests();
});

export {
    fetchAndDisplayBarangayRequests,
    handleSearch,
    processDocument,
    generateDocument
};

// ########### clearance ###############################################################
const documentFieldMappings = {
    clearance: {
        uniqueId: 'clearanceUniqueId',
        name: 'clearanceName',
        age: 'clearanceAge',
        blklot: 'clearanceBlklot'
    },
    indigency: {
        uniqueId: 'indigencyUniqueId',
        name: 'indigencyName',
        age: 'indigencyAge',
        blklot: 'indigencyBlklot'
    },
    certificate: {
        uniqueId: 'certificateUniqueId',
        name: 'certificateName',
        age: 'certificateAge',
        blklot: 'certificateBlklot'
    }
};

// Unified function to fetch user data
async function fetchUserData(documentType) {
    const fields = documentFieldMappings[documentType];
    const uniqueId = document.getElementById(fields.uniqueId).value.trim().toUpperCase();
    
    if (!uniqueId) {
        alert("Please enter a Unique ID");
        return;
    }

    try {
        const usersCollection = collection(db, 'users');
        const q = query(usersCollection, where('uniqueId', '==', uniqueId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            console.log("Fetched user data:", userData);
            populateFormFields(documentType, userData);
        } else {
            console.log("No user found with this ID");
            clearFormFields(documentType);
            alert("No user found with this ID");
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        alert("Error fetching user data. Please try again.");
    }
}

// Unified function to populate form fields
function populateFormFields(documentType, data) {
    if (!data) {
        console.log("No data provided to populateForm");
        return;
    }

    const fields = documentFieldMappings[documentType];
    const formElements = {
        name: document.getElementById(fields.name),
        age: document.getElementById(fields.age),
        blklot: document.getElementById(fields.blklot)
    };

    // Populate name field
    if (formElements.name) {
        const fullName = `${data.firstName || ''} ${data.middleName || ''} ${data.lastName || ''}`.trim();
        formElements.name.value = fullName;
    }

    // Populate age field
    if (formElements.age && data.birthdate) {
        const age = calculateAge(data.birthdate);
        formElements.age.value = age;
    }

    // Populate block/lot field
    if (formElements.blklot) {
        formElements.blklot.value = data.blklot || '';
    }

    console.log("Form populated with data:", {
        name: formElements.name?.value,
        age: formElements.age?.value,
        blklot: formElements.blklot?.value
    });
}

// Unified function to clear form fields
function clearFormFields(documentType) {
    const fields = documentFieldMappings[documentType];
    
    Object.values(fields).forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.value = '';
        }
    });
}

// Event listeners for each document type
document.getElementById('fetchClearanceUserData').addEventListener('click', () => fetchUserData('clearance'));
document.getElementById('fetchIndigencyUserData').addEventListener('click', () => fetchUserData('indigency'));
document.getElementById('fetchCertificateUserData').addEventListener('click', () => fetchUserData('certificate'));

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
const formFields = {
    clearance: [
        'clearanceUniqueId',
        'clearanceName',
        'clearanceAge',
        'clearanceBlklot',
        'clearancePurpose',
        'clearanceIssueDate'
    ],
    indigency: [
        'indigencyUniqueId',
        'indigencyName',
        'indigencyAge',
        'indigencyBlklot',
        'indigencyPurpose',
        'indigencyIssueDate'
    ],
    certificate: [
        'certificateUniqueId',
        'certificateName',
        'certificateAge',
        'certificateBlklot',
        'certificatePurpose',
        'certificateIssueDate',
        'certificateDateOfResidency' 
    ]
};

function clearForm(documentType) {
    if (!formFields[documentType]) {
        console.error(`Invalid document type: ${documentType}`);
        return;
    }

    formFields[documentType].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        } else {
            console.warn(`Element with id '${id}' not found`);
        }
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

async function generateTransactionId(documentType) {
    const collectionMap = {
        clearance: 'brgy_clearance',
        certificate: 'brgy_certificate',
        indigency: 'brgy_indigency',
    };

    const prefixMap = {
        clearance: 'CLRN',
        certificate: 'CERT',
        indigency: 'INDG',
    };

    if (!collectionMap[documentType] || !prefixMap[documentType]) {
        throw new Error('Invalid document type');
    }

    const collectionName = collectionMap[documentType];
    const prefix = prefixMap[documentType];
    
    const documentCollection = collection(db, collectionName);
    const snapshot = await getDocs(documentCollection);
    const documentCount = snapshot.size;
    const newTransactionId = `${prefix}-${(documentCount + 1).toString().padStart(6, '0')}`;

    return newTransactionId;
}


async function generateDocument(type, data) {
    try {
        // Template paths - try multiple possible locations
        const baseTemplateNames = {
            clearance: 'BARANGAY-CLEARANCE-BLANK.docx',
            indigency: 'BARANGAY-INDIGENCY-BLANK.docx',
            certificate: 'BARANGAY-CERTIFICATE-BLANK.docx'
        };

        const possiblePaths = [
            `/Brgy Docs/${baseTemplateNames[type]}`,
            `./Brgy Docs/${baseTemplateNames[type]}`,
            `../Brgy Docs/${baseTemplateNames[type]}`,
            `/public/Brgy Docs/${baseTemplateNames[type]}`,
            `./public/Brgy Docs/${baseTemplateNames[type]}`,
            `../public/Brgy Docs/${baseTemplateNames[type]}`
        ];

        // Try each path until we find one that works
        let templateContent = null;
        let successfulPath = null;

        for (const path of possiblePaths) {
            try {
                console.log(`Attempting to load template from: ${path}`);
                const response = await fetch(path, {
                    method: 'GET',
                    cache: 'no-cache'
                });

                if (response.ok) {
                    templateContent = await response.arrayBuffer();
                    successfulPath = path;
                    console.log(`Successfully loaded template from: ${path}`);
                    break;
                } else {
                    console.log(`Failed to load from ${path}: ${response.status}`);
                }
            } catch (error) {
                console.log(`Error trying path ${path}:`, error.message);
            }
        }

        if (!templateContent) {
            console.error('All template paths failed:', possiblePaths);
            throw new Error('Could not find template file in any location');
        }

        // Verify template content
        if (templateContent.byteLength === 0) {
            throw new Error('Template file is empty');
        }

        console.log(`Template loaded successfully from ${successfulPath}, size: ${templateContent.byteLength} bytes`);

        // Initialize document
        let zip;
        try {
            zip = new PizZip(templateContent);
            console.log('ZIP initialized successfully');
        } catch (error) {
            console.error('ZIP initialization failed:', error);
            throw new Error('Failed to initialize ZIP');
        }

        let doc;
        try {
            doc = new window.docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                delimiters: {
                    start: '${',
                    end: '}'
                }
            });
            console.log('Docxtemplater initialized successfully');
        } catch (error) {
            console.error('Docxtemplater initialization failed:', error);
            throw new Error('Failed to initialize document template');
        }

        // Template data preparation based on document type
        const issueDate = new Date(data.issueDate);
        let templateData = {};

        switch(type) {
            case 'clearance':
                templateData = {
                    printClearance: data.transactionId || '',
                    printClrIssueDate: issueDate.toLocaleDateString(),
                    printClrName: data.fullName || '',
                    printClrAge: data.age ? `${data.age}` : '',
                    printClrBlklot: data.blockLot || '',
                    printClrDay: `${issueDate.getDate()}`,
                    printClrMonth: getMonthName(issueDate.getMonth()),
                    printClrYear: issueDate.getFullYear(),
                    printClrPurpose: data.purpose || ''
                };
                break;

            case 'certificate':
                templateData = {
                    printCertificate: data.transactionId || '',
                    printCertificateIssueDate: issueDate.toLocaleDateString(),
                    printCertificateName: data.fullName || '',
                    printCertificateAge: data.age ? `${data.age}` : '',
                    printCertificateBlklot: data.blockLot || '',
                    printCertificateDay: `${issueDate.getDate()}`,
                    printCertificateMonth: getMonthName(issueDate.getMonth()),
                    printCertificateYear: issueDate.getFullYear(),
                    printCertificatePurpose: data.purpose || ''
                };
                if (data.dor) {
                    templateData.printCertificateDateOfResidency = new Date(data.dor).toLocaleDateString();
                }
                break;

            case 'indigency':
                templateData = {
                    printIndigency: data.transactionId || '',
                    printIndigencyIssueDate: issueDate.toLocaleDateString(),
                    printIndigencyName: data.fullName || '',
                    printIndigencyAge: data.age ? `${data.age}` : '',
                    printIndigencyBlklot: data.blockLot || '',
                    printIndigencyDay: `${issueDate.getDate()}`,
                    printIndigencyMonth: getMonthName(issueDate.getMonth()),
                    printIndigencyYear: issueDate.getFullYear(),
                    printIndigencyPurpose: data.purpose || ''
                };
                break;

            default:
                throw new Error(`Unknown document type: ${type}`);
        }

        console.log('Template data prepared:', templateData);

        // Render document
        try {
            doc.setData(templateData);
            doc.render();
            console.log('Document rendered successfully');
        } catch (error) {
            console.error('Document rendering failed:', error);
            throw new Error('Failed to render document');
        }

        // Generate output
        const out = doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        // Download file
        const sanitizedTransactionId = data.transactionId.replace(/[^a-zA-Z0-9-_]/g, '_');
        const filename = `${type.charAt(0).toUpperCase() + type.slice(1)}_${sanitizedTransactionId}.docx`;
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(out);
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(link.href);

        console.log('Document generated and download initiated');
        return true;

    } catch (error) {
        console.error(`Error in generateDocument (${type}):`, error);
        throw new Error(`Failed to generate ${type}: ${error.message}`);
    }
}

// Event listener for clearance
document.getElementById('printClearance').addEventListener('click', async (event) => {
    try {
        const clearanceData = {
            transactionId: await generateTransactionId('clearance'),  // Pass document type
            fullName: document.getElementById('clearanceName').value.trim().toUpperCase(),
            age: document.getElementById('clearanceAge').value.trim(),
            blockLot: document.getElementById('clearanceBlklot').value.trim().toUpperCase(),
            purpose: document.getElementById('clearancePurpose').value.toUpperCase(),
            issueDate: document.getElementById('clearanceIssueDate').value,
            status: 'Printed',
            createdAt: serverTimestamp(),
            issuedAt: serverTimestamp(),
        };

        if (!clearanceData.fullName || !clearanceData.age || !clearanceData.blockLot || 
            !clearanceData.purpose || !clearanceData.issueDate) {
            alert('Please fill in all required fields');
            return;
        }

        await generateDocument('clearance', clearanceData);
        const docRef = await addDoc(collection(db, 'brgy_clearance'), clearanceData);
        console.log("New clearance saved with ID:", docRef.id);
        
        showToast('Clearance generated successfully', 'success');
        clearForm('clearance');
        closePopup('clearance', 'overlay');        

    } catch (error) {
        console.error('Error:', error); 
        alert('An error occurred while generating the clearance. Please try again.');
    }
});

// Event listener for indigency
document.getElementById('printIndigency').addEventListener('click', async (event) => {
    try {
        const indigencyData = {
            transactionId: await generateTransactionId('indigency'),  // Pass document type
            fullName: document.getElementById('indigencyName').value.trim().toUpperCase(),
            age: document.getElementById('indigencyAge').value.trim(),
            blockLot: document.getElementById('indigencyBlklot').value.trim().toUpperCase(),
            purpose: document.getElementById('indigencyPurpose').value.toUpperCase(),
            issueDate: document.getElementById('indigencyIssueDate').value,
            status: 'Printed',
            createdAt: serverTimestamp(),
            issuedAt: serverTimestamp()
        };

        if (!indigencyData.fullName || !indigencyData.age || !indigencyData.blockLot || 
            !indigencyData.purpose || !indigencyData.issueDate) {
            alert('Please fill in all required fields');
            return;
        }

        await generateDocument('indigency', indigencyData);
        const docRef = await addDoc(collection(db, 'brgy_indigency'), indigencyData);
        console.log("New indigency saved with ID:", docRef.id);
        
        showToast('Indigency generated successfully', 'success');
        clearForm('indigency');
        closePopup('indigency', 'indigencyOverlay');

    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while generating the indigency. Please try again.');
    }
});

// Event listener for certificate
document.getElementById('printCertificate').addEventListener('click', async (event) => {
    try {
        const certificateData = {
            transactionId: await generateTransactionId('certificate'),  // Pass document type
            fullName: document.getElementById('certificateName').value.trim().toUpperCase(),
            age: document.getElementById('certificateAge').value.trim(),
            blockLot: document.getElementById('certificateBlklot').value.trim().toUpperCase(),
            purpose: document.getElementById('certificatePurpose').value.toUpperCase(),
            issueDate: document.getElementById('certificateIssueDate').value,
            dor: document.getElementById('certificateDateOfResidency').value,
            status: 'Printed',
            createdAt: serverTimestamp(),
            issuedAt: serverTimestamp()
        };

        if (!certificateData.fullName || !certificateData.age || !certificateData.blockLot || 
            !certificateData.purpose || !certificateData.issueDate || !certificateData.dor) {
            alert('Please fill in all required fields');
            return;
        }

        await generateDocument('certificate', certificateData);
        const docRef = await addDoc(collection(db, 'brgy_certificate'), certificateData);
        console.log("New certificate saved with ID:", docRef.id);

        showToast('Certificate generated successfully', 'success');
        clearForm('certificate');
        closePopup('certificate', 'certificateOverlay');
        
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while generating the certificate. Please try again.');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Document types we want to handle
    const documentTypes = ['clearance', 'indigency', 'certificate'];
    
    // Set up event listeners for each document type
    documentTypes.forEach(docType => {
        // Button click listener
        const fetchButton = document.getElementById(`fetch${docType.charAt(0).toUpperCase() + docType.slice(1)}UserData`);
        if (fetchButton) {
            fetchButton.addEventListener('click', () => fetchUserData(docType));
        }

        // Input auto-fetch listener
        const uniqueIdInput = document.getElementById(`${docType}UniqueId`);
        if (uniqueIdInput) {
            uniqueIdInput.addEventListener('input', function() {
                // Auto fetch when input reaches 13 characters
                if (this.value.length >= 13) {
                    fetchUserData(docType);
                }
            });

            // Optional: Clear form when input is cleared
            uniqueIdInput.addEventListener('change', function() {
                if (this.value.length === 0) {
                    clearFormFields(docType);
                }
            });
        }
    });
});

// Helper function to debounce the fetch calls (optional but recommended)
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

// Modified fetchUserData function with debouncing
const debouncedFetchUserData = debounce((documentType) => {
    const fields = documentFieldMappings[documentType];
    const uniqueId = document.getElementById(fields.uniqueId).value.trim().toUpperCase();
    
    if (!uniqueId) {
        clearFormFields(documentType);
        return;
    }

    return fetch(documentType, uniqueId);
}, 300); // 300ms delay

function closePopup(documentType, overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
        overlay.style.display = 'none';
    }
    clearFormFields(documentType);
}

// Clearance
document.getElementById('clearanceCloseButton').addEventListener('click', () => closePopup('clearance', 'overlay'));
document.getElementById('clearanceCancelButton').addEventListener('click', () => closePopup('clearance', 'overlay'));

// Certificate
document.getElementById('certificateCloseButton').addEventListener('click', () => closePopup('certificate', 'certificateOverlay'));
document.getElementById('certificateCancelButton').addEventListener('click', () => closePopup('certificate', 'certificateOverlay'));

// Indigency
document.getElementById('indigencyCloseButton').addEventListener('click', () => closePopup('indigency', 'indigencyOverlay'));
document.getElementById('indigencyCancelButton').addEventListener('click', () => closePopup('indigency', 'indigencyOverlay'));


// ##################### SUGGESTION DROPDOWN LIST ####################

async function initializeFormAutocomplete() {
    const forms = {
        clearance: {
            nameInput: document.getElementById('clearanceName'),
            ageInput: document.getElementById('clearanceAge'),
            blklotInput: document.getElementById('clearanceBlklot'),
            uniqueIdInput: document.getElementById('clearanceUniqueId')
        },
        certificate: {
            nameInput: document.getElementById('certificateName'),
            ageInput: document.getElementById('certificateAge'),
            blklotInput: document.getElementById('certificateBlklot'),
            uniqueIdInput: document.getElementById('certificateUniqueId')
        },
        indigency: {
            nameInput: document.getElementById('indigencyName'),
            ageInput: document.getElementById('indigencyAge'),
            blklotInput: document.getElementById('indigencyBlklot'),
            uniqueIdInput: document.getElementById('indigencyUniqueId')
        }
    };

    // Add autocomplete to each form's name input
    Object.values(forms).forEach(formInputs => {
        setupAutocomplete(formInputs);
    });

    function setupAutocomplete(formInputs) {
        const { nameInput } = formInputs;
        
        // Create wrapper div if it doesn't exist
        if (!nameInput.parentElement.classList.contains('autocomplete-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'autocomplete-wrapper';
            nameInput.parentNode.insertBefore(wrapper, nameInput);
            wrapper.appendChild(nameInput);

            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'suggestions-container';
            wrapper.appendChild(suggestionsContainer);
        }

        // Add necessary styles if they don't exist
        if (!document.getElementById('autocomplete-styles')) {
            const style = document.createElement('style');
            style.id = 'autocomplete-styles';
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
                
                .suggestion-id {
                    font-size: 0.8em;
                    color: #666;
                    margin-bottom: 2px;
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

        const suggestionsContainer = nameInput.parentElement.querySelector('.suggestions-container');

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
                    results.set(doc.id, { ...data, id: doc.id });
                });

                suggestionsContainer.innerHTML = '';

                if (results.size === 0) {
                    suggestionsContainer.style.display = 'none';
                    return;
                }

                // Format date function
                function formatDate(dateValue) {
                    if (!dateValue) return 'No birthdate';
                    try {
                        if (dateValue && dateValue.toDate) {
                            return dateValue.toDate().toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });
                        }
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

                // Calculate age function
                function calculateAge(birthDate) {
                    if (!birthDate) return '';
                    try {
                        const date = birthDate.toDate ? birthDate.toDate() : new Date(birthDate);
                        const today = new Date();
                        let age = today.getFullYear() - date.getFullYear();
                        const monthDiff = today.getMonth() - date.getMonth();
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
                            age--;
                        }
                        return age;
                    } catch (error) {
                        console.error('Error calculating age:', error);
                        return '';
                    }
                }

                // Create suggestion items
                Array.from(results.values()).forEach(userData => {
                    const suggestionItem = document.createElement('div');
                    suggestionItem.className = 'suggestion-item';

                    const fullName = `${userData.firstName || ''} ${userData.middleName || ''} ${userData.lastName || ''}`.trim();
                    const birthDate = formatDate(userData.birthdate || userData.birthDate);

                    suggestionItem.innerHTML = `
                        <div class="suggestion-id">ID: ${userData.id || 'N/A'}</div>
                        <div class="suggestion-name">${fullName}</div>
                        <div class="suggestion-details">Birth Date: ${birthDate}</div>
                    `;

                    suggestionItem.addEventListener('click', () => {
                        formInputs.nameInput.value = fullName;
                        formInputs.uniqueIdInput.value = userData.id || '';
                        formInputs.ageInput.value = calculateAge(userData.birthdate || userData.birthDate);
                        formInputs.blklotInput.value = userData.blklot || '';
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
        nameInput.addEventListener('input', (e) => debouncedFetch(e.target.value));

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!nameInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
            }
        });

        // Handle keyboard navigation
        nameInput.addEventListener('keydown', (e) => {
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
}

// Initialize autocomplete when the document is loaded
document.addEventListener('DOMContentLoaded', initializeFormAutocomplete);