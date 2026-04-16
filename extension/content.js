console.log('Job Tracker Pro loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getJobDetails') {
        const jobDetails = extractJobDetailsFromPage();
        sendResponse(jobDetails);
    }
    return true;
});

function extractJobDetailsFromPage() {
    const url = window.location.href;
    let details = { company: '', position: '' };
    
    if (url.includes('linkedin.com')) {
        const companySelectors = [
            '.jobs-unified-top-card__company-name',
            '.jobs-company__name',
            '.job-details-jobs-unified-top-card__company-name',
            '.jobs-search-company-name',
            '.job-search-company-name',
            '[data-test-id="job-details-company-name"]'
        ];
        
        for (let selector of companySelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                details.company = element.textContent.trim();
                break;
            }
        }
        
        const positionSelectors = [
            '.jobs-unified-top-card__job-title',
            '.job-details-jobs-unified-top-card__job-title',
            '.jobs-title',
            'h1',
            '[data-test-id="job-details-title"]'
        ];
        
        for (let selector of positionSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                details.position = element.textContent.trim();
                break;
            }
        }
        
        if (!details.company) {
            const urlParts = url.split('/');
            const index = urlParts.indexOf('jobs');
            if (index !== -1 && urlParts[index + 1]) {
                details.company = urlParts[index + 1].replace(/-/g, ' ');
            }
        }
    }
    
    else if (url.includes('indeed.com')) {
        const companyElement = document.querySelector('[data-testid="jobsearch-CompanyName"]') ||
                              document.querySelector('.jobsearch-CompanyName') ||
                              document.querySelector('[data-testid="jobsearch-JobInfoHeader-company"]') ||
                              document.querySelector('.company-name');
        if (companyElement) details.company = companyElement.textContent.trim();
        
        const positionElement = document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]') ||
                               document.querySelector('.jobsearch-JobInfoHeader-title') ||
                               document.querySelector('h1');
        if (positionElement) details.position = positionElement.textContent.trim();
    }
    
    else if (url.includes('glassdoor.com')) {
        const companyElement = document.querySelector('[data-test="employer-name"]') ||
                              document.querySelector('.employer-name') ||
                              document.querySelector('.css-1t7ah1n');
        if (companyElement) details.company = companyElement.textContent.trim();
        
        const positionElement = document.querySelector('[data-test="job-title"]') ||
                               document.querySelector('.job-title') ||
                               document.querySelector('h1');
        if (positionElement) details.position = positionElement.textContent.trim();
    }
    
    return details;
}

function addTrackingButton() {
    const button = document.createElement('div');
    button.innerHTML = '📊 Track Job';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '9999';
    button.style.backgroundColor = '#004030';
    button.style.color = '#FFF9E5';
    button.style.padding = '12px 20px';
    button.style.borderRadius = '25px';
    button.style.cursor = 'pointer';
    button.style.fontFamily = 'Montserrat, sans-serif';
    button.style.fontWeight = 'bold';
    button.style.fontSize = '14px';
    button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    button.style.transition = 'all 0.3s';
    
    button.onmouseover = () => {
        button.style.backgroundColor = '#4A9782';
        button.style.transform = 'scale(1.05)';
    };
    
    button.onmouseout = () => {
        button.style.backgroundColor = '#004030';
        button.style.transform = 'scale(1)';
    };
    
    button.onclick = () => {
        chrome.runtime.sendMessage({action: 'openPopup'});
    };
    
    document.body.appendChild(button);
}

if (window.location.href.includes('/jobs/') || 
    window.location.href.includes('/viewjob') ||
    window.location.href.includes('/job-listing')) {
    setTimeout(addTrackingButton, 2000);
}