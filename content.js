// content.js
function scanPageForFraud() {
    const textContent = document.body.innerText;
    chrome.runtime.sendMessage({ type: "checkFraud", textContent }, (response) => {
        if (response.isFraudulent) {
            alert("⚠️ MarketShield Warning: This page contains potentially fraudulent content.");
        }
    });
}

// Run scan on page load
scanPageForFraud();
