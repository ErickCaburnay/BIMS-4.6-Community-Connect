
let statusChart, typesChart, purposesChart;

export function initializeDocumentCharts(firestoreInstance) {
    console.log("Initializing document charts");
    db = firestoreInstance;

    if (!db) {
        console.error("Firestore instance is not properly initialized");
        return;
    }

    const timeFilter = document.getElementById('timeFilter');
    const documentTypeSelect = document.getElementById('documentTypeSelect');

    if (timeFilter && documentTypeSelect) {
        timeFilter.addEventListener('change', () => fetchAndDisplayDocumentData(db));
        documentTypeSelect.addEventListener('change', () => fetchAndDisplayDocumentData(db));
    } else {
        console.error('Document filter elements not found');
    }

    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button, .tab-pane').forEach(el => {
                el.classList.remove('active');
            });
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
            updatePurposePercentages(button.dataset.tab);
        });
    });

    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Please include the Chart.js library.');
        return;
    }

    fetchAndDisplayDocumentData(db);
}

async function fetchAndDisplayDocumentData(db) {
    console.log("Fetching and displaying document data");
    const timeFrame = document.getElementById('timeFilter').value;
    const documentType = document.getElementById('documentTypeSelect').value;

    console.log(`Time frame: ${timeFrame}, Document type: ${documentType}`);

    const dateRange = getDateRange(timeFrame);

    const collections = ['brgy_indigency', 'brgy_certificate', 'brgy_clearance'];
    let allDocuments = [];

    for (let collectionName of collections) {
        if (documentType && !collectionName.includes(documentType)) continue;

        const collectionRef = collection(db, collectionName);
        const q = query(collectionRef, 
            where('createdAt', '>=', dateRange.start),
            where('createdAt', '<=', dateRange.end)
        );

        try {
            const querySnapshot = await getDocs(q);
            console.log(`Fetched ${querySnapshot.size} documents from ${collectionName}`);
            allDocuments = allDocuments.concat(querySnapshot.docs.map(doc => ({...doc.data(), type: collectionName})));
        } catch (error) {
            console.error(`Error fetching documents from ${collectionName}:`, error);
        }
    }

    console.log('All documents:', allDocuments);

    const statusData = processStatusData(allDocuments);
    const typesData = processTypesData(allDocuments);
    const purposesData = processPurposesData(allDocuments, documentType);

    console.log('Status data:', statusData);
    console.log('Types data:', typesData);
    console.log('Purposes data:', purposesData);

    updateStatusChart(statusData);
    updateTypesChart(typesData);
    updatePurposesChart(purposesData);

    updateStatusLegend(statusData);
    updateTypesLegend(typesData);
    updatePurposesLegend(purposesData);
    updatePurposePercentages(documentType || 'indigency');
}

function getDateRange(timeFrame) {
    const now = new Date();
    let start = new Date(now);

    switch(timeFrame) {
        case 'today':
            start.setHours(0, 0, 0, 0);
            break;
        case 'week':
            start.setDate(now.getDate() - 7);
            break;
        case 'month':
            start.setMonth(now.getMonth() - 1);
            break;
        case 'year':
            start.setFullYear(now.getFullYear() - 1);
            break;
        default:
            start = new Date(0); // Beginning of time
    }

    return {
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(now)
    };
}

function processStatusData(documents) {
    const statusCounts = {
        Pending: 0,
        Cancelled: 0,
        Printed: 0
    };

    documents.forEach(doc => {
        statusCounts[doc.status] = (statusCounts[doc.status] || 0) + 1;
    });

    return statusCounts;
}

function processTypesData(documents) {
    const typeCounts = {
        'brgy_indigency': 0,
        'brgy_certificate': 0,
        'brgy_clearance': 0
    };

    documents.forEach(doc => {
        typeCounts[doc.type]++;
    });

    return typeCounts;
}

function processPurposesData(documents, documentType) {
    const purposeCounts = {};

    documents.forEach(doc => {
        if (!documentType || doc.type.includes(documentType)) {
            purposeCounts[doc.purpose] = (purposeCounts[doc.purpose] || 0) + 1;
        }
    });

    return purposeCounts;
}

function updateStatusChart(statusData) {
    console.log('Updating status chart with data:', statusData);
    const ctx = document.getElementById('statusChart');
    if (!ctx) {
        console.error('Status chart canvas not found');
        return;
    }

    if (!statusChart) {
        statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Cancelled', 'Printed'],
                datasets: [{
                    data: [statusData.Pending, statusData.Cancelled, statusData.Printed],
                    backgroundColor: ['#ffa726', '#ef5350', '#66bb6a']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    } else {
        statusChart.data.datasets[0].data = [statusData.Pending, statusData.Cancelled, statusData.Printed];
        statusChart.update();
    }
}

function updateTypesChart(typesData) {
    if (!typesChart) {
        const ctx = document.getElementById('typesChart').getContext('2d');
        typesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Indigency', 'Certificate', 'Clearance'],
                datasets: [{
                    data: [typesData.brgy_indigency, typesData.brgy_certificate, typesData.brgy_clearance],
                    backgroundColor: ['#29b6f6', '#ab47bc', '#26a69a']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    } else {
        typesChart.data.datasets[0].data = [typesData.brgy_indigency, typesData.brgy_certificate, typesData.brgy_clearance];
        typesChart.update();
    }
}

function updatePurposesChart(purposesData) {
    const labels = Object.keys(purposesData);
    const data = Object.values(purposesData);

    if (!purposesChart) {
        const ctx = document.getElementById('purposesChart').getContext('2d');
        purposesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: '#4caf50'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    } else {
        purposesChart.data.labels = labels;
        purposesChart.data.datasets[0].data = data;
        purposesChart.update();
    }
}

function updateStatusLegend(statusData) {
    const total = statusData.Pending + statusData.Cancelled + statusData.Printed;
    document.getElementById('pendingPercentage').textContent = `${((statusData.Pending / total) * 100).toFixed(1)}%`;
    document.getElementById('cancelledPercentage').textContent = `${((statusData.Cancelled / total) * 100).toFixed(1)}%`;
    document.getElementById('printedPercentage').textContent = `${((statusData.Printed / total) * 100).toFixed(1)}%`;
}

function updateTypesLegend(typesData) {
    const total = typesData.brgy_indigency + typesData.brgy_certificate + typesData.brgy_clearance;
    document.getElementById('indigencyPercentage').textContent = `${((typesData.brgy_indigency / total) * 100).toFixed(1)}%`;
    document.getElementById('certificatePercentage').textContent = `${((typesData.brgy_certificate / total) * 100).toFixed(1)}%`;
    document.getElementById('clearancePercentage').textContent = `${((typesData.brgy_clearance / total) * 100).toFixed(1)}%`;
}

function updatePurposesLegend(purposesData) {
    const purposesLegend = document.getElementById('purposesLegend');
    purposesLegend.innerHTML = '';

    Object.entries(purposesData).forEach(([purpose, count]) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <span class="legend-color" style="background-color: #4caf50;"></span>
            <span class="legend-label">${purpose}</span>
            <span class="legend-percentage">${count}</span>
        `;
        purposesLegend.appendChild(legendItem);
    });
}

function updatePurposePercentages(documentType) {
    const purposeElements = document.querySelectorAll(`#${documentType} .purpose-percentage`);
    purposeElements.forEach(element => {
        // Here you would calculate the actual percentage based on your data
        // For now, we'll just set a placeholder value
        element.textContent = '0%';
    });
}