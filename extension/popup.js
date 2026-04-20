let currentTab = null;

document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    document.getElementById('extractBtn').addEventListener('click', extractJobDetails);
    document.getElementById('trackBtn').addEventListener('click', trackApplication);
    document.getElementById('updateStatusBtn').addEventListener('click', updateStatus);
    document.getElementById('viewAppsBtn').addEventListener('click', toggleAppList);
    document.getElementById('applyBtn').addEventListener('click', openApplyLink);

    loadStatistics();
    loadLastTracked();
    checkIfJobSite();
});

function checkIfJobSite() {
    if (!currentTab) return;
    const url = currentTab.url || '';
    const isJob = url.includes('linkedin.com') || url.includes('indeed.com') || url.includes('glassdoor.com');
    const hint = document.getElementById('siteHint');
    if (!isJob) {
        hint.textContent = 'Navigate to a LinkedIn, Indeed or Glassdoor job posting to auto-extract details.';
        hint.style.display = 'block';
    } else {
        hint.style.display = 'none';
    }
}

function getPlatform(url) {
    url = url || (currentTab ? currentTab.url : '');
    if (url.includes('linkedin.com')) return 'LinkedIn';
    if (url.includes('indeed.com')) return 'Indeed';
    if (url.includes('glassdoor.com')) return 'Glassdoor';
    return 'Other';
}

function showSuccess(msg) {
    const el = document.getElementById('successAlert');
    el.querySelector('span').textContent = msg;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}

function showError(msg) {
    const el = document.getElementById('errorAlert');
    el.querySelector('span').textContent = msg;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 4000);
}

async function extractJobDetails() {
    const btn = document.getElementById('extractBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Extracting...';
    btn.disabled = true;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        currentTab = tab;
        const url = tab.url || '';

        if (!url.includes('linkedin.com') && !url.includes('indeed.com') && !url.includes('glassdoor.com')) {
            showError('Please go to a LinkedIn, Indeed, or Glassdoor job posting first.');
            return;
        }

        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: scrapeJobPage
        });

        const data = results && results[0] && results[0].result;

        if (data && (data.company || data.position)) {
            if (data.company) document.getElementById('companyName').value = data.company;
            if (data.position) document.getElementById('positionName').value = data.position;
            showSuccess('Details extracted!');
        } else {
            showError('Could not extract — fill in manually below.');
        }
    } catch (err) {
        console.error(err);
        showError('Extraction failed — fill in manually below.');
    } finally {
        btn.innerHTML = '<i class="fas fa-magic"></i> Extract Job Details';
        btn.disabled = false;
    }
}

function scrapeJobPage() {
    const url = window.location.href;
    let company = '';
    let position = '';

    function get(selectors) {
        for (const s of selectors) {
            try {
                const el = document.querySelector(s);
                const text = el && (el.innerText || el.textContent || '').trim();
                if (text) return text;
            } catch(e) {}
        }
        return '';
    }

    if (url.includes('linkedin.com')) {
        company = get([
            '.job-details-jobs-unified-top-card__company-name a',
            '.job-details-jobs-unified-top-card__company-name',
            '.jobs-unified-top-card__company-name a',
            '.jobs-unified-top-card__company-name',
            '.topcard__org-name-link',
            '.topcard__flavor--black-link',
            '[data-test-id="job-details-company-name"]'
        ]);
        position = get([
            '.job-details-jobs-unified-top-card__job-title h1',
            '.job-details-jobs-unified-top-card__job-title',
            '.jobs-unified-top-card__job-title h1',
            '.jobs-unified-top-card__job-title',
            '.topcard__title',
            'h1.t-24',
            'h1'
        ]);
    } else if (url.includes('indeed.com')) {
        company = get([
            '[data-testid="inlineHeader-companyName"] a',
            '[data-testid="inlineHeader-companyName"]',
            '[data-testid="jobsearch-CompanyName"]',
            '.jobsearch-CompanyName',
            '.icl-u-lg-mr--sm a',
            '[data-company-name]'
        ]);
        position = get([
            '[data-testid="jobsearch-JobInfoHeader-title"]',
            '.jobsearch-JobInfoHeader-title',
            '[data-testid="simcenter-title"]',
            'h1'
        ]);
    } else if (url.includes('glassdoor.com')) {
        company = get([
            '[data-test="employer-name"]',
            '[class*="EmployerProfile_employerName"]',
            '[class*="employerName"]',
            '.employer-name'
        ]);
        position = get([
            '[data-test="job-title"]',
            '[class*="JobDetails_jobTitle"]',
            '[class*="jobTitle"]',
            'h1'
        ]);
    }

    if (!position) {
        const h1 = document.querySelector('h1');
        if (h1) position = (h1.innerText || h1.textContent || '').trim();
    }

    return { company, position };
}

function trackApplication() {
    const company = document.getElementById('companyName').value.trim();
    const position = document.getElementById('positionName').value.trim();

    if (!company && !position) {
        showError('Enter a company name and/or position title first.');
        return;
    }

    const url = currentTab ? currentTab.url : '';

    const entry = {
        id: Date.now(),
        dateApplied: new Date().toLocaleString(),
        company: company || '(unknown)',
        position: position || '(unknown)',
        platform: getPlatform(url),
        url: url,
        status: 'Applied',
        notes: '',
        lastUpdated: new Date().toLocaleString()
    };

    chrome.storage.local.get(['applications'], (result) => {
        const apps = result.applications || [];
        apps.unshift(entry);
        chrome.storage.local.set({ applications: apps }, () => {
            showSuccess('Application tracked!');
            document.getElementById('companyName').value = '';
            document.getElementById('positionName').value = '';
            loadStatistics();
            loadLastTracked();
        });
    });
}

function updateStatus() {
    const status = document.getElementById('statusSelect').value;
    const notes = document.getElementById('statusNotes').value.trim();
    const targetId = document.getElementById('appSelect').value;

    chrome.storage.local.get(['applications'], (result) => {
        const apps = result.applications || [];
        if (apps.length === 0) {
            showError('No applications tracked yet.');
            return;
        }

        const idx = targetId
            ? apps.findIndex(a => String(a.id) === targetId)
            : 0;

        if (idx === -1) {
            showError('Application not found.');
            return;
        }

        apps[idx].status = status;
        if (notes) apps[idx].notes = notes;
        apps[idx].lastUpdated = new Date().toLocaleString();

        chrome.storage.local.set({ applications: apps }, () => {
            showSuccess('Status updated!');
            document.getElementById('statusNotes').value = '';
            loadStatistics();
            populateAppSelect();
        });
    });
}

function openApplyLink() {
    const link = document.getElementById('resumeUrl').value.trim();
    if (!link) {
        showError('Paste your resume URL first (e.g. a Google Drive link).');
        return;
    }
    if (!link.startsWith('http')) {
        showError('Please enter a valid URL starting with https://');
        return;
    }
    chrome.tabs.create({ url: link });
}

function loadStatistics() {
    chrome.storage.local.get(['applications'], (result) => {
        const apps = result.applications || [];
        document.getElementById('stats').innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${apps.length}</div>
                <div class="stat-label">Total</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${apps.filter(a => a.status === 'Interview').length}</div>
                <div class="stat-label">Interviews</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${apps.filter(a => a.status === 'Rejected').length}</div>
                <div class="stat-label">Rejected</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${apps.filter(a => a.status === 'Offer').length}</div>
                <div class="stat-label">Offers</div>
            </div>
        `;
    });
}

function loadLastTracked() {
    chrome.storage.local.get(['applications'], (result) => {
        const apps = result.applications || [];
        const badge = document.getElementById('lastTrackedBadge');
        if (apps.length > 0 && badge) {
            badge.textContent = `Last: ${apps[0].company} — ${apps[0].position}`;
            badge.style.display = 'block';
        } else if (badge) {
            badge.style.display = 'none';
        }
        populateAppSelect();
    });
}

function populateAppSelect() {
    chrome.storage.local.get(['applications'], (result) => {
        const apps = result.applications || [];
        const sel = document.getElementById('appSelect');
        if (!sel) return;
        sel.innerHTML = apps.length === 0
            ? '<option value="">No applications yet</option>'
            : apps.map(a => `<option value="${a.id}">${a.company} — ${a.position} [${a.status}]</option>`).join('');
    });
}

function toggleAppList() {
    const existing = document.getElementById('appListPanel');
    if (existing) { existing.remove(); return; }

    chrome.storage.local.get(['applications'], (result) => {
        const apps = result.applications || [];

        const statusColors = {
            Applied:'#DCD0A8', Interview:'#4A9782',
            Rejected:'#e8b4b4', Offer:'#004030', Ignored:'#e8d9a8'
        };
        const statusTextColors = {
            Applied:'#004030', Interview:'#fff',
            Rejected:'#004030', Offer:'#fff', Ignored:'#004030'
        };

        const panel = document.createElement('div');
        panel.id = 'appListPanel';
        panel.style.cssText = `
            position:fixed;top:0;left:0;right:0;bottom:0;
            background:linear-gradient(135deg,#004030,#4A9782);
            z-index:99999;overflow-y:auto;padding:15px;
            font-family:'Open Sans',sans-serif;
        `;

        const rows = apps.length === 0
            ? '<p style="color:#FFF9E5;text-align:center;margin-top:40px;font-size:14px;">No applications tracked yet.</p>'
            : apps.map(a => `
                <div style="background:#FFF9E5;border-radius:12px;padding:12px;margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                        <div style="min-width:0;flex:1;">
                            <div style="font-weight:700;color:#004030;font-size:13px;">${a.company}</div>
                            <div style="color:#4A9782;font-size:12px;margin-top:2px;">${a.position}</div>
                            <div style="color:#aaa;font-size:11px;margin-top:3px;">${a.platform} • ${a.dateApplied}</div>
                            ${a.notes ? `<div style="color:#888;font-size:11px;margin-top:3px;font-style:italic;">${a.notes}</div>` : ''}
                            ${a.url ? `<a href="${a.url}" target="_blank" style="color:#4A9782;font-size:11px;text-decoration:none;">View posting ↗</a>` : ''}
                        </div>
                        <span style="
                            background:${statusColors[a.status]||'#DCD0A8'};
                            color:${statusTextColors[a.status]||'#004030'};
                            padding:3px 10px;border-radius:20px;font-size:11px;
                            font-weight:600;white-space:nowrap;flex-shrink:0;
                        ">${a.status}</span>
                    </div>
                </div>
            `).join('');

        panel.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                <h3 style="color:#FFF9E5;font-family:Montserrat,sans-serif;font-size:16px;font-weight:700;">
                    All Applications (${apps.length})
                </h3>
                <button id="closePanel" style="
                    background:#FFF9E5;color:#004030;border:none;border-radius:8px;
                    padding:6px 14px;cursor:pointer;font-weight:700;font-size:13px;
                ">✕ Close</button>
            </div>
            ${rows}
        `;

        document.body.appendChild(panel);
        document.getElementById('closePanel').onclick = () => panel.remove();
    });
}