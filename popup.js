document.addEventListener("DOMContentLoaded", () => {
  const listingsCount = document.getElementById("listingsCount");
  const fraudCount = document.getElementById("fraudCount");
  const reportsCount = document.getElementById("reportsCount");
  const activityLog = document.getElementById("activityLog");

  // Fetch stats from background
  function refreshStats() {
    chrome.runtime.sendMessage({ action: "getStats" }, (response) => {
      if (response && response.success) {
        const stats = response.data;
        listingsCount.innerText = stats.totalAnalyses;
        fraudCount.innerText = stats.fraudDetected;
        reportsCount.innerText = stats.reportsSubmitted;

        if (stats.lastAnalysis) {
          const last = new Date(stats.lastAnalysis).toLocaleTimeString();
          activityLog.innerText = `Last analysis: ${last}`;
        } else {
          activityLog.innerText = "⏳ Waiting for activity...";
        }
      } else {
        activityLog.innerText = "⚠️ Could not load stats";
      }
    });
  }

  // Initial stats load
  refreshStats();

  // Refresh every few seconds while popup is open
  setInterval(refreshStats, 5000);

  // Report button
  document.getElementById("reportBtn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "reportFraud", data: { reason: "manual_report" } }, (response) => {
      if (response.success) {
        activityLog.innerText = "🚩 Report submitted successfully";
        refreshStats();
      } else {
        activityLog.innerText = "⚠️ Report failed";
      }
    });
  });

  // Toggle real-time protection
  document.getElementById("realtimeToggle").addEventListener("change", (e) => {
    chrome.runtime.sendMessage({
      action: "updateSettings",
      data: { enabled: e.target.checked }
    }, (response) => {
      if (response.success) {
        activityLog.innerText = e.target.checked
          ? "✅ Real-time protection enabled"
          : "⏸ Real-time protection disabled";
        document.addEventListener("DOMContentLoaded", () => {
  // Real-time protection toggle
  const toggle = document.getElementById("protection-toggle");
  toggle.addEventListener("change", () => {
    chrome.runtime.sendMessage({
      action: "updateSettings",
      data: { enabled: toggle.checked }
    }, () => {
      // notify content scripts
      chrome.runtime.sendMessage({ action: "settingsUpdated" });
    });
  });

  // Sensitivity dropdown
  const sensitivity = document.getElementById("alert-sensitivity");
  sensitivity.addEventListener("change", () => {
    chrome.runtime.sendMessage({
      action: "updateSettings",
      data: { alertLevel: sensitivity.value }
    }, () => {
      chrome.runtime.sendMessage({ action: "settingsUpdated" });
    });
  });

  // Report Current Page button
  document.getElementById("report-page").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.runtime.sendMessage({
        action: "reportFraud",
        data: { url: tabs[0].url }
      }, (response) => {
        alert(response.success ? "Reported!" : "Failed to report");
      });
    });
  });

  // Load stats
  chrome.runtime.sendMessage({ action: "getStats" }, (response) => {
    if (response.success) {
      document.getElementById("listings-count").textContent = response.data.totalAnalyses;
      document.getElementById("fraud-count").textContent = response.data.fraudDetected;
      document.getElementById("reports-count").textContent = response.data.reportsSubmitted;
    }
  });
});
        document.addEventListener("DOMContentLoaded", () => {
  const realtimeToggle = document.getElementById("realtimeToggle");
  const reportBtn = document.getElementById("reportBtn");
  const listingsCount = document.getElementById("listingsCount");
  const fraudCount = document.getElementById("fraudCount");
  const reportsCount = document.getElementById("reportsCount");
  const activityLog = document.getElementById("activityLog");

  let stats = { listings: 0, fraud: 0, reports: 0 };

  // Toggle realtime protection
  realtimeToggle.addEventListener("change", () => {
    const status = realtimeToggle.checked ? "enabled" : "disabled";
    activityLog.innerText = `✅ Real-time protection ${status}`;
  });

  // Report current page
  reportBtn.addEventListener("click", () => {
    stats.reports++;
    reportsCount.innerText = stats.reports;
    activityLog.innerText = `🚩 Report submitted for this page`;
  });

  // Simulate scanning (placeholder - real logic would hook into background.js)
  function simulateScan() {
    stats.listings++;
    if (Math.random() < 0.2) {
      stats.fraud++;
      activityLog.innerText = "⚠️ Fraud detected on this page!";
    } else {
      activityLog.innerText = "✅ Page scanned: No fraud detected";
    }
    listingsCount.innerText = stats.listings;
    fraudCount.innerText = stats.fraud;
  }

  // Run scan when popup opens
  simulateScan();
});


      }
    });
  });
});
