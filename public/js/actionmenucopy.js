//actionmmenu.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";


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

    const residentsTable = document.getElementById('residentsTable').getElementsByTagName('tbody')[0];
    const confirmationPopup = document.getElementById('confirmationPopup');
    const deleteConfirmationPopup = document.getElementById('deleteConfirmationPopup');
    const deleteConfirmationMessage = document.getElementById('deleteConfirmationMessage');
    let residentIdToRemove = null;

    const showConfirmationPopup = (residentId) => {
        residentIdToRemove = residentId;
        confirmationPopup.style.display = 'block';
    };

    const hideConfirmationPopup = () => {
        residentIdToRemove = null;
        confirmationPopup.style.display = 'none';
    };

    const hideDeleteConfirmation = () => {
        deleteConfirmationPopup.style.display = 'none';
    };

    document.getElementById('cancelRemove').addEventListener('click', () => {
        hideConfirmationPopup();
    });

    document.getElementById('confirmRemove').addEventListener('click', async () => {
        if (residentIdToRemove) {
            try {
                const docRef = doc(db, 'users', residentIdToRemove);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    await setDoc(doc(db, 'archived', residentIdToRemove), data);
                    await deleteDoc(docRef);

                    const row = document.querySelector(`[data-id='${residentIdToRemove}']`);
                    if (row) row.remove();

                    deleteConfirmationMessage.textContent = `Resident with ID ${residentIdToRemove} has been deleted.`;
                    deleteConfirmationPopup.style.display = 'block';
                    hideConfirmationPopup();
                } else {
                    console.error('No such document!');
                }
            } catch (error) {
                console.error('Error archiving document:', error);
            }
        }
    });

    const showDropdownMenu = (event, residentId) => {
        const dropdown = document.createElement('div');
        dropdown.classList.add('dropdown-menu');
        dropdown.innerHTML = `
            <button onclick="window.updateResident('${residentId}')">Update</button>
            <button onclick="window.removeResident('${residentId}')">Remove</button>
        `;

        document.body.appendChild(dropdown);

        dropdown.style.top = `${event.clientY}px`;
        dropdown.style.left = `${event.clientX}px`;
        dropdown.style.display = 'block';

        const hideDropdownMenu = () => {
            dropdown.remove();
            document.removeEventListener('click', hideDropdownMenu);
        };

        setTimeout(() => {
            document.addEventListener('click', hideDropdownMenu);
        }, 0);
    };

    window.updateResident = async (residentId) => {
        try {
            const docRef = doc(db, 'users', residentId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                populateUpdatePopup(residentId, data);
            } else {
                console.error('No such document!');
            }
        } catch (error) {
            console.error('Error fetching document:', error);
        }
    };

    const populateUpdatePopup = (residentId, data) => {
        // Populate the popup fields with existing data
        document.getElementById('docid').value = residentId;
        document.getElementById('fname').value = data.firstName || '';
        document.getElementById('mname').value = data.middleName || '';
        document.getElementById('lname').value = data.lastName || '';
        document.getElementById('suffix').value = data.suffix || '';
        document.getElementById('blklot').value = data.blockLot || '';
        document.getElementById('street').value = data.street || '';
        document.getElementById('citizenship').value = data.citizenship || '';
        document.getElementById('age').value = data.age || '';
        document.getElementById('birthdate').value = data.birthdate || '';
        document.getElementById('birthplace').value = data.birthplace || '';
        document.getElementById('gender').value = data.gender || '';
        document.getElementById('voter').value = data.voterStatus || '';
        document.getElementById('email').value = data.email || '';
        document.getElementById('marital-status').value = data.maritalStatus || '';
        document.getElementById('employment-status').value = data.employmentStatus || '';
        document.getElementById('phone').value = data.phoneNumber || '';
        document.getElementById('occupation').value = data.occupation || '';

        // Show the update popup
        const overlay = document.getElementById('overlay');
        const popupContainer = document.getElementById('popupContainer');
        overlay.style.display = 'block';
        popupContainer.style.display = 'block';
    };

    const closePopup = () => {
        const overlay = document.getElementById('overlay');
        const popupContainer = document.getElementById('popupContainer');
        overlay.style.display = 'none';
        popupContainer.style.display = 'none';
    };

    document.getElementById('closeButton').addEventListener('click', closePopup);

    document.getElementById('personal-info-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const residentId = document.getElementById('docid').value;
        const updatedData = {
            firstName: document.getElementById('fname').value,
            middleName: document.getElementById('mname').value,
            lastName: document.getElementById('lname').value,
            suffix: document.getElementById('suffix').value,
            blockLot: document.getElementById('blklot').value,
            street: document.getElementById('street').value,
            citizenship: document.getElementById('citizenship').value,
            age: document.getElementById('age').value,
            birthdate: document.getElementById('birthdate').value,
            birthplace: document.getElementById('birthplace').value,
            gender: document.getElementById('gender').value,
            voterStatus: document.getElementById('voter').value,
            email: document.getElementById('email').value,
            maritalStatus: document.getElementById('marital-status').value,
            employmentStatus: document.getElementById('employment-status').value,
            phoneNumber: document.getElementById('phone').value,
            occupation: document.getElementById('occupation').value
        };

        try {
            const docRef = doc(db, 'users', residentId);
            await setDoc(docRef, updatedData, { merge: true });

            // Close the popup after successful update
            closePopup();

            // Optionally, update the table row or display a confirmation
            console.log(`Resident with ID ${residentId} updated successfully.`);
        } catch (error) {
            console.error('Error updating document:', error);
        }
    });

    window.removeResident = (residentId) => {
        showConfirmationPopup(residentId);
    };

    window.editResident = (residentId) => {
        const event = window.event;
        showDropdownMenu(event, residentId);
    };

    // Example code to populate the table (replace with your data loading logic)
    const addRow = (data) => {
        const row = residentsTable.insertRow();
        row.setAttribute('data-id', data.uniqueId);
        row.innerHTML = `
            <td>${data.fullName}</td>
            <td>${data.uniqueId}</td>
            <td>${data.age}</td>
            <td>${data.civilStatus}</td>
            <td>${data.gender}</td>
            <td>${data.voterStatus}</td>
            <td><button onclick="editResident('${data.uniqueId}')">Action</button></td>
        `;
    };
});

window.hideDeleteConfirmation = () => {
    const deleteConfirmationPopup = document.getElementById('deleteConfirmationPopup');
    deleteConfirmationPopup.style.display = 'none';
};