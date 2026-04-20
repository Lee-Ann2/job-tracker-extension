console.log('Job Tracker Pro content script loaded on:', window.location.href);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getJobDetails') {
        const jobDetails = extractJobDetailsFromPage();
        sendResponse(jobDetails);
    }
    return true;
});

function extractJobDetailsFromPage() {
    const url = window.location.href;
    let details = { company: '', position: '', url: url };

    function getText(selectors) {
        for (const sel of selectors) {
            try {
                const el = document.querySelector(sel);
                if (el && el.innerText && el.innerText.trim()) {
                    return el.innerText.trim();
                }
            } catch(e) {}
        }
        return '';
    }

    if (url.includes('linkedin.com')) {
        details.company = getText([
            '.job-details-jobs-unified-top-card__company-name a',
            '.job-details-jobs-unified-top-card__company-name',
            '.jobs-unified-top-card__company-name a',
            '.jobs-unified-top-card__company-name',
            '.jobs-details-top-card__company-url',
            '[data-test-id="job-details-company-name"]',
            '.topcard__org-name-link',
            '.topcard__flavor a'
        ]);
        details.position = getText([
            '.job-details-jobs-unified-top-card__job-title h1',
            '.job-details-jobs-unified-top-card__job-title',
            '.jobs-unified-top-card__job-title',
            '.t-24.t-bold',
            '[data-test-id="job-details-title"]',
            '.topcard__title',
            'h1.jobs-title'
        ]);
        if (!details.position) {
            const h1 = document.querySelector('h1');
            if (h1) details.position = h1.innerText.trim();
        }
    } else if (url.includes('indeed.com')) {
        details.company = getText([
            '[data-testid="inlineHeader-companyName"] a',
            '[data-testid="inlineHeader-companyName"]',
            '[data-testid="jobsearch-CompanyName"]',
            '.jobsearch-CompanyName',
            '[data-testid="jobsearch-JobInfoHeader-company"]',
            '.icl-u-lg-mr--sm.icl-u-xs-mr--xs',
            '.jobsearch-InlineCompanyRating-companyName'
        ]);
        details.position = getText([
            '[data-testid="jobsearch-JobInfoHeader-title"]',
            '.jobsearch-JobInfoHeader-title',
            '[data-testid="simcenter-title"]',
            'h1.jobsearch-JobInfoHeader-title',
            'h1'
        ]);
    } else if (url.includes('glassdoor.com')) {
        details.company = getText([
            '[data-test="employer-name"]',
            '.EmployerProfile_profileContainer__63w3R .EmployerProfile_employerName__Oth8K',
            '.employer-name',
            '.css-87uc0g',
            '[class*="employerName"]',
            '[class*="EmployerName"]'
        ]);
        details.position = getText([
            '[data-test="job-title"]',
            'h1[data-test="job-title"]',
            '.job-title',
            'h1[class*="JobDetails"]',
            'h1[class*="jobTitle"]',
            'h1'
        ]);
    }

    if (!details.company && !details.position) {
        const h1 = document.querySelector('h1');
        if (h1) details.position = h1.innerText.trim();
    }

    console.log('Extracted:', details);
    return details;
}

function getPlatformFromURL(url) {
    if (url.includes('linkedin.com')) return 'LinkedIn';
    if (url.includes('indeed.com')) return 'Indeed';
    if (url.includes('glassdoor.com')) return 'Glassdoor';
    return 'Other';
}

function addTrackingButton() {
    if (document.getElementById('jtp-track-btn')) return;

    const button = document.createElement('div');
    button.id = 'jtp-track-btn';
    button.innerHTML = '📊 Track Job';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        background: #004030;
        color: #FFF9E5;
        padding: 12px 20px;
        border-radius: 25px;
        cursor: pointer;
        font-family: sans-serif;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: background 0.2s, transform 0.2s;
        user-select: none;
    `;

    button.onmouseenter = () => {
        button.style.background = '#4A9782';
        button.style.transform = 'scale(1.05)';
    };
    button.onmouseleave = () => {
        button.style.background = '#004030';
        button.style.transform = 'scale(1)';
    };
    button.onclick = () => {
        chrome.runtime.sendMessage({ action: 'openPopup' });
    };

    document.body.appendChild(button);
}

const isJobPage = (
    window.location.href.includes('linkedin.com/jobs/') ||
    window.location.href.includes('indeed.com/viewjob') ||
    window.location.href.includes('indeed.com/rc/clk') ||
    window.location.href.includes('glassdoor.com/job-listing') ||
    window.location.href.includes('glassdoor.com/Jobs/')
);

if (isJobPage) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(addTrackingButton, 2000));
    } else {
        setTimeout(addTrackingButton, 2000);
    }
}