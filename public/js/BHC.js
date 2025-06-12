document.querySelectorAll(".tab-link").forEach((tab) => {
  tab.addEventListener("click", async function (event) {
    event.preventDefault(); // Prevent default anchor behavior

    // Remove active class from all tabs
    document
      .querySelectorAll(".tab-link")
      .forEach((link) => link.classList.remove("active"));
    // Hide all tab bodies
    document
      .querySelectorAll(".tab-body")
      .forEach((tabBody) => tabBody.classList.remove("active"));

    // Add active class to clicked tab
    this.classList.add("active");
    const targetId = this.getAttribute("href").substring(1); // Get the target section ID

    if (targetId === "tab-2") {
      // Load content from BDRRMC.html
      const response = await fetch("/admin_bbi/html/BDRRMC.html");

      if (response.ok) {
        const content = await response.text();
        document.querySelector("#tab-2").innerHTML = content; // Set the content of the tab
      } else {
        document.querySelector("#tab-2").innerHTML =
          "<p>Error loading content.</p>";
      }
    }

    // Show the corresponding tab body
    const target = document.querySelector(`#${targetId}`);
    if (target) {
      target.classList.add("active");
    }
  });
});

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  doc,
  setDoc,
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

document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM fully loaded and parsed");

  ////////////////////////////////////////////////////////////////////////////////// BHC FUNCTION

  const bhcBtn = document.getElementById("bhc-btn");
  const schedulePopup = document.getElementById("schedulePopup");
  const closeBtn = schedulePopup.querySelector(".close-btn");
  const activityType = document.getElementById("activityType");
  const customTitleContainer = document.getElementById("customTitleContainer");
  const descriptionField = document.getElementById("description");
  const scheduleForm = document.getElementById("scheduleForm");

  if (
    !bhcBtn ||
    !schedulePopup ||
    !closeBtn ||
    !activityType ||
    !customTitleContainer ||
    !descriptionField ||
    !scheduleForm
  ) {
    console.error("One or more required elements are missing from the DOM");
    return;
  }

  console.log("All required elements found in the DOM");

  // Open popup and fetch activities when BHC button is clicked
  bhcBtn.addEventListener("click", async function () {
    console.log("BHC button clicked");
    schedulePopup.style.display = "block";
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div class="overlay"></div>'
    );
    await fetchHealthActivities();
    clearInputFields(); // Clear input fields when opening the popup
  });

  // Activity descriptions
  const activityDescriptions = {
    vaccination:
      "Free vaccination services including anti-rabies, flu shots, and other essential vaccines.",
    checkup:
      "General health assessment, blood pressure monitoring, and basic health screenings.",
    circumcision:
      "Free and safe circumcision service for eligible male residents.",
    dental: "Free dental check-up, cleaning, and basic dental procedures.",
  };

  async function fetchHealthActivities() {
    console.log("Fetching health activities");
    try {
      const activitiesQuery = query(
        collection(db, "BHC"),
        orderBy("date", "desc")
      );
      const querySnapshot = await getDocs(activitiesQuery);
      const activities = [];
      querySnapshot.forEach((doc) => {
        activities.push({ id: doc.id, ...doc.data() });
      });
      console.log("Fetched activities:", activities);
      displayActivities(activities); // Call to update the activities list
    } catch (error) {
      console.error("Error fetching health activities: ", error);
      alert("Failed to fetch health activities. Please try again.");
    }
  }

  function displayActivities(activities) {
    console.log("Displaying activities");
    const activitiesListContainer = document.getElementById(
      "activitiesListContainer"
    );
    activitiesListContainer.innerHTML = ""; // Clear existing activities

    if (activities.length === 0) {
      activitiesListContainer.innerHTML = "<p>No activities scheduled.</p>";
      return; // Exit early if no activities
    }

    activities.forEach((activity) => {
      const listItem = document.createElement("div");
      listItem.textContent = `${activity.title} - ${activity.date} (${activity.startTime} - ${activity.endTime})`;

      // Create a delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "delete-btn";
      deleteBtn.onclick = async () => {
        await deleteActivity(activity.id);
      };

      listItem.appendChild(deleteBtn);
      activitiesListContainer.appendChild(listItem); // Append to the existing container
    });

    console.log("Activities updated in the popup");
  }
  // Close popup function
  function closePopup() {
    console.log("Closing popup");
    schedulePopup.style.display = "none";
    const overlay = document.querySelector(".overlay");
    if (overlay) {
      overlay.remove();
    }
  }

  // Close popup when close button is clicked
  closeBtn.addEventListener("click", closePopup);

  // Close popup when clicking outside
  document.addEventListener("click", function (event) {
    if (event.target.classList.contains("overlay")) {
      closePopup();
    }
  });

  // Handle activity type change
  activityType.addEventListener("change", function () {
    console.log("Activity type changed to:", this.value);
    if (this.value === "custom") {
      customTitleContainer.style.display = "block";
      descriptionField.value = "";
    } else {
      customTitleContainer.style.display = "none";
      descriptionField.value = activityDescriptions[this.value] || "";
    }
  });

  // Function to delete an activity
  async function deleteActivity(activityId) {
    try {
      const docRef = doc(db, "BHC", activityId); // Reference the specific document
      await deleteDoc(docRef); // Delete the document
      alert("Activity deleted successfully!");
      await fetchHealthActivities(); // Refresh the activities list
    } catch (error) {
      console.error("Error deleting document: ", error);
      alert("Failed to delete activity. Please try again.");
    }
  }

  // Clear input fields
  function clearInputFields() {
    activityType.value = "";
    customTitleContainer.style.display = "none";
    descriptionField.value = "";
    document.getElementById("date").value = "";
    document.getElementById("startTime").value = "";
    document.getElementById("endTime").value = "";
  }

  // Handle form submission
  scheduleForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    console.log("Form submitted");

    const type = activityType.value;
    const title =
      type === "custom"
        ? document.getElementById("customTitle").value
        : activityType.options[activityType.selectedIndex].text;
    const description = descriptionField.value;
    const date = document.getElementById("date").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;

    const activityData = {
      type,
      title,
      description,
      date,
      startTime,
      endTime,
    };

    console.log("Activity data being sent to Firestore:", activityData);

    try {
      const docRef = doc(db, "BHC", "HealthActivity " + date); // Use the date directly as the document ID
      await setDoc(docRef, activityData, { merge: true });

      alert("Activity scheduled successfully!");
      await fetchHealthActivities(); // Refresh the activities list
      clearInputFields(); // Clear input fields after scheduling
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Failed to schedule activity. Please try again.");
    }
  });
});
