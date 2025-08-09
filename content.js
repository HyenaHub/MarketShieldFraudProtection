/* content.js - runs on Facebook Marketplace pages */

// CONFIG - update these if needed
const BACKEND_SCAN_MESSAGE = { type: "scan_listing" };
const BACKEND_REPORT_MESSAGE = { type: "report_listing" };
const BACKEND_URL = "https://api.marketshield.com"; // replace with your backend

// Basic suspicious keywords heuristic
const SUSPICIOUS_KEYWORDS = [
  "gift card",
  "urgent sale",
  "contact me",
  "outside facebook",
  "wire transfer",
  "only dm",
  "paypal friends"
];

// Utility: wait for element
function waitFor(selector, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        resolve(el);
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error("Timeout waiting for element: " + selector));
      }
    }, 300);
  });
}

// Try to extract listing info from the Marketplace DOM
function extractListingData() {
  // These selectors may change — adapt if FB updates their DOM
  const url = window.location.href;
  const titleEl = document.querySelector('[data-testid="marketplace_listing_title"]') || document.querySelector('meta[property="og:title"]');
  const priceEl = document.querySelector('[data-testid="marketplace_listing_price"]') || document.querySelector('meta[property="product:price:amount"]');
  const descEl = document.querySelector('[data-testid="marketplace_listing_description"]') || document.querySelector('[data-testid="marketplace_listing_details"]');
  const images = Array.from(document.querySelectorAll('img')).slice(0, 8).map(img => img.src);

  const title = titleEl ? (titleEl.innerText || titleEl.getAttribute('content') || "") : "";
  const price = priceEl ? (priceEl.innerText || priceEl.getAttribute('content') || "") : "";
  const description = descEl ? (descEl.innerText || descEl.getAttribute('content') || "") : "";

  return { url, title, price, description, images };
}

// Run keyword heuristic
function localHeuristicScore(text) {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of SUSPICIOUS_KEYWORDS) {
    if (lower.indexOf(kw) !== -1) hits++;
  }
  // score 0..1
  return Math.min(1, hits / Math.max(1, SUSPICIOUS_KEYWORDS.length * 0.6));
}

// UI: insert a small MarketShield panel on the listing
function insertPanel(initialText = "Scan listing with MarketShield") {
  if (document.getElementById("marketshield-panel")) return;
  const panel = document.createElement("div");
  panel.id = "marketshield-panel";
  panel.style = `
    position: fixed;
    right: 16px;
    bottom: 80px;
    z-index: 999999;
    background: #fff;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    padding: 12px 14px;
    width: 280px;
    font-family: Arial, sans-serif;
  `;
  panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px">
      <img src="${chrome.runtime.getURL('icons/icon48.png')}" width="36" height="36" alt="MarketShield"/>
      <div style="flex:1">
        <div style="font-weight:600">MarketShield</div>
        <div style="font-size:12px;color:#666">Scan this listing for fraud</div>
      </div>
    </div>
    <div id="ms-result" style="margin-top:10px;font-size:14px"> ${initialText} </div>
    <div style="display:flex;gap:8px; margin-top:10px;">
      <button id="ms-scan-btn" style="flex:1;padding:8px;border-radius:6px;border:none;background:#0b84ff;color:#fff;cursor:pointer">Scan</button>
      <button id="ms-report-btn" style="padding:8px;border-radius:6px;border:1px solid #e4e4e4;background:#fff;cursor:pointer">Report</button>
    </div>
  `;
  document.body.appendChild(panel);

  document.getElementById("ms-scan-btn").addEventListener("click", onScanClicked);
  document.getElementById("ms-report-btn").addEventListener("click", onReportClicked);
}

// When user clicks Scan: run heuristic + request backend scan
async function onScanClicked() {
  const data = extractListingData();
  const text = `${data.title}\n${data.description}\n${data.price}`;
  const heuristic = localHeuristicScore(text);

  const resultEl = document.getElementById("ms-result");
  resultEl.textContent = "Running quick check...";

  // Show quick heuristic result
  if (heuristic > 0.4) {
    resultEl.innerHTML = `<strong style="color:#b45309">Caution — suspicious keywords detected</strong>`;
  } else {
    resultEl.innerHTML = `<strong style="color:#16a34a">No obvious keywords found</strong>`;
  }

  // Send to background for API scan (more thorough)
  chrome.runtime.sendMessage({
    type: "scan_listing",
    payload: { listing: data }
  }, (response) => {
    if (!response) {
      resultEl.textContent = "Scan failed (no response).";
      return;
    }
    // Response expected: { score: 0.0-1.0, verdict: "safe"|"caution"|"unsafe", details: {} }
    const score = response.score ?? 0;
    const verdict = response.verdict ?? "caution";
    if (verdict === "unsafe") {
      resultEl.innerHTML = `<strong style="color:#dc2626">🔴 Unsafe (score: ${score})</strong>`;
    } else if (verdict === "caution") {
      resultEl.innerHTML = `<strong style="color:#b45309">🟡 Caution (score: ${score})</strong>`;
    } else {
      resultEl.innerHTML = `<strong style="color:#16a34a">🟢 Safe (score: ${score})</strong>`;
    }
    // store flagged listing locally if caution/unsafe
    if (verdict !== "safe") {
      saveFlaggedListing(data.url, verdict, score);
    }
  });
}

// When user clicks Report: send to backend via background
function onReportClicked() {
  const data = extractListingData();
  if (!confirm("Report this listing as suspicious to MarketShield?")) return;
  chrome.runtime.sendMessage({
    type: "report_listing",
    payload: { listing: data }
  }, (resp) => {
    if (resp && resp.status === "ok") {
      alert("Thanks — your report was submitted.");
      saveFlaggedListing(data.url, "reported", resp.report_count || 1);
    } else {
      alert("Report failed. Try again later.");
    }
  });
}

// Save flagged listings into chrome.storage.local
function saveFlaggedListing(url, status, score) {
  chrome.storage.local.get({ flagged: [] }, (result) => {
    const flagged = result.flagged || [];
    const exists = flagged.find(f => f.url === url);
    if (exists) {
      exists.status = status;
      exists.score = score;
      exists.updated = Date.now();
    } else {
      flagged.push({ url, status, score, updated: Date.now() });
    }
    chrome.storage.local.set({ flagged });
  });
}

// Initialize panel when on a listing page
(function init() {
  try {
    insertPanel("Ready to scan this listing.");
  } catch (e) {
    // ignore injection failures
    console.error("MarketShield injection failed:", e);
  }
})();
