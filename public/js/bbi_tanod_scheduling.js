import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBDp03_t7kWck8XTT9iqv3SIX8UqFp_C6w",
    authDomain: "bims-9aaa7.firebaseapp.com",
    projectId: "bims-9aaa7",
    storageBucket: "bims-9aaa7.appspot.com",
    messagingSenderId: "323333588672",
    appId: "1:323333588672:web:cfb7ea2dff4d9eb2004f25",
    measurementId: "G-RQJBMNMFQ8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchAndDisplayTanodNames() {
    try {
        console.log("Fetching tanod names...");
        const tanodSnapshot = await getDocs(collection(db, "tanod"));
        console.log("Snapshot received:", tanodSnapshot);

        const tanodList = document.getElementById("tanod-list").getElementsByTagName('tbody')[0];
        
        tanodList.innerHTML = '';

        tanodSnapshot.forEach((doc) => {
            console.log("Processing document:", doc.id, doc.data());
            const tanodData = doc.data();
            const row = tanodList.insertRow();
            
            const nameCell = row.insertCell(0);
            const contactCell = row.insertCell(1);

            nameCell.textContent = tanodData.tanodName || 'N/A';
            contactCell.textContent = tanodData.contactNo || 'N/A';
        });

        console.log("Finished processing documents");
    } catch (error) {
        console.error("Error fetching tanod data:", error);
    }
}

function openAddTanodPopup() {
    const popup = document.createElement('div');
    popup.className = 'popup';
    popup.innerHTML = `
        <div class="popup-content">
            <button id="closeButton" class="close-button">&times;</button>
            <h2>Add New Tanod</h2>
            <div class="tanod-input">
            <input type="text" id="tanodName" placeholder="Full Name" required>
            <input type="text" id="tanodAddress" placeholder="Address">
            <input type="tel" id="tanodContact" placeholder="Contact Number">
        </div>
            <div class="button-container">
                <button id="saveButton" class="action-button save-button">Save</button>
                <button id="cancelButton" class="action-button cancel-button">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById('saveButton').addEventListener('click', saveTanod);
    document.getElementById('cancelButton').addEventListener('click', closePopup);
    document.getElementById('closeButton').addEventListener('click', closePopup);
}

function closePopup() {
    const popup = document.querySelector('.popup');
    if (popup) {
        document.body.removeChild(popup);
    }
}

async function saveTanod() {
    const name = document.getElementById('tanodName').value;
    const address = document.getElementById('tanodAddress').value;
    const contact = document.getElementById('tanodContact').value;

    if (!name || !address || !contact) {
        alert('Please fill in all fields');
        return;
    }

    try {
        await addDoc(collection(db, "tanod"), {
            tanodName: name,
            address: address,
            contactNo: contact
        });
        alert('Tanod added successfully');
        closePopup();
        fetchAndDisplayTanodNames(); // Refresh the table
    } catch (error) {
        console.error("Error adding tanod: ", error);
        alert('Error adding tanod. Please try again.');
    }
}

// ####### CREATE SCHED POPUP #######

async function openCreateSchedulePopup() {
    const popup = document.createElement('div');
    popup.className = 'popup';
    
    // Fetch tanod data
    const tanodSnapshot = await getDocs(collection(db, "tanod"));
    let tanodRows = '';
    tanodSnapshot.forEach((doc) => {
        const tanod = doc.data();
        tanodRows += `
            <tr>
                <td>${tanod.tanodName}</td>
                <td>${tanod.contactNo}</td>
                <td><input type="checkbox" name="selectedTanod" value="${doc.id}" data-name="${tanod.tanodName}" data-contact="${tanod.contactNo}"></td>
            </tr>
        `;
    });

    popup.innerHTML = `
        <div class="popup-content schedule-popup">
            <button id="closeButton" class="close-button">&times;</button>
            <h2>Create a Schedule</h2>
            <div class="schedule-input">
                <input type="date" id="startDate" required>
                <input type="time" id="startTime" required>
                <input type="date" id="endDate" required>
                <input type="time" id="endTime" required>
                <input type="text" id="area" placeholder="Patrol Area" required>
            </div>
            <div class="tanod-table-container">
                <table id="tanodTable">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Contact #</th>
                            <th>Select</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tanodRows}
                    </tbody>
                </table>
            </div>
            <div class="button-container">
                <button id="saveScheduleButton" class="action-button save-button">Save Schedule</button>
                <button id="cancelButton" class="action-button cancel-button">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);

    document.getElementById('closeButton').addEventListener('click', closePopup);
    document.getElementById('cancelButton').addEventListener('click', closePopup);
    document.getElementById('saveScheduleButton').addEventListener('click', saveSchedule);
}

async function saveSchedule() {
    const startDate = document.getElementById('startDate').value;
    const startTime = document.getElementById('startTime').value;
    const endDate = document.getElementById('endDate').value;
    const endTime = document.getElementById('endTime').value;
    const area = document.getElementById('area').value;
    
    const selectedTanods = Array.from(document.querySelectorAll('input[name="selectedTanod"]:checked'))
        .map(checkbox => ({
            id: checkbox.value,
            name: checkbox.dataset.name,
            contact: checkbox.dataset.contact
        }));

    if (!startDate || !startTime || !endDate || !endTime || !area || selectedTanods.length === 0) {
        alert('Please fill in all fields and select at least one tanod.');
        return;
    }

    try {
        const scheduleData = {
            startDate,
            startTime,
            endDate,
            endTime,
            area,
            tanods: selectedTanods
        };

        await addDoc(collection(db, "tanod_schedule"), scheduleData);
        alert('Schedule created successfully!');
        closePopup();
        fetchAndDisplaySchedule(); // Refresh the schedule table
    } catch (error) {
        console.error('Error saving schedule:', error);
        alert('Error creating schedule. Please try again.');
    }
}

async function fetchAndDisplaySchedule() {
    try {
        const scheduleSnapshot = await getDocs(collection(db, "tanod_schedule"));
        const schedTable = document.getElementById("schedTable").getElementsByTagName('tbody')[0];
        
        schedTable.innerHTML = '';

        scheduleSnapshot.forEach((doc) => {
            const schedData = doc.data();
            schedData.tanods.forEach(tanod => {
                const row = schedTable.insertRow();
                
                row.insertCell(0).textContent = tanod.name;
                row.insertCell(1).textContent = `${schedData.startDate} ${schedData.startTime}`;
                row.insertCell(2).textContent = `${schedData.endDate} ${schedData.endTime}`;
                row.insertCell(3).textContent = `${schedData.startTime} - ${schedData.endTime}`;
                row.insertCell(4).textContent = schedData.area;
                row.insertCell(5).textContent = tanod.contact;
                row.insertCell(6).textContent = ''; // Remarks (empty for now)
            });
        });
    } catch (error) {
        console.error("Error fetching schedule data:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayTanodNames();
    fetchAndDisplaySchedule();
    document.querySelector('.add-tanod-button').addEventListener('click', openAddTanodPopup);
    document.querySelector('.add-sched-button').addEventListener('click', openCreateSchedulePopup);
});


// document.addEventListener('DOMContentLoaded', () => {
//     fetchAndDisplayTanodNames();
//     document.querySelector('.add-tanod-button').addEventListener('click', openAddTanodPopup);
// });

// document.addEventListener('DOMContentLoaded', () => {
//     document.querySelector('.add-sched-button').addEventListener('click', openCreateSchedulePopup);
// });

export { fetchAndDisplayTanodNames, openAddTanodPopup, openCreateSchedulePopup, fetchAndDisplaySchedule  };