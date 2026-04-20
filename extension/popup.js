const API_BASE = 'https://job-tracker-extension.vercel.app/api';
let currentTabUrl = '';
let currentRowIndex = null;

document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            currentTabUrl = tabs[0].url;
        }
    });

    document.getElementById('extractBtn').addEventListener('click', extractJobDetails);
    document.getElementById('autoApplyBtn').addEventListener('click', autoApply);
    document.getElementById('trackBtn').addEventListener('click', trackApplication);
    document.getElementById('updateStatusBtn').addEventListener('click', updateStatus);
    document.getElementById('viewExcelBtn').addEventListener('click', viewApplications);

    loadStatistics();
    loadLastTracked();
});

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

function showSuccess(message) {
    const alert = document.getElementById('successAlert');
    alert.querySelector('span').textContent = message;
    alert.style.display = 'block';
    setTimeout(() => { alert.style.display = 'none'; }, 3000);
}

function showError(message) {
    const alert = document.getElementById('errorAlert');
    alert.querySelector('span').textContent = message;
    alert.style.display = 'block';
    setTimeout(() => { alert.style.display = 'none'; }, 3000);
}

function getPlatform() {
    if (currentTabUrl.includes('linkedin.com')) return 'LinkedIn';
    if (currentTabUrl.includes('indeed.com')) return 'Indeed';
    if (currentTabUrl.includes('glassdoor.com')) return 'Glassdoor';
    return 'Other';
}

async function extractJobDetails() {
    showLoading(true);
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const isJobSite = tab.url.includes('linkedin.com') ||
                          tab.url.includes('indeed.com') ||
                          tab.url.includes('glassdoor.com');

        if (!isJobSite) {
            showError('Please navigate to a LinkedIn, Indeed, or Glassdoor job posting');
            showLoading(false);
            return;
        }

        currentTabUrl = tab.url;

        let response = null;
        try {
            response = await chrome.tabs.sendMessage(tab.id, { action: 'getJobDetails' });
        } catch (e) {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            await new Promise(r => setTimeout(r, 500));
            try {
                response = await chrome.tabs.sendMessage(tab.id, { action: 'getJobDetails' });
            } catch (e2) {
                response = null;
            }
        }

        if (response && (response.company || response.position)) {
            if (response.company) document.getElementById('companyName').value = response.company;
            if (response.position) document.getElementById('positionName').value = response.position;
            showSuccess('Job details extracted!');
        } else {
            showError('Could not auto-extract. Please fill in manually.');
        }
    } catch (error) {
        console.error('Extraction error:', error);
        showError('Could not extract. Please fill in manually.');
    }
    showLoading(false);
}

async function trackApplication() {
    const company = document.getElementById('companyName').value.trim();
    const position = document.getElementById('positionName').value.trim();

    if (!company || !position) {
        showError('Please enter both company name and position title');
        return;
    }

    showLoading(true);

    const entry = {
        id: Date.now(),
        dateApplied: new Date().toLocaleString(),
        company,
        position,
        platform: getPlatform(),
        url: currentTabUrl,
        status: 'Applied',
        notes: '',
        lastUpdated: new Date().toLocaleString()
    };

    try {
        let savedOnline = false;
        try {
            const res = await fetch(`${API_BASE}/add_application`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company, position,
                    platform: entry.platform,
                    url: entry.url,
                    notes: ''
                }),
                signal: AbortSignal.timeout(4000)
            });
            const result = await res.json();
            if (result.success) {
                currentRowIndex = result.row_index;
                savedOnline = true;
            }
        } catch (e) {}

        await saveToLocalStorage(entry);

        showSuccess(savedOnline
            ? 'Tracked and saved to Excel!'
            : 'Tracked locally! (API offline)');

        document.getElementById('companyName').value = '';
        document.getElementById('positionName').value = '';
        loadStatistics();
    } catch (error) {
        console.error('Track error:', error);
        showError('Error tracking application');
    }
    showLoading(false);
}

async function saveToLocalStorage(entry) {
    return new Promise((resolve) => {
        chrome.storage.local.get(['applications'], (result) => {
            const apps = result.applications || [];
            apps.unshift(entry);
            chrome.storage.local.set({ applications: apps }, resolve);
        });
    });
}

async function updateStatus() {
    const status = document.getElementById('statusSelect').value;
    const notes = document.getElementById('statusNotes').value.trim();

    showLoading(true);
    try {
        let updatedOnline = false;

        if (currentRowIndex !== null) {
            try {
                const res = await fetch(`${API_BASE}/update_status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ row_index: currentRowIndex, status, notes }),
                    signal: AbortSignal.timeout(4000)
                });
                const result = await res.json();
                if (result.success) updatedOnline = true;
            } catch (e) {}
        }

        await new Promise((resolve) => {
            chrome.storage.local.get(['applications'], (result) => {
                const apps = result.applications || [];
                if (apps.length > 0) {
                    apps[0].status = status;
                    apps[0].notes = notes || apps[0].notes;
                    apps[0].lastUpdated = new Date().toLocaleString();
                    chrome.storage.local.set({ applications: apps }, resolve);
                } else {
                    resolve();
                }
            });
        });

        showSuccess(updatedOnline ? 'Status updated in Excel!' : 'Status updated locally!');
        document.getElementById('statusNotes').value = '';
        loadStatistics();
    } catch (error) {
        showError('Error updating status');
    }
    showLoading(false);
}

async function autoApply() {
    const resumePath = document.getElementById('resumePath').value.trim();
    if (!resumePath) {
        showError('Please enter your resume file path');
        return;
    }

    showLoading(true);
    const resultDiv = document.getElementById('applyResult');
    resultDiv.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Attempting auto-apply...';
    resultDiv.style.color = '#4A9782';

    try {
        const res = await fetch(`${API_BASE}/auto_apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: currentTabUrl,
                platform: getPlatform().toLowerCase(),
                resume_path: resumePath
            }),
            signal: AbortSignal.timeout(30000)
        });
        const result = await res.json();

        if (result.success) {
            resultDiv.innerHTML = '<i class="fas fa-check-circle"></i> ' + result.message;
            resultDiv.style.color = '#004030';
            showSuccess('Application submitted!');
            await trackApplication();
        } else {
            resultDiv.innerHTML = '<i class="fas fa-times-circle"></i> ' + result.message;
            resultDiv.style.color = '#888';
            showError(result.message || 'Auto-apply failed');
        }
    } catch (error) {
        resultDiv.innerHTML = '<i class="fas fa-info-circle"></i> API offline — apply manually then click Track';
        resultDiv.style.color = '#888';
    }
    showLoading(false);
}

function loadStatistics() {
    chrome.storage.local.get(['applications'], (result) => {
        const apps = result.applications || [];
        const stats = {
            Total: apps.length,
            Interview: apps.filter(a => a.status === 'Interview').length,
            Rejected: apps.filter(a => a.status === 'Rejected').length,
            Offer: apps.filter(a => a.status === 'Offer').length
        };

        document.getElementById('stats').innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${stats.Total}</div>
                <div class="stat-label"><i class="fas fa-database"></i> Total</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.Interview}</div>
                <div class="stat-label"><i class="fas fa-handshake"></i> Interviews</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.Rejected}</div>
                <div class="stat-label"><i class="fas fa-frown"></i> Rejected</div>
            </div>
        `;
    });
}

function loadLastTracked() {
    chrome.storage.local.get(['applications'], (result) => {
        const apps = result.applications || [];
        if (apps.length > 0) {
            const last = apps[0];
            const badge = document.getElementById('lastTrackedBadge');
            if (badge) {
                badge.textContent = `Last: ${last.company} — ${last.position}`;
                badge.style.display = 'block';
            }
        }
    });
}

function viewApplications() {
    chrome.storage.local.get(['applications'], (result) => {
        const apps = result.applications || [];
        if (apps.length === 0) {
            showError('No applications tracked yet');
            return;
        }

        const existing = document.getElementById('appListPanel');
        if (existing) { existing.remove(); return; }

        const panel = document.createElement('div');
        panel.id = 'appListPanel';
        panel.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(135deg, #004030, #4A9782);
            z-index: 99999; overflow-y: auto; padding: 15px;
        `;

        const statusColors = {
            Applied: '#DCD0A8', Interview: '#4A9782',
            Rejected: '#e8b4b4', Offer: '#004030', Ignored: '#e8d9a8'
        };
        const statusText = { Applied: '#004030', Interview: '#fff', Rejected: '#004030', Offer: '#fff', Ignored: '#004030' };

        panel.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                <h3 style="color:#FFF9E5;font-family:Montserrat,sans-serif;font-size:16px;">
                    <i class="fas fa-list"></i> All Applications (${apps.length})
                </h3>
                <button onclick="document.getElementById('appListPanel').remove()" style="
                    background:#FFF9E5;color:#004030;border:none;border-radius:8px;
                    padding:6px 12px;cursor:pointer;font-weight:bold;font-size:13px;
                ">✕ Close</button>
            </div>
            ${apps.map(a => `
                <div style="
                    background:#FFF9E5;border-radius:12px;padding:12px;
                    margin-bottom:10px;font-family:Open Sans,sans-serif;
                ">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                        <div>
                            <div style="font-weight:700;color:#004030;font-size:13px;">${a.company}</div>
                            <div style="color:#4A9782;font-size:12px;margin-top:2px;">${a.position}</div>
                            <div style="color:#aaa;font-size:11px;margin-top:4px;">${a.platform} • ${a.dateApplied}</div>
                        </div>
                        <span style="
                            background:${statusColors[a.status] || '#DCD0A8'};
                            color:${statusText[a.status] || '#004030'};
                            padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;
                            white-space:nowrap;
                        ">${a.status}</span>
                    </div>
                    ${a.notes ? `<div style="color:#888;font-size:11px;margin-top:6px;font-style:italic;">${a.notes}</div>` : ''}
                </div>
            `).join('')}
        `;
        document.body.appendChild(panel);
    });
}