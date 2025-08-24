// API utility functions for MarketShield Chrome Extension
// Handles communication with the MarketShieldFraudProtection Replit app

(() => {
  if (window.MarketShieldAPI) {
    // Already defined, don’t redeclare
    return;
  }

  class MarketShieldAPI {
    constructor() {
      this.baseURL = 'https://marketshieldfraudprotection.replit.app';
      this.apiKey = null;
      this.rateLimitDelay = 1000; // 1 second between requests
      this.lastRequestTime = 0;
      this.requestQueue = [];
      this.isProcessingQueue = false;
      
      this.loadSettings();
    }

    async loadSettings() {
      chrome.storage.local.get(['apiEndpoint', 'apiKey'], (result) => {
        this.baseURL = result.apiEndpoint || this.baseURL;
        this.apiKey = result.apiKey || 'default_api_key';
      });
    }

    // ... keep the rest of your methods unchanged ...
  }

  // Expose only one instance globally
  window.MarketShieldAPI = new MarketShieldAPI();
})();
