// /#################### REGISTERVISITOR.JS ########################
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, query, where } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

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
    const auth = getAuth();
    const db = getFirestore(app);


    const infoForm = document.getElementById('personal-info-form');
    const submitBtn = document.getElementById('sign-up');
    const agreementCheckbox = document.getElementById('agreement');

    // Function to check form validity and enable/disable submit button
    const updateSubmitButton = () => {
        if (infoForm.checkValidity() && agreementCheckbox.checked) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('inactive-submit');
        } else {
            submitBtn.disabled = true;
            submitBtn.classList.add('inactive-submit');
        }
    };

    // Event listeners for input fields and checkbox
    infoForm.addEventListener('input', updateSubmitButton);
    agreementCheckbox.addEventListener('change', updateSubmitButton);

    const handleSubmit = async (event) => {
        event.preventDefault();
    
        const formData = new FormData(infoForm);
        const data = {
            username: formData.get('username').toUpperCase(),
            password: formData.get('password'),
            firstName: formData.get('fname').toUpperCase(),
            lastName: formData.get('lname').toUpperCase(),
            email: formData.get('email') || '',
            phone: formData.get('phone') || '',
            birthdate: formData.get('birthdate'),
            registrationDate: new Date().toISOString() // Add registration date
        };
    
        try {
            const existingUser = await checkExistingUser(
                data.firstName,
                data.lastName, 
                data.birthdate
            );
    
            if (existingUser.exists) {
                const originalPassword = data.password;
                const key = CryptoJS.enc.Utf8.parse('1234567890123456');
                const encryptedPassword = CryptoJS.AES.encrypt(originalPassword, key, {
                    mode: CryptoJS.mode.ECB
                }).toString();
    
                const userCredentials = await createUserWithEmailAndPassword(auth, data.email, originalPassword);
                const userId = userCredentials.user.uid;
    
                await sendEmailVerification(auth.currentUser);
                alert("Email Verification Sent! Please verify your email to complete registration.");
    
                // Update users collection with registration date
                await setDoc(doc(db, 'users', existingUser.userData.uniqueId), {
                    ...existingUser.userData,
                    username: data.username,
                    email: data.email,
                    phone: data.phone,
                    isRegistered: true,
                    registrationDate: data.registrationDate,
                    userId: userId,
                });
    
                // Update User_Accounts with registration date
                await setDoc(doc(db, 'User_Accounts', userId), {
                    username: data.username,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    phone: data.phone,
                    birthdate: data.birthdate,
                    password: encryptedPassword,
                    uniqueId: existingUser.userData.uniqueId,
                    isRegistered: true,
                    registrationDate: data.registrationDate
                });
    
                infoForm.reset();
                showPopup({ ...data, uniqueId: existingUser.userData.uniqueId }, originalPassword);
    
            } else {
                const originalPassword = data.password;
                const key = CryptoJS.enc.Utf8.parse('1234567890123456');
                const encryptedPassword = CryptoJS.AES.encrypt(originalPassword, key, {
                    mode: CryptoJS.mode.ECB
                }).toString();
    
                const userCredentials = await createUserWithEmailAndPassword(auth, data.email, originalPassword);
                const userId = userCredentials.user.uid;
    
                await sendEmailVerification(auth.currentUser);
                alert("Email Verification Sent! Please verify your email to complete registration.");
    
                const uniqueId = await generateCustomId(db);
    
                // Create new user in users collection with registration date
                await setDoc(doc(db, 'users', uniqueId), {
                    username: data.username,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    phone: data.phone,
                    birthdate: data.birthdate,
                    uniqueId,
                    userId: userId,
                    isRegistered: true,
                    registrationDate: data.registrationDate
                });
    
                // Create entry in User_Accounts with registration date
                await setDoc(doc(db, 'User_Accounts', userId), {
                    username: data.username,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    phone: data.phone,
                    birthdate: data.birthdate,
                    password: encryptedPassword,
                    uniqueId,
                    isRegistered: true,
                    registrationDate: data.registrationDate
                });
    
                infoForm.reset();
                showPopup({ ...data, uniqueId }, originalPassword);
            }
    
            submitBtn.disabled = true;
            submitBtn.classList.add('inactive-submit');
    
        } catch (error) {
            console.error("Error during registration:", error);
            alert(error.message);
        }
    };

    async function checkExistingUser(firstName, lastName, birthdate) {
        try {
            // Convert input to uppercase to match stored data format
            const upperFirstName = firstName.toUpperCase();
            const upperLastName = lastName.toUpperCase();
    
            console.log("Checking for user with:", {
                firstName: upperFirstName,
                lastName: upperLastName,
                birthdate: birthdate
            });
    
            const usersRef = collection(db, 'users');
            
            // Use uppercase values in the query
            const q = query(usersRef, 
                where('firstName', '==', upperFirstName),
                where('lastName', '==', upperLastName),
                where('birthdate', '==', birthdate)
            );
    
            const querySnapshot = await getDocs(q);
            console.log("Query results found:", querySnapshot.size);
    
            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                console.log("Found matching user:", userData);
                return {
                    exists: true,
                    userData: userData,
                    docId: querySnapshot.docs[0].id
                };
            }
    
            // If no match found, log the details
            console.log("No matching user found in database");
            return {
                exists: false,
                userData: null,
                docId: null
            };
    
        } catch (error) {
            console.error("Error in checkExistingUser:", error);
            throw error;
        }
    }
  
    async function generateCustomId(db) {
        const counterDoc = await getDoc(doc(db, 'counters', 'userCounter'));
        let counter;
    
        if (counterDoc.exists()) {
            counter = counterDoc.data().count;
            await setDoc(doc(db, 'counters', 'userCounter'), { count: counter + 1 });
        } else {
            counter = 1;
            await setDoc(doc(db, 'counters', 'userCounter'), { count: counter });
        }
    
        const paddedCounter = String(counter).padStart(6, '0');
        return `SADPI-${paddedCounter}`;
    }
    

      

      const showPopup = (data, originalPassword) => {
        const popup = document.getElementById('popup');
        const popupContent = document.getElementById('popupContent');
    
        if (popupContent) {
            popupContent.innerHTML = generatePopupContent(data, originalPassword);
            popup.classList.add('active');
    
            const closePopupButton = document.getElementById('closePopup');
            if (closePopupButton) {
                closePopupButton.addEventListener('click', () => {
                    popup.classList.remove('active');
                    window.location.href = '/public/loginPage.html';
                });
            }
    
            const togglePasswordButton = document.getElementById('togglePassword');
            const passwordDisplay = document.getElementById('passwordDisplay');
            if (togglePasswordButton && passwordDisplay) {
                togglePasswordButton.addEventListener('click', () => {
                    // Toggle visibility logic
                    const currentType = passwordDisplay.getAttribute('data-type');
                    if (currentType === 'password') {
                        passwordDisplay.setAttribute('data-type', 'text');
                        passwordDisplay.innerText = originalPassword; // Show original password
                    } else {
                        passwordDisplay.setAttribute('data-type', 'password');
                        passwordDisplay.innerText = '*'.repeat(originalPassword.length); // Show masked password
                    }
                });
            } else {
                console.error("Toggle password button or password display element not found.");
            }
        } else {
            console.error("Popup elements not found in the DOM.");
        }
    };
    

    const generatePopupContent = (data, originalPassword) => `
    <p><strong style="color: #e1e1e1;">Unique ID:&nbsp;</strong> ${data.uniqueId}</p>
    <p><strong style="color: #585858;">Username:&nbsp;</strong> ${data.username}</p>
    <p><strong style="color: #e1e1e1;">Password:&nbsp;</strong>
        <span style="display: inline-flex; align-items: center;">
            <span id="passwordDisplay" data-type="password">${'*'.repeat(originalPassword.length)}</span>
            <span class="eye-icon" id="togglePassword" style="margin-left: 10px; cursor: pointer;">
                <img id="eye" src="/icons/eye_slash_icon_white.jpg" alt="Show password" />
                <img id="eye-slash" src="/icons/eye_icon_white.jpg" alt="Hide password" style="display: none;" />
            </span>
        </span>
    </p>
    <p><strong style="color: #e1e1e1;">First Name:&nbsp;</strong> ${data.firstName}</p>
    <p><strong style="color: #e1e1e1;">Last Name:&nbsp;</strong> ${data.lastName}</p>
    <p><strong style="color: #e1e1e1;">Email:&nbsp;</strong> ${data.email}</p>
    <p><strong style="color: #e1e1e1;">Phone:&nbsp;</strong> ${data.phone}</p>
    <p><strong style="color: #e1e1e1;">Birthdate:&nbsp;</strong> ${data.birthdate}</p>
    <p><strong style="color: #e1e1e1;">Registration Date:&nbsp;</strong> ${new Date(data.registrationDate).toLocaleString()}</p>
`;

infoForm.addEventListener('submit', handleSubmit);

});

