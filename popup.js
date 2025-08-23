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
      });
    });
  });
});
