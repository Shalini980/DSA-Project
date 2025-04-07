// Main JavaScript file for ProctorShield
document.addEventListener('DOMContentLoaded', function() {
    // API endpoint base URL - change this to your C++ backend server address
    const API_BASE_URL = 'http://localhost:8080/api';
    
    // Navigation functionality
    initNavigation();
    
    // Dashboard functionality
    loadDashboardData();
    
    // Text analysis functionality
    initTextAnalysis();
    
    // Video surveillance functionality
    initVideoSurveillance();
    
    // Reports functionality
    initReports();
    
    // Settings functionality
    initSettings();
    
    // Init slider values
    initSliders();
});

// Navigation functionality
function initNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
    
    const sectionLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('main section');
    
    sectionLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links
            sectionLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Get the target section id
            const targetId = link.getAttribute('href').substring(1);
            
            // Hide all sections
            sections.forEach(section => {
                section.classList.remove('active-section');
            });
            
            // Show target section
            document.getElementById(targetId).classList.add('active-section');
        });
    });
}

// Initialize all sliders to show their values
function initSliders() {
    const sliders = document.querySelectorAll('.slider');
    sliders.forEach(slider => {
        const valueDisplay = slider.nextElementSibling;
        if (valueDisplay && valueDisplay.classList.contains('slider-value')) {
            // Set initial value
            valueDisplay.textContent = `${slider.value}%`;
            
            // Update on change
            slider.addEventListener('input', () => {
                valueDisplay.textContent = `${slider.value}%`;
            });
        }
    });
}

// ============== DASHBOARD FUNCTIONS ==============
function loadDashboardData() {
    // Get dashboard statistics
    fetch(`${API_BASE_URL}/dashboard/stats`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            updateDashboardStats(data);
        })
        .catch(error => {
            console.error('Error fetching dashboard data:', error);
            // Display error message to user
            displayErrorNotification('Failed to load dashboard data. Please try again later.');
        });
    
    // Get recent incidents
    fetch(`${API_BASE_URL}/dashboard/incidents`)
        .then(response => response.json())
        .then(data => {
            updateRecentIncidents(data);
        })
        .catch(error => {
            console.error('Error fetching incidents:', error);
        });
    
    // Get system status
    fetch(`${API_BASE_URL}/dashboard/status`)
        .then(response => response.json())
        .then(data => {
            updateSystemStatus(data);
        })
        .catch(error => {
            console.error('Error fetching system status:', error);
        });
        
    // Set up the refresh button
    const refreshBtn = document.querySelector('.card-header .btn-small');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadDashboardData();
        });
    }
}

function updateDashboardStats(data) {
    // Update the statistics cards on the dashboard
    const statValues = document.querySelectorAll('.stat-value');
    
    if (data.activeSessions) {
        statValues[0].textContent = data.activeSessions;
    }
    
    if (data.flaggedIncidents) {
        statValues[1].textContent = data.flaggedIncidents;
    }
    
    if (data.completedExams) {
        statValues[2].textContent = data.completedExams;
    }
    
    if (data.systemUptime) {
        statValues[3].textContent = data.systemUptime + '%';
    }
}

function updateRecentIncidents(incidents) {
    const incidentsTable = document.querySelector('#dashboard .data-table tbody');
    if (!incidentsTable) return;
    
    // Clear existing rows
    incidentsTable.innerHTML = '';
    
    // Add new rows
    incidents.forEach(incident => {
        const row = document.createElement('tr');
        
        // Determine badge class based on incident type
        let badgeClass = 'warning';
        let iconClass = 'fa-search';
        
        if (incident.type === 'Device Detected') {
            badgeClass = 'danger';
            iconClass = 'fa-mobile-alt';
        } else if (incident.type === 'Multiple Faces') {
            iconClass = 'fa-user-friends';
        }
        
        row.innerHTML = `
            <td><span class="badge ${badgeClass}"><i class="fas ${iconClass}"></i> ${incident.type}</span></td>
            <td>${incident.student}</td>
            <td>${incident.time}</td>
            <td><span class="severity-indicator ${incident.severity.toLowerCase()}"></span> ${incident.severity}</td>
            <td><button class="btn-icon incident-detail" data-id="${incident.id}"><i class="fas fa-eye"></i></button></td>
        `;
        
        incidentsTable.appendChild(row);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.incident-detail').forEach(button => {
        button.addEventListener('click', function() {
            const incidentId = this.getAttribute('data-id');
            viewIncidentDetails(incidentId);
        });
    });
}

function updateSystemStatus(statuses) {
    const statusContainer = document.querySelector('#dashboard .status-item');
    if (!statusContainer) return;
    
    const statusItems = document.querySelectorAll('#dashboard .status-item');
    
    statuses.forEach((status, index) => {
        if (index < statusItems.length) {
            const statusValue = statusItems[index].querySelector('.status-value');
            statusValue.className = 'status-value';
            statusValue.classList.add(status.status.toLowerCase());
            statusValue.textContent = status.status;
        }
    });
}

function viewIncidentDetails(incidentId) {
    fetch(`${API_BASE_URL}/incidents/${incidentId}`)
        .then(response => response.json())
        .then(data => {
            // Show incident details in a modal or another UI element
            showIncidentModal(data);
        })
        .catch(error => {
            console.error('Error fetching incident details:', error);
        });
}

function showIncidentModal(incidentData) {
    // Create modal to show incident details
    // This is a placeholder - implement according to your UI needs
    alert(`Incident Details: ${JSON.stringify(incidentData)}`);
}

// ============== TEXT ANALYSIS FUNCTIONS ==============
function initTextAnalysis() {
    const analyzeBtn = document.querySelector('#text-analysis .btn-primary');
    const clearBtn = document.querySelector('#text-analysis .btn-secondary');
    const algorithmSelect = document.querySelector('#text-algorithm');
    const thresholdSlider = document.querySelector('#similarity-threshold');
    
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', performTextAnalysis);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearTextInputs);
    }
    
    // Load available algorithms from the backend
    fetch(`${API_BASE_URL}/text-analysis/algorithms`)
        .then(response => response.json())
        .then(data => {
            updateAlgorithmOptions(data);
        })
        .catch(error => {
            console.error('Error fetching algorithm options:', error);
        });
}

function updateAlgorithmOptions(algorithms) {
    const algorithmSelect = document.querySelector('#text-algorithm');
    if (!algorithmSelect) return;
    
    // Clear existing options
    algorithmSelect.innerHTML = '';
    
    // Add new options
    algorithms.forEach(algorithm => {
        const option = document.createElement('option');
        option.value = algorithm.id;
        option.textContent = algorithm.name;
        algorithmSelect.appendChild(option);
    });
}

function performTextAnalysis() {
    const text1 = document.querySelector('#text-analysis .text-input:nth-child(1) textarea').value;
    const text2 = document.querySelector('#text-analysis .text-input:nth-child(2) textarea').value;
    const algorithm = document.querySelector('#text-algorithm').value;
    const threshold = document.querySelector('#similarity-threshold').value;
    
    if (!text1 || !text2) {
        alert('Please enter text in both input fields.');
        return;
    }
    
    // Show loading state
    const analyzeBtn = document.querySelector('#text-analysis .btn-primary');
    analyzeBtn.textContent = 'Analyzing...';
    analyzeBtn.disabled = true;
    
    fetch(`${API_BASE_URL}/text-analysis/analyze`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            text1,
            text2,
            algorithm,
            threshold
        })
    })
        .then(response => response.json())
        .then(data => {
            displayTextAnalysisResults(data);
            
            // Reset button state
            analyzeBtn.textContent = 'Analyze Similarity';
            analyzeBtn.disabled = false;
        })
        .catch(error => {
            console.error('Error analyzing text:', error);
            
            // Reset button state
            analyzeBtn.textContent = 'Analyze Similarity';
            analyzeBtn.disabled = false;
            
            // Show error message
            displayErrorNotification('Text analysis failed. Please try again.');
        });
}

function displayTextAnalysisResults(results) {
    const resultsContainer = document.querySelector('#textResults');
    const similarityValue = resultsContainer.querySelector('.similarity-value');
    const meterFill = resultsContainer.querySelector('.meter-fill');
    const matchedText = resultsContainer.querySelector('.matched-text p');
    
    // Update similarity percentage
    similarityValue.textContent = `${results.similarityPercentage}% Similar`;
    
    // Update meter fill
    meterFill.style.width = `${results.similarityPercentage}%`;
    
    // Update matched patterns text
    if (results.highlightedText) {
        matchedText.innerHTML = results.highlightedText;
    }
    
    // Show results container
    resultsContainer.style.display = 'block';
}

function clearTextInputs() {
    const textareas = document.querySelectorAll('#text-analysis textarea');
    textareas.forEach(textarea => {
        textarea.value = '';
    });
    
    // Hide results container
    document.querySelector('#textResults').style.display = 'none';
}

// ============== VIDEO SURVEILLANCE FUNCTIONS ==============
function initVideoSurveillance() {
    const videoControls = document.querySelectorAll('#video-surveillance .video-controls button');
    if (videoControls.length === 0) return;
    
    // Play button
    videoControls[0].addEventListener('click', startVideoStream);
    
    // Pause button
    videoControls[1].addEventListener('click', pauseVideoStream);
    
    // Stop button
    videoControls[2].addEventListener('click', stopVideoStream);
    
    // Capture button
    videoControls[3].addEventListener('click', captureScreenshot);
    
    // Toggle detection settings
    const toggleSwitches = document.querySelectorAll('#video-surveillance .switch input');
    toggleSwitches.forEach(toggle => {
        toggle.addEventListener('change', updateDetectionSettings);
    });
    
    // Motion sensitivity slider
    const sensitivitySlider = document.querySelector('#video-surveillance .detection-setting .slider');
    if (sensitivitySlider) {
        sensitivitySlider.addEventListener('input', updateSensitivity);
    }
    
    // Start log polling
    pollActivityLog();
}

function startVideoStream() {
    fetch(`${API_BASE_URL}/video/start`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update UI to show stream is active
                updateVideoStreamStatus('active');
                
                // Start receiving video feed
                startReceivingVideoFeed();
            } else {
                displayErrorNotification('Failed to start video stream: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error starting video stream:', error);
            displayErrorNotification('Failed to connect to video server');
        });
}

function pauseVideoStream() {
    fetch(`${API_BASE_URL}/video/pause`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateVideoStreamStatus('paused');
            }
        })
        .catch(error => {
            console.error('Error pausing video stream:', error);
        });
}

function stopVideoStream() {
    fetch(`${API_BASE_URL}/video/stop`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateVideoStreamStatus('stopped');
                stopReceivingVideoFeed();
            }
        })
        .catch(error => {
            console.error('Error stopping video stream:', error);
        });
}

function captureScreenshot() {
    fetch(`${API_BASE_URL}/video/capture`, { method: 'POST' })
        .then(response => response.blob())
        .then(blob => {
            // Create a download link for the captured image
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `screenshot-${new Date().toISOString()}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch(error => {
            console.error('Error capturing screenshot:', error);
            displayErrorNotification('Failed to capture screenshot');
        });
}

function updateVideoStreamStatus(status) {
    const placeholder = document.querySelector('.video-placeholder');
    if (!placeholder) return;
    
    placeholder.className = 'video-placeholder';
    placeholder.classList.add(status);
    
    // Update icon and text based on status
    const icon = placeholder.querySelector('i');
    const text = placeholder.querySelector('p');
    
    if (status === 'active') {
        icon.className = 'fas fa-video';
        text.textContent = 'Camera Feed Active';
    } else if (status === 'paused') {
        icon.className = 'fas fa-pause';
        text.textContent = 'Camera Feed Paused';
    } else {
        icon.className = 'fas fa-video-slash';
        text.textContent = 'Camera Feed Inactive';
    }
}

function startReceivingVideoFeed() {
    // This function would typically connect to a video stream from the backend
    // For a real implementation, you might use WebRTC, WebSockets, or regular polling
    // This is a simplified placeholder
    console.log('Starting video feed connection');
    
    // Placeholder for demo - in a real app, you would handle the video stream
}

function stopReceivingVideoFeed() {
    // Close video connection
    console.log('Stopping video feed connection');
}

function updateDetectionSettings() {
    const settings = {
        faceDetection: document.querySelector('#video-surveillance .detection-setting:nth-child(1) input').checked,
        eyeTracking: document.querySelector('#video-surveillance .detection-setting:nth-child(2) input').checked,
        motionDetection: document.querySelector('#video-surveillance .detection-setting:nth-child(3) input').checked,
        objectDetection: document.querySelector('#video-surveillance .detection-setting:nth-child(4) input').checked
    };
    
    fetch(`${API_BASE_URL}/video/settings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                displayErrorNotification('Failed to update detection settings');
            }
        })
        .catch(error => {
            console.error('Error updating detection settings:', error);
        });
}

function updateSensitivity() {
    const sensitivityValue = document.querySelector('#video-surveillance .detection-setting .slider').value;
    
    fetch(`${API_BASE_URL}/video/sensitivity`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sensitivity: sensitivityValue
        })
    })
        .then(response => response.json())
        .catch(error => {
            console.error('Error updating sensitivity:', error);
        });
}

function pollActivityLog() {
    // Poll the activity log every 5 seconds
    setInterval(() => {
        fetch(`${API_BASE_URL}/video/activity-log`)
            .then(response => response.json())
            .then(data => {
                updateActivityLog(data);
            })
            .catch(error => {
                console.error('Error polling activity log:', error);
            });
    }, 5000);
    
    // Initial load
    fetch(`${API_BASE_URL}/video/activity-log`)
        .then(response => response.json())
        .then(data => {
            updateActivityLog(data);
        })
        .catch(error => {
            console.error('Error loading activity log:', error);
        });
}

function updateActivityLog(logEntries) {
    const logContainer = document.querySelector('#video-surveillance .log-entries');
    if (!logContainer) return;
    
    // Clear existing entries
    logContainer.innerHTML = '';
    
    // Add new entries
    logEntries.forEach(entry => {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        logEntry.innerHTML = `
            <span class="log-time">${entry.time}</span>
            <span class="log-type ${entry.type}">${entry.event}</span>
            <span class="log-message">${entry.message}</span>
        `;
        
        logContainer.appendChild(logEntry);
    });
}

// ============== REPORTS FUNCTIONS ==============
function initReports() {
    const generateBtn = document.querySelector('#reports .btn-primary');
    const clearBtn = document.querySelector('#reports .btn-secondary');
    const exportPdfBtn = document.querySelector('#reports .btn-outline:nth-child(3)');
    const exportCsvBtn = document.querySelector('#reports .btn-outline:nth-child(4)');
    
    if (generateBtn) {
        generateBtn.addEventListener('click', generateReport);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearReportFilters);
    }
    
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', exportReportPdf);
    }
    
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportReportCsv);
    }
    
    // Add event listeners to report detail buttons
    document.querySelectorAll('#reports .btn-icon').forEach(button => {
        button.addEventListener('click', function() {
            const sessionId = this.closest('tr').querySelector('td:first-child').textContent;
            viewReportDetails(sessionId);
        });
    });
}

function generateReport() {
    const dateRange = document.querySelector('#report-date').value;
    const reportType = document.querySelector('#report-type').value;
    const severityLevel = document.querySelector('#report-severity').value;
    
    fetch(`${API_BASE_URL}/reports/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            dateRange,
            reportType,
            severityLevel
        })
    })
        .then(response => response.json())
        .then(data => {
            displayReportResults(data);
        })
        .catch(error => {
            console.error('Error generating report:', error);
            displayErrorNotification('Failed to generate report');
        });
}

function displayReportResults(reportData) {
    // Update summary stats
    const summaryStats = document.querySelectorAll('#reports .summary-stat .stat-value');
    
    if (reportData.summary) {
        summaryStats[0].textContent = reportData.summary.totalSessions;
        summaryStats[1].textContent = reportData.summary.flaggedIncidents;
        summaryStats[2].textContent = reportData.summary.averageScore + '%';
    }
    
    // Update report table
    const reportTableBody = document.querySelector('#reports .data-table tbody');
    
    if (reportTableBody && reportData.sessions) {
        // Clear existing rows
        reportTableBody.innerHTML = '';
        
        // Add new rows
        reportData.sessions.forEach(session => {
            const row = document.createElement('tr');
            
            // Determine badge class based on status
            let badgeClass = 'warning';
            if (session.status === 'Passed') {
                badgeClass = 'success';
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
                <td><button class="btn-icon" data-id="${session.id}"><i class="fas fa-eye"></i></button></td>
            `;
            
            reportTableBody.appendChild(row);
        });
        
        // Add event listeners to view buttons
        document.querySelectorAll('#reports .data-table .btn-icon').forEach(button => {
            button.addEventListener('click', function() {
                const sessionId = this.getAttribute('data-id');
                viewReportDetails(sessionId);
            });
        });
    }
}

function clearReportFilters() {
    document.querySelector('#report-date').value = 'today';
    document.querySelector('#report-type').value = 'all';
    document.querySelector('#report-severity').value = 'all';
    
    // Clear results display
    const summaryStats = document.querySelectorAll('#reports .summary-stat .stat-value');
    summaryStats.forEach(stat => {
        stat.textContent = '0';
    });
    
    document.querySelector('#reports .data-table tbody').innerHTML = '';
}

function exportReportPdf() {
    // Get current report filters
    const dateRange = document.querySelector('#report-date').value;
    const reportType = document.querySelector('#report-type').value;
    const severityLevel = document.querySelector('#report-severity').value;
    
    // Create URL with query parameters
    const url = `${API_BASE_URL}/reports/export/pdf?dateRange=${dateRange}&reportType=${reportType}&severityLevel=${severityLevel}`;
    
    // Create hidden download link
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `proctorshield-report-${new Date().toISOString()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function exportReportCsv() {
    // Get current report filters
    const dateRange = document.querySelector('#report-date').value;
    const reportType = document.querySelector('#report-type').value;
    const severityLevel = document.querySelector('#report-severity').value;
    
    // Create URL with query parameters
    const url = `${API_BASE_URL}/reports/export/csv?dateRange=${dateRange}&reportType=${reportType}&severityLevel=${severityLevel}`;
    
    // Create hidden download link
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `proctorshield-report-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function viewReportDetails(sessionId) {
    fetch(`${API_BASE_URL}/reports/session/${sessionId}`)
        .then(response => response.json())
        .then(data => {
            // Show session details in a modal or another UI element
            showSessionDetailsModal(data);
        })
        .catch(error => {
            console.error('Error fetching session details:', error);
            displayErrorNotification('Failed to load session details');
        });
}

function showSessionDetailsModal(sessionData) {
    // Create modal to show session details
    // This is a placeholder - implement according to your UI needs
    alert(`Session Details: ${JSON.stringify(sessionData)}`);
}

// ============== SETTINGS FUNCTIONS ==============
function initSettings() {
    // Load current settings
    fetch(`${API_BASE_URL}/settings`)
        .then(response => response.json())
        .then(data => {
            updateSettingsUI(data);
        })
        .catch(error => {
            console.error('Error loading settings:', error);
        });
    
    // Add event listener to save button
    const saveBtn = document.querySelector('#settings .btn-primary');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }
    
    // Add event listener to reset button
    const resetBtn = document.querySelector('#settings .btn-secondary');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSettings);
    }
    
    // Add event listeners to setting changes
    const switches = document.querySelectorAll('#settings .switch input');
    switches.forEach(switchInput => {
        switchInput.addEventListener('change', function() {
            // Enable save button
            document.querySelector('#settings .btn-primary').disabled = false;
        });
    });
    
    const inputs = document.querySelectorAll('#settings input[type="number"], #settings input[type="email"], #settings input[type="password"]');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            // Enable save button
            document.querySelector('#settings .btn-primary').disabled = false;
        });
    });
    
    const sliders = document.querySelectorAll('#settings .slider');
    sliders.forEach(slider => {
        slider.addEventListener('input', function() {
            // Enable save button
            document.querySelector('#settings .btn-primary').disabled = false;
            
            // Update slider value
            const valueDisplay = slider.nextElementSibling;
            if (valueDisplay && valueDisplay.classList.contains('slider-value')) {
                valueDisplay.textContent = `${slider.value}%`;
            }
        });
    });
    
    // Add copy button functionality for API key
    const copyBtn = document.querySelector('#settings .api-key-container .btn-icon');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const apiKeyInput = document.querySelector('#settings .api-key-container input');
            apiKeyInput.select();
            document.execCommand('copy');
            
            // Show toast notification
            displayNotification('API key copied to clipboard');
        });
    }
}

function updateSettingsUI(settings) {
    // Update general settings
    const generalSwitches = document.querySelectorAll('#settings .settings-card:nth-child(1) .switch input');
    if (generalSwitches.length >= 3) {
        generalSwitches[0].checked = settings.general.notifications;
        generalSwitches[1].checked = settings.general.autoGenerateReports;
        generalSwitches[2].checked = settings.general.darkMode;
    }
    
    const sessionTimeout = document.querySelector('#settings .settings-card:nth-child(1) input[type="number"]');
    if (sessionTimeout) {
        sessionTimeout.value = settings.general.sessionTimeout;
    }
    
    // Update detection parameters
    const detectionSliders = document.querySelectorAll('#settings .settings-card:nth-child(2) .slider');
    if (detectionSliders.length >= 4) {
        detectionSliders[0].value = settings.detection.faceConfidence;
        detectionSliders[1].value = settings.detection.textSimilarityThreshold;
        detectionSliders[2].value = settings.detection.motionSensitivity;
        detectionSliders[3].value = settings.detection.objectConfidence;
        
        // Update slider value displays
        detectionSliders.forEach(slider => {
            const valueDisplay = slider.nextElementSibling;
            if (valueDisplay) {
                valueDisplay.textContent = `${slider.value}%`;
            }
        });
    }
    
    // Update notification settings
    const notificationSwitches = document.querySelectorAll('#settings .settings-card:nth-child(3) .switch input');
    if (notificationSwitches.length >= 4) {
        notificationSwitches[0].checked = settings.notifications.email;
        notificationSwitches[1].checked = settings.notifications.sms;
        notificationSwitches[2].checked = settings.notifications.dailySummary;
        notificationSwitches[3].checked = settings.notifications.criticalOnly;
    }
    
    // Update account settings
    const emailInput = document.querySelector('#settings .settings-card:nth-child(4) input[type="email"]');
    if (emailInput) {
        emailInput.value = settings.account.email;
    }
    
    const apiKeyInput = document.querySelector('#settings .api-key-container input');
    if (apiKeyInput) {
        apiKeyInput.value = settings.account.apiKey;
    }
    
    // Disable save button initially
    const saveBtn = document.querySelector('#settings .btn-primary');
    if (saveBtn) {
        saveBtn.disabled = true;
    }
}

function saveSettings() {
    // Collect all settings
    const settings = {
        general: {
            notifications: document.querySelector('#settings .settings-card:nth-child(1) .switch input:nth-child(1)').checked,
            autoGenerateReports: document.querySelector('#settings .settings-card:nth-child(1) .switch input:nth-child(3)').checked,
            darkMode: document.querySelector('#settings .settings-card:nth-child(1) .switch input:nth-child(5)').checked,
            sessionTimeout: document.querySelector('#settings .settings-card:nth-child(1) input[type="number"]').value
        },
        detection: {
            faceConfidence: document.querySelector('#settings .settings-card:nth-child(2) .slider:nth-child(1)').value,
            textSimilarityThreshold: document.querySelector('#settings .settings-card:nth-child(2) .slider:nth-child(3)').value,
            motionSensitivity: document.querySelector('#settings .settings-card:nth-child(2) .slider:nth-child(5)').value,
            objectConfidence: document.querySelector('#settings .settings-card:nth-child(2) .slider:nth-child(7)').value
        },
        notifications: {
            email: document.querySelector('#settings .settings-card:nth-child(3) .switch input:nth-child(1)').checked,
            sms: document.querySelector('#settings .settings-card:nth-child(3) .switch input:nth-child(3)').checked,
            dailySummary: document.querySelector('#settings .settings-card:nth-child(3) .switch input:nth-child(5)').checked,
            criticalOnly: document.querySelector('#settings .settings-card:nth-child(3) .switch input:nth-child(7)').checked
        },
        account: {
            email: document.querySelector('#settings .settings-card:nth-child(4) input[type="email"]').value,
            apiKey: document.querySelector('#settings .api-key-container input').value
        }
    };
    
    // Save settings to backend
    fetch(`${API_BASE_URL}/settings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success notification
                displayNotification('Settings saved successfully');
                
                // Disable save button
                document.querySelector('#settings .btn-primary').disabled = true;
                
                // Apply dark mode setting if changed
                if (settings.general.darkMode !== document.body.classList.contains('dark-mode')) {
                    document.body.classList.toggle('dark-mode');
                }
            } else {
                // Show error notification
                displayErrorNotification('Failed to save settings: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error saving settings:', error);
            displayErrorNotification('Failed to save settings. Please try again later.');
        });
}