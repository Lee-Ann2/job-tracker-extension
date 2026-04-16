console.log('Job Tracker extension loaded');
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getJobDetails') {
        const jobDetails = extractJobDetailsFromPage();
        sendResponse(jobDetails);
    }
});

function extractJobDetailsFromPage() {
    const url = window.location.href;
    let details = { company: '', position: '' };
    
    if (url.includes('linkedin.com')) {
        const companyElement = document.querySelector('.jobs-company-name');
        const positionElement = document.querySelector('.jobs-title');
        
        if (companyElement) details.company = companyElement.textContent.trim();
        if (positionElement) details.position = positionElement.textContent.trim();
        
    } else if (url.includes('indeed.com')) {
        const companyElement = document.querySelector('.company-name');
        const positionElement = document.querySelector('.jobsearch-JobInfoHeader-title');
        
        if (companyElement) details.company = companyElement.textContent.trim();
        if (positionElement) details.position = positionElement.textContent.trim();
        
    } else if (url.includes('glassdoor.com')) {
        const companyElement = document.querySelector('.employer-name');
        const positionElement = document.querySelector('.job-title');
        
        if (companyElement) details.company = companyElement.textContent.trim();
        if (positionElement) details.position = positionElement.textContent.trim();
    }
    
    return details;
}
function addTrackingButton() {
    const button = document.createElement('button');
    button.textContent = 'Track Job';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '9999';
    button.style.backgroundColor = '#366092';
    button.style.color = 'white';
    button.style.padding = '10px';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    
    button.onclick = () => {
        chrome.runtime.sendMessage({action: 'trackCurrentJob'});
    };
    
    document.body.appendChild(button);
}

if (window.location.href.includes('/jobs/') || 
    window.location.href.includes('/viewjob') ||
    window.location.href.includes('/job-listing')) {
    setTimeout(addTrackingButton, 2000);
}

