document.getElementById("scan").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: () => {
                alert("Manual scan initiated. MarketShield is reviewing this page...");
            }
        });
    });
});
