// DOM Elements
const navLinks = document.querySelectorAll('.nav-links a');
const navToggle = document.getElementById('navToggle');
const navLinksContainer = document.getElementById('navLinks');
const sections = document.querySelectorAll('main section');

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
}

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
const BACKEND_URL = 'http://127.0.0.1:8080';
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

// Report generation handlers
const generateReportBtn = document.querySelector('#reports .btn-primary');
if (generateReportBtn) {
    generateReportBtn.addEventListener('click', function() {
        // Simulate report generation
        alert('Generating report based on selected filters...');
        // In a real application, this would fetch data and update the report results
    });
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
const FLASK_URL = 'http://127.0.0.1:5000';

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