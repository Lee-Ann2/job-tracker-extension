chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openPopup') {
        chrome.action.openPopup();
    }
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Job Tracker Pro installed and ready');
});