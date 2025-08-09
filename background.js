// background.js
chrome.runtime.onInstalled.addListener(() => {
    console.log("MarketShield Fraud Protection installed and running.");
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "checkFraud") {
        const isFraudulent = detectFraud(message.textContent);
        sendResponse({ isFraudulent });
    }
    return true;
});

function detectFraud(text) {
    const suspiciousKeywords = [
        "wire transfer", "gift card", "bitcoin", "urgent", "too good to be true",
        "send money", "bank details", "Western Union"
    ];
    return suspiciousKeywords.some(keyword => text.toLowerCase().includes(keyword));
}
