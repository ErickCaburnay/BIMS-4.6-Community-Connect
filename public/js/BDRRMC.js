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

////////////////////////////////////////////////////////////////////////////////// BDRRMC FUNCTION

const bdrrmcBtn = document.getElementById("bdrrmc-btn");
const bdrrmcPopup = document.getElementById("bdrrmcPopup");
const bdrrmcCloseBtn = bdrrmcPopup.querySelector(".close-btn");
const bdrrmcActivityType = document.getElementById("bdrrmcActivityType");
const bdrrmcCustomTitleContainer = document.getElementById(
  "bdrrmcCustomTitleContainer"
);
const bdrrmcDescriptionField = document.getElementById("bdrrmcDescription");
const bdrrmcScheduleForm = document.getElementById("bdrrmcScheduleForm");

if (
  !bdrrmcBtn ||
  !bdrrmcPopup ||
  !bdrrmcCloseBtn ||
  !bdrrmcActivityType ||
  !bdrrmcCustomTitleContainer ||
  !bdrrmcDescriptionField ||
  !bdrrmcScheduleForm
) {
  console.error("One or more required elements are missing from the DOM");
  return;
}

console.log("All required elements found in the DOM for BDRRMC");

// Open popup and fetch activities when BDRRMC button is clicked
bdrrmcBtn.addEventListener("click", async function () {
  console.log("BDRRMC button clicked");
  bdrrmcPopup.style.display = "block";
  document.body.insertAdjacentHTML("beforeend", '<div class="overlay"></div>');
  await fetchBdrrmcActivities();
  clearBdrrmcInputFields(); // Clear input fields when opening the popup
});

// Activity descriptions for BDRRMC
const bdrrmcActivityDescriptions = {
  drill: "Regular drills to prepare for disaster response.",
  training: "Training sessions for community members on disaster preparedness.",
  response: "Emergency response activities during disasters.",
  custom: "Custom activity for specific needs.",
};

async function fetchBdrrmcActivities() {
  console.log("Fetching BDRRMC activities");
  try {
    const activitiesQuery = query(
      collection(db, "BDRRMC"),
      orderBy("date", "desc")
    );
    const querySnapshot = await getDocs(activitiesQuery);
    const activities = [];
    querySnapshot.forEach((doc) => {
      activities.push({ id: doc.id, ...doc.data() });
    });
    console.log("Fetched BDRRMC activities:", activities);
    displayBdrrmcActivities(activities); // Call to update the activities list
  } catch (error) {
    console.error("Error fetching BDRRMC activities: ", error);
    alert("Failed to fetch BDRRMC activities. Please try again.");
  }
}

function displayBdrrmcActivities(activities) {
  console.log("Displaying BDRRMC activities");
  const bdrrmcActivitiesListContainer = document.getElementById(
    "bdrrmcActivitiesListContainer"
  );
  bdrrmcActivitiesListContainer.innerHTML = ""; // Clear existing activities

  if (activities.length === 0) {
    bdrrmcActivitiesListContainer.innerHTML = "<p>No activities scheduled.</p>";
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
      const confirmed = confirm(
        "Are you sure you want to delete this activity?"
      );
      if (confirmed) {
        await deleteBdrrmcActivity(activity.id);
      }
    };

    listItem.appendChild(deleteBtn);
    bdrrmcActivitiesListContainer.appendChild(listItem); // Append to the existing container
  });

  console.log("BDRRMC activities updated in the popup");
}

// Close popup function
function closeBdrrmcPopup() {
  console.log("Closing BDRRMC popup");
  bdrrmcPopup.style.display = "none";
  const overlay = document.querySelector(".overlay");
  if (overlay) {
    overlay.remove();
  }
}

// Close popup when close button is clicked
bdrrmcCloseBtn.addEventListener("click", closeBdrrmcPopup);

// Close popup when clicking outside
document.addEventListener("click", function (event) {
  if (event.target.classList.contains("overlay")) {
    closeBdrrmcPopup();
  }
});

// Handle activity type change for BDRRMC
bdrrmcActivityType.addEventListener("change", function () {
  console.log("BDRRMC activity type changed to:", this.value);
  if (this.value === "custom") {
    bdrrmcCustomTitleContainer.style.display = "block";
    bdrrmcDescriptionField.value = "";
  } else {
    bdrrmcCustomTitleContainer.style.display = "none";
    bdrrmcDescriptionField.value = bdrrmcActivityDescriptions[this.value] || "";
  }
});

// Function to delete a BDRRMC activity
async function deleteBdrrmcActivity(activityId) {
  try {
    const docRef = doc(db, "BDRRMC", activityId); // Reference the specific document
    await deleteDoc(docRef); // Delete the document
    alert("BDRRMC activity deleted successfully!");
    await fetchBdrrmcActivities(); // Refresh the activities list
  } catch (error) {
    console.error("Error deleting BDRRMC document: ", error);
    alert("Failed to delete BDRRMC activity. Please try again.");
  }
}

// Clear input fields for BDRRMC
function clearBdrrmcInputFields() {
  bdrrmcActivityType.value = "";
  bdrrmcCustomTitleContainer.style.display = "none";
  bdrrmcDescriptionField.value = "";
  document.getElementById("bdrrmcDate").value = "";
  document.getElementById("bdrrmcStartTime").value = "";
  document.getElementById("bdrrmcEndTime").value = "";
}

// Handle form submission for BDRRMC
bdrrmcScheduleForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  console.log("BDRRMC form submitted");

  const type = bdrrmcActivityType.value;
  const title =
    type === "custom"
      ? document.getElementById("bdrrmcCustomTitle").value
      : bdrrmcActivityType.options[bdrrmcActivityType.selectedIndex].text;
  const description = bdrrmcDescriptionField.value;
  const date = document.getElementById("bdrrmcDate").value;
  const startTime = document.getElementById("bdrrmcStartTime").value;
  const endTime = document.getElementById("bdrrmcEndTime").value;

  const activityData = {
    type,
    title,
    description,
    date,
    startTime,
    endTime,
  };

  console.log("BDRRMC activity data being sent to Firestore:", activityData);

  try {
    const docRef = doc(db, "BDRRMC", "DisasterActivity " + date); // Use the date directly as the document ID
    await setDoc(docRef, activityData, { merge: true });

    alert("BDRRMC activity scheduled successfully!");
    await fetchBdrrmcActivities(); // Refresh the activities list
    clearBdrrmcInputFields(); // Clear input fields after scheduling
  } catch (error) {
    console.error("Error adding BDRRMC document: ", error);
    alert("Failed to schedule BDRRMC activity. Please try again.");
  }
});
