document.addEventListener("DOMContentLoaded", function () {
  // Attach click listeners to all tabs
  document.querySelectorAll(".tab-link").forEach((tab) => {
    tab.addEventListener("click", function (event) {
      event.preventDefault(); // Prevent default link behavior

      // Remove 'active' class from all tabs
      document
        .querySelectorAll(".tab-link")
        .forEach((link) => link.classList.remove("active"));

      // Hide all tab bodies and their popups
      document.querySelectorAll(".tab-body").forEach((tabBody) => {
        tabBody.classList.remove("active");
        tabBody.style.display = "none";

        const popup = tabBody.querySelector(".popup");
        if (popup) popup.style.display = "none"; // Hide the popup if it exists
      });

      // Add 'active' class to clicked tab and show corresponding tab body
      this.classList.add("active");
      const targetSelector = this.getAttribute("href");
      const target = document.querySelector(targetSelector);
      if (target) {
        target.classList.add("active");
        target.style.display = "block"; // Show the active tab body

        // Show associated popup, if any
        const popup = target.querySelector(".popup");
        if (popup) popup.style.display = "block";
      } else {
        console.warn(`No tab body found for selector: ${targetSelector}`);
      }
    });
  });

  // Event listener for closing popups
  document.querySelectorAll(".close-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const popup = this.closest(".popup"); // Find the closest popup
      if (popup) {
        popup.style.display = "none"; // Hide the popup
      }
    });
  });
});

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDp03_t7kWck8XTT9iqv3SIX8UqFp_C6w",
  authDomain: "bims-9aaa7.firebaseapp.com",
  projectId: "bims-9aaa7",
  storageBucket: "bims-9aaa7.appspot.com",
  messagingSenderId: "323333588672",
  appId: "1:323333588672:web:16775be162a67673004f25",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

////////////////////////////////////////////////////////////////////////////////// BHC FUNCTION

// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", async function () {
  // Get all necessary elements
  const addButton = document.getElementById("bhc-add-btn");
  const newRecordButton = document.getElementById("bhc-addnew-btn");
  const addRecordButton = document.getElementById("bhc-add-record-btn");
  const popup = document.getElementById("bhc-schedulePopup");
  const closeBtn = document.querySelector(".bhc-close-btn");
  const form = document.getElementById("bhc-healthRecordForm");
  const userSearchDropdown = document.getElementById("bhc-user-search");
  const userSearchInput = document.getElementById("bhc-user-search-input");

  // Function to open popup
  function openPopup() {
    console.log("Opening popup...");
    popup.style.display = "block";
    document.getElementById("bhc-record-date").valueAsDate = new Date();
  }

  // Function to close popup
  function closePopup() {
    console.log("Closing popup...");
    popup.style.display = "none";
    form.reset();
  }

  // Add click event listeners for popup and form buttons
  addButton.addEventListener("click", openPopup);
  closeBtn.addEventListener("click", closePopup);

  // Close popup when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === popup) {
      closePopup();
    }
  });

  // Debounce function to limit rapid-fire API calls
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

  // Create a cache to store user data
  let userDataCache = new Map();

  // Function to fetch and cache user data
  async function fetchAndCacheUserData(userId) {
    if (userDataCache.has(userId)) {
      return userDataCache.get(userId);
    }

    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const fullName = `${userData.firstName} ${
        userData.middleName ? userData.middleName + " " : ""
      }${userData.lastName}`;
      const userInfo = {
        fullName,
        birthdate: userData.birthdate || "N/A",
        email: userData.email || "N/A",
        phone: userData.phone || "N/A",
      };
      userDataCache.set(userId, userInfo);
      return userInfo;
    }
    return null;
  }

  // Unified function to display health records
  async function displayHealthRecords(searchTerm = "") {
    try {
      const tbody = document.getElementById("bhc-healthRecordsList");
      tbody.innerHTML = ""; // Clear existing records

      // Convert search term to lowercase for case-insensitive comparison
      searchTerm = searchTerm.toLowerCase().trim();

      // Get all BHC documents in one query
      const healthRecordsSnapshot = await getDocs(collection(db, "BHC"));

      // Create an array to store all records before displaying
      const allRecords = [];

      // Process each document and collect records
      for (const docSnapshot of healthRecordsSnapshot.docs) {
        const data = docSnapshot.data();
        const healthRecords = data.healthRecords || [];
        const residentId = docSnapshot.id;

        // Fetch user data
        const userData = await fetchAndCacheUserData(residentId);
        if (!userData) continue;

        // Add each record to our collection with user data
        healthRecords.forEach((record) => {
          allRecords.push({
            fullName: userData.fullName,
            birthdate: userData.birthdate,
            ...record,
          });
        });
      }

      // Sort records by date (most recent first)
      allRecords.sort(
        (a, b) => new Date(b.dateService) - new Date(a.dateService)
      );

      // Filter and display records
      allRecords.forEach((record) => {
        const matchesSearch =
          record.fullName.toLowerCase().includes(searchTerm) ||
          record.birthdate.toLowerCase().includes(searchTerm) ||
          record.recordType.toLowerCase().includes(searchTerm) ||
          record.dateService.toLowerCase().includes(searchTerm) ||
          record.description.toLowerCase().includes(searchTerm);

        if (matchesSearch || searchTerm === "") {
          const row = tbody.insertRow();

          // Add cells in order
          [
            record.fullName,
            record.birthdate,
            record.recordType,
            record.dateService,
            record.description,
          ].forEach((text) => {
            const cell = row.insertCell();
            cell.textContent = text;
          });
        }
      });
    } catch (error) {
      console.error("Error displaying health records:", error);
    }
  }

  // Create debounced version of the display function for search
  const debouncedDisplay = debounce((searchTerm) => {
    displayHealthRecords(searchTerm);
  }, 500);

  // Add event listener to search box
  const searchBox = document.getElementById("bhc-search-box");
  searchBox.addEventListener("input", (e) => {
    debouncedDisplay(e.target.value);
  });

  // Store all resident data for filtering
  let residentsData = [];

  // Fetch all residents and populate the dropdown
  async function populateResidentDropdown() {
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const fullName = `${userData.firstName} ${
          userData.middleName ? userData.middleName + " " : ""
        }${userData.lastName}`;
        const birthdate = userData.birthdate || "N/A";

        // Store the data in array for filtering
        residentsData.push({
          id: doc.id,
          fullName,
          birthdate,
        });

        // Create dropdown option
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = `${fullName} (DOB: ${birthdate})`;
        userSearchDropdown.appendChild(option);
      });
    } catch (error) {
      console.error("Error fetching residents for dropdown:", error);
      alert("Failed to load resident list. Please try again.");
    }
  }

  // Filter dropdown based on input
  userSearchInput.addEventListener("input", function () {
    const searchQuery = userSearchInput.value.toLowerCase().trim();
    const filteredResidents = residentsData.filter((resident) => {
      const fullNameLower = resident.fullName.toLowerCase();
      const birthdateLower = resident.birthdate.toLowerCase();
      return (
        fullNameLower.includes(searchQuery) ||
        birthdateLower.includes(searchQuery)
      );
    });

    // Clear and repopulate dropdown with filtered results
    userSearchDropdown.innerHTML = `<option value="" disabled selected>Select Resident (name, birthdate)</option>`;
    filteredResidents.forEach((resident) => {
      const option = document.createElement("option");
      option.value = resident.id;
      option.textContent = `${resident.fullName} (DOB: ${resident.birthdate})`;
      userSearchDropdown.appendChild(option);
    });
  });

  // Populate form with resident data on selection
  userSearchDropdown.addEventListener("change", async function () {
    const selectedResidentID = userSearchDropdown.value;
    if (!selectedResidentID) return;

    try {
      const userData = await fetchAndCacheUserData(selectedResidentID);
      if (!userData) {
        alert("Resident not found.");
        return;
      }

      // Populate form fields
      document.getElementById("bhc-resident-id").value = selectedResidentID;
      document.getElementById("bhc-resident-name").value = userData.fullName;
      document.getElementById("bhc-resident-email").value = userData.email;
      document.getElementById("bhc-resident-phone").value = userData.phone;
    } catch (error) {
      console.error("Error populating resident details:", error);
      alert("Error loading resident details. Please try again.");
    }
  });

  // Validate resident ID
  async function validateResidentID(residentID) {
    const userDoc = await getDoc(doc(db, "users", residentID));
    return userDoc.exists();
  }

  // Add health record for existing resident
  async function addHealthRecord() {
    const residentID = userSearchDropdown.value; // Get resident ID
    const dateService = document.getElementById("bhc-record-date").value;
    const recordType = document.getElementById("bhc-record-type").value;
    const description = document.getElementById("bhc-record-description").value;

    if (!residentID || !dateService || !recordType || !description) {
      alert("Please fill out all required fields.");
      return;
    }

    if (!(await validateResidentID(residentID))) {
      alert("Resident ID does not exist in the users collection.");
      return;
    }

    try {
      const recordsRef = doc(db, "BHC", residentID); // Use resident ID as document name
      const recordDoc = await getDoc(recordsRef);

      if (recordDoc.exists()) {
        const healthRecord = {
          recordType,
          dateService,
          description,
          timestamp: new Date(),
        };

        await updateDoc(recordsRef, {
          healthRecords: arrayUnion(healthRecord), // Add record to the array
        });

        await displayHealthRecords(""); // Refresh display
        closePopup();
      } else {
        alert("No existing health records. Please select 'New Record'.");
      }
    } catch (error) {
      console.error("Error adding health record:", error);
      alert("Failed to add health record.");
    }
  }

  // Add new health record for new resident
  async function addNewHealthRecord() {
    const residentID = userSearchDropdown.value; // Get resident ID
    const dateService = document.getElementById("bhc-record-date").value;
    const recordType = document.getElementById("bhc-record-type").value;
    const description = document.getElementById("bhc-record-description").value;

    if (!residentID || !dateService || !recordType || !description) {
      alert("Please fill out all required fields.");
      return;
    }

    if (!(await validateResidentID(residentID))) {
      alert("Resident ID does not exist in the users collection.");
      return;
    }

    try {
      const recordsRef = doc(db, "BHC", residentID); // Use resident ID as document name
      const recordDoc = await getDoc(recordsRef);

      if (!recordDoc.exists()) {
        const newHealthRecord = {
          recordType,
          dateService,
          description,
          timestamp: new Date(),
        };

        await setDoc(recordsRef, {
          healthRecords: [newHealthRecord], // Initialize healthRecords array
        });

        await displayHealthRecords(""); // Refresh display
        closePopup();
      } else {
        alert(
          "This resident already has health records. Please select 'Add Record'."
        );
      }
    } catch (error) {
      console.error("Error adding new health record:", error);
      alert("Failed to add new health record.");
    }
  }

  // Attach event listeners to buttons
  addRecordButton.addEventListener("click", function (e) {
    e.preventDefault();
    addHealthRecord();
  });

  newRecordButton.addEventListener("click", function (e) {
    e.preventDefault();
    addNewHealthRecord();
  });

  // Initialize the page
  await populateResidentDropdown();
  await displayHealthRecords("");
});

////////////////////////////////////////////////////////////////////////////////// BPOC FUNCTION

// Function to filter Tanod list based on user input
function searchTanodList() {
  const searchInput = document
    .getElementById("searchTanodInput")
    .value.toLowerCase();
  const tanodListRows = document.querySelectorAll("#tanod-list tbody tr");

  tanodListRows.forEach((row) => {
    const name = row.cells[0].textContent.toLowerCase();
    const contact = row.cells[1].textContent.toLowerCase();
    const address = row.cells[2].textContent.toLowerCase();

    // Check if the search input matches any of the Tanod's fields
    if (
      name.includes(searchInput) ||
      contact.includes(searchInput) ||
      address.includes(searchInput)
    ) {
      row.style.display = ""; // Show row
    } else {
      row.style.display = "none"; // Hide row
    }
  });
}

// Function to filter Tanod schedule based on user input
function searchTanodSchedule() {
  const searchInput = document
    .querySelector(".tanodsched-search-input")
    .value.toLowerCase();
  const scheduleRows = document.querySelectorAll("#schedTable tbody tr");

  scheduleRows.forEach((row) => {
    const tanodName = row.cells[0].textContent.toLowerCase();
    const startDate = row.cells[1].textContent.toLowerCase();
    const endDate = row.cells[2].textContent.toLowerCase();
    const area = row.cells[4].textContent.toLowerCase();

    // Check if the search input matches any of the schedule fields
    if (
      tanodName.includes(searchInput) ||
      startDate.includes(searchInput) ||
      endDate.includes(searchInput) ||
      area.includes(searchInput)
    ) {
      row.style.display = ""; // Show row
    } else {
      row.style.display = "none"; // Hide row
    }
  });
}

// Attach search functions to the input fields
document
  .getElementById("searchTanodInput")
  .addEventListener("input", searchTanodList);
document
  .querySelector(".tanodsched-search-input")
  .addEventListener("input", searchTanodSchedule);

async function fetchAndDisplayTanodNames() {
  try {
    console.log("Fetching tanod names...");
    const tanodSnapshot = await getDocs(collection(db, "tanod"));
    console.log("Snapshot received:", tanodSnapshot);

    const tanodList = document
      .getElementById("tanod-list")
      .getElementsByTagName("tbody")[0];

    tanodList.innerHTML = ""; // Clear previous rows

    tanodSnapshot.forEach((doc) => {
      console.log("Processing document:", doc.id, doc.data());
      const tanodData = doc.data();
      const row = tanodList.insertRow();

      // Set the row id to match the Tanod's ID
      row.id = `tanod-${doc.id}`; // Ensure each row has a unique ID

      const nameCell = row.insertCell(0);
      const contactCell = row.insertCell(1);
      const addressCell = row.insertCell(2);
      const actionsCell = row.insertCell(3);

      nameCell.textContent = tanodData.tanodName || "N/A";
      contactCell.textContent = tanodData.contactNo || "N/A";
      addressCell.textContent = tanodData.address || "N/A";

      // Add Edit and Delete buttons
      const editButton = document.createElement("button");
      editButton.textContent = "Edit";
      editButton.className = "edit-button";
      editButton.onclick = () => openEditTanodPopup(doc.id, tanodData);

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.className = "delete-button";
      deleteButton.onclick = () => deleteTanod(doc.id);

      actionsCell.appendChild(editButton);
      actionsCell.appendChild(deleteButton);
    });

    console.log("Finished processing documents");
  } catch (error) {
    console.error("Error fetching tanod data:", error);
  }
}

function openEditTanodPopup(tanodId, tanodData) {
  const popup = document.createElement("div");
  popup.className = "popup";
  popup.innerHTML = `
        <div class="popup-content">
            <button id="closeButton" class="close-button">&times;</button>
            <h2>Edit Tanod</h2>
            <div class="tanod-input">
                <input type="text" id="editTanodName" placeholder="Full Name" value="${
                  tanodData.tanodName || ""
                }" required>
                <input type="text" id="editTanodAddress" placeholder="Address" value="${
                  tanodData.address || ""
                }">
                <input type="tel" id="editTanodContact" placeholder="Contact Number" value="${
                  tanodData.contactNo || ""
                }">
            </div>
            <div class="button-container">
                <button id="updateButton" class="action-button save-button">Update</button>
                <button id="cancelButton" class="action-button cancel-button">Cancel</button>
            </div>
        </div>
    `;
  document.body.appendChild(popup);

  document
    .getElementById("updateButton")
    .addEventListener("click", () => updateTanod(tanodId));
  document.getElementById("cancelButton").addEventListener("click", closePopup);
  document.getElementById("closeButton").addEventListener("click", closePopup);
}

async function updateTanod(tanodId) {
  const name = document.getElementById("editTanodName").value;
  const address = document.getElementById("editTanodAddress").value;
  const contact = document.getElementById("editTanodContact").value;

  if (!name || !address || !contact) {
    alert("Please fill in all fields");
    return;
  }

  try {
    // Step 1: Update Tanod in the Firestore
    await updateDoc(doc(db, "tanod", tanodId), {
      tanodName: name,
      address: address,
      contactNo: contact,
    });

    // Step 2: Update Tanod name in all schedules where this Tanod is assigned
    const scheduleSnapshot = await getDocs(collection(db, "tanod_schedule"));
    const updateSchedulePromises = [];

    scheduleSnapshot.forEach((scheduleDoc) => {
      const scheduleData = scheduleDoc.data();
      const tanodsAssigned = scheduleData.tanods;

      // Find the Tanod in the assigned Tanods array
      tanodsAssigned.forEach((tanod) => {
        if (tanod.id === tanodId) {
          // Update the tanodName in the schedule
          tanod.name = name; // Update the tanod name in the schedule entry
          updateSchedulePromises.push(
            updateDoc(doc(db, "tanod_schedule", scheduleDoc.id), {
              tanods: tanodsAssigned, // Update the whole array of assigned Tanods
            })
          );
        }
      });
    });

    // Wait for all schedule updates to complete
    await Promise.all(updateSchedulePromises);

    // Step 3: Update the row in the Tanod table
    const tanodRow = document.querySelector(`#tanod-${tanodId}`);
    if (tanodRow) {
      tanodRow.cells[0].textContent = name; // Update name
      tanodRow.cells[1].textContent = contact; // Update contact
      tanodRow.cells[2].textContent = address; // Update address
    }

    // Step 4: Update the schedule table with new Tanod name
    const scheduleTableRows = document.querySelectorAll(`#schedTable tbody tr`);
    scheduleTableRows.forEach((row) => {
      const tanodCell = row.cells[0];
      if (tanodCell && tanodCell.textContent === tanodId) {
        tanodCell.textContent = name; // Update the name in the schedule table
      }
    });

    alert("Tanod updated successfully");
    closePopup(); // Close the popup/modal after update
    fetchAndDisplayTanodNames(); // Refresh the Tanod list
    fetchAndDisplaySchedule(); // Refresh the Schedule list
  } catch (error) {
    console.error("Error updating tanod and schedules: ", error);
    alert("Error updating tanod. Please try again.");
  }
}

async function deleteTanod(tanodId) {
  if (
    confirm(
      "Are you sure you want to delete this tanod and remove it from all its assigned schedules?"
    )
  ) {
    try {
      // Step 1: Delete the tanod from the tanod collection
      await deleteDoc(doc(db, "tanod", tanodId));
      console.log(`Tanod ${tanodId} deleted successfully`);

      // Step 2: Find and update schedules assigned to this tanod
      const schedulesSnapshot = await getDocs(collection(db, "tanod_schedule"));
      const updatePromises = [];

      schedulesSnapshot.forEach((scheduleDoc) => {
        const scheduleData = scheduleDoc.data();
        const tanodsAssigned = scheduleData.tanods;

        // Step 3: Check if the tanod is part of this schedule
        const tanodIndex = tanodsAssigned.findIndex(
          (tanod) => tanod.id === tanodId
        );
        if (tanodIndex !== -1) {
          // Remove the deleted tanod from the schedule's tanods array
          tanodsAssigned.splice(tanodIndex, 1);

          // Step 4: If there are still tanods left in the schedule, update the schedule
          if (tanodsAssigned.length > 0) {
            updatePromises.push(
              updateDoc(doc(db, "tanod_schedule", scheduleDoc.id), {
                tanods: tanodsAssigned,
              })
            );
          } else {
            // If no Tanods are left, delete the schedule
            updatePromises.push(
              deleteDoc(doc(db, "tanod_schedule", scheduleDoc.id))
            );
          }
        }
      });

      // Step 5: Wait for all updates and deletions to complete
      await Promise.all(updatePromises);

      alert("Tanod deleted and removed from its assigned schedules.");
      fetchAndDisplayTanodNames(); // Refresh the Tanod list
      fetchAndDisplaySchedule(); // Refresh the Schedule list
    } catch (error) {
      console.error("Error deleting tanod and updating schedules:", error);
      alert("Error deleting tanod and updating schedules. Please try again.");
    }
  }
}

// Keep existing functions unchanged
function openAddTanodPopup() {
  const popup = document.createElement("div");
  popup.className = "popup";
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

  document.getElementById("saveButton").addEventListener("click", saveTanod);
  document.getElementById("cancelButton").addEventListener("click", closePopup);
  document.getElementById("closeButton").addEventListener("click", closePopup);
}

function closePopup() {
  const popup = document.querySelector(".popup");
  if (popup) {
    document.body.removeChild(popup);
  }
}

async function initializeTanodCounter() {
  const counterRef = doc(db, "counters", "tanodCounter");

  const counterDoc = await getDoc(counterRef);
  if (!counterDoc.exists()) {
    await setDoc(counterRef, { lastUsedId: 0 });
    console.log("Tanod counter initialized.");
  } else {
    console.log("Counter document already exists.");
  }
}

async function saveTanod() {
  const name = document.getElementById("tanodName").value;
  const address = document.getElementById("tanodAddress").value;
  const contact = document.getElementById("tanodContact").value;

  if (!name || !address || !contact) {
    alert("Please fill in all fields");
    return;
  }

  try {
    const counterRef = doc(db, "counters", "tanodCounter");
    const counterDoc = await getDoc(counterRef);

    console.log("Counter Document:", counterDoc.data());

    if (counterDoc.exists()) {
      const currentId = counterDoc.data().lastUsedId;
      const incrementedId = (typeof currentId === "number" ? currentId : 0) + 1;
      const newTanodId = `Tanod-${String(incrementedId).padStart(4, "0")}`;
      console.log("New Tanod ID:", newTanodId);

      await setDoc(doc(db, "tanod", newTanodId), {
        tanodName: name,
        address: address,
        contactNo: contact,
      });

      await updateDoc(counterRef, { lastUsedId: incrementedId });

      alert("Tanod added successfully");
      closePopup();
      fetchAndDisplayTanodNames();
    } else {
      alert("Counter document does not exist. Please initialize it.");
    }
  } catch (error) {
    console.error("Error adding tanod: ", error);
    alert("Error adding tanod. Please try again.");
  }
}

// Initialize the counter when the application starts
initializeTanodCounter();

// ####### CREATE SCHED POPUP #######

async function openCreateSchedulePopup() {
  const popup = document.createElement("div");
  popup.className = "popup";

  // Fetch tanod data
  const tanodSnapshot = await getDocs(collection(db, "tanod"));
  let tanodRows = "";
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
                <label for="startDate">Date Start:</label>
                <input type="date" id="startDate" required>
                <label for="startTime">Start Time:</label>
                <input type="text" id="startTime" value="10:00 PM" readonly>
                <label for="endDate">Date End:</label>
                <input type="date" id="endDate" readonly>
                <label for="endTime">End Time:</label>
                <input type="text" id="endTime" value="04:00 AM" readonly>
                <label for="area">Patrol Area:</label>
                <select id="area" required>
                    <option value="">Select...</option>
                    <option value="Purok 1">Purok 1</option>
                    <option value="Purok 2">Purok 2</option>
                    <option value="Purok 3">Purok 3</option>
                    <option value="Purok 4">Purok 4</option>
                </select>
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

  // Event listeners
  document.getElementById("closeButton").addEventListener("click", closePopup);
  document.getElementById("cancelButton").addEventListener("click", closePopup);
  document
    .getElementById("saveScheduleButton")
    .addEventListener("click", saveSchedule);

  // Automatically adjust the end date based on the start date
  document
    .getElementById("startDate")
    .addEventListener("change", updateEndDate);

  // Set minimum start date to today to prevent selecting past dates
  setMinStartDate();
}

// Function to set the minimum start date to today
function setMinStartDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // months are 0-indexed
  const day = String(today.getDate()).padStart(2, "0");
  const minDate = `${year}-${month}-${day}`; // Format date as YYYY-MM-DD

  document.getElementById("startDate").setAttribute("min", minDate); // Set the min attribute on the start date input
}

function updateEndDate() {
  const startDate = document.getElementById("startDate").value;
  if (startDate) {
    // Create a new Date object based on the start date
    const start = new Date(startDate);
    // Add one day to the start date to calculate the end date
    start.setDate(start.getDate() + 1);
    // Format the end date to YYYY-MM-DD
    const endDate = start.toISOString().split("T")[0];
    document.getElementById("endDate").value = endDate; // Update the end date field
  }
}

async function initializeScheduleCounter() {
  const counterRef = doc(db, "counters", "scheduleCounter");

  const counterDoc = await getDoc(counterRef);
  if (!counterDoc.exists()) {
    await setDoc(counterRef, { lastUsedId: 0 }); // Set initial counter to 0
    console.log("Schedule counter initialized.");
  } else {
    console.log("Schedule counter document already exists.");
  }
}

// Call this function once at the start of your application
initializeScheduleCounter();

async function saveSchedule() {
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const area = document.getElementById("area").value;

  const selectedTanods = Array.from(
    document.querySelectorAll('input[name="selectedTanod"]:checked')
  ).map((checkbox) => ({
    id: checkbox.value,
    name: checkbox.dataset.name,
    contact: checkbox.dataset.contact,
  }));

  if (!startDate || !endDate || !area || selectedTanods.length === 0) {
    alert("Please fill in all fields and select at least one tanod.");
    return;
  }

  // Convert dates to Date objects for comparison
  const startDateTime = new Date(`${startDate}T22:00`); // Fixed start time at 10:00 PM
  const endDateTime = new Date(`${endDate}T04:00`); // Fixed end time at 4:00 AM

  // Validate that start date is before end date
  if (startDateTime >= endDateTime) {
    alert("The end date must be later than the start date.");
    return;
  }

  try {
    // Get the current schedule counter value
    const counterRef = doc(db, "counters", "scheduleCounter");
    const counterDoc = await getDoc(counterRef);

    if (counterDoc.exists()) {
      const currentId = counterDoc.data().lastUsedId + 1; // Increment ID
      const newScheduleId = `PATROL-${String(currentId).padStart(5, "0")}`; // Format ID

      // Create the schedule data with fixed times
      const scheduleData = {
        scheduleId: newScheduleId, // Add the new ID here
        startDate: startDate, // User selected start date
        startTime: "22:00", // Fixed time: 10:00 PM
        endDate: endDate, // User selected end date
        endTime: "04:00", // Fixed time: 4:00 AM
        area,
        tanods: selectedTanods,
      };

      // Save the schedule document with the generated ID
      await addDoc(collection(db, "tanod_schedule"), scheduleData);

      // Update the counter with the new last used ID
      await updateDoc(counterRef, { lastUsedId: currentId });

      alert("Schedule created successfully!");
      closePopup();
      fetchAndDisplaySchedule(); // Refresh the schedule table
    } else {
      alert("Counter document does not exist. Please initialize it.");
    }
  } catch (error) {
    console.error("Error saving schedule:", error);
    alert("Error creating schedule. Please try again.");
  }
}

async function fetchAndDisplaySchedule() {
  try {
    const scheduleSnapshot = await getDocs(collection(db, "tanod_schedule"));
    const schedTable = document
      .getElementById("schedTable")
      .getElementsByTagName("tbody")[0];

    // Clear existing rows
    schedTable.innerHTML = "";

    // Current date and time
    const now = new Date();

    // Loop through each schedule document
    for (const scheduleDoc of scheduleSnapshot.docs) {
      const schedData = scheduleDoc.data();

      // Convert endDate and endTime to a Date object
      const endDateTime = new Date(`${schedData.endDate}T${schedData.endTime}`);

      // Check if the schedule has expired
      if (now > endDateTime) {
        await expireSchedule(scheduleDoc.id); // Mark as expired in the database
        continue; // Skip expired schedules in the display
      }

      // Loop through each tanod ID in the schedule
      for (const tanodRef of schedData.tanods) {
        const tanodDoc = await getDoc(doc(db, "tanod", tanodRef.id));

        if (tanodDoc.exists()) {
          const tanod = tanodDoc.data();

          // Create a new row for each tanod in the schedule entry
          const row = schedTable.insertRow();
          row.insertCell(0).textContent = tanod.tanodName;
          row.insertCell(1).textContent = `${schedData.startDate}`;
          row.insertCell(2).textContent = `${schedData.endDate}`;
          row.insertCell(3).textContent = `${formatTime(
            schedData.startTime
          )} - ${formatTime(schedData.endTime)}`;
          row.insertCell(4).textContent = schedData.area;
          row.insertCell(5).textContent = tanod.contactNo;
        }
      }
    }
  } catch (error) {
    console.error("Error fetching schedule data:", error);
  }
}

// Function to mark the schedule as expired in the database
async function expireSchedule(scheduleId) {
  try {
    const scheduleRef = doc(db, "tanod_schedule", scheduleId);
    await updateDoc(scheduleRef, { expired: true });
    console.log(`Schedule ${scheduleId} has been marked as expired.`);
  } catch (error) {
    console.error("Error marking schedule as expired:", error);
  }
}

// Helper function to format time from 24-hour to 12-hour format
function formatTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const isPM = hours >= 12;
  const formattedHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes; // Ensure minutes are always two digits
  return `${formattedHours}:${formattedMinutes} ${isPM ? "PM" : "AM"}`;
}

document.addEventListener("DOMContentLoaded", () => {
  fetchAndDisplayTanodNames();
  fetchAndDisplaySchedule();
  document
    .querySelector(".add-tanod-button")
    .addEventListener("click", openAddTanodPopup);
  document
    .querySelector(".add-sched-button")
    .addEventListener("click", openCreateSchedulePopup);
});

export {
  fetchAndDisplayTanodNames,
  openAddTanodPopup,
  openCreateSchedulePopup,
  fetchAndDisplaySchedule,
};

//////////////////////////////////////////////////////////////////////////////////// BDRRMC FUNCTION

// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", async function () {
  // Get all necessary elements for forms and popups
  const incidentAddBtn = document.getElementById("open-incident-form");
  const evacuationAddBtn = document.getElementById("open-evacuation-form");
  const reliefAddBtn = document.getElementById("open-relief-form");
  const incidentSearch = document.getElementById("bdrrmc-incidents-search");
  const evacuationSearch = document.getElementById("bdrrmc-evacuation-search");
  const reliefSearch = document.getElementById("bdrrmc-relief-search");

  // Initialize tabs
  showTab("bdrrmc-incidentsSection");

  const tabLinks = document.querySelectorAll(".inner-tab-link");
  tabLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const tabId = e.target.getAttribute("data-tab");
      showTab(tabId);
    });
  });

  // Tab switching function
  function showTab(tabId) {
    const allTabs = document.querySelectorAll(".tab-content");
    allTabs.forEach((tab) => {
      tab.style.display = "none";
    });
    const activeTab = document.getElementById(tabId);
    if (activeTab) activeTab.style.display = "block";

    const allTabLinks = document.querySelectorAll(".inner-tab-link");
    allTabLinks.forEach((link) => {
      link.classList.remove("active");
    });

    const activeTabLink = document.querySelector(`button[data-tab="${tabId}"]`);
    if (activeTabLink) activeTabLink.classList.add("active");
  }

  // Debounce function to limit rapid-fire API calls
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

  // Create debounced search functions
  const debouncedIncidentSearch = debounce((searchTerm) => {
    displayIncidents(searchTerm);
  }, 300);

  const debouncedEvacuationSearch = debounce((searchTerm) => {
    displayEvacuationCenters(searchTerm);
  }, 300);

  const debouncedReliefSearch = debounce((searchTerm) => {
    displayReliefGoods(searchTerm);
  }, 300);

  // Add event listeners for search
  incidentSearch.addEventListener("input", (e) => {
    debouncedIncidentSearch(e.target.value);
  });

  evacuationSearch.addEventListener("input", (e) => {
    debouncedEvacuationSearch(e.target.value);
  });

  reliefSearch.addEventListener("input", (e) => {
    debouncedReliefSearch(e.target.value);
  });

  // Add form submission handlers
  document
    .getElementById("bdrrmc-incidentForm")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = {
        date: document.getElementById("bdrrmc-incident-date").value,
        type: document.getElementById("bdrrmc-incident-type").value,
        location: document.getElementById("bdrrmc-incident-location").value,
        affectedFamilies: document.getElementById("bdrrmc-affected-families")
          .value,
        status: document.getElementById("bdrrmc-incident-status").value,
      };
      addNewIncident(formData);
    });

  document
    .getElementById("bdrrmc-evacuationForm")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = {
        name: document.getElementById("bdrrmc-evac-name").value,
        location: document.getElementById("bdrrmc-evac-location").value,
        capacity: document.getElementById("bdrrmc-evac-capacity").value,
        currentOccupants: document.getElementById("bdrrmc-current-occupants")
          .value,
        status: document.getElementById("bdrrmc-evac-status").value,
      };
      addNewEvacuationCenter(formData);
    });

  document
    .getElementById("bdrrmc-reliefForm")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = {
        name: document.getElementById("bdrrmc-item-name").value,
        quantity: document.getElementById("bdrrmc-quantity").value,
        unit: document.getElementById("bdrrmc-unit").value,
        status: document.getElementById("bdrrmc-relief-status").value,
      };
      addNewReliefGoods(formData);
    });

  // ============== INCIDENT REPORTS FUNCTIONS ==============

  async function displayIncidents(searchTerm = "") {
    try {
      const tbody = document
        .getElementById("bdrrmc-incidents-table")
        .getElementsByTagName("tbody")[0];
      tbody.innerHTML = "";

      const incidentsSnapshot = await getDocs(
        collection(db, "BDRRMC_Incidents")
      );
      const incidents = [];

      incidentsSnapshot.forEach((doc) => {
        incidents.push({ id: doc.id, ...doc.data() });
      });

      incidents.sort((a, b) => new Date(b.date) - new Date(a.date));

      incidents.forEach((incident) => {
        if (
          searchTerm === "" ||
          incident.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          incident.location.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          const row = tbody.insertRow();

          const cells = [
            incident.date,
            incident.type,
            incident.location,
            incident.affectedFamilies,
            incident.status,
          ].map((text) => {
            const cell = row.insertCell();
            cell.textContent = text;
            return cell;
          });

          // Modified action cell with both update and delete buttons
          const actionCell = row.insertCell();
          actionCell.className = "action-buttons";

          const updateBtn = document.createElement("button");
          updateBtn.textContent = "Update";
          updateBtn.onclick = () => updateIncident(incident.id);

          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "Delete";
          deleteBtn.className = "delete-btn";
          deleteBtn.onclick = () => deleteIncident(incident.id);

          actionCell.appendChild(updateBtn);
          actionCell.appendChild(deleteBtn);
        }
      });
    } catch (error) {
      console.error("Error displaying incidents:", error);
    }
  }

  // ============== EVACUATION CENTERS FUNCTIONS ==============

  async function displayEvacuationCenters(searchTerm = "") {
    try {
      const tbody = document
        .getElementById("bdrrmc-evacuation-table")
        .getElementsByTagName("tbody")[0];
      tbody.innerHTML = "";

      const centersSnapshot = await getDocs(
        collection(db, "BDRRMC_EvacuationCenters")
      );
      const centers = [];

      centersSnapshot.forEach((doc) => {
        centers.push({ id: doc.id, ...doc.data() });
      });

      centers.forEach((center) => {
        if (
          searchTerm === "" ||
          center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          center.location.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          const row = tbody.insertRow();

          const cells = [
            center.name,
            center.location,
            center.capacity,
            center.currentOccupants,
            center.status,
          ].map((text) => {
            const cell = row.insertCell();
            cell.textContent = text;
            return cell;
          });

          // Modified action cell with both update and delete buttons
          const actionCell = row.insertCell();
          actionCell.className = "action-buttons";

          const updateBtn = document.createElement("button");
          updateBtn.textContent = "Update";
          updateBtn.onclick = () => updateEvacuationCenter(center.id);

          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "Delete";
          deleteBtn.className = "delete-btn";
          deleteBtn.onclick = () => deleteEvacuationCenter(center.id);

          actionCell.appendChild(updateBtn);
          actionCell.appendChild(deleteBtn);
        }
      });
    } catch (error) {
      console.error("Error displaying evacuation centers:", error);
    }
  }

  // ============== RELIEF GOODS FUNCTIONS ==============

  async function displayReliefGoods(searchTerm = "") {
    try {
      const tbody = document
        .getElementById("bdrrmc-relief-table")
        .getElementsByTagName("tbody")[0];
      tbody.innerHTML = "";

      const goodsSnapshot = await getDocs(collection(db, "BDRRMC_ReliefGoods"));
      const goods = [];

      goodsSnapshot.forEach((doc) => {
        goods.push({ id: doc.id, ...doc.data() });
      });

      goods.forEach((item) => {
        if (
          searchTerm === "" ||
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          const row = tbody.insertRow();

          const cells = [item.name, item.quantity, item.unit, item.status].map(
            (text) => {
              const cell = row.insertCell();
              cell.textContent = text;
              return cell;
            }
          );

          // Modified action cell with both update and delete buttons
          const actionCell = row.insertCell();
          actionCell.className = "action-buttons";

          const updateBtn = document.createElement("button");
          updateBtn.textContent = "Update";
          updateBtn.onclick = () => updateReliefGoods(item.id);

          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "Delete";
          deleteBtn.className = "delete-btn";
          deleteBtn.onclick = () => deleteReliefGoods(item.id);

          actionCell.appendChild(updateBtn);
          actionCell.appendChild(deleteBtn);
        }
      });
    } catch (error) {
      console.error("Error displaying relief goods:", error);
    }
  }

  // ============== DELETE FUNCTIONS ==============

  // Add new delete functions
  async function deleteIncident(id) {
    if (confirm("Are you sure you want to delete this incident?")) {
      try {
        await deleteDoc(doc(db, "BDRRMC_Incidents", id));
        await displayIncidents("");
      } catch (error) {
        console.error("Error deleting incident:", error);
        alert("Failed to delete incident.");
      }
    }
  }

  async function deleteEvacuationCenter(id) {
    if (confirm("Are you sure you want to delete this evacuation center?")) {
      try {
        await deleteDoc(doc(db, "BDRRMC_EvacuationCenters", id));
        await displayEvacuationCenters("");
      } catch (error) {
        console.error("Error deleting evacuation center:", error);
        alert("Failed to delete evacuation center.");
      }
    }
  }

  async function deleteReliefGoods(id) {
    if (confirm("Are you sure you want to delete these relief goods?")) {
      try {
        await deleteDoc(doc(db, "BDRRMC_ReliefGoods", id));
        await displayReliefGoods("");
      } catch (error) {
        console.error("Error deleting relief goods:", error);
        alert("Failed to delete relief goods.");
      }
    }
  }

  // ============== ADD NEW RECORDS FUNCTIONS ==============

  async function addNewIncident(formData) {
    try {
      await addDoc(collection(db, "BDRRMC_Incidents"), {
        date: formData.date,
        type: formData.type,
        location: formData.location,
        affectedFamilies: formData.affectedFamilies,
        status: formData.status,
        timestamp: new Date(),
      });

      await displayIncidents("");
      closePopup("incident");
    } catch (error) {
      console.error("Error adding incident:", error);
      alert("Failed to add incident.");
    }
  }

  async function addNewEvacuationCenter(formData) {
    try {
      await addDoc(collection(db, "BDRRMC_EvacuationCenters"), {
        name: formData.name,
        location: formData.location,
        capacity: formData.capacity,
        currentOccupants: formData.currentOccupants,
        status: formData.status,
        timestamp: new Date(),
      });

      await displayEvacuationCenters("");
      closePopup("evacuation");
    } catch (error) {
      console.error("Error adding evacuation center:", error);
      alert("Failed to add evacuation center.");
    }
  }

  async function addNewReliefGoods(formData) {
    try {
      await addDoc(collection(db, "BDRRMC_ReliefGoods"), {
        name: formData.name,
        quantity: formData.quantity,
        unit: formData.unit,
        status: formData.status,
        timestamp: new Date(),
      });

      await displayReliefGoods("");
      closePopup("relief");
    } catch (error) {
      console.error("Error adding relief goods:", error);
      alert("Failed to add relief goods.");
    }
  }

  // ============== UPDATE FUNCTIONS ==============

  async function updateIncident(id) {
    try {
      const docRef = doc(db, "BDRRMC_Incidents", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // Update form header
        const formHeader = document.querySelector("#bdrrmc-incidentPopup h2");
        if (formHeader) formHeader.textContent = "Update Incident";

        // Populate form
        document.getElementById("bdrrmc-incident-date").value = data.date;
        document.getElementById("bdrrmc-incident-type").value = data.type;
        document.getElementById("bdrrmc-incident-location").value =
          data.location;
        document.getElementById("bdrrmc-affected-families").value =
          data.affectedFamilies;
        document.getElementById("bdrrmc-incident-status").value = data.status;

        // Show popup
        const popup = document.getElementById("bdrrmc-incidentPopup");
        if (popup) {
          popup.style.display = "block";

          // Update form submission handler
          const form = document.getElementById("bdrrmc-incidentForm");
          const newForm = form.cloneNode(true);
          form.parentNode.replaceChild(newForm, form);

          newForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const updateData = {
              date: document.getElementById("bdrrmc-incident-date").value,
              type: document.getElementById("bdrrmc-incident-type").value,
              location: document.getElementById("bdrrmc-incident-location")
                .value,
              affectedFamilies: document.getElementById(
                "bdrrmc-affected-families"
              ).value,
              status: document.getElementById("bdrrmc-incident-status").value,
              timestamp: new Date(),
            };

            await updateDoc(docRef, updateData);
            await displayIncidents("");
            closePopup("incident");
          });
        }
      }
    } catch (error) {
      console.error("Error updating incident:", error);
      alert("Failed to update incident.");
    }
  }

  async function updateEvacuationCenter(id) {
    try {
      const docRef = doc(db, "BDRRMC_EvacuationCenters", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // Update form header
        const formHeader = document.querySelector("#bdrrmc-evacuationPopup h2");
        if (formHeader) formHeader.textContent = "Update Evacuation Center";

        // Populate form
        document.getElementById("bdrrmc-evac-name").value = data.name;
        document.getElementById("bdrrmc-evac-location").value = data.location;
        document.getElementById("bdrrmc-evac-capacity").value = data.capacity;
        document.getElementById("bdrrmc-current-occupants").value =
          data.currentOccupants;
        document.getElementById("bdrrmc-evac-status").value = data.status;

        // Show popup
        const popup = document.getElementById("bdrrmc-evacuationPopup");
        if (popup) {
          popup.style.display = "block";

          // Update form submission handler
          const form = document.getElementById("bdrrmc-evacuationForm");
          const newForm = form.cloneNode(true);
          form.parentNode.replaceChild(newForm, form);

          newForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const updateData = {
              name: document.getElementById("bdrrmc-evac-name").value,
              location: document.getElementById("bdrrmc-evac-location").value,
              capacity: document.getElementById("bdrrmc-evac-capacity").value,
              currentOccupants: document.getElementById(
                "bdrrmc-current-occupants"
              ).value,
              status: document.getElementById("bdrrmc-evac-status").value,
              timestamp: new Date(),
            };

            await updateDoc(docRef, updateData);
            await displayEvacuationCenters("");
            closePopup("evacuation");
          });
        }
      }
    } catch (error) {
      console.error("Error updating evacuation center:", error);
      alert("Failed to update evacuation center.");
    }
  }

  async function updateReliefGoods(id) {
    try {
      const docRef = doc(db, "BDRRMC_ReliefGoods", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // Update form header
        const formHeader = document.querySelector("#bdrrmc-reliefPopup h2");
        if (formHeader) formHeader.textContent = "Update Relief Goods";

        // Populate form
        document.getElementById("bdrrmc-item-name").value = data.name;
        document.getElementById("bdrrmc-quantity").value = data.quantity;
        document.getElementById("bdrrmc-unit").value = data.unit;
        document.getElementById("bdrrmc-relief-status").value = data.status;

        // Show popup
        const popup = document.getElementById("bdrrmc-reliefPopup");
        if (popup) {
          popup.style.display = "block";

          // Update form submission handler
          const form = document.getElementById("bdrrmc-reliefForm");
          const newForm = form.cloneNode(true);
          form.parentNode.replaceChild(newForm, form);

          newForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const updateData = {
              name: document.getElementById("bdrrmc-item-name").value,
              quantity: document.getElementById("bdrrmc-quantity").value,
              unit: document.getElementById("bdrrmc-unit").value,
              status: document.getElementById("bdrrmc-relief-status").value,
              timestamp: new Date(),
            };

            await updateDoc(docRef, updateData);
            await displayReliefGoods("");
            closePopup("relief");
          });
        }
      }
    } catch (error) {
      console.error("Error updating relief goods:", error);
      alert("Failed to update relief goods.");
    }
  }

  // ============== POPUP MANAGEMENT ==============

  function closePopup(type) {
    const popup = document.getElementById(`bdrrmc-${type}Popup`);
    if (popup) {
      popup.style.display = "none";

      // Reset the header back to Add
      const formHeader = popup.querySelector("h2");
      if (formHeader) {
        switch (type) {
          case "incident":
            formHeader.textContent = "Add Incident";
            break;
          case "evacuation":
            formHeader.textContent = "Add Evacuation Center";
            break;
          case "relief":
            formHeader.textContent = "Add Relief Goods";
            break;
        }
      }

      // Reset form
      const form = document.getElementById(`bdrrmc-${type}Form`);
      if (form) {
        form.reset();

        // Reset to default add behavior
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        // Re-add the original add event listener based on type
        switch (type) {
          case "incident":
            newForm.addEventListener("submit", (e) => {
              e.preventDefault();
              const formData = {
                date: document.getElementById("bdrrmc-incident-date").value,
                type: document.getElementById("bdrrmc-incident-type").value,
                location: document.getElementById("bdrrmc-incident-location")
                  .value,
                affectedFamilies: document.getElementById(
                  "bdrrmc-affected-families"
                ).value,
                status: document.getElementById("bdrrmc-incident-status").value,
              };
              addNewIncident(formData);
            });
            break;

          case "evacuation":
            newForm.addEventListener("submit", (e) => {
              e.preventDefault();
              const formData = {
                name: document.getElementById("bdrrmc-evac-name").value,
                location: document.getElementById("bdrrmc-evac-location").value,
                capacity: document.getElementById("bdrrmc-evac-capacity").value,
                currentOccupants: document.getElementById(
                  "bdrrmc-current-occupants"
                ).value,
                status: document.getElementById("bdrrmc-evac-status").value,
              };
              addNewEvacuationCenter(formData);
            });
            break;

          case "relief":
            newForm.addEventListener("submit", (e) => {
              e.preventDefault();
              const formData = {
                name: document.getElementById("bdrrmc-item-name").value,
                quantity: document.getElementById("bdrrmc-quantity").value,
                unit: document.getElementById("bdrrmc-unit").value,
                status: document.getElementById("bdrrmc-relief-status").value,
              };
              addNewReliefGoods(formData);
            });
            break;
        }
      }
    }
  }

  // Setup close button event listeners
  const closeButtons = document.querySelectorAll(".bdrrmc-close-btn");
  closeButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const popup = this.closest("[id^='bdrrmc-'][id$='Popup']");
      if (popup) {
        const type = popup.id.replace("bdrrmc-", "").replace("Popup", "");
        closePopup(type);
      }
    });
  });

  // Add click outside popup to close
  window.addEventListener("click", (event) => {
    const popups = document.querySelectorAll("[id^='bdrrmc-'][id$='Popup']");
    popups.forEach((popup) => {
      if (event.target === popup) {
        const type = popup.id.replace("bdrrmc-", "").replace("Popup", "");
        closePopup(type);
      }
    });
  });

  // ============== INITIALIZE PAGE ==============

  // Display all data initially
  await displayIncidents("");
  await displayEvacuationCenters("");
  await displayReliefGoods("");

  // Add event listeners for add buttons
  incidentAddBtn.addEventListener("click", () => {
    const popup = document.getElementById("bdrrmc-incidentPopup");
    if (popup) popup.style.display = "block";
  });

  evacuationAddBtn.addEventListener("click", () => {
    const popup = document.getElementById("bdrrmc-evacuationPopup");
    if (popup) popup.style.display = "block";
  });

  reliefAddBtn.addEventListener("click", () => {
    const popup = document.getElementById("bdrrmc-reliefPopup");
    if (popup) popup.style.display = "block";
  });
});
