// ############## ADMIN_AUTH.JS #######################
import {  onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";


export function checkAuth() {
    const userDisplay = document.getElementById('current-user');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userRef = doc(db, "Admin_Accounts", user.uid);
                const userDoc = await getDoc(userRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const username = userData.username || "No Username Available";
                    userDisplay.textContent = username;
                } else {
                    userDisplay.textContent = "User not found";
                }

                await checkAndUpdateAdminPrivileges(user);
            } catch (error) {
                console.error('Error fetching user data:', error);
                userDisplay.textContent = "Error fetching user data";
            }
        } else {
            userDisplay.textContent = 'No user signed in';
        }
    });
}

export async function setAdminRole(uid, role) {
    try {
        await setDoc(doc(db, 'Admin_Accounts', uid), { role: role }, { merge: true });
        console.log(`${role} role set for user:`, uid);
    } catch (error) {
        console.error(`Error setting ${role} role:`, error);
    }
}

async function checkAdminPrivileges(user) {
    try {
        const docRef = doc(db, 'Admin_Accounts', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const role = docSnap.data().role;
            console.log('User role:', role);
            return role;
        } else {
            console.log('User has no admin privileges');
            return null;
        }
    } catch (error) {
        console.error('Error checking admin privileges:', error);
        return null;
    }
}

export async function checkAndUpdateAdminPrivileges(user) {
    if (user) {
        const role = await checkAdminPrivileges(user);
        // You can perform additional actions based on the role here
        return role;
    } else {
        console.log('No user is currently signed in.');
        return null;
    }
}