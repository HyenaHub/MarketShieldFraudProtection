document.addEventListener("DOMContentLoaded", () => {
  const protectionToggle = document.getElementById("protectionToggle");
  const sensitivitySelect = document.getElementById("sensitivity");
  const reportBtn = document.getElementById("reportBtn");

  // Load saved state
  chrome.storage.sync.get(["protectionEnabled", "sensitivity"], (data) => {
    protectionToggle.checked = data.protectionEnabled ?? true;
    sensitivitySelect.value = data.sensitivity ?? "medium";
  });

  // Toggle real-time protection
  protectionToggle.addEventListener("change", () => {
    chrome.storage.sync.set({ protectionEnabled: protectionToggle.checked });
  });

  // Change sensitivity
  sensitivitySelect.addEventListener("change", () => {
    chrome.storage.sync.set({ sensitivity: sensitivitySelect.value });
  });

  // Report current page
  reportBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];

      // Send message to content script
      chrome.tabs.sendMessage(activeTab.id, { action: "reportPage" }, (response) => {
        if (response && response.success) {
          let reportsEl = document.getElementById("reportsSubmitted");
          reportsEl.textContent = parseInt(reportsEl.textContent) + 1;
          alert("Page reported successfully!");
        } else {
          alert("Failed to report page.");
        }
        // popup.js

document.addEventListener("DOMContentLoaded", () => {
  const reportBtn = document.getElementById("reportBtn"); // Make sure popup.html has this button
  const statusEl = document.getElementById("status"); // Optional: for feedback

  if (reportBtn) {
    reportBtn.addEventListener("click", () => {
      // Get the current active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "reportCurrentPage" },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error("Message failed:", chrome.runtime.lastError.message);
                if (statusEl) statusEl.textContent = "❌ Failed to report page";
              } else if (response?.success) {
                console.log("Report success:", response.data);
                if (statusEl) statusEl.textContent = "✅ Report sent!";
              } else {
                console.error("Report error:", response?.error);
                if (statusEl) statusEl.textContent = "⚠️ Error sending report";
              }
            }
          );
        }
      });
    });
  }
});

      });
    });
  });
});
