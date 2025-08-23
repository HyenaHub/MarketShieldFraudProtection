// --- Add flags beside listings ---
function flagListings() {
  const listings = document.querySelectorAll("a[href*='/marketplace/item/']");
  
  listings.forEach((listing) => {
    if (listing.dataset.marketshieldFlagged) return; // avoid duplicate

    const risk = Math.random(); // simulate risk score (replace with backend)
    let color = "green";
    if (risk > 0.7) color = "red";
    else if (risk > 0.4) color = "yellow";

    const flag = document.createElement("span");
    flag.textContent = " ●";
    flag.style.color = color;
    flag.style.fontWeight = "bold";
    listing.appendChild(flag);

    listing.dataset.marketshieldFlagged = "true";
  });
}

// Run flags on load and mutation observer
flagListings();
const observer = new MutationObserver(flagListings);
observer.observe(document.body, { childList: true, subtree: true });

// --- Handle messages from popup.js ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "reportPage") {
    const pageUrl = window.location.href;
    
    // Send to backend (replace with your real API endpoint)
    fetch("https://your-backend.com/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: pageUrl, timestamp: Date.now() })
    })
    .then(res => res.json())
    .then(() => {
      sendResponse({ success: true });
    })
    .catch(() => {
      sendResponse({ success: false });
    });

    return true; // keep channel open for async response
  }
});
