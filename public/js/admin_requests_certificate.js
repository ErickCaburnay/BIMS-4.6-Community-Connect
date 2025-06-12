// <!-- ######## ADMIN_REQUESTS_CERTIFICATE.JS ######### -->

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getFirestore, collection, addDoc, orderBy, getDocs, updateDoc, doc, getDoc, query, where, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app)
const auth = getAuth(app);

function getMonthName(monthIndex) {
  const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex];
}

// Function to fetch user data when the fetch button is clicked
async function fetchCertificateUserData() {
    const uniqueId = document.getElementById('certificateUniqueId').value.trim().toUpperCase();
    
    if (uniqueId) {
      try {
        const usersCollection = collection(db, 'users');
        const q = query(usersCollection, where('uniqueId', '==', uniqueId));
        const querySnapshot = await getDocs(q);
  
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          console.log("Fetched user data:", userData);
          populateForm(userData);
        } else {
          console.log("No user found with this ID");
          clearForm();
          alert("No user found with this ID");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        alert("Error fetching user data. Please try again.");
      }
    } else {
      alert("Please enter a Unique ID");
    }
  }
  
  // Function to populate the form with fetched data
  function populateForm(data) {
    if (!data) {
      console.log("No data provided to populateForm");
      return;
    }
  
    const nameElement = document.getElementById('certificateName');
    const ageElement = document.getElementById('certificateAge');
    const blklotElement = document.getElementById('certificateBlklot');
    // const streetElement = document.getElementById('certificateStreet');
  
    if (nameElement) {
      const fullName = `${data.firstName || ''} ${data.middleName || ''} ${data.lastName || ''}`.trim();
      nameElement.value = fullName;
    }
  
    if (ageElement && data.birthdate) {
      const age = calculateAge(data.birthdate);
      ageElement.value = age;
    }
  
    if (blklotElement) blklotElement.value = data.blklot || '';
    // if (streetElement) streetElement.value = data.street || '';
  
    console.log("Form populated with data:", {
      name: nameElement?.value,
      age: ageElement?.value,
      blklot: blklotElement?.value,
      // street: streetElement?.value
    });
  }
  
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
  function clearForm() {
    ['certificateUniqueId', 'certificateName', 'certificateAge', 'certificateBlklot', 'certificatePurpose', 'certificateDateOfResidency', 'certificateIssueDate'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.value = '';
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

async function generateTransactionId() {
  const brgyCertificateCollection = collection(db, 'brgy_certificate');
  const snapshot = await getDocs(brgyCertificateCollection);
  const certificateCount = snapshot.size;
  const newTransactionId = `CERT-${(certificateCount + 1).toString().padStart(6, '0')}`;
  return newTransactionId;
}

async function generateWordCertificate(data) {
  try {
      // Update the path to match your project structure
      const response = await fetch('/public/Brgy Docs/BARANGAY-CERTIFICATE-BLANK.docx');
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      const templateContent = await response.arrayBuffer();
      
      // Check if we got valid content
      if (!templateContent || templateContent.byteLength === 0) {
          throw new Error('Template file is empty');
      }

      console.log('Template loaded, size:', templateContent.byteLength);

      // Load the docx template
      const zip = new PizZip(templateContent);
      const doc = new window.docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: {
              start: '${',
              end: '}'
          }
      });

      // Set the template data using your existing IDs
      doc.setData({
          printCertificateName: data.fullName,
          printCertificateAge: data.age,
          printCertificateBlklot: data.blockLot,
          printCertificatePurpose: data.purpose,
          printCertificateDay: new Date(data.issueDate).getDate() + getOrdinalSuffix(new Date(data.issueDate).getDate()),
          printCertificateMonth: getMonthName(new Date(data.issueDate).getMonth()),
          printCertificateYear: new Date(data.issueDate).getFullYear(),
          printCertificateIssueDate: new Date(data.issueDate).toLocaleDateString(),
          printCertificateORNo: data.transactionId,
          printCertificateDateOfResidency: new Date(data.dor).toLocaleDateString()
      });

      // Render the document
      doc.render();

      // Generate and download
      const out = doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      // Trigger download
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(out);
      link.download = `Certificate_${data.transactionId}.docx`;
      link.click();
      window.URL.revokeObjectURL(link.href);

      return true;
  } catch (error) {
      console.error('Error generating document:', error);
      console.log('Template path:', '/public/Brgy Docs/BARANGAY-CERTIFICATE-BLANK.docx');
      throw error;
  }
}



document.getElementById('printCertificate').addEventListener('click', async (event) => {
  try {
      // Gather form data
      const certificateData = {
          transactionId: await generateTransactionId(),
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

      // Validate form data
      if (!certificateData.fullName || !certificateData.age || !certificateData.blockLot || 
          !certificateData.purpose || !certificateData.issueDate || !certificateData.dor) {
          alert('Please fill in all required fields');
          return;
      }

      // Generate Word document
      await generateWordCertificate(certificateData);

      // Save to Firebase
      const docRef = await addDoc(collection(db, 'brgy_certificate'), certificateData);
      console.log("New certificate saved with ID:", docRef.id);

      // Close preview window
      const previewCertificate = document.getElementById('previewCertificate');
      if (previewCertificate) previewCertificate.style.display = 'none';

  } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while generating the certificate. Please try again.');
  }
});

function handleCloseOrCancel() {
  const certificatePopupContainer = document.getElementById('certificatePopupContainer');
  if (certificatePopupContainer) certificatePopupContainer.style.display = 'none'; // Hide the popup
  clearForm(); 
}


function hideConfirmationPopup() {
  const confirmationPopup = document.getElementById('confirmationPopup');
  confirmationPopup.style.display = 'none';
}

function hidePreviewCertificate() {
  const previewCertificate = document.getElementById('previewCertificate');
  if (previewCertificate) previewCertificate.style.display = 'none';
}


// Add event listener to the fetch button
document.addEventListener('DOMContentLoaded', function () {
  const fetchButton = document.getElementById('fetchCertificateUserData');
  if (fetchButton) {
      fetchButton.addEventListener('click', fetchCertificateUserData);
  }

  const uniqueIdInput = document.getElementById('certificateUniqueId');
  if (uniqueIdInput) {
      uniqueIdInput.addEventListener('input', function () {
          if (this.value.length >= 13) {
              fetchCertificateUserData();
          }
      });
  }

  // Add this handler for preview button
  const previewButton = document.getElementById('certificatePreview');
  if (previewButton) {
      previewButton.addEventListener('click', function() {
          // Validate form fields
          const name = document.getElementById('certificateName').value.trim();
          const age = document.getElementById('certificateAge').value.trim();
          const blklot = document.getElementById('certificateBlklot').value.trim();
          // const street = document.getElementById('certificateStreet').value.trim();
          const purpose = document.getElementById('certificatePurpose').value;
          const issueDate = document.getElementById('certificateIssueDate').value;
          const dor = document.getElementById('certificateDateOfResidency').value;

          const date = new Date(issueDate);
          const day = date.getDate();
          const ordinalDay = day + getOrdinalSuffix(day);
          const month = date.toLocaleString('default', { month: 'long' });
          const year = date.getFullYear();

          if (!name || !age || !blklot || !street || !purpose || !issueDate || !dor) {
              alert("Please fill in all required fields.");
              return;
          }

          // Format the dates
          const formattedIssueDate = new Date(issueDate).toLocaleDateString('en-US', {
              month: 'numeric',
              day: 'numeric',
              year: 'numeric'
          });

          const formattedDor = new Date(dor).toLocaleDateString('en-US', {
              month: 'numeric',
              day: 'numeric',
              year: 'numeric'
          });

          // Populate preview content
          document.getElementById('printCertificateName').textContent = name.toUpperCase();
          document.getElementById('printCertificateName2').textContent = name.toUpperCase();
          document.getElementById('printCertificateAge').textContent = age;
          document.getElementById('printCertificateBlklot').textContent = blklot;
          // document.getElementById('printCertificateStreet').textContent = street;
          document.getElementById('printCertificatePurpose').textContent = purpose.toUpperCase();
          document.getElementById('printCertificateDateOfResidency').textContent = formattedDor;
          document.getElementById('printCertificateIssueDate').textContent = formattedIssueDate;
          document.getElementById('printCertificateDay').textContent = ordinalDay;
          document.getElementById('printCertificateMonth').textContent = month;
          document.getElementById('printCertificateYear').textContent = year;

          // Show preview container
          const previewCertificate = document.getElementById('previewCertificate');
          if (previewCertificate) {
              previewCertificate.style.display = 'block';
          }
      });
  }

  // Add handler for close preview button
  const closePreviewButton = document.getElementById('closePreviewCertificate');
  if (closePreviewButton) {
      closePreviewButton.addEventListener('click', function() {
          const previewCertificate = document.getElementById('previewCertificate');
          if (previewCertificate) {
              previewCertificate.style.display = 'none';
          }
      });
  }

  const printButton = document.getElementById('printCertificate');
  if (printButton) {
      printButton.addEventListener('click', async (event) => {
          // The Word document generation code will be triggered here
          
      });
  }
});

window.generateWordCertificate = generateWordCertificate;
export { generateWordCertificate };