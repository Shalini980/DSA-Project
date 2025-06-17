
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