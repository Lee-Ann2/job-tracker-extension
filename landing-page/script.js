const API_URL = 'https://job-tracker-api.vercel.app/api';

function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    notification.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i> ${message}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

function downloadExtension() {
    const link = document.createElement('a');
    link.href = 'job-tracker-pro-extension.zip';
    link.download = 'job-tracker-pro-extension.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Extension downloaded! Check your Downloads folder.');
}

function showInstallInstructions() {
    const instructions = `
📦 INSTALLATION STEPS:

1️⃣ Extract the downloaded ZIP file

2️⃣ Open Chrome and go to: chrome://extensions/

3️⃣ Enable "Developer mode" (toggle in top right)

4️⃣ Click "Load unpacked"

5️⃣ Select the extracted extension folder

6️⃣ Your extension is now installed!

7️⃣ Click the extension icon to start tracking jobs
    `;
    
    alert(instructions);
}

async function checkAPIStatus() {
    const statusDiv = document.getElementById('apiStatus');
    
    try {
        const response = await fetch(`${API_URL}/get_statistics`);
        const data = await response.json();
        
        statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> API Online - Ready to track jobs!';
        statusDiv.classList.add('online');
        statusDiv.classList.remove('offline');
        showNotification('API is online! Extension is ready to use.', false);
    } catch (error) {
        statusDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> API Offline - Run local backend for auto-apply';
        statusDiv.classList.add('offline');
        statusDiv.classList.remove('online');
        console.log('API offline:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('downloadBtn');
    
    downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showInstallInstructions();
    });
    
    setTimeout(() => {
        checkAPIStatus();
    }, 1000);
});