import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDoc,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  Timestamp,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "bims-9aaa7.firebaseapp.com",
  projectId: "bims-9aaa7",
  storageBucket: "bims-9aaa7.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const reportsCollection = collection(db, "reports");
const countersCollection = collection(db, "counters");
const reportCounterDoc = doc(countersCollection, "reportsCounter");

const modal = document.getElementById("reportModal");
const addReportBtn = document.getElementById("addReportBtn");
const closeModalBtn = document.querySelector(".close");

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}
const searchInput = document.getElementById("searchInput");
searchInput.addEventListener(
  "input",
  debounce(async () => {
    const searchValue = searchInput.value.toLowerCase();
    const filterValue = document.getElementById("filterType").value;
    await loadReports(filterValue, searchValue);
  }, 300)
);

const filterType = document.getElementById("filterType");
filterType.addEventListener("change", async () => {
  const filterValue = filterType.value;
  const searchValue = searchInput.value.toLowerCase();
  await loadReports(filterValue, searchValue);
});

async function loadReports(filter = "", search = "") {
  const reportsGrid = document.getElementById("reportsGrid");
  reportsGrid.innerHTML = "";

  try {
    let q = query(reportsCollection);

    // Apply filter if available
    if (filter) {
      q = query(q, where("type", "==", filter));
    }

    // Fetch reports from Firestore
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((docSnapshot) => {
      const report = docSnapshot.data();
      const reportId = docSnapshot.id; // Use the Firestore document ID as the report ID
      const dateCreated =
        report.dateCreated && report.dateCreated instanceof Timestamp
          ? report.dateCreated.toDate().toLocaleDateString()
          : "N/A";

      // Apply search filter if the search value matches any part of the title or description
      if (
        report.title.toLowerCase().includes(search) ||
        report.description.toLowerCase().includes(search)
      ) {
        const box = document.createElement("div");
        box.classList.add("report-box");
        box.id = `report-${reportId}`; // Set the unique ID for the report box
        box.innerHTML = `
          <h3>${report.title || "Untitled"}</h3>
          <p>${report.description}</p>
          <p>Type: ${report.type}</p>
          <p>Date Created: ${dateCreated}</p>
          <div class="report-actions">
            <button class="action-btn">⋮</button>
            <div class="action-menu">
              <button onclick="editReport('${reportId}', '${
          report.title || ""
        }', '${report.description || ""}', '${
          report.type || ""
        }')">Edit</button>
              <button onclick="deleteReport('${reportId}')">Delete</button>
            </div>
          </div>
        `;
        reportsGrid.appendChild(box);

        // Add click event to toggle the action menu
        const actionBtn = box.querySelector(".action-btn");
        const actionMenu = box.querySelector(".action-menu");
        actionBtn.addEventListener("click", (event) => {
          event.stopPropagation(); // Prevent event bubbling to document
          actionMenu.classList.toggle("show");
        });
      }
    });
  } catch (error) {
    console.error("Error fetching reports: ", error);
  }
}

addReportBtn.addEventListener("click", () => {
  modal.style.display = "block";
});

closeModalBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

window.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.style.display = "none";
  }

  // Close the action menu if clicked outside
  const actionMenus = document.querySelectorAll(".action-menu");
  actionMenus.forEach((menu) => {
    if (
      !menu.contains(event.target) &&
      !menu.previousElementSibling.contains(event.target)
    ) {
      menu.classList.remove("show");
    }
  });
});

document
  .getElementById("reportForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = document.getElementById("reportTitle").value;
    const description = document.getElementById("reportDescription").value;
    const type = document.getElementById("reportType").value;
    const dateCreated = Timestamp.fromDate(new Date());

    try {
      let reportCounter = await getReportCounter(type);
      const newReportId = generateReportId(type, reportCounter);

      // Add the new report to Firestore
      await setDoc(doc(reportsCollection, newReportId), {
        title,
        description,
        type,
        dateCreated,
      });

      // Update the report counter
      await updateReportCounter(type, reportCounter + 1);

      // Reload the reports
      loadReports();

      // Clear the form fields
      document.getElementById("reportForm").reset();

      // Close the modal
      modal.style.display = "none";
    } catch (error) {
      console.error("Error adding report: ", error);
    }
  });

async function getReportCounter(type) {
  const reportCounterSnapshot = await getDoc(reportCounterDoc);
  let counter = 0;

  if (reportCounterSnapshot.exists()) {
    const data = reportCounterSnapshot.data();
    counter = data[type] || 0;
  }

  return counter;
}

async function updateReportCounter(type, newCounterValue) {
  const updateData = {};
  updateData[type] = newCounterValue;
  await updateDoc(reportCounterDoc, updateData);
}

function generateReportId(type, counter) {
  const prefixMap = {
    Weekly: "W-",
    Monthly: "M-",
    Quarterly: "Q-",
    Yearly: "Y-",
  };
  const prefix = prefixMap[type] || "";
  const paddedCounter = String(counter).padStart(6, "0");
  return `${prefix}${paddedCounter}`;
}

window.deleteReport = async function (reportId) {
  const confirmed = confirm("Are you sure you want to delete this report?");
  if (confirmed) {
    try {
      await deleteDoc(doc(reportsCollection, reportId));
      loadReports();
    } catch (error) {
      console.error("Error deleting report: ", error);
    }
  }
};

window.editReport = function (title, description, type) {
  document.getElementById("reportTitle").value = title;
  document.getElementById("reportDescription").value = description;
  document.getElementById("reportType").value = type;
  modal.style.display = "block";
};

window.editReport = async function (reportId, title, description, type) {
  try {
    // Map the report type to the corresponding template filename
    const templateMap = {
      Weekly: "WeeklyReport.docx",
      Monthly: "MonthlyReport.docx",
      Quarterly: "QuarterlyReport.docx",
      Yearly: "YearlyReport.docx",
    };

    // Get the template filename based on the report type
    const templateFile = templateMap[type] || "WeeklyReport.docx"; // Default to Weekly if no match

    // Fetch the corresponding DOCX template (Ensure the path is correct)
    const response = await fetch(`../adminPage/reports_template/${templateFile}`);
    if (!response.ok) {
      throw new Error("Failed to load template file");
    }

    const contentType = response.headers.get("Content-Type");
    if (
      !contentType.includes(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ) {
      throw new Error("The file is not a valid DOCX file");
    }

    const templateBlob = await response.blob();
    const templateArrayBuffer = await templateBlob.arrayBuffer();

    // Use JSZip 2.x to load the template
    const zip = new JSZip(templateArrayBuffer); // JSZip 2.x
    const doc = new docxtemplater(zip);

    // Set the dynamic content for placeholders
    doc.setData({
      title: title,
      description: description,
      type: type,
      date: new Date().toLocaleDateString(),
    });

    // Render the DOCX document with the data
    try {
      doc.render();
    } catch (error) {
      console.error("Error rendering template: ", error);
      return;
    }

    // Generate the .docx file as a blob
    const generatedDocx = doc.getZip().generate({ type: "blob" });

    // Create a download link for the generated DOCX file
    const link = document.createElement("a");
    link.href = URL.createObjectURL(generatedDocx);
    link.download = `Report_${title}.docx`;
    link.click();
  } catch (error) {
    console.error("Error creating the report: ", error);
  }
};

loadReports();
