import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { db, auth } from './firebaseConfig.js';

const checkUserRole = async (userId) => {
    try {
        const userDoc = doc(db, 'Admin_Accounts', userId);
        const docSnap = await getDoc(userDoc);
        if (docSnap.exists()) {
            const role = docSnap.data().role;
            console.log("Retrieved role:", role);
            return role;
        } else {
            console.error("No such document!");
            return null;
        }
    } catch (error) {
        console.error("Error checking user role:", error);
        return null;
    }
};

export const handleAuthStateChange = () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("User is signed in:", user.uid);
            const role = await checkUserRole(user.uid);
            console.log("User role:", role);
            
            if (role === null) {
                console.error("Role is null. User document might not exist or there's an error fetching it.");
                return;
            }

            switch(role) {
                case 'admin':
                    console.log("Redirecting to admin dashboard");
                    window.location.href = 'residentsrecords.html';
                    break;
                case 'sub-admin':
                    console.log("Redirecting to sub-admin dashboard");
                    window.location.href = 'complaints.html';
                    break;
                default:
                    console.error("Unexpected role:", role);
                    
            }
        } else {
            console.log("User is signed out");
            if (window.location.pathname !== '/loginadmin.html') {
                window.location.href = 'loginadmin.html';
            }
        }
    });
};

export { auth, db, getAuth, getFirestore };