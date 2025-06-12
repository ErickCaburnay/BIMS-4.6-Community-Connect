// ################## ADMIN_SETTINGS.JS #####################

document.addEventListener('DOMContentLoaded', function() {
    // Get all category buttons
    const categoryButtons = document.querySelectorAll('.category-button');
    
    // Define category mappings
    const categoryMappings = {
        'All Files': 'all-files',
        'Announcements': 'announcements',
        'Resident Records': 'resident-records',
        'Barangay Clearances': 'clearances',
        'Complaints': 'complaints',
        'Reports': 'reports'
    };

    // Add click event listener to each category button
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get the category name from the button text (excluding the count)
            const categoryName = this.textContent.trim().split('\n')[0].trim();
            
            // Get the corresponding content ID
            const contentId = categoryMappings[categoryName];
            
            // Hide all category content
            document.querySelectorAll('.category-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Show the selected category content
            if (contentId) {
                const selectedContent = document.getElementById(contentId);
                if (selectedContent) {
                    selectedContent.classList.add('active');
                }
            }
        });
    });

    // Initialize with "All Files" selected
    document.querySelector('.category-button').click();
});