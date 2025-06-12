import { setupCollectionListeners } from './admin_notification.js';

// Initialize notifications when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupCollectionListeners();
});