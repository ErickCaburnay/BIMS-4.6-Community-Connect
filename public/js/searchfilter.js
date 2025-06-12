import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

let currentPage = 1;
let rowsPerPage = 10;
let allResidentsData = [];
let filteredResidentsData = [];

export const searchResidents = async (db, searchTerm) => {
    const residentsTable = document.getElementById('residentsTable').getElementsByTagName('tbody')[0];
    residentsTable.innerHTML = ''; // Clear the table before displaying the results

    try {
        // Fetch all residents data
        const querySnapshot = await getDocs(collection(db, 'users'));
        allResidentsData = [];
        querySnapshot.forEach((doc) => {
            allResidentsData.push({ id: doc.id, ...doc.data() });
        });

        console.log("All residents data:", allResidentsData); // Debug log

        // If there is no search term, display all data
        if (searchTerm) {
            searchTerm = searchTerm.toLowerCase().trim();
            console.log("Search term:", searchTerm); // Debug log

            filteredResidentsData = allResidentsData.filter((data) => {
                const fullName = `${data.firstName || ''} ${data.middleName || ''} ${data.lastName || ''} ${data.suffix || ''}`.toLowerCase();
                const gender = (data.gender || '').toLowerCase().trim();
                const voter = (data.voter || '').toLowerCase().trim();

                console.log(`Checking resident: ${fullName}, Gender: ${gender}, Voter: ${voter}`); // Debug log

                // Exact match for gender
                if (searchTerm === 'male' || searchTerm === 'female') {
                    return gender === searchTerm;
                }

                // Exact match for voter status
                if (searchTerm === 'voter' || searchTerm === 'non-voter') {
                    return voter === searchTerm;
                }

                // For other searches, use includes for name matching
                return fullName.includes(searchTerm);
            });
        } else {
            filteredResidentsData = [...allResidentsData];
        }

        console.log("Filtered residents data:", filteredResidentsData); // Debug log

        if (filteredResidentsData.length === 0) {
            residentsTable.innerHTML = '<tr><td colspan="7">No results found</td></tr>';
        } else {
            currentPage = 1; // Reset to first page for new search
            displayPage(currentPage);
            updatePaginationControls();
        }
    } catch (error) {
        console.error("Error fetching search results: ", error);
    }
};

const displayPage = (page) => {
    const residentsTable = document.getElementById('residentsTable').getElementsByTagName('tbody')[0];
    residentsTable.innerHTML = '';

    const start = (page - 1) * rowsPerPage;
    const end = Math.min(start + rowsPerPage, filteredResidentsData.length);

    for (let i = start; i < end; i++) {
        const data = filteredResidentsData[i];
        const row = residentsTable.insertRow();

        const fullNameCell = row.insertCell();
        fullNameCell.textContent = `${data.firstName || ''} ${data.middleName || ''} ${data.lastName || ''} ${data.suffix || ''}`;

        const uniqueIdCell = row.insertCell();
        uniqueIdCell.textContent = data.id;

        const ageCell = row.insertCell();
        ageCell.textContent = data.age;

        const civilStatusCell = row.insertCell();
        civilStatusCell.textContent = data.maritalStatus;

        const genderCell = row.insertCell();
        genderCell.textContent = data.gender;

        const voterStatusCell = row.insertCell();
        voterStatusCell.textContent = data.voter;

        const actionCell = row.insertCell();
        actionCell.innerHTML = `<button onclick="editResident('${data.id}')">Edit</button>`;
    }
};

const updatePaginationControls = () => {
    const paginationControls = document.getElementById('paginationControls');
    const pageButtonsContainer = document.getElementById('pageButtons');
    pageButtonsContainer.innerHTML = '';

    const totalRows = filteredResidentsData.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.classList.add('pagination-button');
        button.addEventListener('click', () => {
            currentPage = i;
            displayPage(currentPage);
            updatePaginationControls();
        });

        if (i === currentPage) {
            button.classList.add('active');
        }

        pageButtonsContainer.appendChild(button);
    }
};

export function clearSearch() {
    document.querySelector('.search-input').value = '';
    searchResidents(db, ''); // Clear the search by passing an empty string
}