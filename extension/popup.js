const API_BASE = 'http://localhost:5000/api';
let currentTabUrl = '';
let currentJobDetails = null;

document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        currentTabUrl = tabs[0].url;
        checkIfJobSite();
    });
    
    document.getElementById('extractBtn').addEventListener('click', extractJobDetails);
    document.getElementById('autoApplyBtn').addEventListener('click', autoApply);
    document.getElementById('trackBtn').addEventListener('click', trackApplication);
    document.getElementById('updateStatusBtn').addEventListener('click', updateStatus);
    document.getElementById('viewExcelBtn').addEventListener('click', viewExcelFile);
    
    loadStatistics();
});

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

function showSuccess(message) {
    const alert = document.getElementById('successAlert');
    alert.querySelector('span').textContent = message;
    alert.style.display = 'block';
    setTimeout(() => {
        alert.style.display = 'none';
    }, 3000);
}

function showError(message) {
    const alert = document.getElementById('errorAlert');
    alert.querySelector('span').textContent = message;
    alert.style.display = 'block';
    setTimeout(() => {
        alert.style.display = 'none';
    }, 3000);
}

function checkIfJobSite() {
    const isJobSite = currentTabUrl.includes('linkedin.com/jobs') || 
                     currentTabUrl.includes('indeed.com/viewjob') ||
                     currentTabUrl.includes('glassdoor.com/job-listing');
    
    if (isJobSite) {
        extractJobDetails();
    } else {
        document.getElementById('jobInfo').innerHTML = '<p><i class="fas fa-info-circle"></i> Navigate to a job posting to extract details</p>';
    }
}

async function extractJobDetails() {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/extract_job_details`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({url: currentTabUrl})
        });
        
        currentJobDetails = await response.json();
        
        const jobInfo = document.getElementById('jobInfo');
        if (currentJobDetails.company || currentJobDetails.position) {
            jobInfo.innerHTML = `
                <p><i class="fas fa-building"></i> <strong>Company:</strong> ${currentJobDetails.company || 'N/A'}</p>
                <p><i class="fas fa-briefcase"></i> <strong>Position:</strong> ${currentJobDetails.position || 'N/A'}</p>
                <p><i class="fas fa-globe"></i> <strong>Platform:</strong> ${getPlatform()}</p>
            `;
        } else {
            jobInfo.innerHTML = '<p><i class="fas fa-exclamation-triangle"></i> Unable to extract details automatically. Please fill manually.</p>';
        }
    } catch (error) {
        console.error('Error extracting job details:', error);
        document.getElementById('jobInfo').innerHTML = '<p><i class="fas fa-exclamation-circle"></i> Error extracting details. Please fill manually.</p>';
    }
    showLoading(false);
}

function getPlatform() {
    if (currentTabUrl.includes('linkedin.com')) return 'linkedin';
    if (currentTabUrl.includes('indeed.com')) return 'indeed';
    if (currentTabUrl.includes('glassdoor.com')) return 'glassdoor';
    return 'other';
}

async function autoApply() {
    const resumePath = document.getElementById('resumePath').value;
    if (!resumePath) {
        showError('Please enter the path to your resume file');
        return;
    }
    
    showLoading(true);
    const resultDiv = document.getElementById('applyResult');
    resultDiv.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Applying...';
    resultDiv.style.color = '#4A9782';
    
    try {
        const response = await fetch(`${API_BASE}/auto_apply`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                url: currentTabUrl,
                platform: getPlatform(),
                resume_path: resumePath
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            resultDiv.innerHTML = '<i class="fas fa-check-circle"></i> ' + result.message;
            resultDiv.style.color = '#004030';
            showSuccess('Application submitted successfully!');
            await trackApplication();
        } else {
            resultDiv.innerHTML = '<i class="fas fa-times-circle"></i> ' + result.message;
            resultDiv.style.color = '#DCD0A8';
            showError(result.message);
        }
    } catch (error) {
        resultDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error during application: ' + error.message;
        resultDiv.style.color = '#DCD0A8';
        showError(error.message);
    }
    showLoading(false);
}

async function trackApplication() {
    if (!currentJobDetails || !currentJobDetails.company || !currentJobDetails.position) {
        const company = prompt('Enter company name:');
        const position = prompt('Enter position title:');
        if (!company || !position) return;
        
        currentJobDetails = {
            company: company,
            position: position
        };
    }
    
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/add_application`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                company: currentJobDetails.company,
                position: currentJobDetails.position,
                platform: getPlatform(),
                url: currentTabUrl,
                notes: ''
            })
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('Application tracked successfully!');
            loadStatistics();
        }
    } catch (error) {
        console.error('Error tracking application:', error);
        showError('Error tracking application');
    }
    showLoading(false);
}

async function updateStatus() {
    const status = document.getElementById('statusSelect').value;
    const notes = document.getElementById('statusNotes').value;
    
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/update_status`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                row_index: 0,
                status: status,
                notes: notes
            })
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('Status updated successfully!');
            document.getElementById('statusNotes').value = '';
            loadStatistics();
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showError('Error updating status');
    }
    showLoading(false);
}

async function loadStatistics() {
    try {
        const response = await fetch(`${API_BASE}/get_statistics`);
        const stats = await response.json();
        
        const statsDiv = document.getElementById('stats');
        statsDiv.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${stats.Total || 0}</div>
                <div class="stat-label"><i class="fas fa-database"></i> Total</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.Interview || 0}</div>
                <div class="stat-label"><i class="fas fa-handshake"></i> Interviews</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.Rejected || 0}</div>
                <div class="stat-label"><i class="fas fa-frown"></i> Rejected</div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function viewExcelFile() {
    const excelPath = 'file:///' + chrome.runtime.getURL('../backend/job_applications.xlsx');
    chrome.tabs.create({url: excelPath});
}

