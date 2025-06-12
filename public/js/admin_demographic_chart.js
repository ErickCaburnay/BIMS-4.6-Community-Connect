// ####################### ADMIN_DEMOGRAPHIC_CHARTS ###########################
import { collection, getDocs, onSnapshot, query, where, Timestamp } from './firebaseConfig.js';
import { db } from './firebaseConfig.js';

let loadingTasks = 0;

let socialServicesChart = null;


function showLoader() {
    loadingTasks++;
    const loader = document.getElementById('loader-container');
    if (loader) {
        loader.style.display = 'flex';
    }
}

function hideLoader() {
    loadingTasks--;
    if (loadingTasks <= 0) {
        loadingTasks = 0;
        const loader = document.getElementById('loader-container');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

export async function initializeCharts() {
    // console.log("Initializing charts");
    try {
        showLoader();
        
        // Convert these to async/await for proper loading handling
        await Promise.all([
            fetchPopulationData(),
            fetchVotersData(),
            fetchAgeDistributionData(),
            fetchAndDisplayDocumentData(db),
            createEducationChart(),
            createHouseholdChart(),
            fetchAndDisplayComplaintsData(db),
            fetchAndDisplaySocialServicesData(),
        ]);
        
        // Set up real-time updates
        const usersRef = collection(db, "users");
        const complaintsRef = collection(db, "Complaints");
        
        onSnapshot(usersRef, (snapshot) => {
            fetchPopulationData();
        });
        
        onSnapshot(complaintsRef, (snapshot) => {
            fetchAndDisplayComplaintsData(db);
        });
        
    } catch (error) {
        console.error("Error initializing charts:", error);
    } finally {
        hideLoader();
    }
}

function setupSocialServicesRealtimeUpdates() {
    try {
        const usersRef = collection(db, "users");
        onSnapshot(usersRef, () => {
            fetchAndDisplaySocialServicesData();
        }, (error) => {
            console.error('Error setting up real-time updates for social services:', error);
        });
    } catch (error) {
        console.error('Error in setupSocialServicesRealtimeUpdates:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // console.log("DOMContentLoaded event fired");
    showLoader();
    initializeCharts(db);

    updatePurposePercentages('indigency');
    updatePurposePercentages('certificate');
    updatePurposePercentages('clearance');

    document.getElementById('documentTimeFilter').addEventListener('change', () => fetchAndDisplayDocumentData(db));
    document.getElementById('documentTypeSelect').addEventListener('change', () => fetchAndDisplayDocumentData(db));

    if (documentTimeFilter) {
        documentTimeFilter.addEventListener('change', () => fetchAndDisplayDocumentData(db));
    }
    if (documentTypeSelect) {
        documentTypeSelect.addEventListener('change', () => fetchAndDisplayDocumentData(db));
    }

    // Initial fetch of document data
    fetchAndDisplayDocumentData(db);

    const purposeTimeFilter = document.getElementById('purposeTimeFilter');
    if (purposeTimeFilter) {
        purposeTimeFilter.addEventListener('change', () => {
            const activeTab = document.querySelector('.tab-button.active');
            if (activeTab) {
                updatePurposePercentages(activeTab.dataset.tab);
            }
        });
    }

    // Listen for tab changes
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button, .tab-pane').forEach(el => {
                el.classList.remove('active');
            });
            
            button.classList.add('active');
            const pane = document.getElementById(button.dataset.tab);
            if (pane) {
                pane.classList.add('active');
            }
            
            updatePurposePercentages(button.dataset.tab);
        });
    });

    // Initial load
    const defaultTab = document.querySelector('.tab-button.active');
    if (defaultTab) {
        updatePurposePercentages(defaultTab.dataset.tab);
    }

    const style = document.createElement('style');
    style.textContent = `
        .total-count {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 20px;
            padding: 10px 15px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
        }

        .document-label {
            font-size: 16px;
            color: #ffffff;
        }

        .document-count {
            font-size: 20px;
            font-weight: bold;
            color: #ffffff;
        }
    `;
    document.head.appendChild(style);
    hideLoader();

    const timeFilter = document.getElementById('complaintsTimeFilter');
    const typeSelect = document.getElementById('complaintTypeSelect');

    if (timeFilter) {
        timeFilter.addEventListener('change', () => fetchAndDisplayComplaintsData(db));
    }
    if (typeSelect) {
        typeSelect.addEventListener('change', () => fetchAndDisplayComplaintsData(db));
    }

    // Initial data fetch
    fetchAndDisplayComplaintsData(db);

    // Set up real-time updates
    const complaintsRef = collection(db, "Complaints");
    onSnapshot(complaintsRef, () => {
        fetchAndDisplayComplaintsData(db);
    });           

    setupSocialServicesRealtimeUpdates();
});


// ###################  POPULATION AND GENDER CHART ##########################
let genderChart;

async function fetchPopulationData() {
    // console.log("Fetching population data");
    showLoader();
    try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        const totalPopulation = querySnapshot.size;
        
        let maleCount = 0;
        let femaleCount = 0;
        let unverifiedCount = 0;

        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            // console.log("User data:", userData);
            
            const gender = (userData.gender || '').toLowerCase();
            
            if (gender === 'male') {
                maleCount++;
            } else if (gender === 'female') {
                femaleCount++;
            } else {
                unverifiedCount++;
            }
        });

        // console.log(`Final counts - Total: ${totalPopulation}, Male: ${maleCount}, Female: ${femaleCount}, Unverified: ${unverifiedCount}`);
        updatePopulationDisplay(totalPopulation, maleCount, femaleCount, unverifiedCount);
    } catch (error) {
        console.error("Error fetching population data:", error);
    } finally {
        hideLoader();
    }
}

function updatePopulationDisplay(total, male, female, unverified) {
    const totalPopulationElement = document.getElementById('totalPopulation');
    const malePercentageElement = document.getElementById('malePercentage');
    const femalePercentageElement = document.getElementById('femalePercentage');
    const unverifiedPercentageElement = document.getElementById('undefinedPercentage');

    if (totalPopulationElement) totalPopulationElement.textContent = total.toLocaleString();

    const malePercentage = total > 0 ? ((male / total) * 100).toFixed(1) : 0;
    const femalePercentage = total > 0 ? ((female / total) * 100).toFixed(1) : 0;
    const unverifiedPercentage = total > 0 ? ((unverified / total) * 100).toFixed(1) : 0;

    if (malePercentageElement) malePercentageElement.textContent = `${malePercentage}%`;
    if (femalePercentageElement) femalePercentageElement.textContent = `${femalePercentage}%`;
    if (unverifiedPercentageElement) unverifiedPercentageElement.textContent = `${unverifiedPercentage}%`;

    updateGenderChart(male, female, unverified);
}


function updateGenderChart(male, female, unverified) {
    // console.log(`Updating gender chart: Male=${male}, Female=${female}, Unverified=${unverified}`);
    const ctx = document.getElementById('genderChart');
    if (!ctx) {
        console.error('Gender chart canvas not found');
        return;
    }

    const data = [male, female, unverified];
    const labels = ['Male', 'Female'];
    const backgroundColor = ['#00aaff', '#ff6ec7'];

if (genderChart) {
    // console.log("Updating existing chart with data:", data);
    genderChart.data.labels = labels;
    genderChart.data.datasets[0].data = data;
    genderChart.data.datasets[0].backgroundColor = backgroundColor;
    genderChart.update();
} else {
    // console.log("Creating new chart with data:", data);
    genderChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColor,
                borderWidth: 0
            }]
        },
        options: {
            cutout: '70%',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                    position: 'bottom',
                    labels: {
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map(function(label, i) {
                                    const meta = chart.getDatasetMeta(0);
                                    const style = meta.controller.getStyle(i);
                                    const value = chart.config.data.datasets[0].data[i];
                                    const total = data.datasets[0].data.reduce((acc, val) => acc + val, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return {
                                        text: `${label}: ${percentage}%`,
                                        fillStyle: style.backgroundColor,
                                        hidden: isNaN(value) || meta.data[i].hidden,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.formattedValue;
                            const total = context.dataset.data.reduce((acc, data) => acc + data, 0);
                            const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}
}

// ########################## EDUCATION LEVEL CHART ##############################
let educationChart;

async function createEducationChart() {
    try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        
        const educationCounts = {            
            'Elementary': 0,
            'High-School': 0,            
            'College': 0,
            'Vocational/Technical': 0,
            'Postgraduate': 0,
            'Doctorate': 0,
            'No Formal Education': 0,
            // 'Undefined': 0
        };

        const educationMapping = {
            'ELEMENTARY': 'Elementary',
            'HIGH_SCHOOL': 'High-School',            
            'COLLEGE': 'College',
            'VOCATIONAL_TECHNICAL': 'Vocational/Technical',
            'POSTGRADUATE': 'Postgraduate',
            'DOCTORATE': 'Doctorate',
            'NO_FORMAL_EDUCATION': 'No Formal Education'
        };

        let totalEducation = 0;
        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData.educationalStatus) {
                const educationKey = educationMapping[userData.educationalStatus];
                if (educationKey) {
                    educationCounts[educationKey]++;
                    totalEducation++;
                } else {
                    educationCounts['Undefined']++;
                    totalEducation++;
                }
            } else {
                educationCounts['Undefined']++;
                totalEducation++;
            }
        });

        // Update total count
        const totalEducationElement = document.getElementById('totalEducation');
        if (totalEducationElement) {
            totalEducationElement.textContent = totalEducation.toLocaleString();
        }

        updateEducationChart(educationCounts);

    } catch (error) {
        console.error("Error fetching education data:", error);
    }
}

function updateEducationChart(educationCounts) {
    const ctx = document.getElementById('educationChart');
    if (!ctx) {
        console.error('Education chart canvas not found');
        return;
    }

    const filteredCounts = Object.entries(educationCounts)
        .filter(([key, value]) => value > 0)
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    const data = Object.values(filteredCounts);
    const labels = Object.keys(filteredCounts);

    const colorMapping = {
        'Elementary': '#81C784',
        'High-School': '#64B5F6',        
        'College': '#BA68C8',
        'Vocational/Technical': '#FF9800',
        'Postgraduate': '#F44336',
        'Doctorate': '#E57373',
        'No Formal Education': '#795548',
        'Undefined': '#9E9E9E'
    };

    const filteredColors = labels.map(label => colorMapping[label]);
    const total = data.reduce((acc, val) => acc + val, 0);
    const percentages = data.map(value => ((value / total) * 100).toFixed(1));

    // Update percentages in legend
    Object.keys(educationCounts).forEach((label) => {
        const elementId = label.toLowerCase().replace(/[\s()\/]/g, '-');
        const percentageElement = document.getElementById(`${elementId}-percentage`);
        const count = educationCounts[label] || 0;
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
        if (percentageElement) {
            percentageElement.textContent = `${percentage}%`;
        }
    });

    if (educationChart) {
        educationChart.data.labels = labels;
        educationChart.data.datasets[0].data = data;
        educationChart.data.datasets[0].backgroundColor = filteredColors;
        educationChart.update();
    } else {
        educationChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: filteredColors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.formattedValue;
                                const percentage = percentages[context.dataIndex];
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}



// ########################## VOTERS CHART ##############################

let votersChart;

async function fetchVotersData() {
    // console.log("Fetching voters data");
    try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        
        let voterCount = 0;
        let nonVoterCount = 0;
        let undefinedCount = 0;

        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            // console.log("User data:", userData);
            // console.log("Voter status:", userData.voter);
            if (userData.voter) {
                const status = userData.voter.toLowerCase();
                // console.log("Lowercase status:", status);
                if (status === "VOTER") {
                    voterCount++;
                    // console.log("Voter count increased:", voterCount);
                } else if (status === "NON-VOTER" || status === "NONVOTER") {
                    nonVoterCount++;
                    // console.log("Non-voter count increased:", nonVoterCount);
                } else {
                    undefinedCount++;
                    // console.log("Undefined count increased:", undefinedCount);
                }
            } else {
                undefinedCount++;
                // console.log("Undefined count increased (no status):", undefinedCount);
            }
        });

        // console.log(`Final voter counts - Voters: ${voterCount}, Non-voters: ${nonVoterCount}, Undefined: ${undefinedCount}`);
        updateVotersDisplay(voterCount, nonVoterCount, undefinedCount);
    } catch (error) {
        console.error("Error fetching voters data:", error);
    }
}

function updateVotersDisplay(voters, nonVoters, undefined) {
    // console.log("Updating voters display with data:", { voters, nonVoters, undefined });
    const totalVotersElement = document.getElementById('totalVoters');
    const votersCountElement = document.getElementById('votersCount');
    const nonVotersCountElement = document.getElementById('nonVotersCount');
    const undefinedCountElement = document.getElementById('undefinedVotersCount');

    const total = voters + nonVoters + undefined;

    if (totalVotersElement) totalVotersElement.textContent = total.toLocaleString();
    if (votersCountElement) votersCountElement.textContent = voters.toLocaleString();
    if (nonVotersCountElement) nonVotersCountElement.textContent = nonVoters.toLocaleString();
    if (undefinedCountElement) undefinedCountElement.textContent = undefined.toLocaleString();

    updateVotersChart(voters, nonVoters, undefined);
}

function updateVotersChart(voters, nonVoters, undefined) {
    // console.log(`Updating voters chart: Voters=${voters}, Non-voters=${nonVoters}, Undefined=${undefined}`);
    const ctx = document.getElementById('votersChart');
    if (!ctx) {
        console.error('Voters chart canvas not found');
        return;
    }

    const data = [voters, nonVoters, undefined];
    const labels = ['Voters', 'Non-voters', 'Undefined'];
    const backgroundColor = ['#4caf50', '#f44336', '#cccccc'];

    const total = data.reduce((acc, val) => acc + val, 0);
    const percentages = data.map(value => ((value / total) * 100).toFixed(1));

    // Update the legend percentages
    document.getElementById('votersPercentage').textContent = `${percentages[0]}%`;
    document.getElementById('nonVotersPercentage').textContent = `${percentages[1]}%`;
    document.getElementById('undefinedVotersPercentage').textContent = `${percentages[2]}%`;

    if (votersChart) {
        // console.log("Updating existing chart with data:", data);
        votersChart.data.labels = labels;
        votersChart.data.datasets[0].data = data;
        votersChart.data.datasets[0].backgroundColor = backgroundColor;
        votersChart.update();
    } else {
        // console.log("Creating new chart with data:", data);
        votersChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColor,
                    borderColor: '#cdcdcd', 
                    borderWidth: 2 
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: { 
                        grid: {
                            color: '#CDCDCD', 
                            borderColor: '#CDCDCD', 
                        },
                        ticks: {
                            color: '#CDCDCD', 
                        }
                    },
                    y: { 
                        grid: {
                            color: '#CDCDCD', 
                            borderColor: '#CDCDCD', 
                        },
                        ticks: {
                            color: '#CDCDCD',
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.formattedValue;
                                const percentage = percentages[context.dataIndex];
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// ########################## AGE DISTRIBUTION CHART ##############################

let ageDistributionChart;

function calculateAge(birthdate) {
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

async function fetchAgeDistributionData() {
    // console.log("Fetching age distribution data");
    try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        
        let minorCount = 0;
        let legalAgeCount = 0;
        let seniorCount = 0;
        let undefinedCount = 0;

        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            // console.log("User data:", userData);

            let age;
            if (userData.birthdate) {
                age = calculateAge(userData.birthdate);
            } else if (userData.age !== null && userData.age !== undefined) {
                age = userData.age;
            }

            // console.log("Calculated age:", age);

            if (age !== undefined) {
                if (age < 18) {
                    minorCount++;
                } else if (age >= 18 && age < 60) {
                    legalAgeCount++;
                } else if (age >= 60) {
                    seniorCount++;
                }
            } else {
                undefinedCount++;
            }
        });

        // console.log(`Final age counts - Minors: ${minorCount}, Legal Age: ${legalAgeCount}, Seniors: ${seniorCount}, Undefined: ${undefinedCount}`);
        updateAgeDistributionDisplay(minorCount, legalAgeCount, seniorCount, undefinedCount);
    } catch (error) {
        console.error("Error fetching age distribution data:", error);
    }
}

function updateAgeDistributionDisplay(minors, legalAge, seniors, undefined) {
    // console.log("Updating age distribution display with data:", { minors, legalAge, seniors, undefined });
    const totalAgeGroupElement = document.getElementById('totalAgeGroup');
    const minorsCountElement = document.getElementById('minorsCount');
    const legalAgeCountElement = document.getElementById('legalAgeCount');
    const seniorsCountElement = document.getElementById('seniorsCount');
    const undefinedAgeCountElement = document.getElementById('undefinedAgeCount');

    const total = minors + legalAge + seniors + undefined;

    if (totalAgeGroupElement) totalAgeGroupElement.textContent = total.toLocaleString();
    if (minorsCountElement) minorsCountElement.textContent = minors.toLocaleString();
    if (legalAgeCountElement) legalAgeCountElement.textContent = legalAge.toLocaleString();
    if (seniorsCountElement) seniorsCountElement.textContent = seniors.toLocaleString();
    if (undefinedAgeCountElement) undefinedAgeCountElement.textContent = undefined.toLocaleString();

    updateAgeDistributionChart(minors, legalAge, seniors, undefined);
}

function updateAgeDistributionChart(minors, legalAge, seniors, undefined) {
    // console.log(`Updating age distribution chart: Minors=${minors}, Legal Age=${legalAge}, Seniors=${seniors}, Undefined=${undefined}`);
    const ctx = document.getElementById('ageDistributionChart');
    if (!ctx) {
        console.error('Age distribution chart canvas not found');
        return;
    }

    const data = [minors, legalAge, seniors, undefined];
    const labels = ['Minors', 'Legal Age', 'Seniors', 'Undefined'];
    const backgroundColor = ['#ff9800', '#2196f3', '#9c27b0', '#cccccc'];

    const total = data.reduce((acc, val) => acc + val, 0);
    const percentages = data.map(value => ((value / total) * 100).toFixed(1));

    // Update the legend percentages
    document.getElementById('minorsPercentage').textContent = `${percentages[0]}%`;
    document.getElementById('legalAgePercentage').textContent = `${percentages[1]}%`;
    document.getElementById('seniorsPercentage').textContent = `${percentages[2]}%`;
    document.getElementById('undefinedAgePercentage').textContent = `${percentages[3]}%`;

    if (ageDistributionChart) {
        // console.log("Updating existing chart with data:", data);
        ageDistributionChart.data.labels = labels;
        ageDistributionChart.data.datasets[0].data = data;
        ageDistributionChart.data.datasets[0].backgroundColor = backgroundColor;
        ageDistributionChart.update();
    } else {
        // console.log("Creating new chart with data:", data);
        ageDistributionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColor,
                    borderColor: '#cdcdcd', 
                    borderWidth: 2 
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { 
                        grid: {
                            color: '#CDCDCD', 
                            borderColor: '#CDCDCD', 
                        },
                        ticks: {
                            color: '#CDCDCD', 
                        }
                    },
                    y: { 
                        grid: {
                            color: '#CDCDCD', 
                            borderColor: '#CDCDCD', 
                        },
                        ticks: {
                            color: '#CDCDCD',
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.formattedValue;
                                const percentage = percentages[context.dataIndex];
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
    }
}

// ####################### HOUSEHOLD OVERVIEW CHART ############################
let householdChart;

async function createHouseholdChart() {
    try {
        const usersRef = collection(db, "Household");
        const querySnapshot = await getDocs(usersRef);
        
        const householdData = {
            size: {
                'small': 0,    // 1-3 members
                'medium': 0,   // 4-6 members
                'large': 0,    // 7-9 members
                'xl': 0        // 10+ members
            },
            type: {
                'OWNED': 0,
                'RENT': 0,
                'MORTGAGE': 0,
                'PLEDGE': 0,
                'SHARED': 0,
                'INFORMAL': 0
            }
        };

        let totalHouseholds = 0;

        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            // console.log("Raw ownership data:", userData.ownership);
            totalHouseholds++;

            // Process household size
            const members = parseInt(userData.totalMembers) || 0;
            if (members <= 3) householdData.size.small++;
            else if (members <= 6) householdData.size.medium++;
            else if (members <= 9) householdData.size.large++;
            else householdData.size.xl++;

            // Process household type
            if (userData.householdType) {
                const type = userData.householdType.toLowerCase();
                if (householdData.type.hasOwnProperty(type)) {
                    householdData.type[type]++;
                }
            }

            // Process ownership type
            if (userData.ownership) {
                const ownership = userData.ownership.toUpperCase();
                if (householdData.type.hasOwnProperty(ownership)) {
                    householdData.type[ownership]++;
                }
            }

        });

        // Update total households display
        const totalElement = document.getElementById('totalHouseholds');
        if (totalElement) totalElement.textContent = totalHouseholds.toLocaleString();

        updateHouseholdChart(householdData, totalHouseholds);

    } catch (error) {
        console.error("Error fetching household data:", error);
    }
}

function updateHouseholdChart(householdData, total) {
    // console.log("Household Data:", householdData);
    // console.log("Type data specifically:", householdData.type);
    const ctx = document.getElementById('householdChart');
    if (!ctx) return;

    // Calculate percentages
    const calculatePercentages = (data) => {
        return Object.entries(data).reduce((acc, [key, value]) => {
            const percentage = ((value / total) * 100).toFixed(1);
            const elementId = `${key.toLowerCase()}-percentage`;        
            const percentageElement = document.getElementById(elementId);
            if (percentageElement) {
                percentageElement.textContent = `${percentage}%`;
            }
            acc[key] = percentage;
            return acc;
        }, {});
    };

    const sizePercentages = calculatePercentages(householdData.size);
    const typePercentages = calculatePercentages(householdData.type);

    const data = {
        datasets: [{
            data: Object.values(householdData.size),
            backgroundColor: ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800'],
            label: 'Household Size'
        }, {
            data: Object.values(householdData.type),
            backgroundColor: ['#F44336', '#795548', '#3F51B5', '#009688', '#FF5722', '#607D8B'],
            label: 'Household Type'
        }]
    };

    if (householdChart) householdChart.destroy();

    householdChart = new Chart(ctx, {
        type: 'pie',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label;
                            const value = context.raw;
                            const percentage = context.dataset.label === 'Household Size' 
                                ? sizePercentages[Object.keys(householdData.size)[context.dataIndex]]
                                : typePercentages[Object.keys(householdData.type)[context.dataIndex]];
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });    
}


// ####################### DOCUMENT OVERVIEW CHART ############################
let documentStatusChart;

async function fetchAndDisplayDocumentData(db) {
    const timeFilter = document.getElementById('documentTimeFilter')?.value || 'all';
    const documentType = document.getElementById('documentTypeSelect')?.value || 'all';

    let collections = [];
    if (documentType === 'all') {
        collections = ['brgy_clearance', 'brgy_certificate', 'brgy_indigency'];
    } else {
        switch(documentType) {
            case 'clearance':
                collections = ['brgy_clearance'];
                break;
            case 'certificate':
                collections = ['brgy_certificate'];
                break;
            case 'indigency':
                collections = ['brgy_indigency'];
                break;
        }
    }

    const startDate = getStartDate(timeFilter);
    const endDate = new Date();

    try {
        const statusCounts = {
            Pending: 0,
            Rejected: 0,
            Approved: 0
        };

        // Fetch data from all relevant collections
        for (const collectionName of collections) {
            const startTimestamp = Timestamp.fromDate(startDate);
            const endTimestamp = Timestamp.fromDate(endDate);

            const q = query(
                collection(db, collectionName),
                where('createdAt', '>=', startTimestamp),
                where('createdAt', '<=', endTimestamp)
            );

            const querySnapshot = await getDocs(q);
            // console.log(`Fetched ${querySnapshot.size} documents from ${collectionName}`);

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // console.log(`Processing document ${doc.id}:`, {
                //     status: data.status,
                //     createdAt: data.createdAt?.toDate()
                // });

                const normalizedStatus = (data.status || '').trim().toLowerCase();
                
                if (normalizedStatus === 'approved' || normalizedStatus === 'printed') {
                    statusCounts.Approved++;
                } else if (normalizedStatus === 'rejected') {
                    statusCounts.Rejected++;
                } else if (normalizedStatus === 'pending') {
                    statusCounts.Pending++;
                } else {
                    console.warn(`Unknown status: "${data.status}" for document ${doc.id}`);
                    statusCounts.Pending++;
                }
            });
        }

        // console.log('Final status counts:', {
        //     collections,
        //     timeFrame: timeFilter,
        //     counts: statusCounts
        // });

        // Calculate and update total count
        const totalCount = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
        const documentCountElement = document.getElementById('documentCount');
        if (documentCountElement) {
            documentCountElement.textContent = totalCount.toLocaleString();
        }

        // Update counts display
        updateStatusCountsDisplay(statusCounts);
        
        // Update the chart
        updateDocumentStatusChart(statusCounts);

    } catch (error) {
        console.error("Error fetching document data:", error);
        const documentCountElement = document.getElementById('documentCount');
        if (documentCountElement) {
            documentCountElement.textContent = 'Error';
        }
        updateChartError(error.message);
    }
}

function updateStatusCountsDisplay(counts) {
    // Update the total count
    const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const totalElement = document.getElementById('totalDocuments');
    if (totalElement) {
        totalElement.textContent = totalCount.toLocaleString();
    }

    // Update individual counts
    Object.entries(counts).forEach(([status, count]) => {
        const element = document.getElementById(`document${status}Count`);
        if (element) {
            element.textContent = count.toLocaleString();
        }
    });
}

function updateDocumentStatusChart(statusCounts) {
    const ctx = document.getElementById('documentStatusChart');
    
    if (!ctx) {
        console.error('Cannot find chart canvas element');
        return;
    }

    const data = Object.values(statusCounts);
    const total = data.reduce((a, b) => a + b, 0);
    
    const percentages = total > 0 
        ? data.map(value => ((value / total) * 100).toFixed(1))
        : data.map(() => '0.0');

    if (documentStatusChart) {
        documentStatusChart.destroy();
    }

    const centerTextPlugin = {
        id: 'centerText',
        beforeDraw: (chart) => {
            const { ctx, width, height } = chart;
            ctx.save();
    
            const totalLength = total.toString().length; // Get the number of digits
            const baseFontSize = 50; // Starting font size for short numbers
            const scaleFactor = 5; // Adjust this for how much the font should shrink per digit
    
            // Dynamically calculate font size
            const dynamicFontSize = baseFontSize - (totalLength - 1) * scaleFactor;
    
            ctx.font = `bold ${Math.max(dynamicFontSize, 10)}px Arial`; // Ensure a minimum size
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
    
            // Draw the number in the center
            ctx.fillText(total.toString(), width / 2, height / 2);
            ctx.restore();
        }
    };
    

    documentStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Rejected', 'Approved'],
            datasets: [{
                data: data,
                backgroundColor: ['#ffa726', '#ef5350', '#66bb6a'],
                borderWidth: 1,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = percentages[context.dataIndex];
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true
            }
        },
        plugins: [centerTextPlugin] // NEW - Add the center text plugin
    });

    ['Pending', 'Rejected', 'Approved'].forEach((status, index) => {
        const element = document.getElementById(`document${status}Percentage`);
        if (element) {
            element.textContent = `${percentages[index]}%`;
        }
    });
}

function updateChartError(errorMessage) {
    const ctx = document.getElementById('documentStatusChart');
    if (!ctx) return;

    if (documentStatusChart) {
        documentStatusChart.destroy();
    }

    // Clear any existing content
    const parent = ctx.parentElement;
    parent.innerHTML = `
        <div class="text-center text-red-500">
            <p>Error loading chart data</p>
            <p class="text-sm">${errorMessage}</p>
        </div>
    `;
}

// Add real-time updates
function setupRealtimeUpdates(db) {
    const documentTypes = ['brgy_clearance', 'brgy_certificate', 'brgy_indigency'];
    
    documentTypes.forEach(collectionName => {
        const collectionRef = collection(db, collectionName);
        onSnapshot(collectionRef, (snapshot) => {
            if (document.getElementById('documentStatusChart')) {
                fetchAndDisplayDocumentData(db);
            }
        });
    });
}

function getStartDate(timeFilter) {
    const now = new Date();
    switch(timeFilter) {
        case 'today':
            return new Date(now.setHours(0,0,0,0));
        case 'week':
            return new Date(now.setDate(now.getDate() - 7));
        case 'month':
            return new Date(now.setMonth(now.getMonth() - 1));
        case 'year':
            return new Date(now.setFullYear(now.getFullYear() - 1));
        case 'all':
            return new Date(0); // January 1, 1970
        default:
            return new Date(0);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Event listeners for filters
    const timeFilter = document.getElementById('documentTimeFilter');
    const typeSelect = document.getElementById('documentTypeSelect');

    if (timeFilter) {
        timeFilter.addEventListener('change', () => fetchAndDisplayDocumentData(db));
    }
    if (typeSelect) {
        typeSelect.addEventListener('change', () => fetchAndDisplayDocumentData(db));
    }

    // Initial data fetch
    fetchAndDisplayDocumentData(db);
    setupRealtimeUpdates(db);
});




// ################## DOCUMENT PURPOSE CHARTS #######################

document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and panes
        document.querySelectorAll('.tab-button, .tab-pane').forEach(el => {
            el.classList.remove('active');
        });
        
        // Add active class to clicked button and corresponding pane
        button.classList.add('active');
        document.getElementById(button.dataset.tab).classList.add('active');
        
        // Update percentages for the active tab
        updatePurposePercentages(button.dataset.tab);
    });
});

async function updatePurposePercentages(documentType) {
    const timeFilter = document.getElementById('purposeTimeFilter')?.value || 'all';
    const collectionName = `brgy_${documentType}`;
    const purposeCounts = {};
    let total = 0;

    try {
        const dateConstraint = getDateConstraint(timeFilter);
        
        // Create query with proper field name (createdAt instead of dateCreated)
        let purposeQuery;
        if (dateConstraint) {
            purposeQuery = query(
                collection(db, collectionName),
                where('createdAt', '>=', dateConstraint)
            );
        } else {
            purposeQuery = collection(db, collectionName);
        }

        const querySnapshot = await getDocs(purposeQuery);
        // console.log(`Fetched ${querySnapshot.size} documents from ${collectionName}`);
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // console.log('Document data:', data); // Debug log
            const purpose = data.purpose?.toUpperCase();
            if (purpose) {
                purposeCounts[purpose] = (purposeCounts[purpose] || 0) + 1;
                total++;
            }
        });

        // console.log('Purpose counts:', purposeCounts); 

        // Map purposes to their corresponding element IDs
        const purposeIdMap = {
            indigency: {
                'MEDICAL ASSISTANCE': 'medical-assistance',
                'EDUCATIONAL ASSISTANCE': 'educational-assistance',
                'BURIAL ASSISTANCE': 'burial-assistance',
                'SOCIAL SERVICES BENEFITS': 'social-services-benefits',
                'LEGAL AID APPLICATION': 'legal-aid-application'
            },
            certificate: {
                'PROOF OF RESIDENCY': 'proof-of-residency',
                'GOOD MORAL': 'good-moral-certificate',
                'NO PENDING CASE': 'no-pending-case-certificate',
                'PROPERTY VERIFICATION': 'property-verification',
                'LEGAL DOCUMENT': 'legal-document'
            },
            clearance: {
                'EMPLOYMENT': 'employment',
                'BANK ACCOUNT OPENING': 'bank-account-opening',
                'POLICE CLEARANCE': 'police-clearance',
                'SCHOOL REQUIREMENTS': 'school-requirements',
                'LOAN APPLICATION': 'loan-application'
            }
        };

        // Update percentages
        Object.entries(purposeIdMap[documentType]).forEach(([purpose, elementId]) => {
            const count = purposeCounts[purpose] || 0;
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
            const fullElementId = `${documentType}-${elementId}`;
            
            const element = document.getElementById(fullElementId);
            if (element) {
                element.textContent = `${percentage}%`;
                // console.log(`Updated ${fullElementId} with ${percentage}%`); 
            } else {
                console.warn(`Element not found: ${fullElementId}`);
            }
        });

    } catch (error) {
        console.error(`Error fetching ${documentType} data:`, error);
        // Set error state in UI
        Object.values(purposeIdMap[documentType]).forEach(elementId => {
            const element = document.getElementById(`${documentType}-${elementId}`);
            if (element) {
                element.textContent = 'Error';
            }
        });
    }
}

function getDateConstraint(timeFilter) {
    const now = new Date();
    switch(timeFilter) {
        case 'today':
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return today;
        case 'week':
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            lastWeek.setHours(0, 0, 0, 0);
            return lastWeek;
        case 'month':
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            lastMonth.setHours(0, 0, 0, 0);
            return lastMonth;
        case 'year':
            const lastYear = new Date();
            lastYear.setFullYear(lastYear.getFullYear() - 1);
            lastYear.setHours(0, 0, 0, 0);
            return lastYear;
        default:
            return null; // For 'all' time filter
    }
}

function startOfDay(date) {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
}

// Add event listener for time filter changes
document.getElementById('timeFilter').addEventListener('change', () => {
    const activeTab = document.querySelector('.tab-button.active');
    if (activeTab) {
        updatePurposePercentages(activeTab.dataset.tab);
    }
});

// Initialize first load
window.addEventListener('DOMContentLoaded', () => {
    const defaultTab = document.querySelector('.tab-button.active');
    if (defaultTab) {
        updatePurposePercentages(defaultTab.dataset.tab);
    }
});

// ########################################### COMPLAINTS OVERVIEW ##############################################

let complaintsChart = null;

function updateComplaintsChart(data) {
    try {
        const ctx = document.getElementById('complaintsStatusChart');
        if (!ctx) {
            console.error('Complaints chart canvas not found');
            return;
        }

        // If chart exists, destroy it
        if (window.complaintsChart) {
            window.complaintsChart.destroy();
        }

        // Create chart configuration
        const chartConfig = {
            type: 'line',
            data: {
                labels: data.map(item => item.date),
                datasets: [
                    {
                        label: 'Pending',
                        data: data.map(item => item.Pending),
                        borderColor: '#ffa726',
                        backgroundColor: 'rgba(255, 167, 38, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Cancelled',
                        data: data.map(item => item.Cancelled),
                        borderColor: '#ef5350',
                        backgroundColor: 'rgba(239, 83, 80, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Closed',
                        data: data.map(item => item.Closed),
                        borderColor: '#66bb6a',
                        backgroundColor: 'rgba(102, 187, 106, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Resolved',
                        data: data.map(item => item.Resolved),
                        borderColor: '#42a5f5',
                        backgroundColor: 'rgba(66, 165, 245, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            color: '#CDCDCD',
                            borderColor: '#CDCDCD',
                        },
                        ticks: {
                            color: '#CDCDCD',
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#CDCDCD',
                            borderColor: '#CDCDCD',
                        },
                        ticks: {
                            color: '#CDCDCD',
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: '#CDCDCD'
                        }
                    }
                }
            }
        };

        // Create new chart instance
        window.complaintsChart = new Chart(ctx, chartConfig);
        complaintsChart = window.complaintsChart;

    } catch (error) {
        console.error('Error updating complaints chart:', error);
    }
}

// Update your fetchAndDisplayComplaintsData function to include error handling
async function fetchAndDisplayComplaintsData(db) {
    try {
        const timeFilter = document.getElementById('complaintsTimeFilter')?.value || 'all';
        const complaintType = document.getElementById('complaintTypeSelect')?.value;

        const complaintsRef = collection(db, "Complaints");
        let startDate = getStartDate(timeFilter);
        const endDate = new Date();

        // Start with base query for time filter
        let q = query(
            complaintsRef,
            where('timestamp', '>=', Timestamp.fromDate(startDate)),
            where('timestamp', '<=', Timestamp.fromDate(endDate))
        );

        // Add complaint type filter if a specific type is selected
        if (complaintType && complaintType !== '' && complaintType !== 'all') {
            q = query(q, where('complaintType', '==', complaintType)); // Removed replace() since your field matches exactly
        }

        const querySnapshot = await getDocs(q);
        
        const complaintsByDate = {};
        const statusCounts = {
            Pending: 0,
            Cancelled: 0,
            Closed: 0,
            Resolved: 0
        };

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (!data.timestamp) {
                console.warn('Document missing timestamp:', doc.id);
                return;
            }

            const date = data.timestamp.toDate();
            const dateStr = date.toISOString().split('T')[0];
            
            if (!complaintsByDate[dateStr]) {
                complaintsByDate[dateStr] = {
                    Pending: 0,
                    Cancelled: 0,
                    Closed: 0,
                    Resolved: 0
                };
            }

            const status = data.status || 'Pending';
            if (statusCounts.hasOwnProperty(status)) {
                complaintsByDate[dateStr][status]++;
                statusCounts[status]++;
            }
        });

        const chartData = Object.entries(complaintsByDate)
            .map(([date, counts]) => ({
                date,
                ...counts
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Call updateComplaintsChart instead of recreating chart here
        updateComplaintsChart(chartData);
        
        // Update status percentages and average resolution time
        updateStatusPercentages(statusCounts);
        updateAvgResolutionTime(querySnapshot);

    } catch (error) {
        console.error("Error fetching complaints data:", error);
        console.error("Stack trace:", error.stack);
    }
}



function updateStatusPercentages(counts) {
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    Object.entries(counts).forEach(([status, count]) => {
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
        const elementId = `complaint${status}Percentage`;
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = `${percentage}%`;
        }
    });
}

function updateAvgResolutionTime(querySnapshot) {
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'Resolved' && data.resolutionDate) {
            const createdDate = data.timestamp.toDate();
            const resolvedDate = data.resolutionDate.toDate();
            totalResolutionTime += resolvedDate - createdDate;
            resolvedCount++;
        }
    });

    const avgElement = document.getElementById('avgResolutionTime');
    if (avgElement) {
        if (resolvedCount > 0) {
            const avgTimeInDays = (totalResolutionTime / resolvedCount) / (1000 * 60 * 60 * 24);
            avgElement.textContent = `${avgTimeInDays.toFixed(1)} days`;
        } else {
            avgElement.textContent = 'No resolved complaints';
        }
    }
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    const timeFilter = document.getElementById('complaintsTimeFilter');
    const typeSelect = document.getElementById('complaintTypeSelect');

    if (timeFilter) {
        timeFilter.addEventListener('change', () => fetchAndDisplayComplaintsData(db));
    }
    if (typeSelect) {
        typeSelect.addEventListener('change', () => fetchAndDisplayComplaintsData(db));
    }

    // Initial data fetch
    fetchAndDisplayComplaintsData(db);

    // Set up real-time updates
    const complaintsRef = collection(db, "Complaints");
    onSnapshot(complaintsRef, () => {
        fetchAndDisplayComplaintsData(db);
    });
});

// ####################################### SOCIAL SERVICES ###########################################

async function fetchAndDisplaySocialServicesData() {
    showLoader();
    try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        
        let kdbmCount = 0;
        let pwdCount = 0;
        let fourPsCount = 0;
        let soloParentCount = 0;
        const totalUsers = querySnapshot.size;

        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            
            if (userData.kdbm?.toUpperCase() === 'YES') kdbmCount++;
            if (userData.pwd?.toUpperCase() === 'YES') pwdCount++;
            if (userData.fourPs?.toUpperCase() === 'YES') fourPsCount++;
            if (userData.soloParent?.toUpperCase() === 'YES') soloParentCount++;
        });

        updateSocialServicesDisplay(totalUsers, kdbmCount, pwdCount, fourPsCount, soloParentCount);
    } catch (error) {
        console.error("Error fetching social services data:", error);
    } finally {
        hideLoader();
    }
}

function updateSocialServicesDisplay(total, kdbm, pwd, fourPs, soloParent) {
    // Update percentages in the legend
    const kdbmPercentage = total > 0 ? ((kdbm / total) * 100).toFixed(1) : 0;
    const pwdPercentage = total > 0 ? ((pwd / total) * 100).toFixed(1) : 0;
    const fourPsPercentage = total > 0 ? ((fourPs / total) * 100).toFixed(1) : 0;
    const soloParentPercentage = total > 0 ? ((soloParent / total) * 100).toFixed(1) : 0;

    const kdbmElement = document.getElementById('kdbmPercentage');
    const pwdElement = document.getElementById('pwdPercentage');
    const fourPsElement = document.getElementById('fourPsPercentage');
    const soloParentElement = document.getElementById('soloParentPercentage');

    if (kdbmElement) kdbmElement.textContent = `${kdbmPercentage}%`;
    if (pwdElement) pwdElement.textContent = `${pwdPercentage}%`;
    if (fourPsElement) fourPsElement.textContent = `${fourPsPercentage}%`;
    if (soloParentElement) soloParentElement.textContent = `${soloParentPercentage}%`;

    updateSocialServicesChart(kdbm, pwd, fourPs, soloParent);
}

function updateSocialServicesChart(kdbm, pwd, fourPs, soloParent) {
    const ctx = document.getElementById('socialServicesChart');
    if (!ctx) {
        console.error('Social services chart canvas not found');
        return;
    }

    const data = [kdbm, pwd, fourPs, soloParent];
    const labels = ['KDBM', 'PWD', '4Ps', 'Solo Parent'];
    const backgroundColor = ['#4CAF50', '#2196F3', '#FFC107', '#9C27B0'];

    if (socialServicesChart) {
        socialServicesChart.data.labels = labels;
        socialServicesChart.data.datasets[0].data = data;
        socialServicesChart.data.datasets[0].backgroundColor = backgroundColor;
        socialServicesChart.update();
    } else {
        socialServicesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColor,
                    borderWidth: 0
                }]
            },
            options: {
                cutout: '70%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                        position: 'bottom',
                        labels: {
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map(function(label, i) {
                                        const meta = chart.getDatasetMeta(0);
                                        const style = meta.controller.getStyle(i);
                                        const value = chart.config.data.datasets[0].data[i];
                                        const total = data.datasets[0].data.reduce((acc, val) => acc + val, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return {
                                            text: `${label}: ${percentage}%`,
                                            fillStyle: style.backgroundColor,
                                            hidden: isNaN(value) || meta.data[i].hidden,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.formattedValue;
                                const total = context.dataset.data.reduce((acc, data) => acc + data, 0);
                                const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

export { fetchAndDisplaySocialServicesData, setupSocialServicesRealtimeUpdates };