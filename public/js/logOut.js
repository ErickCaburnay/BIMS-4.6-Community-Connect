//########### LOGOUT.JS ############

import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

(function() {
    window.logout = function() {
        const confirmLogout = window.confirm("Are you sure you want to logout?");

        if (confirmLogout) {
            const auth = getAuth();
            signOut(auth).then(() => {
                window.location.href = '/public/index.html';
            }).catch((error) => {
                console.error('Logout error:', error);
            });
        }
    }
})();

export { getAuth, signOut }

