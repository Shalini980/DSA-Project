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
}// Define C++ backend server URL - updated to connect to the C++ server instead of Flask
// const BACKEND_URL = 'http://127.0.0.1:8080';
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


// Face detection and video controls functionality
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let context = canvas.getContext('2d');
let faceCountElement = document.getElementById('face-count');
let stream = null;
let intervalId = null;
let isPaused = false;

// Eye tracking variables
let eyeTrackingData = {
    isTracking: false,
    suspiciousMovements: 0,
    lastDirection: 'center',
    movementHistory: [],
    awayFromScreenCount: 0,
    calibrationComplete: false
};

// Eye tracking thresholds and settings
const EYE_TRACKING_CONFIG = {
    movementThreshold: 15, // pixels
    suspiciousMovementLimit: 3, // number of suspicious movements before alert
    awayFromScreenLimit: 5, // frames without eye detection before alert
    directionChangeThreshold: 2, // rapid direction changes
    movementHistoryLimit: 10 // keep last 10 movements for analysis
};


// Function to start the camera
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        isPaused = false;
        addLogEntry('Camera started', 'info');
        intervalId = setInterval(captureFrame, 1000);
        
        // Reset eye tracking when starting camera
        resetEyeTracking();
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
        
        // Reset eye tracking
        resetEyeTracking();
    }
}

// Function to capture a screenshot
function captureScreenshot() {
    if (stream && !isPaused) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        addLogEntry('Screenshot captured', 'info');
    }
}


// Function to reset eye tracking data
function resetEyeTracking() {
    eyeTrackingData = {
        isTracking: false,
        suspiciousMovements: 0,
        lastDirection: 'center',
        movementHistory: [],
        awayFromScreenCount: 0,
        calibrationComplete: false
    };
    
    // Call server to reset tracking
    fetch(`${FLASK_URL}/reset_eye_tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors'
    }).catch(error => console.error('Error resetting server eye tracking:', error));
    
    addLogEntry('Eye tracking system reset', 'info');
}



// Function to analyze eye tracking data and detect suspicious behavior
function analyzeEyeMovement(eyeData) {
    if (!eyeData || eyeData.tracking_status !== 'active') {
        // No eyes detected
        eyeTrackingData.awayFromScreenCount++;
        
        if (eyeTrackingData.awayFromScreenCount >= EYE_TRACKING_CONFIG.awayFromScreenLimit) {
            addLogEntry('ALERT: Eyes not detected - Student may be looking away from screen', 'danger');
            triggerSuspiciousActivity('eyes_not_detected');
            eyeTrackingData.awayFromScreenCount = 0; // Reset to avoid spam
        }
        return;
    }
    
    // Reset away from screen counter if eyes are detected
    eyeTrackingData.awayFromScreenCount = 0;
    eyeTrackingData.isTracking = true;
    
    // Mark calibration as complete after first few successful detections
    if (!eyeTrackingData.calibrationComplete && eyeData.eyes_detected >= 2) {
        eyeTrackingData.calibrationComplete = true;
        addLogEntry('Eye tracking calibration completed', 'success');
    }
    
    // Analyze movement magnitude
    if (eyeData.movement_detected && eyeData.movement_magnitude > EYE_TRACKING_CONFIG.movementThreshold) {
        eyeTrackingData.suspiciousMovements++;
        
        // Add to movement history
        eyeTrackingData.movementHistory.push({
            direction: eyeData.eye_direction,
            magnitude: eyeData.movement_magnitude,
            timestamp: Date.now()
        });
        
        // Keep only recent movements
        if (eyeTrackingData.movementHistory.length > EYE_TRACKING_CONFIG.movementHistoryLimit) {
            eyeTrackingData.movementHistory.shift();
        }
        
        addLogEntry(`Eye movement detected: ${eyeData.eye_direction} (${eyeData.movement_magnitude}px)`, 'warning');
        
        // Check for suspicious patterns
        detectSuspiciousPatterns(eyeData);
    }
    
    // Update last direction
    eyeTrackingData.lastDirection = eyeData.eye_direction;
    
    // Update UI with eye tracking status
    updateEyeTrackingUI(eyeData);
}


// Function to detect suspicious eye movement patterns
function detectSuspiciousPatterns(eyeData) {
    const recentMovements = eyeTrackingData.movementHistory.slice(-5); // Last 5 movements
    
    // Pattern 1: Rapid direction changes (looking around)
    if (recentMovements.length >= 3) {
        const directions = recentMovements.map(m => m.direction);
        const uniqueDirections = [...new Set(directions)];
        
        if (uniqueDirections.length >= 3) {
            addLogEntry('ALERT: Rapid eye movements detected - Possible cheating behavior', 'danger');
            triggerSuspiciousActivity('rapid_eye_movements');
        }
    }
    
    // Pattern 2: Consistent looking away from center
    if (eyeData.eye_direction !== 'center' && eyeData.eye_direction !== 'unknown') {
        const awayFromCenter = recentMovements.filter(m => m.direction !== 'center').length;
        
        if (awayFromCenter >= 4) {
            addLogEntry(`ALERT: Consistently looking ${eyeData.eye_direction} - Student not focused on screen`, 'danger');
            triggerSuspiciousActivity('looking_away');
        }
    }
    
    // Pattern 3: Large eye movements (looking at second monitor or notes)
    if (eyeData.movement_magnitude > EYE_TRACKING_CONFIG.movementThreshold * 2) {
        addLogEntry(`ALERT: Large eye movement detected (${eyeData.movement_magnitude}px) - Possible external reference`, 'danger');
        triggerSuspiciousActivity('large_movement');
    }
    
    // Pattern 4: Too many suspicious movements in short time
    if (eyeTrackingData.suspiciousMovements >= EYE_TRACKING_CONFIG.suspiciousMovementLimit) {
        addLogEntry('ALERT: Multiple suspicious eye movements detected', 'danger');
        triggerSuspiciousActivity('multiple_movements');
        eyeTrackingData.suspiciousMovements = 0; // Reset counter
    }
}

// Function to trigger suspicious activity alerts
function triggerSuspiciousActivity(type) {
    const timestamp = new Date().toLocaleTimeString();
    
    // Create alert object
    const alert = {
        type: type,
        timestamp: timestamp,
        severity: getSeverityLevel(type)
    };
    
    // You can extend this to send alerts to your backend, show notifications, etc.
    console.warn('PROCTORING ALERT:', alert);
    
    // Visual alert (you can customize this)
    showVisualAlert(alert);
    
    // Optional: Send alert to server for logging
    sendAlertToServer(alert);
}


// Function to determine severity level of different alert types
function getSeverityLevel(type) {
    const severityMap = {
        'eyes_not_detected': 'medium',
        'rapid_eye_movements': 'high',
        'looking_away': 'medium',
        'large_movement': 'high',
        'multiple_movements': 'high'
    };
    
    return severityMap[type] || 'low';
}

// Function to show visual alert
function showVisualAlert(alert) {
    // You can customize this to show alerts in your UI
    const alertMessage = getAlertMessage(alert.type);
    
    // Flash the border or show notification
    document.body.style.border = '5px solid red';
    setTimeout(() => {
        document.body.style.border = '';
    }, 2000);
    
    // Add to activity log with high priority
    addLogEntry(`🚨 ${alertMessage}`, 'danger');
}

// Function to get human-readable alert messages
function getAlertMessage(type) {
    const messages = {
        'eyes_not_detected': 'Eyes not visible - Student may be looking away',
        'rapid_eye_movements': 'Rapid eye movements - Possible cheating behavior',
        'looking_away': 'Student consistently looking away from screen',
        'large_movement': 'Large eye movement - Possible external reference',
        'multiple_movements': 'Multiple suspicious eye movements detected'
    };
    
    return messages[type] || 'Suspicious activity detected';
}

// Function to send alerts to server (using existing routes only)
async function sendAlertToServer(alert) {
    // Just log locally for now - only use your existing routes
    console.log('Alert logged locally:', alert);
    // If you want server logging, you could append to the existing log via your /get_logs route
}

// Function to update eye tracking UI elements
function updateEyeTrackingUI(eyeData) {
    // Update eye detection status
    const eyeStatusElement = document.getElementById('eye-status');
    if (eyeStatusElement) {
        eyeStatusElement.textContent = `Eyes: ${eyeData.eyes_detected} | Direction: ${eyeData.eye_direction}`;
        eyeStatusElement.className = eyeData.eyes_detected >= 2 ? 'status-good' : 'status-warning';
    }
    
    // Update movement indicator
    const movementElement = document.getElementById('movement-status');
    if (movementElement) {
        movementElement.textContent = eyeData.movement_detected ? 
            `Movement: ${eyeData.movement_magnitude}px` : 'No movement';
        movementElement.className = eyeData.movement_detected ? 'movement-detected' : 'movement-normal';
    }
}


// Control handlers for your specific button IDs
document.addEventListener('DOMContentLoaded', function() {
    // Start camera button
    const startBtn = document.getElementById('start-camera-btn');
    if (startBtn) {
        startBtn.addEventListener('click', startCamera);
    }
    
    // Pause camera button
    const pauseBtn = document.getElementById('pause-camera-btn');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', function() {
            const icon = this.querySelector('i');
            togglePauseCamera(icon);
        });
    }
    
    // Stop camera button
    const stopBtn = document.getElementById('stop-camera-btn');
    if (stopBtn) {
        stopBtn.addEventListener('click', stopCamera);
    }
    
    // Screenshot button
    const screenshotBtn = document.getElementById('screenshot-btn');
    if (screenshotBtn) {
        screenshotBtn.addEventListener('click', captureScreenshot);
    }
    
    // Add eye tracking status elements to your HTML
    addEyeTrackingStatusElements();
});



// Modified function to capture frame and send to server for face and eye detection
async function captureFrame() {
    if (!video.srcObject) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg');

    try {
        const response = await fetch(`${FLASK_URL}/process_frame`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ image: imageData }),
            mode: 'cors'
        });

        const data = await response.json();

        // Handle face detection
        if (data.face_count !== undefined) {
            const prevCount = parseInt(faceCountElement.textContent) || 0;
            faceCountElement.textContent = data.face_count;

            if (data.face_count > 1) {
                addLogEntry(`ALERT: Multiple faces detected: ${data.face_count} faces in frame`, 'danger');
                triggerSuspiciousActivity('multiple_faces');
            } else if (data.face_count === 0 && prevCount > 0) {
                addLogEntry('No face detected in frame', 'danger');
            } else if (data.face_count === 1 && prevCount !== 1) {
                addLogEntry('Face detected and verified', 'success');
            }
        }

        // Handle eye tracking data
        if (data.eye_data) {
            analyzeEyeMovement(data.eye_data);
        }

    } catch (error) {
        console.error('Error sending frame:', error);
        addLogEntry('Error processing video frame', 'danger');
    }
}


// Add activity log entries (updated to work with your existing log structure)
function addLogEntry(message, type) {
    const logEntries = document.querySelector('.log-entries');
    if (!logEntries) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { hour12: false });

    // Create new log entry
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    // Map type to your existing CSS classes
    const typeMap = {
        'info': 'info',
        'success': 'success', 
        'warning': 'warning',
        'danger': 'danger'
    };
    
    const logType = typeMap[type] || 'info';
    const logLabel = type === 'info' ? 'Info' : 
                    type === 'warning' ? 'Warning' : 
                    type === 'danger' ? 'Alert' : 'Success';

    logEntry.innerHTML = `
        <span class="log-time">${timeString}</span>
        <span class="log-type ${logType}">${logLabel}</span>
        <span class="log-message">${message}</span>
    `;

    // Insert at the beginning of log entries
    logEntries.insertBefore(logEntry, logEntries.firstChild);
    
    // Keep only the last 10 entries to avoid clutter
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


// Function to add eye tracking status elements to your existing HTML
function addEyeTrackingStatusElements() {
    const faceCountDisplay = document.querySelector('.face-count-display');
    if (faceCountDisplay && !document.getElementById('eye-status')) {
        // Add eye tracking status after face count
        const eyeStatusDiv = document.createElement('div');
        eyeStatusDiv.className = 'eye-tracking-display';
        eyeStatusDiv.innerHTML = `
            <i class="fas fa-eye"></i>
            <span id="eye-status">Eyes: 0 | Direction: unknown</span>
        `;
        faceCountDisplay.parentNode.insertBefore(eyeStatusDiv, faceCountDisplay.nextSibling);
        
        // Add movement status
        const movementStatusDiv = document.createElement('div');
        movementStatusDiv.className = 'movement-tracking-display';
        movementStatusDiv.innerHTML = `
            <i class="fas fa-arrows-alt"></i>
            <span id="movement-status">No movement</span>
        `;
        eyeStatusDiv.parentNode.insertBefore(movementStatusDiv, eyeStatusDiv.nextSibling);
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