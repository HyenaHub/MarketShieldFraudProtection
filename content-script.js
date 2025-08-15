// Content script for Facebook Marketplace fraud detection
// Analyzes listings and injects warning overlays

class MarketplaceMonitor {
  constructor() {
    this.isEnabled = true;
    this.processedListings = new Set();
    this.observer = null;
    this.settings = {};
    
    this.init();
  }
  
  async init() {
    console.log('MarketShield: Initializing marketplace monitor');
    
    // Get user settings
    await this.loadSettings();
    
    if (!this.settings.enabled) {
      return;
    }
    
    // Start monitoring the page
    this.startMonitoring();
    
    // Listen for settings updates
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'settingsUpdated') {
        this.loadSettings();
      }
    });
  }
  
  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getUserSettings' }, (response) => {
        if (response.success) {
          this.settings = response.data;
          this.isEnabled = this.settings.enabled;
        }
        resolve();
      });
    });
  }
  
  startMonitoring() {
    // Process existing listings
    this.scanForListings();
    
    // Set up mutation observer for dynamic content
    this.observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if new listings were added
              if (this.isListingElement(node) || 
                  node.querySelector && node.querySelector('[data-testid*="marketplace"]')) {
                shouldScan = true;
              }
            }
          });
        }
      });
      
      if (shouldScan) {
        // Debounce scanning
        clearTimeout(this.scanTimeout);
        this.scanTimeout = setTimeout(() => this.scanForListings(), 500);
      }
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  scanForListings() {
    if (!this.isEnabled) return;
    
    // Find marketplace listing elements
    const listingSelectors = [
      '[data-testid*="marketplace-item"]',
      '[role="main"] [data-pagelet="MarketplaceSearchResults"] a',
      '[data-testid="marketplace-search-result"]',
      '.x1n2onr6[href*="/marketplace/item/"]',
      'a[href*="/marketplace/item/"]'
    ];
    
    listingSelectors.forEach(selector => {
      const listings = document.querySelectorAll(selector);
      listings.forEach(listing => this.processListing(listing));
    });
    
    // Also check individual listing pages
    if (window.location.pathname.includes('/marketplace/item/')) {
      this.processListingPage();
    }
  }
  
  async processListing(listingElement) {
    const listingId = this.extractListingId(listingElement);
    
    if (!listingId || this.processedListings.has(listingId)) {
      return;
    }
    
    this.processedListings.add(listingId);
    
    try {
      const listingData = this.extractListingData(listingElement);
      
      if (!listingData.title && !listingData.price) {
        return; // Not enough data to analyze
      }
      
      // Send to background script for analysis
      chrome.runtime.sendMessage({
        action: 'analyzeListing',
        data: listingData
      }, (response) => {
        if (response && response.success) {
          this.handleAnalysisResult(listingElement, response.data, listingData);
        }
      });
      
    } catch (error) {
      console.error('Failed to process listing:', error);
    }
  }
  
  async processListingPage() {
    const listingId = this.extractListingIdFromUrl();
    
    if (!listingId || this.processedListings.has(listingId)) {
      return;
    }
    
    this.processedListings.add(listingId);
    
    try {
      const listingData = this.extractDetailedListingData();
      
      chrome.runtime.sendMessage({
        action: 'analyzeListing',
        data: listingData
      }, (response) => {
        if (response && response.success) {
          this.handleDetailedAnalysisResult(response.data, listingData);
        }
      });
      
    } catch (error) {
      console.error('Failed to process listing page:', error);
    }
  }
  
  extractListingId(element) {
    // Try to extract listing ID from href
    const link = element.href || element.querySelector('a')?.href;
    if (link) {
      const match = link.match(/\/marketplace\/item\/(\d+)/);
      if (match) return match[1];
    }
    
    // Fallback to element position or data attributes
    return element.dataset.testid || 
           element.id || 
           `pos_${Array.from(element.parentNode.children).indexOf(element)}`;
  }
  
  extractListingIdFromUrl() {
    const match = window.location.pathname.match(/\/marketplace\/item\/(\d+)/);
    return match ? match[1] : null;
  }
  
  extractListingData(element) {
    const data = {
      id: this.extractListingId(element),
      url: element.href || window.location.href,
      timestamp: Date.now()
    };
    
    // Extract title
    const titleSelectors = [
      '[data-testid*="title"]',
      '.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6',
      'span[dir="auto"]',
      'h3',
      'h2'
    ];
    
    for (const selector of titleSelectors) {
      const titleEl = element.querySelector(selector);
      if (titleEl && titleEl.textContent.trim()) {
        data.title = titleEl.textContent.trim();
        break;
      }
    }
    
    // Extract price
    const priceSelectors = [
      '[data-testid*="price"]',
      '.x193iq5w.xeuugli.x13faqbe.x1vvkbs.x1xmvt09.x1lliihq.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x4zkp8e.x676frb.x1nxh6w3.x1sibtaa.xo1l8bm.xi81zsa',
      'span:contains("$")',
      '.x193iq5w'
    ];
    
    for (const selector of priceSelectors) {
      const priceEl = element.querySelector(selector);
      if (priceEl && priceEl.textContent.includes('$')) {
        data.price = priceEl.textContent.trim();
        break;
      }
    }
    
    // Extract seller info if available
    const sellerSelectors = [
      '[data-testid*="seller"]',
      '[role="link"][href*="/profile/"]'
    ];
    
    for (const selector of sellerSelectors) {
      const sellerEl = element.querySelector(selector);
      if (sellerEl) {
        data.seller = {
          name: sellerEl.textContent.trim(),
          profileUrl: sellerEl.href
        };
        break;
      }
    }
    
    // Extract location
    const locationEl = element.querySelector('[data-testid*="location"], .x1i10hfl.xjbqb8w.x6umtig.x1b1mbwd.xaqea5y.xav7gou.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz.x1heor9g.xt0b8zv.xo1l8bm');
    if (locationEl) {
      data.location = locationEl.textContent.trim();
    }
    
    return data;
  }
  
  extractDetailedListingData() {
    const data = {
      id: this.extractListingIdFromUrl(),
      url: window.location.href,
      timestamp: Date.now()
    };
    
    // Extract detailed information from listing page
    const titleEl = document.querySelector('h1[data-testid*="title"], h1 span[dir="auto"]');
    if (titleEl) {
      data.title = titleEl.textContent.trim();
    }
    
    const priceEl = document.querySelector('[data-testid*="price"], .x193iq5w.xeuugli.x13faqbe.x1vvkbs.xaatb59.x1d52u69.x10b6aqq.x1smauel.xykv574');
    if (priceEl) {
      data.price = priceEl.textContent.trim();
    }
    
    const descriptionEl = document.querySelector('[data-testid*="description"], [data-testid="post_message"]');
    if (descriptionEl) {
      data.description = descriptionEl.textContent.trim();
    }
    
    // Extract seller information
    const sellerLink = document.querySelector('a[href*="/profile/"]');
    if (sellerLink) {
      data.seller = {
        name: sellerLink.textContent.trim(),
        profileUrl: sellerLink.href
      };
    }
    
    // Extract images
    const images = Array.from(document.querySelectorAll('img[src*="scontent"]')).map(img => img.src);
    if (images.length > 0) {
      data.images = images;
    }
    
    return data;
  }
  
  handleAnalysisResult(listingElement, analysisResult, listingData) {
    if (!analysisResult || !this.shouldShowWarning(analysisResult)) {
      return;
    }
    
    // Create warning overlay
    this.createWarningOverlay(listingElement, analysisResult, listingData);
  }
  
  handleDetailedAnalysisResult(analysisResult, listingData) {
    if (!analysisResult || !this.shouldShowWarning(analysisResult)) {
      return;
    }
    
    // Create page-level warning
    this.createPageWarning(analysisResult, listingData);
  }
  
  shouldShowWarning(analysisResult) {
    const riskLevel = analysisResult.riskLevel || 'low';
    const fraudProbability = analysisResult.fraudProbability || 0;
    
    switch (this.settings.alertLevel) {
      case 'high':
        return riskLevel === 'high' || fraudProbability > 0.8;
      case 'medium':
        return riskLevel === 'high' || riskLevel === 'medium' || fraudProbability > 0.5;
      case 'low':
        return riskLevel !== 'low' || fraudProbability > 0.3;
      default:
        return riskLevel === 'high' || fraudProbability > 0.7;
    }
  }
  
  createWarningOverlay(listingElement, analysisResult, listingData) {
    // Prevent duplicate overlays
    if (listingElement.querySelector('.marketshield-warning')) {
      return;
    }
    
    const overlay = document.createElement('div');
    overlay.className = `marketshield-warning marketshield-${analysisResult.riskLevel || 'medium'}`;
    
    const riskLevel = analysisResult.riskLevel || 'medium';
    const fraudProbability = Math.round((analysisResult.fraudProbability || 0) * 100);
    
    overlay.innerHTML = `
      <div class="marketshield-warning-content">
        <div class="marketshield-warning-header">
          <span class="marketshield-warning-icon">⚠️</span>
          <span class="marketshield-warning-title">Fraud Risk: ${riskLevel.toUpperCase()}</span>
        </div>
        <div class="marketshield-warning-details">
          Risk Level: ${fraudProbability}%
        </div>
        <div class="marketshield-warning-actions">
          <button class="marketshield-btn marketshield-btn-report" data-listing-id="${listingData.id}">
            Report
          </button>
          <button class="marketshield-btn marketshield-btn-dismiss">
            Dismiss
          </button>
        </div>
      </div>
    `;
    
    // Position overlay
    listingElement.style.position = 'relative';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.right = '0';
    overlay.style.zIndex = '10000';
    
    // Add event listeners
    overlay.querySelector('.marketshield-btn-report').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.reportListing(listingData, analysisResult);
    });
    
    overlay.querySelector('.marketshield-btn-dismiss').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      overlay.remove();
    });
    
    listingElement.appendChild(overlay);
  }
  
  createPageWarning(analysisResult, listingData) {
    // Create page-level warning banner
    const existingWarning = document.querySelector('.marketshield-page-warning');
    if (existingWarning) {
      existingWarning.remove();
    }
    
    const warning = document.createElement('div');
    warning.className = `marketshield-page-warning marketshield-${analysisResult.riskLevel || 'medium'}`;
    
    const riskLevel = analysisResult.riskLevel || 'medium';
    const fraudProbability = Math.round((analysisResult.fraudProbability || 0) * 100);
    
    warning.innerHTML = `
      <div class="marketshield-page-warning-content">
        <div class="marketshield-warning-header">
          <span class="marketshield-warning-icon">⚠️</span>
          <span class="marketshield-warning-title">FRAUD ALERT: This listing may be fraudulent</span>
        </div>
        <div class="marketshield-warning-details">
          <p>Risk Level: <strong>${riskLevel.toUpperCase()}</strong> (${fraudProbability}% fraud probability)</p>
          <p>Reasons: ${(analysisResult.reasons || []).join(', ')}</p>
        </div>
        <div class="marketshield-warning-actions">
          <button class="marketshield-btn marketshield-btn-report" data-listing-id="${listingData.id}">
            Report Fraud
          </button>
          <button class="marketshield-btn marketshield-btn-dismiss">
            Dismiss Warning
          </button>
        </div>
      </div>
    `;
    
    // Add event listeners
    warning.querySelector('.marketshield-btn-report').addEventListener('click', () => {
      this.reportListing(listingData, analysisResult);
    });
    
    warning.querySelector('.marketshield-btn-dismiss').addEventListener('click', () => {
      warning.remove();
    });
    
    // Insert at top of page
    document.body.insertBefore(warning, document.body.firstChild);
  }
  
  reportListing(listingData, analysisResult) {
    const reportData = {
      listingId: listingData.id,
      listingUrl: listingData.url,
      reportType: 'fraud_suspicion',
      analysisResult: analysisResult,
      listingData: listingData,
      userAgent: navigator.userAgent,
      reportedAt: Date.now()
    };
    
    chrome.runtime.sendMessage({
      action: 'reportFraud',
      data: reportData
    }, (response) => {
      if (response && response.success) {
        this.showNotification('Report submitted successfully', 'success');
      } else {
        this.showNotification('Failed to submit report', 'error');
      }
    });
  }
  
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `marketshield-notification marketshield-notification-${type}`;
    notification.textContent = message;
    
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '99999';
    notification.style.padding = '10px 15px';
    notification.style.borderRadius = '5px';
    notification.style.color = 'white';
    notification.style.fontWeight = 'bold';
    
    if (type === 'success') {
      notification.style.backgroundColor = '#4CAF50';
    } else if (type === 'error') {
      notification.style.backgroundColor = '#f44336';
    } else {
      notification.style.backgroundColor = '#2196F3';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
  
  isListingElement(element) {
    if (!element.tagName) return false;
    
    const listingIndicators = [
      'marketplace',
      'item',
      'listing',
      'product'
    ];
    
    const elementText = (element.className + ' ' + (element.dataset.testid || '')).toLowerCase();
    
    return listingIndicators.some(indicator => elementText.includes(indicator)) &&
           (element.querySelector('a[href*="/marketplace/item/"]') || element.href?.includes('/marketplace/item/'));
  }
}

// Initialize the marketplace monitor
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new MarketplaceMonitor();
  });
} else {
  new MarketplaceMonitor();
}
