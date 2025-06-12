// ########## LANDINGPAGE_NEWSUPDATES.JS ################
import { 
    db,
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    getDoc
} from './firebaseConfig.js';

// Get DOM elements
const newsGrid = document.querySelector('.news-grid');
const modal = document.getElementById('newsDetailModal');
const closeModalBtn = modal.querySelector('.close-modal');
const newsDetailContent = document.getElementById('newsDetailContent');

const ITEMS_PER_PAGE = 4;
let currentPage = 0;
let allNewsItems = [];

// console.log('Modal element:', modal);
// console.log('Modal content element:', modal.querySelector('.modal-content'));
// console.log('News detail content element:', newsDetailContent);

async function refreshNewsList() {
    try {
        console.log('Starting to fetch news...');
        const newsGrid = document.querySelector('.news-grid');
        const paginationContainer = document.querySelector('.pagination-dots');
        
        newsGrid.innerHTML = '<p>Loading news...</p>';
        
        const newsQuery = query(collection(db, 'News_Updates'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(newsQuery);

        if (querySnapshot.empty) {
            newsGrid.innerHTML = '<p>No news available.</p>';
            return;
        }

        // Store all news items
        allNewsItems = [];
        querySnapshot.forEach((doc) => {
            allNewsItems.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Calculate total pages
        const totalPages = Math.ceil(allNewsItems.length / ITEMS_PER_PAGE);
        
        // Create pagination dots
        paginationContainer.innerHTML = '';
        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('div');
            dot.className = `pagination-dot ${i === 0 ? 'active' : ''}`;
            dot.addEventListener('click', () => changePage(i));
            paginationContainer.appendChild(dot);
        }

        // Display first page
        displayPage(0);

    } catch (error) {
        console.error('Error loading news:', error);
        newsGrid.innerHTML = `<p>Error loading news: ${error.message}</p>`;
    }
}


// Function to display specific page
function displayPage(pageNumber) {
    const newsGrid = document.querySelector('.news-grid');
    
    // Clear current content
    newsGrid.innerHTML = '';
    
    const startIndex = pageNumber * ITEMS_PER_PAGE;
    const pageItems = allNewsItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    
    pageItems.forEach(newsData => {
        const newsElement = createNewsCard(newsData);
        newsGrid.appendChild(newsElement);
    });
}

// Function to change page
async function changePage(newPageNumber) {
    if (newPageNumber === currentPage) return;

    const newsGrid = document.querySelector('.news-grid');
    
    // Add fade out animation
    newsGrid.classList.add('fade-out');
    
    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Update current page
    currentPage = newPageNumber;
    
    // Display new page content
    displayPage(newPageNumber);
    
    // Remove fade out and add fade in
    newsGrid.classList.remove('fade-out');
    newsGrid.classList.add('fade-in');
    
    // Remove fade in class after animation
    setTimeout(() => {
        newsGrid.classList.remove('fade-in');
    }, 300);

    // Update pagination dots
    const dots = document.querySelectorAll('.pagination-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === newPageNumber);
    });
}

// Add touch swipe functionality for mobile
function handleSwipe(direction) {
    const totalPages = Math.ceil(allNewsItems.length / ITEMS_PER_PAGE);
    
    if (direction === 'left' && currentPage < totalPages - 1) {
        changePage(currentPage + 1);
    } else if (direction === 'right' && currentPage > 0) {
        changePage(currentPage - 1);
    }
}

// Update swipe support function
function addSwipeSupport() {
    const newsGrid = document.querySelector('.news-grid');
    let touchStartX = 0;
    let touchEndX = 0;

    newsGrid.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    });

    newsGrid.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        const swipeThreshold = 50;

        if (touchEndX < touchStartX - swipeThreshold) {
            handleSwipe('left');
        } else if (touchEndX > touchStartX + swipeThreshold) {
            handleSwipe('right');
        }
    });
}

// Add this function
function createPagination(totalPages) {
    const paginationContainer = document.querySelector('.pagination-dots');
    paginationContainer.innerHTML = `
        <button class="nav-arrow prev" ${currentPage === 0 ? 'disabled' : ''}>←</button>
        <div class="dots-container"></div>
        <button class="nav-arrow next" ${currentPage === totalPages - 1 ? 'disabled' : ''}>→</button>
    `;

    const dotsContainer = paginationContainer.querySelector('.dots-container');
    for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement('div');
        dot.className = `pagination-dot ${i === currentPage ? 'active' : ''}`;
        dot.addEventListener('click', () => changePage(i));
        dotsContainer.appendChild(dot);
    }

    // Add arrow click handlers
    paginationContainer.querySelector('.prev').addEventListener('click', () => {
        if (currentPage > 0) changePage(currentPage - 1);
    });
    paginationContainer.querySelector('.next').addEventListener('click', () => {
        if (currentPage < totalPages - 1) changePage(currentPage + 1);
    });
}


// Close modal when clicking the close button or outside the modal
closeModalBtn.addEventListener('click', closeModal);
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

// Function to display news
async function displayNews() {
    try {
        console.log('Starting to fetch news...');
        newsGrid.innerHTML = '<p>Loading news...</p>';

        const newsQuery = query(
            collection(db, 'News_Updates'),
            orderBy('createdAt', 'desc')
        );

        console.log('Query created');

        const querySnapshot = await getDocs(newsQuery);
        console.log('Data received:', querySnapshot.size, 'documents');

        if (querySnapshot.empty) {
            newsGrid.innerHTML = '<p>No news available.</p>';
            return;
        }

        // Clear loading message
        newsGrid.innerHTML = '';

        // Display each news item
        querySnapshot.forEach((doc) => {
            const data = { ...doc.data(), id: doc.id };
            console.log('News item:', data);
            const newsCard = createNewsCard(data);
            newsGrid.appendChild(newsCard);
        });

    } catch (error) {
        console.error('Error loading news:', error);
        newsGrid.innerHTML = `<p>Error loading news: ${error.message}</p>`;
    }
}

// Function to create a news card
function createNewsCard(newsData) {
    const article = document.createElement('article');
    article.className = 'news-card';

    const formattedDate = formatDate(newsData.date);
    
    // Convert category to class-friendly format
    const categoryClass = `category-${newsData.category.toLowerCase().replace(/\s+/g, '-')}`;

    article.innerHTML = `
        <div class="news-image">
            ${newsData.imageUrl 
                ? `<img src="${newsData.imageUrl}" alt="${newsData.title}">` 
                : '<img src="/public/resources/placeholder.jpg" alt="News Image">'
            }
            <span class="category-tag ${categoryClass}">${newsData.category}</span>
        </div>
        <div class="news-content">
            <h3>${newsData.title}</h3>
            <p class="post-meta">${formattedDate}</p>
            <p class="post-excerpt">${truncateText(newsData.description, 150)}</p>
            <div class="news-footer">
                <button class="read-more-btn" data-news-id="${newsData.id}">Read More</button>
            </div>
        </div>
    `;

    // Add click event listener to the Read More button
    const readMoreBtn = article.querySelector('.read-more-btn');
    readMoreBtn.addEventListener('click', () => openNewsDetail(newsData.id));

    return article;
}

// Function to open news detail modal
async function openNewsDetail(newsId) {
    try {
        console.log('Opening detail for news ID:', newsId);
        const newsDoc = await getDoc(doc(db, 'News_Updates', newsId));
        
        if (!newsDoc.exists()) {
            alert('News not found');
            return;
        }

        const newsData = newsDoc.data();
        const formattedDate = formatDate(newsData.date);

        // Clear and update modal content
        const newsDetailContent = document.getElementById('newsDetailContent');
        newsDetailContent.innerHTML = `
            ${newsData.imageUrl 
                ? `<img src="${newsData.imageUrl}" alt="${newsData.title}" class="news-detail-image">` 
                : ''}
            <span class="news-detail-category">${newsData.category}</span>
            <h2 class="news-detail-title">${newsData.title}</h2>
            <p class="news-detail-meta">Posted on: ${formattedDate}</p>
            <div class="news-detail-description">${newsData.description}</div>
        `;

        // Show modal
        const modal = document.getElementById('newsDetailModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'auto';
            console.log('Modal should be visible now');
        } else {
            console.error('Modal element not found');
        }

    } catch (error) {
        console.error('Error fetching news detail:', error);
        alert('Error loading news detail. Please try again later.');
    }
}

// Function to close modal
function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'Date not available';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}


function truncateText(text, maxLength) {
    if (!text) return '';
    // Replace line breaks with spaces for the preview
    const plainText = text.replace(/\n/g, ' ').trim();
    if (plainText.length <= maxLength) return plainText;
    return plainText.substr(0, maxLength) + '...';
}

// Initialize display
document.addEventListener('DOMContentLoaded', displayNews);
document.addEventListener('DOMContentLoaded', () => {
    refreshNewsList();
    addSwipeSupport();
    createPagination();
});
document.addEventListener('keydown', (e) => {
    const totalPages = Math.ceil(allNewsItems.length / ITEMS_PER_PAGE);
    
    if (e.key === 'ArrowRight' && currentPage < totalPages - 1) {
        changePage(currentPage + 1);
    } else if (e.key === 'ArrowLeft' && currentPage > 0) {
        changePage(currentPage - 1);
    }
});

export { createNewsCard };