// ########## LANDINGPAGE_SEARCHNEWS.JS ################
import { 
    db,
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    getDoc
} from './firebaseConfig.js';
import { createNewsCard } from './landingPage_newsupdates.js';

// Global variables
let allNewsItems = []; // Define this globally
let filteredNewsItems = [];
let currentPage = 0;
const ITEMS_PER_PAGE = 4;

// Get DOM elements
const searchInput = document.querySelector('.search-input');
const categoryFilter = document.querySelector('.category-filter');
const dateFilter = document.querySelector('.date-filter');

// Initialize the news list
async function initializeNewsList() {
    try {
        console.log('Initializing news list...');
        const newsQuery = query(collection(db, 'News_Updates'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(newsQuery);
        
        // Store all news items
        allNewsItems = [];
        querySnapshot.forEach((doc) => {
            allNewsItems.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Initialize filtered items with all items
        filteredNewsItems = [...allNewsItems];
        
        // Initial display
        filterNews();
        
    } catch (error) {
        console.error('Error initializing news list:', error);
    }
}

// Function to handle filtering
function filterNews() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value.toLowerCase();
    const selectedDate = dateFilter.value;

    // Filter all news items based on search, category, and date
    filteredNewsItems = allNewsItems.filter(news => {
        const matchesSearch = (
            news.title.toLowerCase().includes(searchTerm) ||
            news.description.toLowerCase().includes(searchTerm)
        );

        const matchesCategory = !selectedCategory || 
            news.category.toLowerCase().replace(/\s+/g, '-') === selectedCategory;

        const matchesDate = !selectedDate || news.date === selectedDate;

        return matchesSearch && matchesCategory && matchesDate;
    });

    // Reset to first page when filtering
    currentPage = 0;
    
    // Recalculate total pages based on filtered items
    const totalPages = Math.ceil(filteredNewsItems.length / ITEMS_PER_PAGE);
    
    // Update pagination
    updatePagination(totalPages);
    
    // Display filtered results
    displayFilteredResults();
}

// Function to display filtered results
function displayFilteredResults() {
    const newsGrid = document.querySelector('.news-grid');
    
    if (filteredNewsItems.length === 0) {
        newsGrid.innerHTML = '<p class="no-results">No results found</p>';
        document.querySelector('.pagination-dots').style.display = 'none';
        return;
    }

    // Show pagination
    document.querySelector('.pagination-dots').style.display = 'flex';

    // Get items for current page
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const pageItems = filteredNewsItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Clear and display new items
    newsGrid.innerHTML = '';
    pageItems.forEach(newsData => {
        const newsElement = createNewsCard(newsData);
        newsGrid.appendChild(newsElement);
    });
}

// Function to update pagination
function updatePagination(totalPages) {
    const paginationContainer = document.querySelector('.pagination-dots');
    paginationContainer.innerHTML = '';

    for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement('div');
        dot.className = `pagination-dot ${i === currentPage ? 'active' : ''}`;
        dot.addEventListener('click', () => changePage(i));
        paginationContainer.appendChild(dot);
    }
}

// Function to change page
async function changePage(newPageNumber) {
    if (newPageNumber === currentPage) return;

    const newsGrid = document.querySelector('.news-grid');
    
    // Add fade out animation
    newsGrid.classList.add('fade-out');
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    currentPage = newPageNumber;
    
    // Display filtered results for new page
    displayFilteredResults();
    
    // Animation handling
    newsGrid.classList.remove('fade-out');
    newsGrid.classList.add('fade-in');
    
    setTimeout(() => {
        newsGrid.classList.remove('fade-in');
    }, 300);

    // Update pagination dots
    const dots = document.querySelectorAll('.pagination-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === newPageNumber);
    });
}

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add event listeners for filters
searchInput.addEventListener('input', debounce(filterNews, 300));
categoryFilter.addEventListener('change', filterNews);
dateFilter.addEventListener('input', filterNews);

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeNewsList);