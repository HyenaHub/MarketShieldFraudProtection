// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const scanBtn = document.getElementById('scan-btn');
  const reportBtn = document.getElementById('report-btn');
  const currentUrlEl = document.getElementById('current-url');
  const scoreEl = document.getElementById('score');
  const flaggedListEl = document.getElementById('flagged-list');
  const openOptions = document.getElementById('open-options');

  // get current active tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;
    const url = tab.url;
    currentUrlEl.textContent = url;
    // attempt to show last flagged status if stored
    chrome.storage.local.get({ flagged: [] }, (res) => {
      const found = (res.flagged || []).find(f => url.includes(f.url) || f.url === url);
      if (found) {
        scoreEl.textContent = `${found.status.toUpperCase()} (${found.score || 'N/A'})`;
      } else {
        scoreEl.textContent = "No scan";
      }
      renderFlagged(res.flagged || []);
    });
  });

  scanBtn.addEventListener('click', () => {
    // send message to content script to trigger scan
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      chrome.tabs.sendMessage(tab.id, { type: 'ui_trigger_scan' }, (resp) => {
        // content script handles UI; we can also request background scan for tab
        chrome.runtime.sendMessage({ type: 'scan_listing', payload: { listing: { url: tab.url } } }, (result) => {
          if (!result) return;
          scoreEl.textContent = `${(result.verdict || 'caution').toUpperCase()} (${result.score ?? 'N/A'})`;
        });
      });
    });
  });

  reportBtn.addEventListener('click', () => {
    if (!confirm('Report this listing as suspicious?')) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      chrome.runtime.sendMessage({ type: 'report_listing', payload: { listing: { url: tab.url } } }, (result) => {
        if (result && result.status === 'ok') {
          alert('Report submitted.');
          // update local storage
          chrome.storage.local.get({ flagged: [] }, (res) => {
            const flagged = res.flagged || [];
            flagged.push({ url: tab.url, status: 'reported', score: result.report_count || 1, updated: Date.now() });
            chrome.storage.local.set({ flagged }, () => renderFlagged(flagged));
          });
        } else {
          alert('Report failed.');
        }
      });
    });
  });

  openOptions.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  function renderFlagged(list) {
    flaggedListEl.innerHTML = '';
    (list || []).slice().reverse().slice(0, 8).forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${item.url} — ${item.status}${item.score ? ' (' + item.score + ')' : ''}`;
      flaggedListEl.appendChild(li);
    });
  }
});
