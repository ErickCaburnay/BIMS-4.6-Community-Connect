// ############### LANDINGPAGE_PORTFOLIO.JS ###################
// Import Firebase configurations
import { 
    db,
    collection,
    getDocs,
    query,
    orderBy
} from './firebaseConfig.js';

// Function to fetch the latest portfolio data
async function fetchLatestPortfolio() {
    try {
        // Get reference to the Portfolio collection and order by creation date
        const portfolioRef = collection(db, 'Portfolio');
        const q = query(portfolioRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Get the most recent portfolio entry
            return querySnapshot.docs[0].data();
        } else {
            console.log('No portfolio data found');
            return null;
        }
    } catch (error) {
        console.error('Error fetching portfolio data:', error);
        return null;
    }
}

// Function to update the portfolio section in the landing page
async function updatePortfolioSection() {
    try {
        const portfolioData = await fetchLatestPortfolio();
        
        if (portfolioData) {
            // Update image if available
            const portfolioImage = document.querySelector('.portfolio-image img');
            if (portfolioImage && portfolioData.imageUrl) {
                portfolioImage.src = portfolioData.imageUrl;
                portfolioImage.alt = portfolioData.fullName;
            }

            // Title
            const titleElement = document.querySelector('.protfolio-title');
            if (titleElement) {
                titleElement.textContent = "Barangay Captain";
            }

            // Name
            const nameElement = document.querySelector('.pname');
            if (nameElement) {
                nameElement.textContent = portfolioData.fullName;
            }

            // Quote
            const quoteElement = document.querySelector('blockquote');
            if (quoteElement) {
                quoteElement.textContent = `"${portfolioData.quote || 'A true leader does not create division but unites people.'}" – ${portfolioData.fullName}`;
            }

            // Description
            const descriptionElement = document.querySelector('.portfolio-description');
            if (descriptionElement) {
                descriptionElement.textContent = portfolioData.description || 
                    `Barangay Captain ${portfolioData.fullName}, a dedicated advocate for the community and a proud representative of the district, has been serving since 2024.`;
            }

            // Slogan
            const sloganElement = document.getElementById('slogan');
            if (sloganElement && portfolioData.slogan) {
                // Split the slogan into two parts
                const sloganWords = portfolioData.slogan.split(' ');
                const midPoint = Math.ceil(sloganWords.length / 2);
                
                const firstLine = sloganWords.slice(0, midPoint).join(' ');
                const secondLine = sloganWords.slice(midPoint).join(' ');
            
                // Update the HTML maintaining the structure
                sloganElement.innerHTML = `
                    <h3 contenteditable="TRUE">${firstLine}</h3>
                    <h3 contenteditable="TRUE">${secondLine}</h3>
                `;
            }

        } else {
            // If no data is found, keep default content
            console.log('No portfolio data available, keeping default content');
        }
    } catch (error) {
        console.error('Error updating portfolio section:', error);
    }
}

// Function to initialize portfolio section
function initializePortfolioSection() {
    // Update portfolio section when page loads
    document.addEventListener('DOMContentLoaded', () => {
        updatePortfolioSection();
    });

    // Optional: Add real-time updates if needed
    // You can add real-time listener here if you want to update content immediately when changes occur
}

// Initialize the portfolio section
initializePortfolioSection();

// Export functions if needed elsewhere
export { updatePortfolioSection, fetchLatestPortfolio };