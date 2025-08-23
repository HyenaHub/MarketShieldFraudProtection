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
      }
    });
  });
});
