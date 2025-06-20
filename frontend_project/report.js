/// Modern Report generation handlers
const generateReportBtn = document.querySelector('.btn-primary-modern');
const exportBtn = document.querySelector('#export-btn');
const clearFiltersBtn = document.querySelector('.btn-secondary-modern');
const shareBtn = document.querySelector('#share-btn');

if (generateReportBtn) {
    generateReportBtn.addEventListener('click', async function() {
        // Show loading state
        const originalContent = this.innerHTML;
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
            updateModernReportSummary(reportData.summary);
            
            // Update detailed results table
            updateModernReportDetailsTable(reportData.details);
            
            // Store report data for exports
            window.currentReportData = reportData;
            
            // Enable export button
            if (exportBtn) exportBtn.disabled = false;
            
        } catch (error) {
            console.error('Error in report generation process:', error);
            showNotification('Failed to generate report: ' + error.message, 'error');
        }
        
        // Reset button state
        this.innerHTML = originalContent;
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
            
        const text1 = document.querySelector('#text-analysis .text-input:first-of-type textarea')?.value || '';
        const text2 = document.querySelector('#text-analysis .text-input:last-of-type textarea')?.value || '';
        const algorithm = document.getElementById('text-algorithm')?.value || 'standard';
        
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
            student: 'Current User',
            date: now.toISOString().split('T')[0],
            duration: '30:00',
            text1: text1,
            text2: text2,
            algorithm: algorithm,
            similarity: similarity,
            violations: similarity > 60 ? 1 : 0,
            status: status,
            score: 100 - similarity
        });
    }
    
    // Add previous analysis results if stored (avoiding localStorage per instructions)
    if (window.savedTextResults && Array.isArray(window.savedTextResults)) {
        results.sessions = [...results.sessions, ...window.savedTextResults];
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
        const type = entry.querySelector('.log-type')?.textContent;
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
        student: 'Current User',
        date: now.toISOString().split('T')[0],
        duration: '15:00',
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
    }
    
    return results;
}

// Function to process text analysis results based on filters
function processTextResults(results, severityLevel, dateRange) {
    const filteredSessions = filterSessionsByParams(results.sessions, severityLevel, dateRange);
    
    const summary = {
        totalSessions: filteredSessions.length,
        flaggedIncidents: filteredSessions.filter(s => s.status !== 'Passed').length,
        averageScore: calculateAverageScore(filteredSessions),
        successRate: calculateSuccessRate(filteredSessions)
    };
    
    return {
        summary: summary,
        details: filteredSessions
    };
}

// Function to process video analysis results based on filters
function processVideoResults(results, severityLevel, dateRange) {
    const filteredSessions = filterSessionsByParams(results.sessions, severityLevel, dateRange);
    
    const summary = {
        totalSessions: filteredSessions.length,
        flaggedIncidents: filteredSessions.filter(s => s.status !== 'Passed').length,
        averageScore: calculateAverageScore(filteredSessions),
        successRate: calculateSuccessRate(filteredSessions)
    };
    
    return {
        summary: summary,
        details: filteredSessions
    };
}

// Function to combine text and video results
function combineResults(textResults, videoResults, severityLevel, dateRange) {
    const allSessions = [...textResults.sessions, ...videoResults.sessions];
    const filteredSessions = filterSessionsByParams(allSessions, severityLevel, dateRange);
    
    const summary = {
        totalSessions: filteredSessions.length,
        flaggedIncidents: filteredSessions.filter(s => s.status !== 'Passed').length,
        averageScore: calculateAverageScore(filteredSessions),
        successRate: calculateSuccessRate(filteredSessions)
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
        if (severityLevel === 'critical' && session.status !== 'Failed') return false;
        if (severityLevel === 'low' && session.status === 'Failed') return false;
        
        // Filter by date range
        if (dateRange !== 'all') {
            const sessionDate = new Date(session.date);
            const today = new Date();
            
            if (dateRange === 'today') {
                const todayString = today.toISOString().split('T')[0];
                if (session.date !== todayString) return false;
            } else if (dateRange === 'yesterday') {
                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);
                const yesterdayString = yesterday.toISOString().split('T')[0];
                if (session.date !== yesterdayString) return false;
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

// Helper function to calculate success rate
function calculateSuccessRate(sessions) {
    if (sessions.length === 0) return 0;
    
    const passedSessions = sessions.filter(s => s.status === 'Passed').length;
    return ((passedSessions / sessions.length) * 100).toFixed(1);
}

// Clear filters handler
if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', function() {
        document.getElementById('report-date').selectedIndex = 0;
        document.getElementById('report-type').selectedIndex = 0;
        document.getElementById('report-severity').selectedIndex = 0;
        document.getElementById('report-format').selectedIndex = 0;
    });
}

// Export handler
if (exportBtn) {
    exportBtn.addEventListener('click', function() {
        if (!window.currentReportData) {
            showNotification('Please generate a report first', 'warning');
            return;
        }
        
        const format = document.getElementById('report-format').value;
        
        switch(format) {
            case 'pdf':
                exportReportToPdf(window.currentReportData);
                break;
            case 'csv':
                exportReportToCsv(window.currentReportData);
                break;
            case 'excel':
                exportReportToExcel(window.currentReportData);
                break;
            case 'json':
                exportReportToJson(window.currentReportData);
                break;
            default:
                exportReportToPdf(window.currentReportData);
        }
    });
}

// Share handler
if (shareBtn) {
    shareBtn.addEventListener('click', function() {
        if (!window.currentReportData) {
            showNotification('Please generate a report first', 'warning');
            return;
        }
        
        showShareModal(window.currentReportData);
    });
}

// Function to update the modern report summary section
function updateModernReportSummary(summary) {
    const statElements = document.querySelectorAll('.stat-value-modern');
    
    statElements.forEach(element => {
        const statType = element.getAttribute('data-stat');
        
        switch(statType) {
            case 'total':
                element.textContent = summary.totalSessions;
                break;
            case 'flagged':
                element.textContent = summary.flaggedIncidents;
                break;
            case 'average':
                element.textContent = summary.averageScore + '%';
                break;
            case 'success':
                element.textContent = summary.successRate + '%';
                break;
        }
    });
    
    // Update trend indicators (mock data for now)
    updateTrendIndicators(summary);
}

// Function to update trend indicators
function updateTrendIndicators(summary) {
    const changeElements = document.querySelectorAll('.stat-change-modern');
    
    // Mock trend data - in real app, compare with previous period
    const trends = [
        '+12% from last month',
        '-8% from last month', 
        '+5.2% from last month',
        '+3.1% from last month'
    ];
    
    changeElements.forEach((element, index) => {
        if (trends[index]) {
            element.textContent = trends[index];
        }
    });
}

// Function to update the modern detailed results table
function updateModernReportDetailsTable(details) {
    const tableBody = document.querySelector('.data-table-modern tbody');
    if (!tableBody) return;
    
    // Clear existing rows except header
    tableBody.innerHTML = '';
    
    // Add new rows
    details.forEach(session => {
        const row = document.createElement('tr');
        row.className = 'table-row-modern';
        
        // Determine badge classes
        let statusClass = 'success';
        let violationClass = 'success';
        let scoreClass = 'high';
        
        if (session.status === 'Review') {
            statusClass = 'warning';
        } else if (session.status === 'Failed') {
            statusClass = 'danger';
        }
        
        if (session.violations > 0) {
            violationClass = session.violations > 2 ? 'danger' : 'warning';
        }
        
        if (session.score < 70) {
            scoreClass = 'low';
        } else if (session.score < 85) {
            scoreClass = 'medium';
        }
        
        // Get student initials
        const initials = session.student.split(' ').map(n => n[0]).join('').toUpperCase();
        
        row.innerHTML = `
            <td><input type="checkbox" class="row-select"></td>
            <td><span class="session-id">#${session.id}</span></td>
            <td>
                <div class="student-info">
                    <div class="student-avatar">${initials}</div>
                    <span>${session.student}</span>
                </div>
            </td>
            <td>${session.date}</td>
            <td><span class="duration-badge">${session.duration}</span></td>
            <td><span class="violation-count ${violationClass}">${session.violations}</span></td>
            <td><span class="status-badge ${statusClass}">${session.status}</span></td>
            <td><span class="score-badge ${scoreClass}">${session.score}%</span></td>
            <td>
                <div class="action-buttons-modern">
                    <button class="btn-icon-modern view" title="View Details" onclick="viewModernSessionDetails('${session.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon-modern download" title="Download" onclick="downloadSession('${session.id}')">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn-icon-modern more" title="More Options" onclick="showSessionMenu('${session.id}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Update pagination info
    updatePaginationInfo(details.length);
}

// Function to view session details with modern modal
function viewModernSessionDetails(sessionId) {
    if (window.currentReportData && window.currentReportData.details) {
        const session = window.currentReportData.details.find(s => s.id === sessionId);
        
        if (session) {
            showModernSessionDetailsModal(session);
            return;
        }
    }
    
    // Fetch from server if not found locally
    fetchSessionDetails(sessionId)
        .then(data => showModernSessionDetailsModal(data))
        .catch(error => {
            console.error('Error fetching session details:', error);
            showNotification(`Could not load details for session ${sessionId}`, 'error');
        });
}

// Function to show modern session details modal
function showModernSessionDetailsModal(sessionData) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay-modern';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content-modern';
    modalContent.style.cssText = `
        background: white;
        border-radius: 20px;
        padding: 2rem;
        max-width: 800px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
        animation: slideIn 0.3s ease;
    `;
    
    // Get student initials
    const initials = sessionData.student.split(' ').map(n => n[0]).join('').toUpperCase();
    
    let content = `
        <div class="modal-header-modern">
            <h2><i class="fas fa-chart-line"></i> Session Analysis</h2>
            <button class="close-btn-modern" onclick="this.closest('.modal-overlay-modern').remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="session-overview-modern">
            <div class="session-header-card">
                <div class="student-avatar-large">${initials}</div>
                <div class="session-info">
                    <h3>${sessionData.student}</h3>
                    <p>Session #${sessionData.id}</p>
                    <span class="status-badge ${sessionData.status.toLowerCase()}">${sessionData.status}</span>
                </div>
                <div class="session-score">
                    <div class="score-circle">
                        <span>${sessionData.score}%</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="session-details-grid">
            <div class="detail-card">
                <i class="fas fa-calendar-alt"></i>
                <div>
                    <span class="detail-label">Date</span>
                    <span class="detail-value">${sessionData.date}</span>
                </div>
            </div>
            
            <div class="detail-card">
                <i class="fas fa-clock"></i>
                <div>
                    <span class="detail-label">Duration</span>
                    <span class="detail-value">${sessionData.duration}</span>
                </div>
            </div>
            
            <div class="detail-card">
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <span class="detail-label">Violations</span>
                    <span class="detail-value">${sessionData.violations}</span>
                </div>
            </div>
        </div>
    `;
    
    // Add type-specific details
    if (sessionData.id.startsWith('T')) {
        content += `
            <div class="analysis-section">
                <h3><i class="fas fa-text-width"></i> Text Analysis</h3>
                <div class="analysis-grid">
                    <div class="analysis-card">
                        <span class="analysis-label">Algorithm</span>
                        <span class="analysis-value">${sessionData.algorithm || 'Standard'}</span>
                    </div>
                    <div class="analysis-card">
                        <span class="analysis-label">Similarity Score</span>
                        <span class="analysis-value">${sessionData.similarity || '0'}%</span>
                    </div>
                </div>
                
                <div class="text-comparison">
                    <div class="text-sample">
                        <h4>Sample 1</h4>
                        <div class="sample-preview">${(sessionData.text1 || 'Not available').substring(0, 150)}...</div>
                    </div>
                    <div class="text-sample">
                        <h4>Sample 2</h4>
                        <div class="sample-preview">${(sessionData.text2 || 'Not available').substring(0, 150)}...</div>
                    </div>
                </div>
            </div>
        `;
    } else if (sessionData.id.startsWith('V')) {
        content += `
            <div class="analysis-section">
                <h3><i class="fas fa-video"></i> Video Analysis</h3>
                <div class="analysis-grid">
                    <div class="analysis-card">
                        <span class="analysis-label">Face Detection</span>
                        <span class="analysis-value">${sessionData.faceCount === 1 ? 'Successful' : 
                          sessionData.faceCount === 0 ? 'Failed' : 'Multiple Faces'}</span>
                    </div>
                    <div class="analysis-card">
                        <span class="analysis-label">Warnings</span>
                        <span class="analysis-value">${sessionData.warnings || '0'}</span>
                    </div>
                    <div class="analysis-card">
                        <span class="analysis-label">Alerts</span>
                        <span class="analysis-value">${sessionData.alerts || '0'}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    content += `
        <div class="modal-actions">
            <button class="btn btn-primary-modern" onclick="downloadSession('${sessionData.id}')">
                <i class="fas fa-download"></i> Download Report
            </button>
            <button class="btn btn-secondary-modern" onclick="this.closest('.modal-overlay-modern').remove()">
                Close
            </button>
        </div>
    `;
    
    modalContent.innerHTML = content;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Utility functions
function showNotification(message, type = 'info') {
    // Create a modern notification
    const notification = document.createElement('div');
    notification.className = `notification-modern ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        color: white;
        z-index: 1100;
        animation: slideInRight 0.3s ease;
    `;
    
    const colors = {
        success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        info: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
    };
    
    notification.style.background = colors[type] || colors.info;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function updatePaginationInfo(totalItems) {
    const paginationInfo = document.querySelector('.pagination-info');
    if (paginationInfo) {
        paginationInfo.textContent = `Showing 1-${Math.min(totalItems, 10)} of ${totalItems} sessions`;
    }
}

// Export functions
// Updated PDF Export function with actual PDF generation
function exportReportToPdf(reportData) {
    showNotification('PDF Export: Your report is being generated', 'info');
    
    try {
        // Create new jsPDF instance
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Set up colors and fonts
        const primaryColor = [102, 126, 234]; // #667eea
        const textColor = [31, 41, 55]; // #1f2937
        const grayColor = [107, 114, 128]; // #6b7280
        
        let yPosition = 20;
        
        // Header
        doc.setFontSize(24);
        doc.setTextColor(...primaryColor);
        doc.text('ProctorShield Report', 20, yPosition);
        
        yPosition += 15;
        doc.setFontSize(12);
        doc.setTextColor(...grayColor);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition);
        
        yPosition += 20;
        
        // Summary Section
        doc.setFontSize(16);
        doc.setTextColor(...textColor);
        doc.text('Summary Statistics', 20, yPosition);
        yPosition += 10;
        
        // Add summary data
        doc.setFontSize(12);
        doc.text(`Total Sessions: ${reportData.summary.totalSessions}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Flagged Incidents: ${reportData.summary.flaggedIncidents}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Average Score: ${reportData.summary.averageScore}%`, 20, yPosition);
        yPosition += 8;
        doc.text(`Success Rate: ${reportData.summary.successRate}%`, 20, yPosition);
        yPosition += 20;
        
        // Detailed Results Section
        doc.setFontSize(16);
        doc.setTextColor(...textColor);
        doc.text('Detailed Results', 20, yPosition);
        yPosition += 15;
        
        // Table headers
        doc.setFontSize(10);
        doc.setTextColor(...grayColor);
        const headers = ['Session ID', 'Student', 'Date', 'Duration', 'Violations', 'Status', 'Score'];
        const columnWidths = [25, 35, 25, 20, 20, 20, 20];
        let xPosition = 20;
        
        headers.forEach((header, index) => {
            doc.text(header, xPosition, yPosition);
            xPosition += columnWidths[index];
        });
        
        yPosition += 8;
        
        // Draw header line
        doc.setDrawColor(...grayColor);
        doc.line(20, yPosition, 185, yPosition);
        yPosition += 5;
        
        // Table data
        doc.setFontSize(9);
        doc.setTextColor(...textColor);
        
        reportData.details.forEach((session, index) => {
            // Check if we need a new page
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            
            xPosition = 20;
            const rowData = [
                `#${session.id}`,
                session.student.length > 15 ? session.student.substring(0, 15) + '...' : session.student,
                session.date,
                session.duration,
                session.violations.toString(),
                session.status,
                `${session.score}%`
            ];
            
            // Set row background color for alternating rows
            if (index % 2 === 0) {
                doc.setFillColor(248, 250, 252); // Light gray
                doc.rect(20, yPosition - 3, 165, 8, 'F');
            }
            
            // Set text color based on status
            if (session.status === 'Failed') {
                doc.setTextColor(220, 38, 38); // Red
            } else if (session.status === 'Review') {
                doc.setTextColor(217, 119, 6); // Orange
            } else {
                doc.setTextColor(...textColor);
            }
            
            rowData.forEach((data, colIndex) => {
                doc.text(data, xPosition, yPosition);
                xPosition += columnWidths[colIndex];
            });
            
            yPosition += 8;
            doc.setTextColor(...textColor); // Reset color
        });
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(...grayColor);
            doc.text(`Page ${i} of ${pageCount}`, 20, 285);
            doc.text('ProctorShield - Exam Monitoring System', 105, 285, { align: 'center' });
            doc.text(new Date().toISOString().split('T')[0], 190, 285, { align: 'right' });
        }
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `proctorshield_report_${timestamp}.pdf`;
        
        // Save the PDF
        doc.save(filename);
        
        showNotification(`PDF Export: Report "${filename}" has been downloaded`, 'success');
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        showNotification('Failed to generate PDF: ' + error.message, 'error');
    }
}

// Alternative PDF export function using HTML to PDF conversion
function exportReportToPdfAlternative(reportData) {
    showNotification('PDF Export: Your report is being generated', 'info');
    
    try {
        // Create HTML content for the report
        const reportHtml = generateReportHtml(reportData);
        
        // Use html2pdf library (if available)
        if (window.html2pdf) {
            const opt = {
                margin: 1,
                filename: `proctorshield_report_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };
            
            html2pdf().set(opt).from(reportHtml).save().then(() => {
                showNotification('PDF Export: Report has been downloaded', 'success');
            });
        } else {
            throw new Error('html2pdf library not found');
        }
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        showNotification('Failed to generate PDF: ' + error.message, 'error');
    }
}

// Helper function to generate HTML content for PDF
function generateReportHtml(reportData) {
    return `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #667eea; margin: 0;">ProctorShield Report</h1>
                <p style="color: #6b7280; margin: 5px 0;">Generated on: ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div style="margin-bottom: 30px;">
                <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Summary Statistics</h2>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px;">
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                        <h3 style="margin: 0; color: #374151;">Total Sessions</h3>
                        <p style="font-size: 24px; font-weight: bold; color: #1f2937; margin: 5px 0;">${reportData.summary.totalSessions}</p>
                    </div>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                        <h3 style="margin: 0; color: #374151;">Flagged Incidents</h3>
                        <p style="font-size: 24px; font-weight: bold; color: #ef4444; margin: 5px 0;">${reportData.summary.flaggedIncidents}</p>
                    </div>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                        <h3 style="margin: 0; color: #374151;">Average Score</h3>
                        <p style="font-size: 24px; font-weight: bold; color: #10b981; margin: 5px 0;">${reportData.summary.averageScore}%</p>
                    </div>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                        <h3 style="margin: 0; color: #374151;">Success Rate</h3>
                        <p style="font-size: 24px; font-weight: bold; color: #10b981; margin: 5px 0;">${reportData.summary.successRate}%</p>
                    </div>
                </div>
            </div>
            
            <div>
                <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Detailed Results</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background: #f3f4f6;">
                            <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Session ID</th>
                            <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Student</th>
                            <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Date</th>
                            <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Duration</th>
                            <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Violations</th>
                            <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Status</th>
                            <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportData.details.map((session, index) => `
                            <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                                <td style="border: 1px solid #d1d5db; padding: 12px;">#${session.id}</td>
                                <td style="border: 1px solid #d1d5db; padding: 12px;">${session.student}</td>
                                <td style="border: 1px solid #d1d5db; padding: 12px;">${session.date}</td>
                                <td style="border: 1px solid #d1d5db; padding: 12px;">${session.duration}</td>
                                <td style="border: 1px solid #d1d5db; padding: 12px;">${session.violations}</td>
                                <td style="border: 1px solid #d1d5db; padding: 12px;">
                                    <span style="padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; 
                                        ${session.status === 'Passed' ? 'background: #dcfce7; color: #166534;' : 
                                          session.status === 'Review' ? 'background: #fef3c7; color: #92400e;' : 
                                          'background: #fee2e2; color: #991b1b;'}">${session.status}</span>
                                </td>
                                <td style="border: 1px solid #d1d5db; padding: 12px; font-weight: bold; 
                                    color: ${session.score >= 85 ? '#166534' : session.score >= 70 ? '#92400e' : '#991b1b'};">${session.score}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px;">
                <p>ProctorShield - Exam Monitoring System</p>
                <p>Report generated on ${new Date().toLocaleString()}</p>
            </div>
        </div>
    `;
}

// Function to load required libraries if not already loaded
function loadPdfLibraries() {
    return new Promise((resolve, reject) => {
        // Check if jsPDF is already loaded
        if (window.jspdf) {
            resolve();
            return;
        }
        
        // Load jsPDF from CDN
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
            console.log('jsPDF library loaded successfully');
            resolve();
        };
        script.onerror = () => {
            reject(new Error('Failed to load jsPDF library'));
        };
        document.head.appendChild(script);
    });
}

// Initialize PDF libraries when the page loads
document.addEventListener('DOMContentLoaded', function() {
    loadPdfLibraries().catch(error => {
        console.warn('PDF export may not work:', error);
    });
});

function exportReportToCsv(reportData) {
    let csv = 'Session ID,Student,Date,Duration,Violations,Status,Score\n';
    
    reportData.details.forEach(session => {
        csv += `${session.id},${session.student},${session.date},${session.duration},${session.violations},${session.status},${session.score}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.setAttribute('download', `proctorshield_report_${timestamp}.csv`);
    
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showNotification('CSV export completed successfully', 'success');
}

function exportReportToExcel(reportData) {
    showNotification('Excel export feature coming soon!', 'info');
}

function exportReportToJson(reportData) {
    const jsonData = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.setAttribute('download', `proctorshield_report_${timestamp}.json`);
    
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showNotification('JSON export completed successfully', 'success');
}

// Additional helper functions
function downloadSession(sessionId) {
    showNotification(`Downloading session ${sessionId}...`, 'info');
}

function showSessionMenu(sessionId) {
    showNotification('Session menu feature coming soon!', 'info');
}

function showShareModal(reportData) {
    showNotification('Share feature coming soon!', 'info');
}

async function fetchSessionDetails(sessionId) {
    let apiUrl;
    
    if (sessionId.startsWith('T')) {
        apiUrl = `${BACKEND_URL}/api/sessions/${sessionId}`;
    } else if (sessionId.startsWith('V')) {
        apiUrl = `${FLASK_URL}/api/sessions/${sessionId}`;
    } else {
        apiUrl = `${BACKEND_URL}/api/sessions/${sessionId}`;
    }
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error(`Error fetching session details: ${response.status}`);
    }
    return response.json();
}

// Add styles for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideIn {
        from { transform: scale(0.9) translateY(-20px); opacity: 0; }
        to { transform: scale(1) translateY(0); opacity: 1; }
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .modal-header-modern {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #f3f4f6;
    }
    
    .close-btn-modern {
        background: #f3f4f6;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #6b7280;
        transition: all 0.2s ease;
    }
    
    .close-btn-modern:hover {
        background: #e5e7eb;
        color: #374151;
    }
    
    .session-header-card {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        padding: 2rem;
        border-radius: 16px;
        margin-bottom: 2rem;
    }
    .student-avatar-large {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 1.5rem;
        font-weight: bold;
        text-transform: uppercase;
        box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
    }
    
    .session-info {
        flex: 1;
    }
    
    .session-info h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
        color: #1f2937;
    }
    
    .session-info p {
        margin: 0 0 0.5rem 0;
        color: #6b7280;
        font-size: 0.875rem;
    }
    
    .session-score {
        text-align: center;
    }
    
    .score-circle {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: conic-gradient(from 0deg, #10b981 0deg, #10b981 var(--score-angle, 270deg), #e5e7eb var(--score-angle, 270deg) 360deg);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }
    
    .score-circle::before {
        content: '';
        position: absolute;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: white;
    }
    
    .score-circle span {
        position: relative;
        z-index: 1;
        font-size: 1.25rem;
        font-weight: bold;
        color: #1f2937;
    }
    
    .session-details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
    }
    
    .detail-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    
    .detail-card i {
        color: #6366f1;
        font-size: 1.25rem;
    }
    
    .detail-label {
        display: block;
        font-size: 0.875rem;
        color: #6b7280;
        margin-bottom: 0.25rem;
    }
    
    .detail-value {
        display: block;
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
    }
    
    .analysis-section {
        margin-bottom: 2rem;
    }
    
    .analysis-section h3 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        color: #1f2937;
        font-size: 1.25rem;
    }
    
    .analysis-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    
    .analysis-card {
        display: flex;
        flex-direction: column;
        padding: 1rem;
        background: #f8fafc;
        border-radius: 8px;
        border-left: 4px solid #6366f1;
    }
    
    .analysis-label {
        font-size: 0.875rem;
        color: #6b7280;
        margin-bottom: 0.5rem;
    }
    
    .analysis-value {
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
    }
    
    .text-comparison {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }
    
    .text-sample {
        background: #f9fafb;
        border-radius: 8px;
        padding: 1rem;
    }
    
    .text-sample h4 {
        margin: 0 0 0.75rem 0;
        color: #374151;
        font-size: 1rem;
    }
    
    .sample-preview {
        font-size: 0.875rem;
        color: #6b7280;
        line-height: 1.5;
        background: white;
        padding: 0.75rem;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }
    
    .modal-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 1px solid #e5e7eb;
    }
    
    .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    
    .status-badge.success {
        background: #dcfce7;
        color: #166534;
    }
    
    .status-badge.warning {
        background: #fef3c7;
        color: #92400e;
    }
    
    .status-badge.danger {
        background: #fee2e2;
        color: #991b1b;
    }
    
    .violation-count {
        padding: 0.25rem 0.5rem;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.875rem;
    }
    
    .violation-count.success {
        background: #dcfce7;
        color: #166534;
    }
    
    .violation-count.warning {
        background: #fef3c7;
        color: #92400e;
    }
    
    .violation-count.danger {
        background: #fee2e2;
        color: #991b1b;
    }
    
    .score-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-weight: 600;
        font-size: 0.875rem;
    }
    
    .score-badge.high {
        background: #dcfce7;
        color: #166534;
    }
    
    .score-badge.medium {
        background: #fef3c7;
        color: #92400e;
    }
    
    .score-badge.low {
        background: #fee2e2;
        color: #991b1b;
    }
    
    .duration-badge {
        background: #e0e7ff;
        color: #3730a3;
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.875rem;
        font-weight: 500;
    }
    
    .student-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .student-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 0.75rem;
        font-weight: bold;
        text-transform: uppercase;
    }
    
    .session-id {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.875rem;
        color: #6b7280;
        background: #f3f4f6;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
    }
    
    .action-buttons-modern {
        display: flex;
        gap: 0.5rem;
    }
    
    .btn-icon-modern {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.875rem;
    }
    
    .btn-icon-modern.view {
        background: #e0e7ff;
        color: #3730a3;
    }
    
    .btn-icon-modern.view:hover {
        background: #c7d2fe;
    }
    
    .btn-icon-modern.download {
        background: #dcfce7;
        color: #166534;
    }
    
    .btn-icon-modern.download:hover {
        background: #bbf7d0;
    }
    
    .btn-icon-modern.more {
        background: #f3f4f6;
        color: #6b7280;
    }
    
    .btn-icon-modern.more:hover {
        background: #e5e7eb;
    }
    
    @media (max-width: 768px) {
        .session-header-card {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
        }
        
        .session-details-grid {
            grid-template-columns: 1fr;
        }
        
        .text-comparison {
            grid-template-columns: 1fr;
        }
        
        .modal-actions {
            flex-direction: column;
        }
        
        .analysis-grid {
            grid-template-columns: 1fr;
        }
    }
`;

document.head.appendChild(style);