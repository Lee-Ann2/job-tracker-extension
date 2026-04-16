chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'trackCurrentJob') {
        chrome.action.openPopup();
    }
});

