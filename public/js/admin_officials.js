// <!-- ##################################### ADMIN_OFFICIALS.js #####################################3 -->

// import { getFirestore, collection, doc, updateDoc, deleteDoc, setDoc, addDoc, getDoc, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
// import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
// import { firebaseConfig } from '/js/firebaseConfig.js';
import { 
    app, 
    db,
    doc,
    collection,
    updateDoc,
    addDoc,
    deleteDoc,
    getDoc,
    getDocs,
    query,
    where,
    limit,
    Timestamp
 } from './firebaseConfig.js';


let loadingTasks = 0;

function showLoader() {
    loadingTasks++;
    const loader = document.getElementById('loader-container');
    if (loader) {
        loader.style.display = 'flex';
    }
}

function hideLoader() {
    loadingTasks--;
    if (loadingTasks <= 0) {
        loadingTasks = 0;
        const loader = document.getElementById('loader-container');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

// DOM elements
const infoForm = document.getElementById('personal-info-form');
const addOfficialButton = document.querySelector('.add-official-button');
const popupContainer = document.getElementById('popupContainer');
const closeButton = document.getElementById('closeButton');
const overlay = document.getElementById('overlay');
const officialsTable = document.getElementById('officialsTable').getElementsByTagName('tbody')[0];

// Function to get user role
const getUserRole = async (userId) => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? userDoc.data().role : null;
  };
  
  // Function to update a document
  const handleDocumentUpdate = async (userId, documentId, data) => {
    const role = await getUserRole(userId);
  
    if (role === 'admin') {
      const docRef = doc(db, 'Barangay_Officials', documentId);
      await updateDoc(docRef, data);
      console.log('Document updated successfully.');
    } else {
      console.log('User is not authorized to update this document.');
      alert('You are not authorized to perform this action.');
    }
  };

//   infoForm.addEventListener('submit', async (event) => {
//     event.preventDefault();
        
//     const userId = getCurrentUserId();
  
//     const formData = new FormData(infoForm);
//     const data = {
//     };
  
//     const docId = form.dataset.id;
  
//     try {
//       if (docId) {
//         await handleDocumentUpdate(userId, docId, data);
//       } else {
//         console.log('No document ID provided.');
//       }
//     } catch (error) {
//       console.error("Error handling document update: ", error);
//     }
//   });
  

    // Function to show the add official popup
    const showAddOfficialPopup = () => {
        overlay.style.display = 'flex';
        popupContainer.style.display = 'block';
    };

    // Function to close the add official popup
    const closePopup = () => {
        overlay.style.display = 'none';
        popupContainer.style.display = 'none';
    };

    // Handle form submission
    const handleSubmit = async (event) => {
        event.preventDefault();
        showLoader();
    
        console.log('Form submitted');
    
        const formData = new FormData(infoForm);
        const position = formData.get('position');
        
        if (!position) {
            console.error('Position is required');
            alert('Position is required');
            hideLoader();
            return;
        }
    
        const positionUpper = position.toUpperCase();
        const docId = infoForm.dataset.id;
        // Define actionType based on whether we're updating or creating
        const actionType = docId ? 'updated' : 'added';
    
        if (!docId) {
            const positionExists = await checkExistingPosition(positionUpper);
            if (positionExists) {
                document.getElementById('subOverlay2').style.display = 'flex';
                document.getElementById('subPopup2').style.display = 'block';
                hideLoader();
                return;
            }
        }
    
        const data = {
            firstName: formData.get('fname')?.toUpperCase() || '',
            middleName: formData.get('mname')?.toUpperCase() || '',
            lastName: formData.get('lname')?.toUpperCase() || '',
            suffix: formData.get('suffix')?.toUpperCase() || '',
            address1: formData.get('blklot')?.toUpperCase() || '', // Updated to match form field
            address2: formData.get('street')?.toUpperCase() || '', // Updated to match form field
            termStart: formData.get('term-start') || '',
            termEnd: formData.get('term-end') || '',
            gender: formData.get('gender')?.toUpperCase() || '',
            position: positionUpper,
            chair: formData.get('chair')?.toUpperCase() || '',
            status: formData.get('status')?.toUpperCase() || '',
            profileImageUrl: formData.get('profileImageUrl') || ''
        };
    
        try {
            let docRef;
            if (docId) {
                // Update existing document
                docRef = doc(db, 'Barangay_Officials', docId);
                await updateDoc(docRef, data);
                console.log('Document updated with ID: ', docId);
            } else {
                // Add new document
                docRef = await addDoc(collection(db, 'Barangay_Officials'), data);
                console.log('Document written with ID: ', docRef.id);
            }
    
            const logEntry = {
                userId: auth.currentUser.uid,
                email: auth.currentUser.email,
                action: `${auth.currentUser.email} has ${actionType} a barangay official`,
                role: 'Admin',
                details: {
                    officialId: docId || docRef.id,
                    officialName: `${data.firstName} ${data.middleName} ${data.lastName} ${data.suffix}`.trim(),
                    position: data.position,
                    modifiedBy: auth.currentUser.email,
                    modificationType: actionType
                },
                timestamp: Timestamp.fromDate(new Date())
            };
    
            // Save log entry
            await addDoc(collection(db, 'activity_logs'), logEntry);
    
            showConfirmationPopup(data);
            await fetchAndDisplayOfficials();
            await fetchDataAndPopulateTable();
            closePopup();
            infoForm.reset();
        } catch (error) {
            console.error("Error adding/updating document: ", error);
            alert("Error adding/updating document: " + error.message);
        }
        hideLoader();
    };

const handleUpdateButtonClick = async (event) => {
    event.preventDefault();
    console.log('Update button clicked');
    showLoader();

    const form = document.getElementById('update-info-form');
    //const formData = new FormData(form);
    const docId = form.dataset.id;

    if (!docId) {
        console.error('No document ID found');
        alert('Error: No document ID found for update');
        return;
    }

    const data = {
        firstName: form.elements['update-fname'].value.toUpperCase(),
        middleName: form.elements['update-mname'].value.toUpperCase() || '',
        lastName: form.elements['update-lname'].value.toUpperCase(),
        suffix: form.elements['update-suffix'].value.toUpperCase() || '',
        address1: form.elements['update-address1'].value.toUpperCase(),
        address2: form.elements['update-address2'].value.toUpperCase() || '',
        termStart: form.elements['update-term-start'].value,
        termEnd: form.elements['update-term-end'].value,
        citizenship: form.elements['update-citizenship'].value.toUpperCase(),
        age: form.elements['update-age'].value,
        gender: form.elements['update-gender'].value.toUpperCase(),
        position: form.elements['update-position'].value.toUpperCase(),
        chair: form.elements['update-chair'].value.toUpperCase(),
        status: form.elements['update-status'].value.toUpperCase(),
        phone: form.elements['update-phone'].value.toString(),
        profileImageUrl: form.elements['profileImageUrl'].value || ''
    };

    console.log('Update Data:', data);
    console.log('Document ID:', docId);

    // const logEntry = {
    //     userId: user.uid,
    //     email: user.email,
    //     action: `Barangay Official ${originalFullName} (${originalPosition}) has been updated`,
    //     role: 'Admin',
    //     details: {
    //         officialId: docId,
    //         updatedBy: user.email,
    //         originalName: originalFullName,
    //         updatedName: updatedFullName,
    //         originalPosition: originalPosition,
    //         updatedPosition: data.position,
    //         changes: {
    //             name: originalFullName !== updatedFullName ? {
    //                 from: originalFullName,
    //                 to: updatedFullName
    //             } : null,
    //             position: originalData?.position !== data.position ? {
    //                 from: originalData?.position,
    //                 to: data.position
    //             } : null,
    //             termStart: originalData?.termStart !== data.termStart ? {
    //                 from: originalData?.termStart,
    //                 to: data.termStart
    //             } : null,
    //             termEnd: originalData?.termEnd !== data.termEnd ? {
    //                 from: originalData?.termEnd,
    //                 to: data.termEnd
    //             } : null,
    //             status: originalData?.status !== data.status ? {
    //                 from: originalData?.status,
    //                 to: data.status
    //             } : null
    //         }
    //     },
    //     timestamp: Timestamp.fromDate(new Date())
    // };

    // await addDoc(collection(db, 'activity_logs'), logEntry);

    try {
        const docRef = doc(db, 'Barangay_Officials', docId);
        await updateDoc(docRef, data);
        console.log('Document updated successfully with ID:', docId);

        await fetchDataAndPopulateTable();
        console.log('Table refreshed');

        document.getElementById('updateOverlay').style.display = 'none';
        document.getElementById('updatePopupContainer').style.display = 'none';
        form.reset();

        alert('Official information updated successfully');
    } catch (error) {
        console.error("Error updating document: ", error);
        alert("Error updating document. Please try again.");
    }
    hideLoader();
};

// Add event listener for the update submit button
document.getElementById('upd-submit-btn').addEventListener('click', handleUpdateButtonClick);


const handleImageUpload = async (event) => {
    showLoader();
    const file = event.target.files[0];
    if (!file) return;

    const storage = getStorage();

    // Show preview
    const previewContainer = document.getElementById('profile-preview-container');
    const previewImg = document.getElementById('profile-preview');
    const reader = new FileReader();
    
    reader.onload = function(e) {
        previewImg.src = e.target.result;
        previewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);

    try {
        // Generate a unique filename to avoid duplicates
        const fileExtension = file.name.split('.').pop();
        const uniqueFileName = `Profile_Image/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
        
        // Remove existing hidden input to prevent duplicates
        const existingInput = event.target.parentNode.querySelector('input[name="profileImageUrl"]');
        if (existingInput) {
            // If there's an existing image URL, delete it from storage
            try {
                const oldImageRef = ref(storage, existingInput.value);
                await deleteObject(oldImageRef);
                console.log('Old image deleted successfully');
            } catch (deleteError) {
                if (deleteError.code === 'storage/object-not-found') {
                    console.log('No old image found to delete');
                } else {
                    console.error('Error deleting old image:', deleteError);
                }
            }
            existingInput.remove();
        }

        // Upload the new file with unique filename
        const storageRef = ref(storage, uniqueFileName);
        const snapshot = await uploadBytes(storageRef, file);
        console.log('Uploaded a blob or file!');

        // Get the download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log('File available at', downloadURL);

        // Create new hidden input with the URL
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = 'profileImageUrl';
        hiddenInput.value = downloadURL;
        event.target.parentNode.appendChild(hiddenInput);

    } catch (error) {
        console.error("Error uploading file: ", error);
        alert("Error uploading file: " + error.message);
        previewContainer.style.display = 'none';
    }
    hideLoader();
};

//function to handle image upload for updates
const handleUpdateImageUpload = async (event, currentImageUrl) => {
    showLoader();
    const file = event.target.files[0];
    if (!file) {
        hideLoader();
        return;
    }

    const storage = getStorage();

    try {
        // If there's an existing image, try to delete it first
        if (currentImageUrl) {
            try {
                const oldImageRef = ref(storage, currentImageUrl);
                await deleteObject(oldImageRef);
                console.log('Old image deleted successfully');
            } catch (deleteError) {
                if (deleteError.code === 'storage/object-not-found') {
                    console.log('Old image not found, proceeding with upload');
                } else {
                    throw deleteError; // Re-throw if it's a different error
                }
            }
        }

        // Generate a unique filename to avoid conflicts
        const fileExtension = file.name.split('.').pop();
        const uniqueFileName = `Profile_Image/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;

        // Upload the new file
        const storageRef = ref(storage, uniqueFileName);
        const snapshot = await uploadBytes(storageRef, file);
        console.log('Uploaded a new file!');

        // Get the download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log('File available at', downloadURL);

        // Update the hidden input field
        let hiddenInput = document.getElementById('update-profile-image-url');
        if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = 'update-profile-image-url';
            hiddenInput.name = 'profileImageUrl';
            event.target.parentNode.appendChild(hiddenInput);
        }
        hiddenInput.value = downloadURL;

        // Update the preview image if it exists
        const previewImage = document.getElementById('update-profile-image-preview');
        if (previewImage) {
            previewImage.src = downloadURL;
        }

    } catch (error) {
        console.error("Error handling file: ", error);
        alert("Error handling file: " + error.message);
    } finally {
        hideLoader();
    }
};


// Function to fetch data from Firestore and populate the table
const fetchDataAndPopulateTable = async () => {
    showLoader();
    try {
        const querySnapshot = await getDocs(collection(db, 'Barangay_Officials'));
        if (querySnapshot.empty) {
            console.log('No documents found.');
            return;
        }
             
        const officials = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            officials.push({ docId: doc.id, data });
        });

        // Define the order of positions
        const preferredOrder = [
            "PUNONG BARANGAY",
            "SECRETARY",
            "TREASURER",
            "KONSEHAL",
            "SK CHAIRMAN"
        ];

        // Sort the officials array
        officials.sort((a, b) => {
            const indexA = preferredOrder.indexOf(a.data.position.toUpperCase());
            const indexB = preferredOrder.indexOf(b.data.position.toUpperCase());
            
            // If both positions are in the preferredOrder array
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            // If only a's position is in the preferredOrder array
            if (indexA !== -1) return -1;
            // If only b's position is in the preferredOrder array
            if (indexB !== -1) return 1;
            // If neither position is in the preferredOrder array, maintain their relative order
            return 0;
        });

        officialsTable.innerHTML = '';

        officials.forEach(({ docId, data }) => {
            addOfficialToTable(docId, data);
        });

    } catch (error) {
        console.error('Error fetching documents: ', error);
        alert('Error fetching documents: ' + error.message);
    } finally {
        hideLoader();
    }
};

// Function to show action menu


// Function to add official data to the table
const addOfficialToTable = (docId, data) => {
    const row = officialsTable.insertRow();
    row.dataset.id = docId;

    const imgCell = row.insertCell();
    const img = document.createElement('img');
    img.src = data.profileImageUrl || '';
    img.alt = 'Profile Picture';
    img.width = 50;
    img.height = 50;
    img.onerror = function() { this.src = ''; };
    imgCell.appendChild(img);


    row.insertCell().textContent = `${data.firstName} ${data.middleName} ${data.lastName} ${data.suffix}`;
    row.insertCell().textContent = data.position;
    row.insertCell().textContent = data.termStart;
    row.insertCell().textContent = data.termEnd;
    row.insertCell().textContent = data.chair;
    row.insertCell().textContent = data.status;

    const actionCell = row.insertCell();
    const button = document.createElement('button');
    button.textContent = 'Action';
    button.classList.add('action-button');
    actionCell.appendChild(button);

    button.addEventListener('click', (event) => {
        event.stopPropagation(); 
        showActionMenu(event, docId);
    });

    row.addEventListener('click', () => {
        displayRowData(data);
    });
};

//############################### DISPLAY TABLE ROW DATA ####################################

const displayRowData = (data) => {
    const content = `
        <div class="popup-content">
        <div class="profile-image-container">
                <img src="${data.profileImageUrl || '/resources/acct.png'}" alt="Profile Picture" 
                     style="width: 150px; height: 150px; object-fit: cover; border-radius: 50%;">
            </div>
            <div class="column">
                <p><strong style="color: #aeadad;">First Name:&nbsp&nbsp</strong> ${data.firstName}</p>
                <p><strong style="color: #aeadad;">Middle Name:&nbsp&nbsp</strong> ${data.middleName}</p>
                <p><strong style="color: #aeadad;">Last Name:&nbsp&nbsp</strong> ${data.lastName}</p>
                <p><strong style="color: #aeadad;">Suffix:&nbsp&nbsp</strong> ${data.suffix}</p>
                <p><strong style="color: #aeadad;">Position:&nbsp&nbsp</strong> ${data.position}</p>
                <p><strong style="color: #aeadad;">Term Start:&nbsp&nbsp</strong> ${data.termStart}</p>
                <p><strong style="color: #aeadad;">Term End:&nbsp&nbsp</strong> ${data.termEnd}</p>
            </div>
            <div class="column">
                <p><strong style="color: #aeadad;">Chairmanship:&nbsp&nbsp</strong> ${data.chair}</p>
                <p><strong style="color: #aeadad;">Status:&nbsp&nbsp</strong> ${data.status}</p>
                <p><strong style="color: #aeadad;">Phone:&nbsp&nbsp</strong> ${data.phone}</p>
                <p><strong style="color: #aeadad;">Citizenship:&nbsp&nbsp</strong> ${data.citizenship}</p>
                <p><strong style="color: #aeadad;">Gender:&nbsp&nbsp</strong> ${data.gender}</p>
                <p><strong style="color: #aeadad;">Age:&nbsp&nbsp</strong> ${data.age}</p>
            </div>
        </div>
    `;
    
    const subPopupContent = document.getElementById('displayPopupContent');
    const subOverlay = document.getElementById('subOverlay');
    const subPopup = document.getElementById('displayPopup');

    if (subPopupContent && subOverlay && subPopup) {
        subPopupContent.innerHTML = content;
        subOverlay.style.display = 'flex';
        subPopup.style.display = 'block';
    } else {
        console.error('One or more required elements not found');
    }
};

document.getElementById('okCloseDisplay').addEventListener('click', () => {
    document.getElementById('subOverlay').style.display = 'none';
    document.getElementById('displayPopup').style.display = 'none';
});

// ################################################################

const showUpdatePopup = async (docId) => {
    const overlay = document.getElementById('updateOverlay');
    const popupContainer = document.getElementById('updatePopupContainer');
    const form = document.getElementById('update-info-form');

    try {
        const docRef = doc(db, 'Barangay_Officials', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            console.log('Document data:', docSnap.data());
            const data = docSnap.data();

            document.getElementById('update-fname').value = data.firstName || '';
            document.getElementById('update-mname').value = data.middleName || '';
            document.getElementById('update-lname').value = data.lastName || '';
            document.getElementById('update-suffix').value = data.suffix || '';
            document.getElementById('update-address1').value = data.address1 || '';
            document.getElementById('update-address2').value = data.address2 || '';
            document.getElementById('update-term-start').value = data.termStart || '';
            document.getElementById('update-term-end').value = data.termEnd || '';
            document.getElementById('update-citizenship').value = data.citizenship || '';
            // document.getElementById('update-age').value = data.age || '';
            document.getElementById('update-phone').value = data.phone || '';

            const genderSelect = document.getElementById('update-gender');
            const positionSelect = document.getElementById('update-position');
            const chairSelect = document.getElementById('update-chair');
            const statusSelect = document.getElementById('update-status');

            const normalizeValue = (value) => value ? value.toString().trim().toLowerCase() : '';

            const setSelectValue = (selectElement, value) => {
                const normalizedValue = normalizeValue(value);
                for (const option of selectElement.options) {
                    if (normalizeValue(option.value) === normalizedValue) {
                        selectElement.value = option.value;
                        break;
                    }
                }
            };

            setSelectValue(genderSelect, data.gender);
            setSelectValue(positionSelect, data.position);
            setSelectValue(chairSelect, data.chair);
            setSelectValue(statusSelect, data.status);

            // Remove existing preview container if it exists
            const existingPreview = document.querySelector('#update-profile-image-preview')?.parentElement;
            if (existingPreview) {
                existingPreview.remove();
            }

            // Create new preview container
            const imagePreviewContainer = document.createElement('div');
            imagePreviewContainer.innerHTML = `
                <img id="update-profile-image-preview" src="${data.profileImageUrl || ''}" 
                     alt="Profile Picture Preview" style="width: 100px; height: 100px; object-fit: cover;">
            `;
            const fileInput = document.getElementById('update-profile-picture');
            fileInput.parentNode.insertBefore(imagePreviewContainer, fileInput);

            let hiddenInput = document.getElementById('update-profile-image-url');
            if (!hiddenInput) {
                hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.id = 'update-profile-image-url';
                hiddenInput.name = 'profileImageUrl';
                fileInput.parentNode.appendChild(hiddenInput);
            }
            hiddenInput.value = data.profileImageUrl || '';

            fileInput.addEventListener('change', (event) => handleUpdateImageUpload(event, data.profileImageUrl));
            
            form.dataset.id = docId;
            console.log('Form ID set to:', form.dataset.id);
        } else {
            console.log("No such document!");
            alert("No such document found!");
            return;
        }
    } catch (error) {
        console.error("Error fetching document: ", error);
        alert("Error fetching document: " + error.message);
        return;
    }

    overlay.style.display = 'block';
    popupContainer.style.display = 'block';

    document.getElementById('updateCloseButton').addEventListener('click', () => {
        overlay.style.display = 'none';
        popupContainer.style.display = 'none';
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.style.display = 'none';
            popupContainer.style.display = 'none';
        }
    });
};

addOfficialButton.addEventListener('click', showAddOfficialPopup);
closeButton.addEventListener('click', closePopup);
overlay.addEventListener('click', closePopup);
infoForm.addEventListener('submit', handleSubmit);

document.getElementById('profile-picture').addEventListener('change', handleImageUpload);
window.addEventListener('DOMContentLoaded', fetchDataAndPopulateTable);

//############################# CHECK EXISTING POSITION #########################3

const checkExistingPosition = async (position) => {
    const uniquePositions = ["PUNONG BARANGAY", "SECRETARY", "TREASURER", "SK CHAIRMAN"];
    if (!uniquePositions.includes(position.toUpperCase())) {
      return false;
    }
  
    const q = query(collection(db, 'Barangay_Officials'), where("position", "==", position.toUpperCase()));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  document.getElementById('okDuplicate').addEventListener('click', () => {
    document.getElementById('subOverlay2').style.display = 'none';
    document.getElementById('subPopup2').style.display = 'none';
});

//############################# SUBMISSION DISPLAY #########################3

const showConfirmationPopup = (data) => {
    const subPopupContent = document.getElementById('subPopupContent');
    const subOverlay = document.getElementById('subOverlay');
    const subPopup = document.getElementById('subPopup');
    
    subPopupContent.innerHTML = generatePopupContent(data);
    subOverlay.style.display = 'flex';
    subPopup.style.display = 'block';
};

const generatePopupContent = (data) => `
    <div class="popup-content">
        <div class="column">
            <p><strong style="color: #aeadad;">Position:</strong> ${data.position}</p>
            <p><strong style="color: #aeadad;">First Name:</strong> ${data.firstName}</p>
            <p><strong style="color: #aeadad;">Middle Name:</strong> ${data.middleName}</p>
            <p><strong style="color: #aeadad;">Last Name:</strong> ${data.lastName}</p>
            <p><strong style="color: #aeadad;">Suffix:</strong> ${data.suffix}</p>
            <p><strong style="color: #aeadad;">Age:</strong> ${data.age}</p>
        </div>
        <div class="column">
            <p><strong style="color: #aeadad;">Phone:</strong> ${data.phone}</p>
            <p><strong style="color: #aeadad;">Citizenship:</strong> ${data.citizenship}</p>
            <p><strong style="color: #aeadad;">Gender:</strong> ${data.gender}</p>
            <p><strong style="color: #aeadad;">Status:</strong> ${data.status}</p>
            <p><strong style="color: #aeadad;">Chairmanship:</strong> ${data.chair}</p>
        </div>
    </div>
`;

document.getElementById('okSubmission').addEventListener('click', () => {
    document.getElementById('subOverlay').style.display = 'none';
    document.getElementById('subPopup').style.display = 'none';
});


const fetchAndDisplayOfficials = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, 'Barangay_Officials'));
        const officialsRow = document.getElementById('officialsRow');
        
        // Check if element exists
        if (!officialsRow) {
            console.warn('Officials row element not found');
            return;
        }

        // Clear existing content
        officialsRow.innerHTML = '';

        // Add officials
        querySnapshot.forEach((doc) => {
            const officialData = doc.data();
            const officialElement = document.createElement('div');
            officialElement.classList.add('official');
            officialElement.innerHTML = `
                <img src="${officialData.profileImageUrl || '/resources/acct.png'}" alt="Profile Picture">
                <h3>${officialData.firstName} ${officialData.lastName}</h3>
                <p>${officialData.position}</p>
            `;
            officialsRow.appendChild(officialElement);
        });
    } catch (error) {
        console.error('Error fetching officials:', error);
    }
};

  window.addEventListener('DOMContentLoaded', fetchAndDisplayOfficials);
  

//###############################  ####################################

const showActionMenu = (event, docId) => {
    const actionMenu = document.createElement('div');
    actionMenu.classList.add('action-menu');
    actionMenu.style.display = 'block';
    actionMenu.innerHTML = `
        <button class="action-update">Update</button>
        <button class="action-remove">Remove</button>
    `;

    // Remove any existing action menus
    document.querySelectorAll('.action-menu').forEach(menu => menu.remove());

    // Position the menu
    actionMenu.style.position = 'absolute';
    actionMenu.style.top = `${event.pageY}px`;
    actionMenu.style.left = `${event.pageX}px`;
    document.body.appendChild(actionMenu);

    // Add event listeners
    actionMenu.querySelector('.action-update').addEventListener('click', () => {
        showUpdatePopup(docId);
        actionMenu.remove();
    });

    actionMenu.querySelector('.action-remove').addEventListener('click', () => {
        showRemoveConfirmation(docId);
        actionMenu.remove();
    });

    // Close menu when clicking outside
    document.addEventListener('click', function closeMenu(e) {
        if (!actionMenu.contains(e.target) && e.target !== event.target) {
            actionMenu.remove();
            document.removeEventListener('click', closeMenu);
        }
    }, { once: true });

    // Prevent the event from bubbling up
    event.stopPropagation();
};

const archiveStyles = document.createElement('style');
archiveStyles.textContent = `
    .modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1000;
    }

    .modal-content {
        background-color: #fefefe;
        margin: 15% auto;
        padding: 20px;
        border-radius: 8px;
        width: 50%;
        max-width: 500px;
        position: relative;
    }

    .close-btn {
        position: absolute;
        right: 10px;
        top: 10px;
        font-size: 24px;
        cursor: pointer;
    }

    #archiveForm {
        display: flex;
        flex-direction: column;
        gap: 15px;
        margin-top: 20px;
    }

    #archiveForm select,
    #archiveForm textarea {
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        width: 100%;
    }

    .btn-submit {
        background: #dc3545;
        color: white;
        padding: 10px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .btn-submit:hover {
        background: #c82333;
    }
`;
document.head.appendChild(archiveStyles);

// Update showRemoveConfirmation function
const showRemoveConfirmation = (docId) => {
    const archivePopup = document.getElementById('archivePopup');
    const closeBtn = document.getElementById('closeArchivePopup');
    const archiveForm = document.getElementById('archiveForm');
    const officialIdInput = document.getElementById('officialId');
    const archiveStatusSelect = document.getElementById('archiveStatus'); // Updated ID

    // Reset form and set docId
    archiveForm.reset();
    officialIdInput.value = docId;
    archivePopup.style.display = 'block';

    closeBtn.onclick = () => {
        archivePopup.style.display = 'none';
    };

    archiveForm.onsubmit = async (e) => {
        e.preventDefault();
        
        // Get values using new ID
        const status = archiveStatusSelect.value.toUpperCase();
        const remarks = document.getElementById('remarks').value;

        console.log('Form Values:', {
            status,
            remarks,
            docId: officialIdInput.value
        });

        if (!status) {
            alert('Please select a status');
            return;
        }

        const confirmResult = confirm("Are you sure you want to archive this official?");
        if (confirmResult) {
            try {
                await removeOfficial(docId, status, remarks);
                archivePopup.style.display = 'none';
            } catch (error) {
                console.error('Error in archive process:', error);
                alert('Failed to archive official: ' + error.message);
            }
        }
    };
};

const removeOfficial = async (docId, status, remarks) => {
    if (!status) {
        throw new Error('Status is required');
    }

    try {
        showLoader();
        console.log('Starting archive process with status:', status);
        
        const [officialDoc, adminDoc] = await Promise.all([
            getDoc(doc(db, 'Barangay_Officials', docId)),
            getDoc(doc(db, 'Admin_Accounts', auth.currentUser?.uid))
        ]);

        if (!officialDoc.exists()) {
            throw new Error('Official not found');
        }

        const officialData = officialDoc.data();
        const adminUsername = adminDoc.exists() ? adminDoc.data().username : 'unknown';
        const removedDate = new Date().toLocaleDateString();

        if (officialData.profileImageUrl) {
            try {
                const storage = getStorage();
                const imageRef = ref(storage, officialData.profileImageUrl);
                await deleteObject(imageRef);
                console.log('Profile image deleted successfully');
            } catch (error) {
                if (error.code === 'storage/object-not-found') {
                    console.log('Profile image not found in storage');
                } else {
                    console.error('Error deleting profile image:', error);
                }
            }
        }

        const archivedData = {
            ...officialData,
            archivedAt: new Date(),
            archivedBy: `${adminUsername}\n${removedDate}`,
            originalDocId: docId,
            status: status,
            archiveRemarks: remarks,
            reason: 'User Archived'
        };

        console.log('Status being archived:', status);
        console.log('Complete archived data:', archivedData);

        const archiveRef = await addDoc(collection(db, 'archived_officials'), archivedData);
        
        const savedDoc = await getDoc(archiveRef);
        console.log('Saved Archive Data:', savedDoc.data());

        await deleteDoc(doc(db, 'Barangay_Officials', docId));

        await addDoc(collection(db, 'Logs'), {
            action: 'OFFICIAL_ARCHIVED',
            officialName: `${officialData.firstName} ${officialData.lastName}`,
            position: officialData.position,
            timestamp: new Date(),
            performedBy: adminUsername,
            status: status,
            remarks: remarks,
            details: {
                archiveId: archiveRef.id,
                originalId: docId
            }
        });

        await fetchDataAndPopulateTable();
        await fetchAndDisplayOfficials();

        alert('Official has been archived successfully');

    } catch (error) {
        console.error('Error archiving official:', error);
        throw error;
    } finally {
        hideLoader();
    }
};

// ########################## suggestion list #########################
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

async function initializeOfficialsAutocomplete() {
    const formInputs = {
        firstNameInput: document.getElementById('fname'),
        middleNameInput: document.getElementById('mname'),
        lastNameInput: document.getElementById('lname'),
        suffixInput: document.getElementById('suffix'),
        blklotInput: document.getElementById('blklot'),
        streetInput: document.getElementById('street'),
        genderInput: document.getElementById('gender'),
        maritalStatusInput: document.getElementById('marital-status'),
        statusInput: document.getElementById('status'),
        positionInput: document.getElementById('position'),
        chairInput: document.getElementById('chair'),
        termStartInput: document.getElementById('term-start'),
        termEndInput: document.getElementById('term-end')
    };

    // Setup autocomplete for first name input
    setupAutocomplete(formInputs.firstNameInput, formInputs);

    function setupAutocomplete(input, formInputs) {
        if (!input.parentElement.classList.contains('autocomplete-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'autocomplete-wrapper';
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);

            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'suggestions-container';
            wrapper.appendChild(suggestionsContainer);
        }

        // Add necessary styles if they don't exist
        if (!document.getElementById('officials-autocomplete-styles')) {
            const style = document.createElement('style');
            style.id = 'officials-autocomplete-styles';
            style.textContent = `
                .autocomplete-wrapper {
                    position: relative;
                    width: auto;
                }
                
                .suggestions-container {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    max-height: 200px;
                    overflow-y: auto;
                    background-color: white;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    z-index: 1000;
                    display: none;
                    margin-top: 2px;
                }
                
                .suggestion-item {
                    padding: 8px 12px;
                    cursor: pointer;
                    border-bottom: 1px solid #eee;
                }
                
                .suggestion-item:hover,
                .suggestion-item.active {
                    background-color: #f5f5f5;
                }
                
                .suggestion-id {
                    font-size: 0.8em;
                    color: #666;
                    margin-bottom: 2px;
                }
                
                .suggestion-name {
                    font-weight: 500;
                    margin-bottom: 4px;
                }
                
                .suggestion-details {
                    font-size: 0.9em;
                    color: #666;
                }
            `;
            document.head.appendChild(style);
        }

        const suggestionsContainer = input.parentElement.querySelector('.suggestions-container');

        async function fetchSuggestions(searchTerm) {
            if (searchTerm.length < 2) {
                suggestionsContainer.style.display = 'none';
                return;
            }

            try {
                const searchTermUpper = searchTerm.toUpperCase();
                
                // Create references to both collections
                const officialsRef = collection(db, 'officials');
                const usersRef = collection(db, 'users');

                // Query both collections
                const [officialsSnapshot, usersSnapshot] = await Promise.all([
                    // Query officials collection
                    getDocs(query(officialsRef,
                        where('firstName', '>=', searchTermUpper),
                        where('firstName', '<=', searchTermUpper + '\uf8ff'),
                        limit(5)
                    )),
                    // Query users collection
                    getDocs(query(usersRef,
                        where('firstName', '>=', searchTermUpper),
                        where('firstName', '<=', searchTermUpper + '\uf8ff'),
                        limit(5)
                    ))
                ]);

                // Combine results from both collections
                const results = new Map();
                
                // Add officials results
                officialsSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    results.set(doc.id, { ...data, id: doc.id, isOfficial: true });
                });

                // Add users results
                usersSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (!results.has(doc.id)) { // Avoid duplicates
                        results.set(doc.id, { ...data, id: doc.id, isOfficial: false });
                    }
                });

                suggestionsContainer.innerHTML = '';

                if (results.size === 0) {
                    suggestionsContainer.style.display = 'none';
                    return;
                }

                // Create suggestion items
                Array.from(results.values()).forEach(data => {
                    const suggestionItem = document.createElement('div');
                    suggestionItem.className = 'suggestion-item';

                    const fullName = `${data.firstName || ''} ${data.middleName || ''} ${data.lastName || ''} ${data.suffix || ''}`.trim();
                    const birthdate = data.birthdate 
                    ? new Date(data.birthdate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) 
                    : 'N/A';
                                    suggestionItem.innerHTML = `
                        <div class="suggestion-id">ID: ${data.id || 'N/A'}</div>
                        <div class="suggestion-name">${fullName}</div>
                        <div class="suggestion-birthdate">${birthdate}</div>
                        <div class="suggestion-details">${data.isOfficial ? 'Position: ' + (data.position || 'Not specified') : 'Resident'}</div>
                    `;

                    suggestionItem.addEventListener('click', () => {
                        // Populate form fields
                        formInputs.firstNameInput.value = data.firstName || '';
                        formInputs.middleNameInput.value = data.middleName || '';
                        formInputs.lastNameInput.value = data.lastName || '';
                        formInputs.suffixInput.value = data.suffix || '';
                        formInputs.blklotInput.value = data.blklot || '';
                        formInputs.streetInput.value = data.street || '';

                        // Only populate these fields if they exist (for officials)
                        if (data.isOfficial) {
                            if (data.gender) formInputs.genderInput.value = data.gender;
                            if (data.maritalStatus) formInputs.maritalStatusInput.value = data.maritalStatus;
                            if (data.status) formInputs.statusInput.value = data.status;
                            if (data.position) formInputs.positionInput.value = data.position;
                            if (data.chair) formInputs.chairInput.value = data.chair;
                            if (data.termStart) formInputs.termStartInput.value = data.termStart;
                            if (data.termEnd) formInputs.termEndInput.value = data.termEnd;
                        }

                        // Handle profile picture if it exists
                        const profilePreview = document.getElementById('profile-preview');
                        const previewContainer = document.getElementById('profile-preview-container');
                        if (profilePreview && previewContainer && data.profilePicture) {
                            profilePreview.src = data.profilePicture;
                            previewContainer.style.display = 'block';
                        }

                        suggestionsContainer.style.display = 'none';
                    });

                    suggestionsContainer.appendChild(suggestionItem);
                });

                suggestionsContainer.style.display = 'block';

            } catch (error) {
                console.error('Error fetching suggestions:', error);
                suggestionsContainer.style.display = 'none';
            }
        }

        // Add debounced input event listener
        const debouncedFetch = debounce(fetchSuggestions, 300);
        input.addEventListener('input', (e) => debouncedFetch(e.target.value));

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
            }
        });

        // Handle keyboard navigation
        input.addEventListener('keydown', (e) => {
            const items = suggestionsContainer.getElementsByClassName('suggestion-item');
            const activeItem = suggestionsContainer.querySelector('.suggestion-item.active');

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    if (!activeItem && items.length > 0) {
                        items[0].classList.add('active');
                    } else if (activeItem && activeItem.nextElementSibling) {
                        activeItem.classList.remove('active');
                        activeItem.nextElementSibling.classList.add('active');
                    }
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    if (activeItem && activeItem.previousElementSibling) {
                        activeItem.classList.remove('active');
                        activeItem.previousElementSibling.classList.add('active');
                    }
                    break;

                case 'Enter':
                    if (activeItem) {
                        e.preventDefault();
                        activeItem.click();
                    }
                    break;

                case 'Escape':
                    suggestionsContainer.style.display = 'none';
                    break;
            }
        });
    }
}

// Initialize autocomplete when the document is loaded
document.addEventListener('DOMContentLoaded', initializeOfficialsAutocomplete);