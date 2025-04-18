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

// Video controls functionality
const videoControls = document.querySelectorAll('.video-controls .btn-icon');
videoControls.forEach(control => {
    control.addEventListener('click', function() {
        // Handle video control functions
        const icon = this.querySelector('i');
        if (icon.classList.contains('fa-play')) {
            console.log('Video playback started');
        } else if (icon.classList.contains('fa-pause')) {
            console.log('Video playback paused');
        } else if (icon.classList.contains('fa-stop')) {
            console.log('Video playback stopped');
        } else if (icon.classList.contains('fa-camera')) {
            console.log('Screenshot captured');
        }
    });
});

// Save settings handler
const saveSettingsBtn = document.querySelector('#settings .btn-primary');
if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', function() {
        alert('Settings saved successfully!');
    });
}