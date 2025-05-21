// Dashboard.js - Real-time dashboard updates for ProctorShield
// ===================================================================

// Configuration
const BACKEND_URL = 'http://127.0.0.1:8080'; // C++ backend server URL
const FLASK_URL = 'http://127.0.0.1:5000';   // Flask server URL
const UPDATE_INTERVAL = 5000;                // Update dashboard every 5 seconds

// DOM Elements
const navLinks = document.querySelectorAll('.nav-links a');
const navToggle = document.getElementById('navToggle');
const navLinksContainer = document.getElementById('navLinks');
const sections = document.querySelectorAll('main section');

// Dashboard Stats Elements
const activeSessionsEl = document.querySelector('.stat-card:nth-child(1) .stat-value');
const flaggedIncidentsEl = document.querySelector('.stat-card:nth-child(2) .stat-value');
const completedExamsEl = document.querySelector('.stat-card:nth-child(3) .stat-value');
const systemUptimeEl = document.querySelector('.stat-card:nth-child(4) .stat-value');

// Recent Incidents Table
const incidentsTableBody = document.querySelector('#dashboard .data-table tbody');

// System Status Elements
const statusItems = document.querySelectorAll('.status-item .status-value');

// Function to activate selected page
function activatePage(pageId) {
    // Default to dashboard if no pageId is provided
    if (!pageId) {
        pageId = 'dashboard';
    }
   
    // Update navigation links
    navLinks.forEach(link => {
        if (link.getAttribute('href') === '/' + pageId ||
            (pageId === 'dashboard' && link.getAttribute('href') === '/dashboard')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
   
    // Hide all sections and show the selected one
    sections.forEach(section => {
        if (section.id === pageId) {
            section.classList.add('active-section');
        } else {
            section.classList.remove('active-section');
        }
    });

    // If dashboard is activated, start real-time updates
    if (pageId === 'dashboard') {
        startDashboardUpdates();
    } else {
        stopDashboardUpdates();
    }
}

// Toggle mobile navigation
navToggle.addEventListener('click', () => {
    navLinksContainer.classList.toggle('show');
});

// Event Listeners for navigation
navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const pageId = this.getAttribute('href').replace('/', '');
        activatePage(pageId);
       
        // Close mobile menu if open
        if (window.innerWidth <= 768) {
            navLinksContainer.classList.remove('show');
        }
    });
});

// Dashboard Data Update Functions
// ===============================

let dashboardUpdateInterval = null;

/**
 * Start dashboard real-time updates
 */
function startDashboardUpdates() {
    // Immediately fetch data once
    fetchDashboardData();
    
    // Then set up interval for continuous updates
    if (!dashboardUpdateInterval) {
        dashboardUpdateInterval = setInterval(fetchDashboardData, UPDATE_INTERVAL);
    }
}

/**
 * Stop dashboard real-time updates
 */
function stopDashboardUpdates() {
    if (dashboardUpdateInterval) {
        clearInterval(dashboardUpdateInterval);
        dashboardUpdateInterval = null;
    }
}

/**
 * Fetch all dashboard data from the backend
 */
async function fetchDashboardData() {
    try {
        // Fetch the dashboard stats data
        const statsResponse = await fetch(`${BACKEND_URL}/api/dashboard/stats`);
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            updateDashboardStats(statsData);
        }

        // Fetch the recent incidents data
        const incidentsResponse = await fetch(`${BACKEND_URL}/api/dashboard/incidents`);
        if (incidentsResponse.ok) {
            const incidentsData = await incidentsResponse.json();
            updateRecentIncidents(incidentsData);
        }

        // Fetch the system status data
        const statusResponse = await fetch(`${BACKEND_URL}/api/dashboard/system-status`);
        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            updateSystemStatus(statusData);
        }
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Use mock data if server connection fails
        useMockData();
    }
}

/**
 * Update the dashboard stats with data from the server
 */
function updateDashboardStats(data) {
    activeSessionsEl.textContent = data.activeSessions;
    flaggedIncidentsEl.textContent = data.flaggedIncidents;
    completedExamsEl.textContent = data.completedExams;
    systemUptimeEl.textContent = data.systemUptime;
}

/**
 * Update the recent incidents table with data from the server
 */
function updateRecentIncidents(incidents) {
    // Clear existing incidents
    incidentsTableBody.innerHTML = '';

    // Add new incidents
    incidents.forEach(incident => {
        const row = document.createElement('tr');
        
        // Create type cell with appropriate badge
        const typeCell = document.createElement('td');
        const badgeClass = getBadgeClassForIncidentType(incident.type);
        typeCell.innerHTML = `<span class="badge ${badgeClass}"><i class="${getIconForIncidentType(incident.type)}"></i> ${incident.type}</span>`;
        
        // Create other cells
        const studentCell = document.createElement('td');
        studentCell.textContent = incident.student;
        
        const timeCell = document.createElement('td');
        timeCell.textContent = incident.time;
        
        const severityCell = document.createElement('td');
        severityCell.innerHTML = `<span class="severity-indicator ${incident.severity.toLowerCase()}"></span> ${incident.severity}`;
        
        const actionCell = document.createElement('td');
        actionCell.innerHTML = `<button class="btn-icon" onclick="viewSessionDetails('${incident.id}')"><i class="fas fa-eye"></i></button>`;
        
        // Append all cells to the row
        row.appendChild(typeCell);
        row.appendChild(studentCell);
        row.appendChild(timeCell);
        row.appendChild(severityCell);
        row.appendChild(actionCell);
        
        // Append the row to the table
        incidentsTableBody.appendChild(row);
    });
}

/**
 * Update the system status items with data from the server
 */
function updateSystemStatus(statusData) {
    // Map the status items to the data
    const statusMapping = [
        'textAnalysis',
        'videoSurveillance',
        'reportGeneration',
        'lmsIntegration',
        'databaseConnection'
    ];
    
    // Update each status item
    statusItems.forEach((item, index) => {
        if (index < statusMapping.length) {
            const status = statusData[statusMapping[index]];
            item.textContent = status;
            
            // Remove all status classes
            item.classList.remove('online', 'warning', 'offline');
            
            // Add appropriate status class
            switch (status.toLowerCase()) {
                case 'online':
                    item.classList.add('online');
                    break;
                case 'maintenance':
                    item.classList.add('warning');
                    break;
                case 'offline':
                    item.classList.add('offline');
                    break;
                default:
                    item.classList.add('warning');
            }
        }
    });
}

/**
 * Helper function to get badge class based on incident type
 */
function getBadgeClassForIncidentType(type) {
    switch (type) {
        case 'Text Similarity':
            return 'warning';
        case 'Device Detected':
            return 'danger';
        case 'Multiple Faces':
            return 'warning';
        case 'No Face Detected':
            return 'danger';
        case 'Eye Tracking':
            return 'warning';
        default:
            return 'info';
    }
}

/**
 * Helper function to get icon based on incident type
 */
function getIconForIncidentType(type) {
    switch (type) {
        case 'Text Similarity':
            return 'fas fa-search';
        case 'Device Detected':
            return 'fas fa-mobile-alt';
        case 'Multiple Faces':
            return 'fas fa-user-friends';
        case 'No Face Detected':
            return 'fas fa-user-slash';
        case 'Eye Tracking':
            return 'fas fa-eye';
        default:
            return 'fas fa-exclamation-circle';
    }
}

/**
 * Use mock data if server connection fails
 */
function useMockData() {
    // Mock stats data
    updateDashboardStats({
        activeSessions: Math.floor(Math.random() * 30) + 10,
        flaggedIncidents: Math.floor(Math.random() * 10) + 1,
        completedExams: Math.floor(Math.random() * 50) + 80,
        systemUptime: '99.8%'
    });
    
    // Mock incidents data
    const mockIncidents = [
        {
            id: 'inc-' + Math.floor(Math.random() * 10000),
            type: 'Text Similarity',
            student: 'John Smith',
            time: '10:42 AM',
            severity: 'High'
        },
        {
            id: 'inc-' + Math.floor(Math.random() * 10000),
            type: 'Device Detected',
            student: 'Emily Johnson',
            time: '09:15 AM',
            severity: 'Critical'
        },
        {
            id: 'inc-' + Math.floor(Math.random() * 10000),
            type: 'Multiple Faces',
            student: 'Michael Brown',
            time: 'Yesterday',
            severity: 'Medium'
        }
    ];
    updateRecentIncidents(mockIncidents);
    
    // Mock system status
    updateSystemStatus({
        textAnalysis: 'Online',
        videoSurveillance: 'Online',
        reportGeneration: 'Online',
        lmsIntegration: 'Maintenance',
        databaseConnection: 'Online'
    });
}

// Refresh Button Event Listener
document.querySelector('.card-header .btn-small').addEventListener('click', function() {
    fetchDashboardData();
});

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set dashboard as the default active page
    activatePage('dashboard');
    
    // Determine if we're in responsive mode and set up the menu accordingly
    if (window.innerWidth <= 768) {
        navLinksContainer.classList.remove('show');
    }
});

// Window resize event to handle responsive layout
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        navLinksContainer.classList.remove('show');
    }
});





// Text Analysis section - Add event listeners for the analysis button
const analyzeBtn = document.querySelector('#text-analysis .btn-primary');
if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async function() {
        const text1 = document.querySelector('#text-analysis .text-input:first-of-type textarea').value;
        const text2 = document.querySelector('#text-analysis .text-input:last-of-type textarea').value;
        
        if (!text1 || !text2) {
            alert('Please enter both text samples');
            return;
        }
        
        const algorithm = document.getElementById('text-algorithm').value;
        const threshold = document.getElementById('similarity-threshold').value;
        
        // Connect to the C++ backend for text analysis
        try {
            const response = await fetch(`${BACKEND_URL}/api/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    text1: text1,
                    text2: text2,
                    algorithm: algorithm,
                    threshold: threshold
                }),
                mode: 'cors'
            });
            
            const data = await response.json();
            
            if (data.error) {
                alert('Error: ' + data.error);
                return;
            }
            
            // Update the results UI
            const resultsSummary = document.querySelector('.result-summary');
            const meterFill = resultsSummary.querySelector('.meter-fill');
            const similarityValue = resultsSummary.querySelector('.similarity-value');
            
            meterFill.style.width = `${data.similarity}%`;
            similarityValue.textContent = `${Math.round(data.similarity)}% Similar`;
            
            // Show the results container
            document.getElementById('textResults').style.display = 'block';
            
            // Highlight matched patterns if available
            if (data.matchedPatterns && data.matchedPatterns.length > 0) {
                const matchedText = document.querySelector('.matched-text p');
                let text = text1;
                
                // Create an array of characters with highlighting info
                const chars = Array.from(text).map(char => ({ char, highlight: false }));
                
                // Mark characters to highlight based on matched patterns
                data.matchedPatterns.forEach(match => {
                    const pattern = match.pattern;
                    match.positions.forEach(pos => {
                        for (let i = 0; i < pattern.length; i++) {
                            if (pos + i < chars.length) {
                                chars[pos + i].highlight = true;
                            }
                        }
                    });
                });
                
                // Generate highlighted HTML
                let highlightedText = '';
                let inHighlight = false;
                
                for (let i = 0; i < chars.length; i++) {
                    if (chars[i].highlight && !inHighlight) {
                        highlightedText += '<mark>';
                        inHighlight = true;
                    } else if (!chars[i].highlight && inHighlight) {
                        highlightedText += '</mark>';
                        inHighlight = false;
                    }
                    
                    highlightedText += chars[i].char;
                }
                
                if (inHighlight) {
                    highlightedText += '</mark>';
                }
                
                matchedText.innerHTML = highlightedText;
            }
            
        } catch (error) {
            console.error('Error analyzing text:', error);
            alert('Error connecting to the analysis server. Please check if the server is running.');
        }
    });
}

// Mobile menu toggle
navToggle.addEventListener('click', function() {
    navLinksContainer.classList.toggle('show');
});

// Handle page load
document.addEventListener('DOMContentLoaded', function() {
    // Always show dashboard on initial load
    activatePage('dashboard');
    
    // Update URL when navigating without page reload
    window.addEventListener('popstate', function() {
        const path = window.location.pathname.substring(1);
        activatePage(path || 'dashboard'); // Default to dashboard if path is empty
    });
});

// Additional interactive elements

// Text Analysis section sliders
const similarityThreshold = document.getElementById('similarity-threshold');
if (similarityThreshold) {
    const sliderValue = similarityThreshold.nextElementSibling;
    similarityThreshold.addEventListener('input', function() {
        sliderValue.textContent = this.value + '%';
    });
}

// Settings section sliders
const sliders = document.querySelectorAll('.settings-card .slider');
sliders.forEach(slider => {
    const sliderValue = slider.nextElementSibling;
    if (sliderValue) {
        slider.addEventListener('input', function() {
            sliderValue.textContent = this.value + '%';
        });
    }
});





/// Report generation handlers
const generateReportBtn = document.querySelector('#reports .btn-primary');
const exportPdfBtn = document.querySelector('#reports .btn-outline:nth-of-type(1)');
const exportCsvBtn = document.querySelector('#reports .btn-outline:nth-of-type(2)');
const clearFiltersBtn = document.querySelector('#reports .btn-secondary');

if (generateReportBtn) {
    generateReportBtn.addEventListener('click', async function() {
        // Show loading state
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        this.disabled = true;
        
        // Get filter values
        const dateRange = document.getElementById('report-date').value;
        const reportType = document.getElementById('report-type').value;
        const severityLevel = document.getElementById('report-severity').value;
        
        try {
            let reportData;
            
            // Get real data from appropriate backend based on report type
            if (reportType === 'text') {
                // Use data from text analysis results
                const textResults = getTextAnalysisResults();
                reportData = processTextResults(textResults, severityLevel, dateRange);
            } 
            else if (reportType === 'video') {
                // Use data from video analysis results
                const videoResults = await getVideoAnalysisResults();
                reportData = processVideoResults(videoResults, severityLevel, dateRange);
            } 
            else {
                // For "all" reports, combine both text and video data
                const textResults = getTextAnalysisResults();
                const videoResults = await getVideoAnalysisResults();
                reportData = combineResults(textResults, videoResults, severityLevel, dateRange);
            }
            
            // Update summary statistics
            updateReportSummary(reportData.summary);
            
            // Update detailed results table
            updateReportDetailsTable(reportData.details);
            
            // Store report data for exports
            window.currentReportData = reportData;
            
            // Enable export buttons
            if (exportPdfBtn) exportPdfBtn.disabled = false;
            if (exportCsvBtn) exportCsvBtn.disabled = false;
            
        } catch (error) {
            console.error('Error in report generation process:', error);
            alert('Failed to generate report: ' + error.message);
        }
        
        // Reset button state
        this.innerHTML = 'Generate Report';
        this.disabled = false;
    });
}

// Function to get text analysis results from the current application state
function getTextAnalysisResults() {
    // Get text analysis data from the text analysis section
    const textResultsElement = document.getElementById('textResults');
    
    // Initialize with empty data
    let results = {
        sessions: []
    };
    
    // If text analysis has been performed, extract the results
    if (textResultsElement && textResultsElement.style.display !== 'none') {
        const similarityElement = document.querySelector('.similarity-value');
        const similarity = similarityElement ? 
            parseInt(similarityElement.textContent.replace(/\D/g, '')) : 0;
            
        const text1 = document.querySelector('#text-analysis .text-input:first-of-type textarea').value;
        const text2 = document.querySelector('#text-analysis .text-input:last-of-type textarea').value;
        const algorithm = document.getElementById('text-algorithm').value;
        
        const now = new Date();
        const id = 'T' + now.getTime().toString().substring(5);
        
        // Determine status based on similarity score
        let status = 'Passed';
        if (similarity > 80) {
            status = 'Failed';
        } else if (similarity > 60) {
            status = 'Review';
        }
        
        results.sessions.push({
            id: id,
            student: 'Current User',  // In real app, get from user session
            date: now.toISOString().split('T')[0],
            duration: '30:00',  // Placeholder duration
            text1: text1,
            text2: text2,
            algorithm: algorithm,
            similarity: similarity,
            violations: similarity > 60 ? 1 : 0,
            status: status,
            score: 100 - similarity  // Lower similarity = higher score
        });
    }
    
    // Add previous analysis results if stored in localStorage
    const savedResults = localStorage.getItem('textAnalysisResults');
    if (savedResults) {
        try {
            const parsed = JSON.parse(savedResults);
            if (Array.isArray(parsed)) {
                results.sessions = [...results.sessions, ...parsed];
            }
        } catch (e) {
            console.error('Error parsing saved text results:', e);
        }
    }
    
    return results;
}

// Function to get video analysis results from the backend
async function getVideoAnalysisResults() {
    // Get data from the face detection section
    const faceCount = document.getElementById('face-count') ? 
        parseInt(document.getElementById('face-count').textContent) : 0;
    
    let results = {
        sessions: []
    };
    
    // Extract data from the log entries
    const logEntries = document.querySelectorAll('.log-entries .log-entry');
    let warnings = 0;
    let alerts = 0;
    
    logEntries.forEach(entry => {
        const type = entry.querySelector('.log-type').textContent;
        if (type === 'Warning') warnings++;
        if (type === 'Alert') alerts++;
    });
    
    // Create a session from current data
    const now = new Date();
    const id = 'V' + now.getTime().toString().substring(5);
    
    // Determine status based on face detection and warnings
    let status = 'Passed';
    if (alerts > 0) {
        status = 'Failed';
    } else if (warnings > 0) {
        status = 'Review';
    }
    
    // Calculate a score based on violations
    const violations = warnings + (alerts * 2);
    const score = Math.max(100 - (violations * 10), 50);
    
    results.sessions.push({
        id: id,
        student: 'Current User',  // In real app, get from user session
        date: now.toISOString().split('T')[0],
        duration: '15:00',  // Placeholder duration
        faceCount: faceCount,
        warnings: warnings,
        alerts: alerts,
        violations: violations,
        status: status,
        score: score
    });
    
    // Try to get additional video session data from backend
    try {
        const response = await fetch(`${FLASK_URL}/api/video-sessions`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.sessions)) {
                results.sessions = [...results.sessions, ...data.sessions];
            }
        }
    } catch (error) {
        console.log('Additional video sessions not available:', error);
        // Continue with local data only if server request fails
    }
    
    return results;
}

// Function to process text analysis results based on filters
function processTextResults(results, severityLevel, dateRange) {
    const filteredSessions = filterSessionsByParams(results.sessions, severityLevel, dateRange);
    
    // Calculate summary statistics
    const summary = {
        totalSessions: filteredSessions.length,
        flaggedIncidents: filteredSessions.filter(s => s.status !== 'Passed').length,
        averageScore: calculateAverageScore(filteredSessions)
    };
    
    return {
        summary: summary,
        details: filteredSessions
    };
}

// Function to process video analysis results based on filters
function processVideoResults(results, severityLevel, dateRange) {
    const filteredSessions = filterSessionsByParams(results.sessions, severityLevel, dateRange);
    
    // Calculate summary statistics
    const summary = {
        totalSessions: filteredSessions.length,
        flaggedIncidents: filteredSessions.filter(s => s.status !== 'Passed').length,
        averageScore: calculateAverageScore(filteredSessions)
    };
    
    return {
        summary: summary,
        details: filteredSessions
    };
}

// Function to combine text and video results
function combineResults(textResults, videoResults, severityLevel, dateRange) {
    // Combine all sessions
    const allSessions = [...textResults.sessions, ...videoResults.sessions];
    
    // Apply filters
    const filteredSessions = filterSessionsByParams(allSessions, severityLevel, dateRange);
    
    // Calculate summary statistics
    const summary = {
        totalSessions: filteredSessions.length,
        flaggedIncidents: filteredSessions.filter(s => s.status !== 'Passed').length,
        averageScore: calculateAverageScore(filteredSessions)
    };
    
    return {
        summary: summary,
        details: filteredSessions
    };
}

// Helper function to filter sessions by parameters
function filterSessionsByParams(sessions, severityLevel, dateRange) {
    return sessions.filter(session => {
        // Filter by severity
        if (severityLevel === 'high' && session.status !== 'Failed') return false;
        if (severityLevel === 'medium' && session.status === 'Passed') return false;
        
        // Filter by date range
        if (dateRange !== 'all') {
            const sessionDate = new Date(session.date);
            const today = new Date();
            
            if (dateRange === 'today') {
                const todayString = today.toISOString().split('T')[0];
                if (session.date !== todayString) return false;
            } else if (dateRange === 'week') {
                const weekAgo = new Date();
                weekAgo.setDate(today.getDate() - 7);
                if (sessionDate < weekAgo) return false;
            } else if (dateRange === 'month') {
                const monthAgo = new Date();
                monthAgo.setMonth(today.getMonth() - 1);
                if (sessionDate < monthAgo) return false;
            }
        }
        
        return true;
    });
}

// Helper function to calculate average score
function calculateAverageScore(sessions) {
    if (sessions.length === 0) return 0;
    
    const totalScore = sessions.reduce((sum, session) => sum + session.score, 0);
    return (totalScore / sessions.length).toFixed(1);
}

if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', function() {
        // Reset all filter selects to first option
        document.getElementById('report-date').selectedIndex = 0;
        document.getElementById('report-type').selectedIndex = 0;
        document.getElementById('report-severity').selectedIndex = 0;
    });
}

// Export handlers
if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', function() {
        if (!window.currentReportData) {
            alert('Please generate a report first');
            return;
        }
        
        exportReportToPdf(window.currentReportData);
    });
}

if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', function() {
        if (!window.currentReportData) {
            alert('Please generate a report first');
            return;
        }
        
        exportReportToCsv(window.currentReportData);
    });
}

// Function to update the report summary section
function updateReportSummary(summary) {
    const summaryStats = document.querySelectorAll('.summary-stats .summary-stat .stat-value');
    
    if (summaryStats.length >= 3) {
        summaryStats[0].textContent = summary.totalSessions;
        summaryStats[1].textContent = summary.flaggedIncidents;
        summaryStats[2].textContent = summary.averageScore + '%';
    }
}

// Function to update the detailed results table
function updateReportDetailsTable(details) {
    const tableBody = document.querySelector('.report-results table tbody');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add new rows
    details.forEach(session => {
        const row = document.createElement('tr');
        
        // Status badge class based on status value
        let badgeClass = 'success';
        if (session.status === 'Review') {
            badgeClass = 'warning';
        } else if (session.status === 'Failed') {
            badgeClass = 'danger';
        }
        
        row.innerHTML = `
            <td>${session.id}</td>
            <td>${session.student}</td>
            <td>${session.date}</td>
            <td>${session.duration}</td>
            <td>${session.violations}</td>
            <td><span class="badge ${badgeClass}">${session.status}</span></td>
            <td><button class="btn-icon" onclick="viewSessionDetails('${session.id}')"><i class="fas fa-eye"></i></button></td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Function to view session details
function viewSessionDetails(sessionId) {
    // Get session data from our current report data
    if (window.currentReportData && window.currentReportData.details) {
        const session = window.currentReportData.details.find(s => s.id === sessionId);
        
        if (session) {
            showSessionDetailsModal(session);
            return;
        }
    }
    
    // If not found locally, try to fetch from server
    let apiUrl;
    
    if (sessionId.startsWith('T')) {
        // Text session - use C++ backend
        apiUrl = `${BACKEND_URL}/api/sessions/${sessionId}`;
    } else if (sessionId.startsWith('V')) {
        // Video session - use Flask backend
        apiUrl = `${FLASK_URL}/api/sessions/${sessionId}`;
    } else {
        // Default to main backend
        apiUrl = `${BACKEND_URL}/api/sessions/${sessionId}`;
    }
    
    // Fetch session details
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error fetching session details: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            showSessionDetailsModal(data);
        })
        .catch(error => {
            console.error('Error fetching session details:', error);
            alert(`Could not load details for session ${sessionId}. Error: ${error.message}`);
        });
}

// Function to show session details in a modal
function showSessionDetailsModal(sessionData) {
    // Create a modal for session details
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.style.position = 'fixed';
    modal.style.zIndex = '1000';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.overflow = 'auto';
    modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.backgroundColor = '#fefefe';
    modalContent.style.margin = '10% auto';
    modalContent.style.padding = '20px';
    modalContent.style.border = '1px solid #888';
    modalContent.style.width = '80%';
    modalContent.style.maxWidth = '800px';
    modalContent.style.borderRadius = '5px';
    
    // Create close button
    const closeButton = document.createElement('span');
    closeButton.className = 'close';
    closeButton.innerHTML = '&times;';
    closeButton.style.color = '#aaa';
    closeButton.style.float = 'right';
    closeButton.style.fontSize = '28px';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.cursor = 'pointer';
    
    closeButton.onclick = function() {
        document.body.removeChild(modal);
    };
    
    // Add content based on session type
    let content = `
        <h2>Session Details</h2>
        <div class="details-grid">
            <div class="detail-item">
                <span class="detail-label">Session ID:</span>
                <span class="detail-value">${sessionData.id}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Student:</span>
                <span class="detail-value">${sessionData.student}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${sessionData.date}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">${sessionData.duration}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Status:</span>
                <span class="detail-value ${sessionData.status === 'Failed' ? 'text-danger' : 
                   sessionData.status === 'Review' ? 'text-warning' : 'text-success'}">${sessionData.status}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Score:</span>
                <span class="detail-value">${sessionData.score}%</span>
            </div>
        </div>
    `;
    
    // Add type-specific details
    if (sessionData.id.startsWith('T')) {
        // Text session details
        content += `
            <div class="text-details">
                <h3>Text Analysis Details</h3>
                <div class="detail-item">
                    <span class="detail-label">Algorithm:</span>
                    <span class="detail-value">${sessionData.algorithm || 'Standard'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Similarity Score:</span>
                    <span class="detail-value">${sessionData.similarity || '0'}%</span>
                </div>
                <div class="text-samples">
                    <div class="text-sample">
                        <h4>Text Sample 1</h4>
                        <div class="sample-content">${sessionData.text1 || 'Not available'}</div>
                    </div>
                    <div class="text-sample">
                        <h4>Text Sample 2</h4>
                        <div class="sample-content">${sessionData.text2 || 'Not available'}</div>
                    </div>
                </div>
            </div>
        `;
    } else if (sessionData.id.startsWith('V')) {
        // Video session details
        content += `
            <div class="video-details">
                <h3>Video Analysis Details</h3>
                <div class="detail-item">
                    <span class="detail-label">Face Detection:</span>
                    <span class="detail-value">${sessionData.faceCount !== undefined ? 
                      (sessionData.faceCount === 1 ? 'Successful' : 
                       sessionData.faceCount === 0 ? 'Failed - No face detected' : 
                       'Failed - Multiple faces detected') : 'Not recorded'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Warnings:</span>
                    <span class="detail-value">${sessionData.warnings || '0'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Alerts:</span>
                    <span class="detail-value">${sessionData.alerts || '0'}</span>
                </div>
            </div>
        `;
    }
    
    // Add content to modal
    modalContent.appendChild(closeButton);
    modalContent.innerHTML += content;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close on click outside
    window.onclick = function(event) {
        if (event.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

// Function to export report to PDF
function exportReportToPdf(reportData) {
    // In a real implementation, you would use a library like jsPDF
    alert('PDF Export: Your report is being generated');
    console.log('Report data for PDF export:', reportData);
    
    // Create a timestamp for the filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `proctorshield_report_${timestamp}.pdf`;
    
    // Simulate PDF generation delay
    setTimeout(() => {
        alert(`PDF Export: Report "${filename}" has been downloaded`);
    }, 1000);
}

// Function to export report to CSV
function exportReportToCsv(reportData) {
    // Create CSV content
    let csv = 'Session ID,Student,Date,Duration,Violations,Status,Score\n';
    
    reportData.details.forEach(session => {
        csv += `${session.id},${session.student},${session.date},${session.duration},${session.violations},${session.status},${session.score}\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    
    // Create a timestamp for the filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.setAttribute('download', `proctorshield_report_${timestamp}.csv`);
    
    document.body.appendChild(a);
    
    // Trigger download
    a.click();
    
    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}









// Face detection and video controls functionality
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let context = canvas.getContext('2d');
let faceCountElement = document.getElementById('face-count');
let stream = null;
let intervalId = null;
let isPaused = false;

// Define Flask server URL - key change to fix the 405 error
// const FLASK_URL = 'http://127.0.0.1:5000';

// Function to start the camera
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        isPaused = false;
        addLogEntry('Camera started', 'info');
        intervalId = setInterval(captureFrame, 1000);
    } catch (err) {
        console.error("Error accessing camera:", err);
        addLogEntry('Error accessing camera: ' + err.message, 'danger');
        alert("Error accessing camera. Please make sure you've granted camera permissions.");
    }
}

// Function to pause/resume the camera
function togglePauseCamera(icon) {
    if (isPaused) {
        video.play();
        intervalId = setInterval(captureFrame, 1000);
        icon.className = 'fas fa-pause';
        isPaused = false;
        addLogEntry('Camera resumed', 'info');
    } else {
        video.pause();
        clearInterval(intervalId);
        icon.className = 'fas fa-play';
        isPaused = true;
        addLogEntry('Camera paused', 'info');
    }
}

// Function to stop the camera
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        clearInterval(intervalId);
        faceCountElement.textContent = '0';
        addLogEntry('Camera stopped', 'info');
    }
}

// Function to capture a screenshot
function captureScreenshot() {
    if (stream && !isPaused) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        addLogEntry('Screenshot captured', 'info');
    }
}

// Unified control handler using icons
const videoControls = document.querySelectorAll('.video-controls .btn-icon');
videoControls.forEach(control => {
    control.addEventListener('click', function () {
        const icon = this.querySelector('i');
        if (icon.classList.contains('fa-play')) {
            startCamera();
        } else if (icon.classList.contains('fa-pause') || icon.classList.contains('fa-play')) {
            togglePauseCamera(icon);
        } else if (icon.classList.contains('fa-stop')) {
            stopCamera();
        } else if (icon.classList.contains('fa-camera')) {
            captureScreenshot();
        }
    });
});

// Function to capture frame and send to server for face detection
async function captureFrame() {
    if (!video.srcObject) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg');

    try {
        // Changed to use the FLASK_URL constant
        const response = await fetch(`${FLASK_URL}/process_frame`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                // Added to ensure CORS works properly
                'Accept': 'application/json'
            },
            body: JSON.stringify({ image: imageData }),
            // Added for better CORS support
            mode: 'cors'
        });

        const data = await response.json();

        if (data.face_count !== undefined) {
            const prevCount = parseInt(faceCountElement.textContent) || 0;
            faceCountElement.textContent = data.face_count;

            if (data.face_count > 1) {
                addLogEntry(`Multiple faces detected: ${data.face_count} faces in frame`, 'warning');
            } else if (data.face_count === 0 && prevCount > 0) {
                addLogEntry('No face detected in frame', 'danger');
            } else if (data.face_count === 1 && prevCount !== 1) {
                addLogEntry('Face detected and verified', 'success');
            }
        }
    } catch (error) {
        console.error('Error sending frame:', error);
        addLogEntry('Error processing video frame', 'danger');
    }
}

// Add activity log entries
function addLogEntry(message, type) {
    const logEntries = document.querySelector('.log-entries');
    if (!logEntries) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { hour12: false });

    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = `
        <span class="log-time">${timeString}</span>
        <span class="log-type ${type}">${type === 'info' ? 'Info' : type === 'warning' ? 'Warning' : type === 'danger' ? 'Alert' : 'Success'}</span>
        <span class="log-message">${message}</span>
    `;

    logEntries.insertBefore(logEntry, logEntries.firstChild);
    while (logEntries.children.length > 10) {
        logEntries.removeChild(logEntries.lastChild);
    }
}

// Function to fetch and display logs from server
async function fetchServerLogs() {
    try {
        const response = await fetch(`${FLASK_URL}/get_logs`);
        const data = await response.json();
        
        if (data.logs) {
            const logContainer = document.querySelector('.server-logs');
            if (logContainer) {
                logContainer.innerHTML = '';
                data.logs.forEach(log => {
                    const logItem = document.createElement('div');
                    logItem.className = 'log-entry';
                    logItem.textContent = log;
                    logContainer.appendChild(logItem);
                });
            }
        }
    } catch (error) {
        console.error('Error fetching server logs:', error);
    }
}

// Handle tab visibility to save resources
document.addEventListener('visibilitychange', () => {
    if (document.hidden && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    } else if (!document.hidden && video.srcObject && !isPaused && !intervalId) {
        intervalId = setInterval(captureFrame, 1000);
    }
});


// Save settings handler
const saveSettingsBtn = document.querySelector('#settings .btn-primary');
if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', function() {
        alert('Settings saved successfully!');
    });
}