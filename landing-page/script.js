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
    link.href = 'extension.zip';
    link.download = 'job-tracker-pro-extension.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Extension downloaded successfully! Check your Downloads folder.');
}

function showInstallInstructions() {
    const instructions = `
        📦 Installation Steps:\n\n
        1️⃣ Extract the downloaded ZIP file\n
        2️⃣ Open Chrome and go to chrome://extensions/\n
        3️⃣ Enable "Developer mode" (toggle in top right)\n
        4️⃣ Click "Load unpacked"\n
        5️⃣ Select the extracted extension folder\n
        6️⃣ Make sure backend server is running at http://localhost:5000\n
        7️⃣ Click the extension icon to start tracking!
    `;
    
    showNotification('Check console for installation instructions', false);
    console.log(instructions);
    
    alert(instructions);
}

function checkBackendStatus() {
    fetch('http://localhost:5000/api/get_statistics')
        .then(response => response.json())
        .then(data => {
            showNotification('✅ Backend server is running! You can use all features including auto-apply.');
        })
        .catch(error => {
            showNotification('⚠️ Backend server not running. Auto-apply feature will be limited. Start the server with: python main.py', true);
        });
}

document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('installBtn');
    
    installBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showInstallInstructions();
    });
    
    setTimeout(() => {
        checkBackendStatus();
    }, 1000);
});

