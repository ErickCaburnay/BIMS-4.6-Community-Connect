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
  
  ////////////////////////////////////////////////////////////////////////////////// BDRRMC FUNCTION
  
  document.addEventListener("DOMContentLoaded", () => {
    // Show the first tab by default
    showTab("bdrrmc-incidentsSection");
  
    // Event listener for tab navigation
    const tabLinks = document.querySelectorAll(".inner-tab-link");
    tabLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        const tabId = e.target.getAttribute("data-tab");
        showTab(tabId);
      });
    });
  
    // Function to display the active tab
    function showTab(tabId) {
      const allTabs = document.querySelectorAll(".tab-content");
      allTabs.forEach((tab) => {
        tab.style.display = "none";
      });
  
      const activeTab = document.getElementById(tabId);
      if (activeTab) {
        activeTab.style.display = "block";
      }
  
      const allTabLinks = document.querySelectorAll(".inner-tab-link");
      allTabLinks.forEach((link) => {
        link.classList.remove("active");
      });
  
      const activeTabLink = document.querySelector(`button[data-tab="${tabId}"]`);
      if (activeTabLink) {
        activeTabLink.classList.add("active");
      }
    }
  
    // Add Incident Form
    const incidentForm = document.getElementById("bdrrmc-incident-form");
    incidentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      addBdrrmcIncident(event);
    });
  
    // Add Evacuation Center Form
    const evacuationForm = document.getElementById("bdrrmc-evacuation-form");
    evacuationForm.addEventListener("submit", (event) => {
      event.preventDefault();
      addBdrrmcEvacuationCenter(event);
    });
  
    // Add Relief Goods Form
    const reliefForm = document.getElementById("bdrrmc-relief-form");
    reliefForm.addEventListener("submit", (event) => {
      event.preventDefault();
      addBdrrmcReliefGoods(event);
    });
  });
  
  // Incident Modal
  const openIncidentFormBtn = document.getElementById("open-incident-form");
  const incidentModal = document.getElementById("incident-modal");
  const closeIncidentModal = document.getElementById("close-incident-modal");
  
  openIncidentFormBtn.onclick = () => {
    incidentModal.style.display = "block";
  };
  
  closeIncidentModal.onclick = () => {
    incidentModal.style.display = "none";
  };
  
  // Evacuation Modal
  const openEvacuationFormBtn = document.getElementById("open-evacuation-form");
  const evacuationModal = document.getElementById("evacuation-modal");
  const closeEvacuationModal = document.getElementById("close-evacuation-modal");
  
  openEvacuationFormBtn.onclick = () => {
    evacuationModal.style.display = "block";
  };
  
  closeEvacuationModal.onclick = () => {
    evacuationModal.style.display = "none";
  };
  
  // Relief Modal
  const openReliefFormBtn = document.getElementById("open-relief-form");
  const reliefModal = document.getElementById("relief-modal");
  const closeReliefModal = document.getElementById("close-relief-modal");
  
  openReliefFormBtn.onclick = () => {
    reliefModal.style.display = "block";
  };
  
  closeReliefModal.onclick = () => {
    reliefModal.style.display = "none";
  };
  
  // Function to handle adding an incident
  function addBdrrmcIncident(event) {
    const type = document.getElementById("bdrrmc-incident-type").value;
    const location = document.getElementById("bdrrmc-incident-location").value;
    const description = document.getElementById(
      "bdrrmc-incident-description"
    ).value;
    const affected = document.getElementById("bdrrmc-affected-families").value;
  
    // Get the current date
    const date = new Date().toLocaleDateString();
  
    // Add the incident to the table
    const incidentTable = document.querySelector("#bdrrmc-incidents-table tbody");
    const row = incidentTable.insertRow();
    row.innerHTML = `
      <td>${date}</td>
      <td>${type}</td>
      <td>${location}</td>
      <td>${affected}</td>
      <td><span class="risk-level low">Low</span></td>
      <td><button class="edit-btn" onclick="editIncident(this)">Edit</button><button class="delete-btn" onclick="deleteIncident(this)">Delete</button></td>
    `;
  
    // Clear the form fields after submission
    event.target.reset();
  }
  
  // Function to handle editing an incident
  function editIncident(button) {
    const row = button.closest("tr");
    const cells = row.getElementsByTagName("td");
  
    // Pre-fill the form with the current values
    document.getElementById("bdrrmc-incident-type").value = cells[1].innerText;
    document.getElementById("bdrrmc-incident-location").value =
      cells[2].innerText;
    document.getElementById("bdrrmc-incident-description").value =
      cells[3].innerText;
    document.getElementById("bdrrmc-affected-families").value =
      cells[4].innerText;
  
    // Remove the row (will be re-added when updated)
    row.remove();
  
    // Update the button to handle updating
    const submitButton = document.querySelector("#bdrrmc-incident-form button");
    submitButton.innerText = "Update Incident";
    submitButton.setAttribute("onclick", "updateIncident(event)");
  }
  
  // Function to handle updating an incident
  function updateIncident(event) {
    event.preventDefault();
  
    const type = document.getElementById("bdrrmc-incident-type").value;
    const location = document.getElementById("bdrrmc-incident-location").value;
    const description = document.getElementById(
      "bdrrmc-incident-description"
    ).value;
    const affected = document.getElementById("bdrrmc-affected-families").value;
  
    const date = new Date().toLocaleDateString();
  
    const incidentTable = document.querySelector("#bdrrmc-incidents-table tbody");
    const row = incidentTable.insertRow();
    row.innerHTML = `
      <td>${date}</td>
      <td>${type}</td>
      <td>${location}</td>
      <td>${affected}</td>
      <td><span class="risk-level low">Low</span></td>
      <td><button class="edit-btn" onclick="editIncident(this)">Edit</button><button class="delete-btn" onclick="deleteIncident(this)">Delete</button></td>
    `;
  
    // Clear the form and reset button text
    const submitButton = document.querySelector("#bdrrmc-incident-form button");
    submitButton.innerText = "Add Incident";
    submitButton.setAttribute("onclick", "addBdrrmcIncident(event)");
    event.target.reset();
  }
  
  // Function to delete an incident
  function deleteIncident(button) {
    const row = button.closest("tr");
    row.remove();
  }
  
  // Function to handle adding an evacuation center
  function addBdrrmcEvacuationCenter(event) {
    const name = document.getElementById("bdrrmc-center-name").value;
    const location = document.getElementById("bdrrmc-center-location").value;
    const capacity = document.getElementById("bdrrmc-center-capacity").value;
  
    const evacuationTable = document.querySelector(
      "#bdrrmc-evacuation-table tbody"
    );
    const row = evacuationTable.insertRow();
    row.innerHTML = `
      <td>${name}</td>
      <td>${location}</td>
      <td>${capacity}</td>
      <td>0</td>
      <td><button class="edit-btn" onclick="editEvacuationCenter(this)">Edit</button><button class="delete-btn" onclick="deleteEvacuationCenter(this)">Delete</button></td>
    `;
  
    event.target.reset();
  }
  
  // Function to handle editing an evacuation center
  function editEvacuationCenter(button) {
    const row = button.closest("tr");
    const cells = row.getElementsByTagName("td");
  
    // Pre-fill the form with the current values
    document.getElementById("bdrrmc-center-name").value = cells[0].innerText;
    document.getElementById("bdrrmc-center-location").value = cells[1].innerText;
    document.getElementById("bdrrmc-center-capacity").value = cells[2].innerText;
  
    // Remove the row (will be re-added when updated)
    row.remove();
  
    const submitButton = document.querySelector("#bdrrmc-evacuation-form button");
    submitButton.innerText = "Update Center";
    submitButton.setAttribute("onclick", "updateEvacuationCenter(event)");
  }
  
  // Function to handle updating an evacuation center
  function updateEvacuationCenter(event) {
    event.preventDefault();
  
    const name = document.getElementById("bdrrmc-center-name").value;
    const location = document.getElementById("bdrrmc-center-location").value;
    const capacity = document.getElementById("bdrrmc-center-capacity").value;
  
    const evacuationTable = document.querySelector(
      "#bdrrmc-evacuation-table tbody"
    );
    const row = evacuationTable.insertRow();
    row.innerHTML = `
      <td>${name}</td>
      <td>${location}</td>
      <td>${capacity}</td>
      <td>0</td>
      <td><button class="edit-btn" onclick="editEvacuationCenter(this)">Edit</button><button class="delete-btn" onclick="deleteEvacuationCenter(this)">Delete</button></td>
    `;
  
    const submitButton = document.querySelector("#bdrrmc-evacuation-form button");
    submitButton.innerText = "Add Center";
    submitButton.setAttribute("onclick", "addBdrrmcEvacuationCenter(event)");
    event.target.reset();
  }
  
  // Function to delete an evacuation center
  function deleteEvacuationCenter(button) {
    const row = button.closest("tr");
    row.remove();
  }
  
  // Function to handle adding relief goods
  function addBdrrmcReliefGoods(event) {
    const name = document.getElementById("bdrrmc-item-name").value;
    const quantity = document.getElementById("bdrrmc-item-quantity").value;
    const unit = document.getElementById("bdrrmc-item-unit").value;
  
    const reliefTable = document.querySelector("#bdrrmc-relief-table tbody");
    const row = reliefTable.insertRow();
    row.innerHTML = `
      <td>${name}</td>
      <td>${quantity}</td>
      <td>${unit}</td>
      <td><span class="risk-level low">Low</span></td>
      <td><button class="edit-btn" onclick="editReliefGoods(this)">Edit</button><button class="delete-btn" onclick="deleteReliefGoods(this)">Delete</button></td>
    `;
  
    event.target.reset();
  }
  
  // Function to handle editing relief goods
  function editReliefGoods(button) {
    const row = button.closest("tr");
    const cells = row.getElementsByTagName("td");
  
    // Pre-fill the form with the current values
    document.getElementById("bdrrmc-item-name").value = cells[0].innerText;
    document.getElementById("bdrrmc-item-quantity").value = cells[1].innerText;
    document.getElementById("bdrrmc-item-unit").value = cells[2].innerText;
  
    // Remove the row (will be re-added when updated)
    row.remove();
  
    const submitButton = document.querySelector("#bdrrmc-relief-form button");
    submitButton.innerText = "Update Relief Item";
    submitButton.setAttribute("onclick", "updateReliefGoods(event)");
  }
  
  // Function to handle updating relief goods
  function updateReliefGoods(event) {
    event.preventDefault();
  
    const name = document.getElementById("bdrrmc-item-name").value;
    const quantity = document.getElementById("bdrrmc-item-quantity").value;
    const unit = document.getElementById("bdrrmc-item-unit").value;
  
    const reliefTable = document.querySelector("#bdrrmc-relief-table tbody");
    const row = reliefTable.insertRow();
    row.innerHTML = `
      <td>${name}</td>
      <td>${quantity}</td>
      <td>${unit}</td>
      <td><span class="risk-level low">Low</span></td>
      <td><button class="edit-btn" onclick="editReliefGoods(this)">Edit</button><button class="delete-btn" onclick="deleteReliefGoods(this)">Delete</button></td>
    `;
  
    const submitButton = document.querySelector("#bdrrmc-relief-form button");
    submitButton.innerText = "Add Relief Item";
    submitButton.setAttribute("onclick", "addBdrrmcReliefGoods(event)");
    event.target.reset();
  }
  
  // Function to delete relief goods
  function deleteReliefGoods(button) {
    const row = button.closest("tr");
    row.remove();
  }
  