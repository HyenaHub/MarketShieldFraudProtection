document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("protection-toggle");
  const sensitivity = document.getElementById("alert-sensitivity");
  const reportBtn = document.getElementById("report-page");

  const listingsCount = document.getElementById("listings-count");
  const fraudCount = document.getElementById("fraud-count");
  const reportsCount = document.getElementById("reports-count");

  // Load settings from background
  chrome.runtime.sendMessage({ action: "getUserSettings" }, (response) => {
    if (response.success) {
      toggle.checked = response.data.enabled;
      sensitivity.value = response.data.alertLevel;
    }
  });

  // Load stats
  chrome.runtime.sendMessage({ action: "getStats" }, (response) => {
    if (response.success) {
      listingsCount.textContent = response.data.totalAnalyses || 0;
      fraudCount.textContent = response.data.fraudDetected || 0;
      reportsCount.textContent = response.data.reportsSubmitted || 0;
    }
  });

  // Handle toggle
  toggle.addEventListener("change", () => {
    chrome.runtime.sendMessage({
      action: "updateSettings",
      data: { enabled: toggle.checked }
    }, () => {
      chrome.runtime.sendMessage({ action: "settingsUpdated" });
    });
  });

  // Handle sensitivity dropdown
  sensitivity.addEventListener("change", () => {
    chrome.runtime.sendMessage({
      action: "updateSettings",
      data: { alertLevel: sensitivity.value }
    }, () => {
      chrome.runtime.sendMessage({ action: "settingsUpdated" });
    });
  });

  // Handle "Report Current Page"
  reportBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.runtime.sendMessage({
        action: "reportFraud",
        data: { url: tabs[0].url }
      }, (response) => {
        alert(response.success ? "Reported!" : "Failed to report");
      });
    });
  });
});
