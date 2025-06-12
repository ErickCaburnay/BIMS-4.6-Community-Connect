// ############### ADMIN_COMPLAINTS.JS ####################
// import { db } from './firebaseConfig.js';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, getDocs, updateDoc, addDoc, Timestamp, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js';
import { createUserNotification } from './admin_notification.js';


// Global variables
let complaintsData = [];
const rowsPerPage = 10;
let currentPage = 1;

// Loader functions
function showLoader() {
    const loader = document.getElementById('loader-container');
    if (loader) loader.style.display = 'flex';
}

function hideLoader() {
    const loader = document.getElementById('loader-container');
    if (loader) loader.style.display = 'none';
}

document.getElementById('adminComplaintCloseBtn').addEventListener('click', () => {
    // Close the popup
    document.getElementById('adminComplaintPopup').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';

    // Clear the form inputs
    document.getElementById('complaintForm').reset();
});



function updateNotificationCount(count) {
    const notificationBadge = document.getElementById('notificationBadge');
    if (notificationBadge) {
        if (count > 0) {
            notificationBadge.textContent = count;
            notificationBadge.style.display = 'block';
        } else {
            notificationBadge.style.display = 'none';
        }
    }

    // Update title with notification count
    document.title = count > 0 ? `(${count}) Complaints Management` : 'Complaints Management';
}

// Date formatting
function formatDate(dateField) {
    if (dateField instanceof Timestamp) {
        return dateField.toDate().toLocaleString('en-PH');
    } else if (dateField instanceof Date) {
        return dateField.toLocaleString('en-PH');
    } else if (typeof dateField === 'string') {
        return dateField;
    } else {
        return 'N/A';
    }
}

async function generateComplaintId() {
    try {
        const counterDocRef = doc(db, 'counters', 'complaintId');
        
        // Get the current counter value
        const counterDoc = await getDoc(counterDocRef);
        let currentNumber;

        if (!counterDoc.exists()) {
            // Initialize counter if it doesn't exist
            currentNumber = 1;
            await setDoc(counterDocRef, { value: currentNumber });
        } else {
            // Increment existing counter
            currentNumber = counterDoc.data().value + 1;
            await updateDoc(counterDocRef, { value: currentNumber });
        }

        // Format the number with leading zeros (6 digits)
        const formattedNumber = String(currentNumber).padStart(6, '0');
        
        // Create the complaint ID in the format SADPI-FC-XXXXXX
        return `SADPI-FC-${formattedNumber}`;
    } catch (error) {
        console.error('Error generating complaint ID:', error);
        throw error;
    }
}

// Create new complaint
async function createComplaintRequest(complaintData) {
    try {
        showLoader();
        console.log('Creating new complaint:', complaintData);

        // Generate the complaint ID
        const complaintId = await generateComplaintId();
        console.log('Generated complaint ID:', complaintId);

        const resolutionDate = complaintData.status !== 'Pending' ? 
            Timestamp.now() : null;

        const newComplaintData = {
            userId: userId,
            complaintId: complaintId, // Add the generated ID
            complaintType: complaintData.complaintType,
            respondent: complaintData.respondent,
            respondentAddress: complaintData.respondentAddress,
            complainant: complaintData.complainant,
            complainantAddress: complaintData.complainantAddress,
            issue: complaintData.issue,
            status: 'Pending',
            timestamp: Timestamp.now(),
            assignedOfficer: complaintData.assignedOfficer || '',
            resolutionDate: null,
            read: false
        };

        const newComplaintRef = await addDoc(collection(db, 'Complaints'), newComplaintData);
        console.log('Complaint created with ID:', newComplaintRef.id);

        // Create activity log entry
        const logEntry = {
            userId: auth.currentUser.uid,
            email: auth.currentUser.email,
            action: `${auth.currentUser.email} has created a new complaint`,
            role: 'Admin', 
            details: {
                complaintId: complaintId,
                complainantName: newComplaintData.complainant,
                respondentName: newComplaintData.respondent,
                complaintType: newComplaintData.complaintType,
                modifiedBy: auth.currentUser.email,
                modificationType: 'created'
            },
            timestamp: Timestamp.now()
        };

        // Save log entry
        await addDoc(collection(db, 'activity_logs'), logEntry);
        console.log('Complaint creation logged successfully!');
        
        return newComplaintRef.id;
    } catch (error) {
        console.error('Error creating complaint:', error);
        throw error;
    } finally {
        hideLoader();
    }
}

// Mark complaint as read
async function markComplaintAsRead(complaintId) {
    try {
        await updateDoc(doc(db, 'Complaints', complaintId), {
            read: true
        });
    } catch (error) {
        console.error('Error marking complaint as read:', error);
    }
}

// Main function to listen for complaints
function listenForComplaints() {
    console.log('Starting complaints listener...');
    const q = query(collection(db, 'Complaints'), orderBy('timestamp', 'desc'));

    onSnapshot(q, (snapshot) => {
        complaintsData = [];
        let unreadCount = 0;

        snapshot.forEach((doc) => {
            const data = doc.data();
            const resolutionDateDisplay = data.status === 'Pending' ? 
                'Pending' : 
                formatDate(data.resolutionDate);

            complaintsData.push({
                id: doc.id,
                complaintId: data.complaintId || 'NO-ID', // Use the stored complaintId
                complaintType: data.complaintType || 'N/A',
                respondent: data.respondent || 'N/A',
                complainant: data.complainant || 'N/A',
                dateFiled: formatDate(data.timestamp),
                assignedOfficer: data.assignedOfficer || 'N/A',
                status: data.status || 'N/A',
                resolutionDate: formatDate(data.resolutionDate),
                respondentAddress: data.respondentAddress || 'N/A',
                complainantAddress: data.complainantAddress || 'N/A',
                issue: data.issue || 'N/A',
                read: data.read || false
            });

            if (!data.read) unreadCount++;
        });

        console.log(`Fetched ${complaintsData.length} complaints`);
        renderComplaintsTable();
        updateNotificationCount(unreadCount);
    }, (error) => {
        console.error('Error fetching complaints:', error);
    });
}

// Add these global variables at the top of your file
let currentSortColumn = 'dateFiled'; // Default sort column
let currentSortOrder = 'desc'; // Default sort order

// Add this sorting utility function
function sortComplaints(complaints, column, order) {
    return [...complaints].sort((a, b) => {
        let aValue = a[column];
        let bValue = b[column];

        // Handle special cases for dates
        if (column === 'dateFiled' || column === 'resolutionDate') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
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

let currentFilter = 'all';
let searchTerm = '';

// Search function
function searchComplaints(complaints, term) {
    if (!term) return complaints;
    
    term = term.toLowerCase();
    return complaints.filter(complaint => {
        return (
            complaint.complaintId.toLowerCase().includes(term) ||
            complaint.complaintType.toLowerCase().includes(term) ||
            complaint.respondent.toLowerCase().includes(term) ||
            complaint.complainant.toLowerCase().includes(term) ||
            complaint.assignedOfficer.toLowerCase().includes(term) ||
            complaint.status.toLowerCase().includes(term) ||
            complaint.issue.toLowerCase().includes(term)
        );
    });
}

// Date filter function
function filterByDate(complaints, filterType) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return complaints.filter(complaint => {
        const complaintDate = new Date(complaint.dateFiled);
        switch (filterType) {
            case 'today':
                return complaintDate >= today;
            case 'week':
                return complaintDate >= startOfWeek;
            case 'month':
                return complaintDate >= startOfMonth;
            case 'year':
                return complaintDate >= startOfYear;
            default:
                return true;
        }
    });
}

// Render complaints table
function renderComplaintsTable() {
    // Apply search and filter
    let filteredData = [...complaintsData];
    
    // Apply search
    if (searchTerm) {
        filteredData = searchComplaints(filteredData, searchTerm);
    }
    
    // Apply date filter
    if (currentFilter !== 'all') {
        filteredData = filterByDate(filteredData, currentFilter);
    }
    
    const tbody = document.querySelector('#complaintsTable tbody');
    const thead = document.querySelector('#complaintsTable thead');
    
    if (!tbody || !thead) {
        console.error('Table elements not found');
        return;
    }

    // Update the table header to include sort indicators and click handlers
    thead.innerHTML = `
        <tr>
            ${[
                { id: 'complaintId', label: 'Complaint ID' },
                { id: 'complaintType', label: 'Type of Complaint' },
                { id: 'respondent', label: 'Respondent' },
                { id: 'complainant', label: 'Complainant' },
                { id: 'dateFiled', label: 'Date Filed' },
                { id: 'assignedOfficer', label: 'Assigned Officer' },
                { id: 'status', label: 'Status' },
                { id: 'resolutionDate', label: 'Resolution Date' }
            ].map(column => `
                <th class="sortable" data-column="${column.id}">
                    ${column.label}
                    <span class="sort-indicator">
                        ${currentSortColumn === column.id ? 
                            (currentSortOrder === 'asc' ? '▲' : '▼') : 
                            ''}
                    </span>
                </th>
            `).join('')}
        </tr>
    `;

    // Add click handlers to sortable headers
    thead.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            if (currentSortColumn === column) {
                // If clicking the same column, toggle sort order
                currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                // If clicking a new column, set it as current and default to ascending
                currentSortColumn = column;
                currentSortOrder = 'asc';
            }
            renderComplaintsTable(); // Re-render with new sort
        });
    });

    // Sort the filtered data
    const sortedData = sortComplaints(filteredData, currentSortColumn, currentSortOrder);
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, sortedData.length);
    const paginatedData = sortedData.slice(startIndex, endIndex);

    // Render table body
    tbody.innerHTML = '';
    paginatedData.forEach(complaint => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${complaint.complaintId}</td>
            <td>${complaint.complaintType}</td>
            <td>${complaint.respondent}</td>
            <td>${complaint.complainant}</td>
            <td>${complaint.dateFiled}</td>
            <td>${complaint.assignedOfficer}</td>
            <td>${complaint.status}</td>
            <td>${complaint.resolutionDate}</td>
        `;

        row.addEventListener('click', () => {
            openComplaintPopup(complaint.id);
            if (!complaint.read) {
                markComplaintAsRead(complaint.id);
            }
        });

        tbody.appendChild(row);
    });

    // Update pagination with filtered data length
    const totalPages = Math.ceil(sortedData.length / rowsPerPage);
    const paginationContainer = document.getElementById('paginationControls');
    if (paginationContainer) {
        let paginationHTML = `
            <div class="pagination">
                <button onclick="changePage(1)" class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''}>
                    First
                </button>
                <button onclick="changePage(${currentPage - 1})" class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''}>
                    Prev
                </button>
        `;

        const maxVisiblePages = 5;
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

    // Update showing entries info
    const showingEntries = document.getElementById('showingEntriesComplaints');
    if (showingEntries) {
        showingEntries.textContent = sortedData.length === 0 
            ? 'No entries to show'
            : `Showing ${startIndex + 1} to ${endIndex} of ${sortedData.length} entries${
                searchTerm || currentFilter !== 'all' 
                    ? ` (filtered from ${complaintsData.length} total entries)` 
                    : ''
            }`;
    }
}

function updatePaginationControls() {
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(complaintsData.length / rowsPerPage);
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

    // Update showing entries info
    const showingEntries = document.getElementById('showingEntriesComplaints');
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, complaintsData.length);
    
    if (showingEntries) {
        showingEntries.textContent = complaintsData.length === 0 
            ? 'No entries to show'
            : `Showing ${startIndex + 1} to ${endIndex} of ${complaintsData.length} entries`;
    }
}

window.changePage = function(page) {
    const totalPages = Math.ceil(complaintsData.length / rowsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderComplaintsTable();
};

// Add the styles if not already present
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

    #showingEntriesComplaints {
    color: #cdcdcd;
    }
`;
document.head.appendChild(paginationStyles);


function isFinalStatus(status) {
    return ['Resolved', 'Cancelled', 'Closed'].includes(status);
}

// Open complaint popup
async function openComplaintPopup(complaintId) {
    console.log('Opening complaint popup for ID:', complaintId);
    
    const overlay = document.getElementById('complaintOverlay');
    const popup = document.getElementById('complaintPopupContent');
    
    if (!overlay || !popup) {
        console.error('Popup elements not found');
        return;
    }

    try {
        const complaintDoc = await getDoc(doc(db, 'Complaints', complaintId));
        
        if (complaintDoc.exists()) {
            const data = complaintDoc.data();
            const isReadOnly = isFinalStatus(data.status);
            
            overlay.style.display = 'flex';
            popup.style.display = 'block';

            popup.innerHTML = `
                <div class="blurred-background"></div>
                <button id="complaintCloseButton" class="complaint-close-button">&times;</button>
                <h2>Complaint Details</h2>
                <form id="complaintDetails">
                    <!-- Complaint Type - Full Row -->
                    <div class="form-group">
                        <label>Complaint Type:</label>
                        <p>${data.complaintType || 'N/A'}</p>
                    </div>

                    <!-- Respondent Row -->
                    <div style="display: flex; gap: 20px;">
                        <div class="form-group" style="flex: 1;">
                            <label>Respondent:</label>
                            <p>${data.respondent || 'N/A'}</p>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Respondent Address:</label>
                            <p>${data.respondentAddress || 'N/A'}</p>
                        </div>
                    </div>

                    <!-- Complainant Row -->
                    <div style="display: flex; gap: 20px;">
                        <div class="form-group" style="flex: 1;">
                            <label>Complainant:</label>
                            <p>${data.complainant || 'N/A'}</p>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Complainant Address:</label>
                            <p>${data.complainantAddress || 'N/A'}</p>
                        </div>
                    </div>

                    <!-- Assigned Officer and Date Filed Row -->
                    <div style="display: flex; gap: 20px;">
                        <div class="form-group" style="flex: 1;">
                            <label>Assigned Officer:</label>
                            ${isReadOnly ? 
                                `<p>${data.assignedOfficer || 'N/A'}</p>` :
                                `<input type="text" 
                                    id="assignedofficer-input" 
                                    class="input-group" 
                                    value="${data.assignedOfficer || ''}"
                                    required
                                >`
                            }
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Date Filed:</label>
                            <p>${formatDate(data.timestamp)}</p>
                        </div>
                    </div>

                    <!-- Status and Resolution Date Row -->
                    <div style="display: flex; gap: 20px;">
                        <div class="form-group" style="flex: 1;">
                            <label>Status:</label>
                            ${isReadOnly ?
                                `<p>${data.status}</p>` :
                                `<select id="status-select" class="form-select" required>
                                    <option value="">Select a status</option>
                                    <option value="Pending" ${data.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                    <option value="Resolved" ${data.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                                    <option value="Cancelled" ${data.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                                    <option value="Closed" ${data.status === 'Closed' ? 'selected' : ''}>Closed</option>
                                </select>`
                            }
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Resolution Date:</label>
                            <p>${data.status === 'Pending' ? 'Pending' : (data.resolutionDate ? formatDate(data.resolutionDate) : 'N/A')}</p>
                        </div>
                    </div>

                    <!-- Issue Row -->
                    <div class="form-group">
                        <label>Issue:</label>
                        <p class="readonly-textarea">${data.issue || 'N/A'}</p>
                    </div>

                    <!-- Remarks Row -->
                    <div class="form-group">
                        <label>Remarks:</label>
                        ${isReadOnly ?
                            `<p class="readonly-textarea">${data.remarks || 'No remarks'}</p>` :
                            `<textarea 
                                id="remarks-input" 
                                class="form-textarea" 
                                rows="3" 
                                placeholder="Enter additional remarks"
                                style="background-color: white; color: black; min-height: 100px; resize: vertical;"
                            >${data.remarks || ''}</textarea>`
                        }
                    </div>

                    ${!isReadOnly ? `
                        <div class="button-group" style="justify-content: center;">
                            <button type="button" id="submitButton">Submit</button>
                        </div>
                    ` : ''}
                </form>
            `;

            // Add event listeners
            const closeButton = popup.querySelector('#complaintCloseButton');
            if (closeButton) {
                closeButton.addEventListener('click', closeComplaintPopup);
            }

            if (!isReadOnly) {
                const submitButton = popup.querySelector('#submitButton');
                if (submitButton) {
                    submitButton.addEventListener('click', () => {
                        handleComplaint(complaintId, 'submit');
                    });
                }

                const statusSelect = popup.querySelector('#status-select');
                if (statusSelect) {
                    statusSelect.addEventListener('change', (e) => {
                        console.log('Status changed to:', e.target.value);
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error opening complaint popup:', error);
    }
}

// Close complaint popup
function closeComplaintPopup() {
    const overlay = document.getElementById('complaintOverlay');
    const popup = document.getElementById('complaintPopupContent');
    
    if (overlay) overlay.style.display = 'none';
    if (popup) popup.style.display = 'none';
}

// Update complaint
// async function updateComplaint(complaintId) {
//     try {
//         showLoader();

//         // Get form elements using querySelector
//         const assignedOfficerElement = document.querySelector('#assignedofficer');
//         const statusElement = document.querySelector('#status');
//         const remarksElement = document.querySelector('#remarks');

//         // Log the elements for debugging
//         console.log('Form Elements:', {
//             assignedOfficerElement,
//             statusElement,
//             remarksElement
//         });

//         // Get and validate values
//         const assignedOfficer = assignedOfficerElement ? assignedOfficerElement.value.trim() : '';
//         const status = statusElement ? statusElement.value.trim() : '';
//         const remarks = remarksElement ? remarksElement.value.trim() : '';

//         console.log('Form Values:', {
//             assignedOfficer,
//             status,
//             remarks
//         });

//         // Create update object with only non-empty values
//         const updateData = {};
        
//         if (assignedOfficer) updateData.assignedOfficer = assignedOfficer;
//         if (status) updateData.status = status;
//         if (remarks) updateData.remarks = remarks;

//         console.log('Update Data:', updateData);

//         // Validate we have data to update
//         if (Object.keys(updateData).length === 0) {
//             alert('No changes to update');
//             hideLoader();
//             return;
//         }

//         // Update the document
//         await updateDoc(doc(db, 'Complaints', complaintId), updateData);
        
//         alert('Complaint updated successfully');
//         closeComplaintPopup();
        
//     } catch (error) {
//         console.error('Error updating complaint:', error);
//         alert(`Failed to update complaint: ${error.message}`);
//     } finally {
//         hideLoader();
//     }
// }


// // Utility function for creating form fields
// function createFormField(label, value, isApproved) {
//     return `
//         <div class="form-group">
//             <label for="${label.toLowerCase()}">${label}:</label>
//             ${isApproved ? 
//                 `<p>${value || 'N/A'}</p>` :
//                 `<input type="text" 
//                     id="${label.toLowerCase()}" 
//                     class="input-group" 
//                     name="${label.toLowerCase()}" 
//                     value="${value || ''}"
//                     ${label === 'Assigned Officer' ? 'required' : ''}
//                 >`
//             }
//         </div>
//     `;
// }

// // Utility function for creating status field
// function createStatusField(status, isApproved) {
//     return `
//         <div class="form-group">
//             <label for="status">Status:</label>
//             ${isApproved ?
//                 `<p>${status}</p>` :
//                 `<select id="status" name="status" class="form-select" required>
//                     <option value="">Select a status</option>
//                     <option value="Pending" ${status === 'Pending' ? 'selected' : ''}>Pending</option>
//                     <option value="Approved" ${status === 'Approved' ? 'selected' : ''}>Approved</option>                    
//                     <option value="Closed" ${status === 'Closed' ? 'selected' : ''}>Closed</option>
//                     <option value="Cancelled" ${status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
//                 </select>`
//             }
//         </div>
//     `;
// }

// Handle complaint actions (pending/resolved/cancelled/closed)
// ######################################################################################

async function handleComplaint(complaintId, action) {
    try {
        const popup = document.getElementById('complaintPopupContent');
        const statusSelect = popup.querySelector('#status-select');
        const assignedOfficerInput = popup.querySelector('#assignedofficer-input');
        const remarksInput = popup.querySelector('#remarks-input');

        if (!statusSelect || !statusSelect.value) {
            alert('Please select a status');
            return;
        }

        showLoader();
        
        // Get the complaint document first to check status change
        const complaintRef = doc(db, 'Complaints', complaintId);
        const complaintSnap = await getDoc(complaintRef);
        const complaintData = complaintSnap.data();
        
        console.log('Complaint Data:', complaintData);

        const oldStatus = complaintData.status;
        const newStatus = statusSelect.value;

        const updateData = {
            status: newStatus,
            assignedOfficer: assignedOfficerInput ? assignedOfficerInput.value.trim() : '',
            remarks: remarksInput ? remarksInput.value.trim() : '',
            resolutionDate: newStatus !== 'Pending' ? Timestamp.now() : null
        };

        // Update the complaint
        await updateDoc(complaintRef, updateData);

        // Only create notification if userId exists
        if (complaintData.userId && oldStatus === 'Pending' && ['Closed', 'Cancelled', 'Resolved'].includes(newStatus)) {
            let statusEmoji = {
                'Closed': '🔒',
                'Cancelled': '❌',
                'Resolved': '✅'
            }[newStatus];

            try {
                // Get user's uniqueId from users collection
                const userQuery = query(
                    collection(db, 'users'),
                    where('userId', '==', complaintData.userId)
                );
                
                const userSnapshot = await getDocs(userQuery);
                if (!userSnapshot.empty) {
                    const userData = userSnapshot.docs[0].data();
                    const uniqueId = userData.uniqueId;

                    // Create notification in user's subcollection
                    await createUserNotification(uniqueId, {
                        type: 'COMPLAINTS', 
                        title: `Complaint ${newStatus} ${statusEmoji}`,
                        message: `Your complaint (${complaintData.complaintType}) has been marked as ${newStatus}. ${
                            newStatus === 'Resolved' ? 'The issue has been successfully addressed.' :
                            newStatus === 'Closed' ? 'The case has been closed.' :
                            'The complaint has been cancelled.'
                        }`,
                        status: newStatus,
                        timestamp: serverTimestamp()
                    });
                }
            } catch (notificationError) {
                console.log('Skipped notification creation:', notificationError);
            }
        }

        // Create activity log only if there's an authenticated user
        if (auth.currentUser) {
            const logEntry = {
                userId: auth.currentUser.uid,
                email: auth.currentUser.email,
                action: `${auth.currentUser.email} has ${action}d a complaint`,
                role: 'Admin',
                details: {
                    complaintId: complaintId,
                    complainantName: complaintData.complainant,
                    respondentName: complaintData.respondent,
                    complaintType: complaintData.complaintType,
                    modifiedBy: auth.currentUser.email,
                    modificationType: action,
                    changes: Object.keys(updateData)
                },
                timestamp: Timestamp.now()
            };

            await addDoc(collection(db, 'activity_logs'), logEntry);
            console.log(`Complaint ${action}d and logged successfully!`);
        }
        
        console.log('Update successful');
        alert(`Complaint successfully updated to ${updateData.status}`);
        closeComplaintPopup();
        
    } catch (error) {
        console.error('Error updating complaint:', error);
        alert(`Failed to update complaint: ${error.message}`);
    } finally {
        hideLoader();
    }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing complaints system...');
    
    // Start complaints listener
    listenForComplaints();
    
    // Get all necessary DOM elements
    const searchInput = document.getElementById('adminSearchComplaint'); 
    const searchButton = document.querySelector('.admin-search-complaint-button'); 
    const clearButton = document.querySelector('.admin-clear-complaint-button'); 
    const dateFilter = document.getElementById('dateFilter');
    const fileComplaintBtn = document.getElementById('fileComplaintBtn');
    const adminComplaintPopup = document.getElementById('adminComplaintPopup');
    const adminComplaintCloseBtn = document.getElementById('adminComplaintCloseBtn');
    const complaintSubmitBtn = document.getElementById('complaintSubmitBtn');
    const sortOrderSelect = document.getElementById('sortOrder');

    // Search functionality
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            searchTerm = searchInput.value;
            currentPage = 1;
            renderComplaintsTable();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                searchTerm = searchInput.value;
                currentPage = 1;
                renderComplaintsTable();
            }
        });
    }

    // Search functionality
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            searchTerm = searchInput.value;
            currentPage = 1;
            renderComplaintsTable();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                searchTerm = searchInput.value;
                currentPage = 1;
                renderComplaintsTable();
            }
        });
    }

    // Clear button functionality
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            console.log('Clear button clicked'); // Debug log

            // Clear search input
            if (searchInput) {
                searchInput.value = '';
                searchTerm = '';
            }

            // Reset date filter
            if (dateFilter) {
                dateFilter.value = 'all';
                currentFilter = 'all';
            }

            // Reset page and render
            currentPage = 1;
            renderComplaintsTable();
            
            // Console log for debugging
            console.log('Cleared filters:', {
                searchTerm,
                currentFilter,
                searchInputValue: searchInput?.value,
                dateFilterValue: dateFilter?.value
            });
        });
    }

    // Date filter functionality
    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            currentPage = 1;
            renderComplaintsTable();
        });
    }

    // File complaint button functionality
    if (fileComplaintBtn) {
        fileComplaintBtn.addEventListener('click', () => {
            if (adminComplaintPopup) adminComplaintPopup.style.display = 'block';
        });
    }

    // Close complaint popup functionality
    if (adminComplaintCloseBtn) {
        adminComplaintCloseBtn.addEventListener('click', () => {
            if (adminComplaintPopup) adminComplaintPopup.style.display = 'none';
        });
    }

    // Submit complaint functionality
    if (complaintSubmitBtn) {
        complaintSubmitBtn.addEventListener('click', async () => {
            const complaintData = {
                complaintType: document.getElementById('complaintType').value,
                respondent: document.getElementById('respondent').value,
                respondentAddress: document.getElementById('respondent-address').value,
                complainant: document.getElementById('complainant').value,
                complainantAddress: document.getElementById('complainant-address').value,
                issue: document.getElementById('issue').value,
                assignedOfficer: document.getElementById('assignedOfficer').value,
                status: document.getElementById('status').value
            };

            try {
                await createComplaintRequest(complaintData);
                alert('Complaint submitted successfully!');
                if (adminComplaintPopup) adminComplaintPopup.style.display = 'none';
                
                // Reset form
                const form = document.getElementById('complaintForm');
                if ('complaintForm') form.reset();
            } catch (error) {
                console.error('Error submitting complaint:', error);
                alert('Failed to submit complaint. Please try again.');
            }
        });
    }

    // Sort order functionality
    if (sortOrderSelect) {
        sortOrderSelect.addEventListener('click', (e) => {
            currentSortOrder = e.target.value;
            renderComplaintsTable();
        });
    }

    // Initial render of the table
    renderComplaintsTable();
});

// Make functions available globally
window.handleComplaint = handleComplaint;
// window.updateComplaint = updateComplaint;

// Export necessary functions
export {
    createComplaintRequest,
    closeComplaintPopup,
    showLoader,
    hideLoader,
    listenForComplaints,
    openComplaintPopup,
    markComplaintAsRead
};