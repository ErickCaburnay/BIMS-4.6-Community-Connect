import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let allLogs = []; // Store all logs
let currentPage = 1;
const entriesPerPage = 10; // Fixed to 10 entries per page
let actionSearchTerm = ''; // Store the current action search term
let actionSortDirection = 'asc';

// Fetch logs from Firebase
// Add to your fetchLogs function
async function fetchLogs() {
    const activeLogsQuery = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'));
    const archivedLogsQuery = query(collection(db, 'archived_logs'), orderBy('timestamp', 'desc'));
    
    const [activeSnapshot, archivedSnapshot] = await Promise.all([
        getDocs(activeLogsQuery),
        getDocs(archivedLogsQuery)
    ]);
    
    allLogs = [
        ...activeSnapshot.docs.map(doc => ({
            ...doc.data(),
            timestamp: doc.data().timestamp.toDate(),
            role: doc.data().role || 'Admin'
        })),
        ...archivedSnapshot.docs.map(doc => ({
            ...doc.data(),
            timestamp: doc.data().timestamp.toDate(),
            role: doc.data().role || 'Admin',
            archived: true
        }))
    ].sort((a, b) => b.timestamp - a.timestamp);
    
    displayLogs();
    updatePagination();
    initializeActionSearch();
}

// Filter logs based on role and action search
function filterLogs() {
    const roleFilter = document.getElementById('roleFilter').value;
    let filteredByRole = roleFilter === 'all' 
        ? allLogs 
        : allLogs.filter(log => log.role === roleFilter);

    // Additional filter for action search
    if (actionSearchTerm) {
        filteredByRole = filteredByRole.filter(log => 
            log.action && log.action.toLowerCase().includes(actionSearchTerm.toLowerCase())
        );
    }

    return filteredByRole;
}

// Initialize action search functionality
function initializeActionSearch() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'actionSearch';
    searchInput.placeholder = 'Search actions...';
    searchInput.classList.add('action-search-input');

    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.id = 'actionSuggestions';
    suggestionsDiv.classList.add('action-suggestions');
    suggestionsDiv.style.display = 'none';

    const container = document.getElementById('actionFilterContainer');
    container.appendChild(searchInput);
    container.appendChild(suggestionsDiv);

    // Get unique actions for suggestions
    function getUniqueSuggestions(input) {
        const uniqueActions = [...new Set(allLogs.map(log => log.action))];
        return uniqueActions.filter(action => 
            action && action.toLowerCase().includes(input.toLowerCase())
        );
    }

    // Handle input changes
    searchInput.addEventListener('input', (e) => {
        const input = e.target.value;
        actionSearchTerm = input;
        
        if (input.trim()) {
            const suggestions = getUniqueSuggestions(input);
            displaySuggestions(suggestions);
        } else {
            suggestionsDiv.style.display = 'none';
            actionSearchTerm = '';
            currentPage = 1;
            displayLogs();
            updatePagination();
        }
    });

    // Display suggestions
    function displaySuggestions(suggestions) {
        if (suggestions.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        suggestionsDiv.innerHTML = '';
        suggestions.forEach(suggestion => {
            const div = document.createElement('div');
            div.textContent = suggestion;
            div.classList.add('suggestion-item');
            div.addEventListener('click', () => {
                searchInput.value = suggestion;
                actionSearchTerm = suggestion;
                suggestionsDiv.style.display = 'none';
                currentPage = 1;
                displayLogs();
                updatePagination();
            });
            suggestionsDiv.appendChild(div);
        });
        suggestionsDiv.style.display = 'block';
    }

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            suggestionsDiv.style.display = 'none';
        }
    });
}

// Update pagination numbers
function updatePagination() {
    const filteredLogs = filterLogs();
    const totalPages = Math.ceil(filteredLogs.length / entriesPerPage);
    const pageNumbers = document.getElementById('pageNumbers');
    pageNumbers.innerHTML = '';

    // Update entries info
    const startEntry = ((currentPage - 1) * entriesPerPage) + 1;
    const endEntry = Math.min(currentPage * entriesPerPage, filteredLogs.length);
    const totalEntries = filteredLogs.length;

    document.getElementById('startEntry').textContent = startEntry;
    document.getElementById('endEntry').textContent = endEntry;
    document.getElementById('totalEntries').textContent = totalEntries;

    // Create page number buttons
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.classList.add('page-number');
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.addEventListener('click', () => {
            currentPage = i;
            displayLogs();
            updatePagination();
        });
        pageNumbers.appendChild(pageButton);
    }

    // Update prev/next button states
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

// Display logs with pagination
function displayLogs() {
    const filteredLogs = filterLogs();
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    const currentLogs = filteredLogs.slice(startIndex, endIndex);
    
    const logsContainer = document.getElementById('logsBody');
    logsContainer.innerHTML = '';
    
    currentLogs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.userId || ''}</td>
            <td>${log.action || ''}</td>
            <td>${log.role || 'undefined'}</td>
            <td>${log.timestamp.toLocaleString()}</td>
        `;
        logsContainer.appendChild(row);
    });
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Role filter
    const roleFilter = document.getElementById('roleFilter');
    roleFilter.addEventListener('change', () => {
        currentPage = 1; // Reset to first page when filter changes
        displayLogs();
        updatePagination();
    });
    
    // Pagination
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayLogs();
            updatePagination();
        }
    });
    
    document.getElementById('nextPage').addEventListener('click', () => {
        const filteredLogs = filterLogs();
        const totalPages = Math.ceil(filteredLogs.length / entriesPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayLogs();
            updatePagination();
        }
    });
    
    // Initial fetch and display
    fetchLogs();
});

export { fetchLogs, displayLogs };  