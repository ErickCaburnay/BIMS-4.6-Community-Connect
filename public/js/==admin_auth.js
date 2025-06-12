// admin_auth.js
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-functions.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const ADMIN_COLLECTION = 'Admin_Accounts';
const AUTH_STATE = {
    LOADING: 'loading',
    AUTHENTICATED: 'authenticated',
    UNAUTHENTICATED: 'unauthenticated',
    ERROR: 'error'
};

class AdminAuthManager {
    constructor() {
        this.currentUser = null;
        this.authState = AUTH_STATE.LOADING;
        this.authListeners = new Set();
    }

    async initialize() {
        return new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                try {
                    if (user) {
                        const adminData = await this.verifyAndGetAdminData(user);
                        if (adminData) {
                            this.currentUser = {
                                ...adminData,
                                uid: user.uid,
                                email: user.email
                            };
                            this.authState = AUTH_STATE.AUTHENTICATED;
                            this.updateUI();
                            resolve({ success: true, admin: this.currentUser });
                        } else {
                            console.warn('User is not an admin');
                            await signOut(auth);
                            this.authState = AUTH_STATE.UNAUTHENTICATED;
                            this.redirectToLogin();
                            resolve({ success: false, error: 'Not an admin account' });
                        }
                    } else {
                        this.currentUser = null;
                        this.authState = AUTH_STATE.UNAUTHENTICATED;
                        this.updateUI();
                        this.redirectToLogin();
                        resolve({ success: false, error: 'No user signed in' });
                    }
                } catch (error) {
                    console.error('Auth initialization error:', error);
                    this.authState = AUTH_STATE.ERROR;
                    this.updateUI('Error: ' + error.message);
                    resolve({ success: false, error: error.message });
                }
            });
        });
    }

    async verifyAndGetAdminData(user) {
        try {
            // First try direct document lookup
            const directDoc = await getDoc(doc(db, ADMIN_COLLECTION, user.uid));
            if (directDoc.exists()) {
                return directDoc.data();
            }

            // Fallback to query in case document ID doesn't match UID
            const adminQuery = query(
                collection(db, ADMIN_COLLECTION),
                where('authUID', '==', user.uid)
            );
            const querySnapshot = await getDocs(adminQuery);
            
            if (!querySnapshot.empty) {
                // If found via query, update the document to use UID as document ID
                const adminData = querySnapshot.docs[0].data();
                await setDoc(doc(db, ADMIN_COLLECTION, user.uid), {
                    ...adminData,
                    authUID: user.uid
                });
                return adminData;
            }
            
            return null;
        } catch (error) {
            console.error('Error verifying admin:', error);
            throw error;
        }
    }

    updateUI(errorMessage = null) {
        const userDisplay = document.getElementById('current-user');
        if (!userDisplay) return;

        switch (this.authState) {
            case AUTH_STATE.LOADING:
                userDisplay.textContent = 'Loading...';
                break;
            case AUTH_STATE.AUTHENTICATED:
                userDisplay.textContent = this.currentUser?.username || 'Admin User';
                break;
            case AUTH_STATE.UNAUTHENTICATED:
                userDisplay.textContent = 'No user signed in';
                break;
            case AUTH_STATE.ERROR:
                userDisplay.textContent = errorMessage || 'Authentication Error';
                break;
        }
    }

    redirectToLogin() {
        const currentPath = window.location.pathname;
        if (!currentPath.includes('login.html') && this.authState === AUTH_STATE.UNAUTHENTICATED) {
            window.location.href = '/login.html';
        }
    }

    async setAdminRole(uid, role) {
        try {
            await setDoc(doc(db, ADMIN_COLLECTION, uid), 
                { 
                    role: role,
                    updatedAt: new Date().toISOString()
                }, 
                { merge: true }
            );
            console.log(`${role} role set for user:`, uid);
            return true;
        } catch (error) {
            console.error(`Error setting ${role} role:`, error);
            throw error;
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getAuthState() {
        return this.authState;
    }

    addAuthStateListener(listener) {
        this.authListeners.add(listener);
    }

    removeAuthStateListener(listener) {
        this.authListeners.delete(listener);
    }
}

// Create and export singleton instance
const adminAuth = new AdminAuthManager();

export function checkAuth() {
    return adminAuth.initialize();
}

export function setAdminRole(uid, role) {
    return adminAuth.setAdminRole(uid, role);
}

export async function checkAndUpdateAdminPrivileges(user) {
    if (!user) {
        console.log('No user is currently signed in.');
        return null;
    }
    
    try {
        const adminData = await adminAuth.verifyAndGetAdminData(user);
        return adminData?.role || null;
    } catch (error) {
        console.error('Error checking admin privileges:', error);
        return null;
    }
}

export { adminAuth };