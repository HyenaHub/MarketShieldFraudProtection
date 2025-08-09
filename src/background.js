/* background.js - service worker for MarketShield */

const BACKEND_BASE = "https://api.marketshield.com"; // replace with real backend

self.addEventListener('install', () => {
  console.log('MarketShield background installed');
});

self.addEventListener('activate', () => {
  console.log('MarketShield background active');
});

// Listen for messages from content scripts/popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    sendResponse({ error: "invalid_message" });
    return;
  }

  if (message.type === "scan_listing") {
    handleScanListing(message.payload).then(sendResponse).catch(err => {
      console.error(err);
      sendResponse({ error: "scan_failed" });
    });
    return true; // keep channel open for async response
  }

  if (message.type === "report_listing") {
    handleReportListing(message.payload).then(sendResponse).catch(err => {
      console.error(err);
      sendResponse({ error: "report_failed" });
    });
    return true;
  }

  sendResponse({ error: "unknown_type" });
  return false;
});

// Call backend scan endpoint
async function handleScanListing(payload) {
  try {
    const res = await fetch(`${BACKEND_BASE}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing: payload.listing })
    });
    if (!res.ok) {
      console.error("Scan API non-OK:", res.status);
      return { error: "backend_error" };
    }
    const data = await res.json();
    // expected data: {score: 0-1, verdict: 'safe'|'caution'|'unsafe', details: {...}}

    // If unsafe, trigger a desktop notification
    if (data.verdict === 'unsafe') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: 'MarketShield Warning',
        message: `This listing was flagged as UNSAFE (score ${data.score}).`
      });
    }

    return data;
  } catch (err) {
    console.error("handleScanListing error:", err);
    return { error: "exception" };
  }
}

// Call backend report endpoint
async function handleReportListing(payload) {
  try {
    const res = await fetch(`${BACKEND_BASE}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing: payload.listing })
    });
    if (!res.ok) return { error: "backend_error" };
    const data = await res.json();
    // expected data: { status: "ok", report_count: n }
    // optionally: if report_count >= 2 -> show elevated notification
    if (data.report_count >= 2) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: 'MarketShield Alert',
        message: `A listing has been reported multiple times and is now flagged as UNSAFE.`
      });
    }
    return data;
  } catch (err) {
    console.error("handleReportListing error:", err);
    return { error: "exception" };
  }
}
