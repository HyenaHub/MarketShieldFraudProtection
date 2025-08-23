// content-script.js

// === CONFIG ===
const API_BASE = "https://your-webapp.com/api"; // Change this to your backend endpoint

// Utility to create a flag element
function createFlag(color, tooltip) {
  const flag = document.createElement("span");
  flag.textContent = "⚑"; // Flag icon
  flag.style.color = color;
  flag.style.fontSize = "18px";
  flag.style.marginLeft = "6px";
  flag.style.cursor = "pointer";
  flag.title = tooltip;
  return flag;
}

// Example fraud check logic (replace with real checks)
function analyzeListing(listingEl) {
  const text = listingEl.innerText.toLowerCase();

  if (text.includes("too good to be true") || text.includes("scam")) {
    return { risk: "high", color: "red", message: "High risk of fraud" };
  } else if (text.includes("cheap") || text.includes("urgent")) {
    return { risk: "medium", color: "orange", message: "Suspicious listing" };
  } else {
    return { risk: "low", color: "green", message: "Looks safe" };
  }
}

// Inject flags into listings
function injectFlags() {
  const listings = document.querySelectorAll('[role="article"]'); // FB Marketplace listings

  listings.forEach(listing => {
    if (listing.dataset.marketshieldFlagged) return; // Prevent duplicate flags
    listing.dataset.marketshieldFlagged = "true";

    const result = analyzeListing(listing);
    const flag = createFlag(result.color, result.message);

    // Append flag near title or price
    const header = listing.querySelector("span, h2, h3");
    if (header) {
      header.appendChild(flag);
    }
  });
}

// Mutation observer to watch for new listings
const observer = new MutationObserver(() => {
  injectFlags();
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial injection
injectFlags();

// === Handle messages from popup.js ===
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "reportCurrentPage") {
    const url = window.location.href;

    // Collect all flagged listings
    const listings = [];
    document.querySelectorAll('[role="article"]').forEach(listing => {
      const analysis = analyzeListing(listing);
      listings.push({
        text: listing.innerText.slice(0, 200), // snippet
        risk: analysis.risk,
        message: analysis.message
      });
    });

    // Send to backend
    fetch(`${API_BASE}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: url, listings })
    })
      .then(res => res.json())
      .then(data => {
        console.log("Report sent:", data);
        sendResponse({ success: true, data });
      })
      .catch(err => {
        console.error("Error sending report:", err);
        sendResponse({ success: false, error: err });
      });

    return true; // Keep channel open for async sendResponse
  }
});
