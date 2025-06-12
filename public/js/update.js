import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
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

    const handleSubmit = async (event) => {
        event.preventDefault();

        const formData = new FormData(document.getElementById('update-info-form'));
        const residentId = formData.get('docid');
        const data = {
            firstName: formData.get('fname').toUpperCase(),
            middleName: formData.get('mname').toUpperCase() || '',
            lastName: formData.get('lname').toUpperCase(),
            suffix: formData.get('suffix').toUpperCase() || '',
            email: formData.get('email').toUpperCase() || '',
            phone: formData.get('phone').toUpperCase() || '',
            birthdate: formData.get('birthdate'),
            birthplace: formData.get('birthplace').toUpperCase() || '',
            citizenship: formData.get('citizenship').toUpperCase(),
            age: formData.get('age'),
            gender: formData.get('gender'),
            voter: formData.get('voter'),
            maritalStatus: formData.get('marital-status'),
            employmentStatus: formData.get('employment-status'),
            occupation: formData.get('occupation').toUpperCase() || '',
            blklot: formData.get('blklot').toUpperCase(),
            street: formData.get('street').toUpperCase() || ''
        };

        console.log('Form Data:', data); // Log form data to check if it's correctly accessed

        // Validate form data before submitting
        for (const key in data) {
            if (data[key] === null || data[key] === undefined) {
                console.error(`Form data for ${key} is null or undefined`);
            }
        }

        try {
            const docRef = doc(db, 'users', residentId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                await setDoc(docRef, data, { merge: true });
                console.log(`Document with ID ${residentId} successfully updated in Firestore.`);

                // Optionally, update the table row or display a confirmation
                updateResidentInTable(data, residentId); // Implement this function to update the table row
                showSubPopup(data, residentId); // Show success message or popup
                closeUpdatePopup(); // Close the update popup after successful update
            } else {
                console.error(`Document with ID ${residentId} does not exist.`);
                alert(`Document with ID ${residentId} does not exist.`);
            }
        } catch (error) {
            console.error('Error updating document:', error);
            alert('Error updating document: ' + error.message);
        }
    };

    const updateResidentInTable = (data, residentId) => {
        const row = document.querySelector(`tr[data-id='${residentId}']`);
        if (row) {
            // Update each relevant cell in the row with the new data
            row.querySelector('.fullName').textContent = `${data.firstName} ${data.middleName} ${data.lastName}`.trim();
            row.querySelector('.uniqueId').textContent = residentId;
            row.querySelector('.age').textContent = data.age;
            row.querySelector('.civilStatus').textContent = data.maritalStatus;
            row.querySelector('.gender').textContent = data.gender;
            row.querySelector('.voterStatus').textContent = data.voter;
    
            // Update the action button if needed
            const actionButtonCell = row.querySelector('.actionButton');
            if (actionButtonCell) {
                actionButtonCell.innerHTML = `<button class="action-btn" onclick="editResident('${residentId}')">Action</button>`;
            } else {
                console.error(`Action button cell for row with ID ${residentId} not found.`);
            }
        } else {
            console.error(`Table row with ID ${residentId} not found.`);
        }
    };
    
    const showSubPopup = (data, residentId) => {
        // Implement this function to show a success popup or message after update
        console.log('Showing update success popup for resident ID:', residentId);
        // Example: Find your success popup element and display it
        const popup = document.getElementById('update-success-popup');
        if (popup) {
            // Update content if necessary
            popup.textContent = `Resident ${data.firstName} ${data.lastName} updated successfully!`;
            popup.classList.add('show'); // Assuming 'show' class has CSS for displaying the popup
            setTimeout(() => {
                popup.classList.remove('show'); // Hide the popup after a delay (e.g., 3 seconds)
            }, 3000); // Adjust the timeout as needed
        } else {
            console.error('Update success popup element not found.');
        }
    };
    
    const closeUpdatePopup = () => {
        // Implement this function to close the update popup after successful update
        console.log('Closing update popup');
        // Example: Find your update popup container and hide it
        const updatePopupContainer = document.getElementById('updPopupContainer');
        if (updatePopupContainer) {
            updatePopupContainer.classList.remove('show'); // Assuming 'show' class makes the popup visible
        } else {
            console.error('Update popup container element not found.');
        }
    };
    
    // Assuming you have an event listener for form submission
    document.getElementById('upd-submit-btn').addEventListener('click', handleSubmit);

});