// ###################### ADMIN_AUTH_CHECK.JS ##########################// admin_auth_check.js
import { checkAuth, adminAuth } from './==admin_auth.js';

async function initializeAdminAuth() {
    try {
        const authResult = await checkAuth();
        if (!authResult.success) {
            console.warn('Auth failed:', authResult.error);
            window.location.href = '/login.html';
            return false;
        }
        
        const currentAdmin = adminAuth.getCurrentUser();
        console.log('Admin logged in:', currentAdmin);
        return true;
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/login.html';
        return false;
    }
}

document.addEventListener('DOMContentLoaded', initializeAdminAuth);

export { initializeAdminAuth };