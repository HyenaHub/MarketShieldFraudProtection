// Background service worker for MarketShield Chrome Extension
// Handles API communication and cross-tab messaging

const API_BASE_URL = 'https://marketshieldfraudprotection.replit.app';

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('MarketShield extension installed');
  
  // Set default settings
  chrome.storage.local.set({
    enabled: true,
    alertLevel: 'medium',
    autoReport: false,
    apiEndpoint: API_BASE_URL
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'analyzeListing':
      analyzeListing(request.data)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
      
    case 'reportFraud':
      reportFraud(request.data)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'getUserSettings':
      getUserSettings()
        .then(settings => sendResponse({ success: true, data: settings }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'updateSettings':
      updateSettings(request.data)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'getStats':
      getExtensionStats()
        .then(stats => sendResponse({ success: true, data: stats }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});

// Analyze listing data through MarketShield API
async function analyzeListing(listingData) {
  try {
    const settings = await getUserSettings();
    
    const response = await fetch(`${settings.apiEndpoint}/api/analyze-listing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getApiKey()}`
      },
      body: JSON.stringify({
        listing: listingData,
        timestamp: Date.now(),
        source: 'chrome_extension'
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Store analysis result for statistics
    await updateAnalysisStats(result);
    
    return result;
  } catch (error) {
    console.error('Failed to analyze listing:', error);
    throw error;
  }
}

// Report fraudulent content
async function reportFraud(reportData) {
  try {
    const settings = await getUserSettings();
    
    const response = await fetch(`${settings.apiEndpoint}/api/report-fraud`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getApiKey()}`
      },
      body: JSON.stringify({
        ...reportData,
        timestamp: Date.now(),
        source: 'chrome_extension'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to submit report: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Update report statistics
    await updateReportStats();
    
    return result;
  } catch (error) {
    console.error('Failed to report fraud:', error);
    throw error;
  }
}

// Get user settings from storage
async function getUserSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      'enabled',
      'alertLevel',
      'autoReport',
      'apiEndpoint'
    ], (result) => {
      resolve({
        enabled: result.enabled ?? true,
        alertLevel: result.alertLevel ?? 'medium',
        autoReport: result.autoReport ?? false,
        apiEndpoint: result.apiEndpoint ?? API_BASE_URL
      });
    });
  });
}

// Update user settings
async function updateSettings(newSettings) {
  return new Promise((resolve) => {
    chrome.storage.local.set(newSettings, () => {
      resolve();
    });
  });
}

// Get API key from environment or storage
async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiKey'], (result) => {
      // Fallback to a default key if none is set
      resolve(result.apiKey || 'default_api_key');
    });
  });
}

// Get extension statistics
async function getExtensionStats() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      'totalAnalyses',
      'fraudDetected',
      'reportsSubmitted',
      'lastAnalysis'
    ], (result) => {
      resolve({
        totalAnalyses: result.totalAnalyses || 0,
        fraudDetected: result.fraudDetected || 0,
        reportsSubmitted: result.reportsSubmitted || 0,
        lastAnalysis: result.lastAnalysis || null
      });
    });
  });
}

// Update analysis statistics
async function updateAnalysisStats(analysisResult) {
  const stats = await getExtensionStats();
  const newStats = {
    totalAnalyses: stats.totalAnalyses + 1,
    lastAnalysis: Date.now()
  };
  
  if (analysisResult.riskLevel === 'high' || analysisResult.fraudProbability > 0.7) {
    newStats.fraudDetected = stats.fraudDetected + 1;
  }
  
  chrome.storage.local.set(newStats);
}

// Update report statistics
async function updateReportStats() {
  const stats = await getExtensionStats();
  chrome.storage.local.set({
    reportsSubmitted: stats.reportsSubmitted + 1
  });
}

// Handle tab updates to refresh content scripts
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.includes('facebook.com/marketplace')) {
    
    // Inject content script if not already present
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['utils/api.js', 'utils/dom-utils.js', 'content-script.js']
    }).catch(error => {
      // Auto-analyze marketplace listings when user visits
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.includes('facebook.com/marketplace')) {
    
    // Inject content script to scrape listing data
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['utils/api.js', 'utils/dom-utils.js', 'content-script.js']
    }).catch(error => {
      console.log('Content script already injected or failed:', error.message);
    });

    // Trigger background analysis (dummy example, replace with real data from content script)
    chrome.runtime.sendMessage({
      action: 'analyzeListing',
      data: { url: tab.url }
    });
  }
});

      console.log('Content script already injected or failed:', error.message);
    });
  }
});
