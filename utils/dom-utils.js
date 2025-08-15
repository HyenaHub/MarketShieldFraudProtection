// DOM utility functions for MarketShield Chrome Extension
// Handles Facebook Marketplace DOM manipulation and data extraction

class DOMUtils {
  constructor() {
    this.observerConfig = {
      childList: true,
      subtree: true,
      attributes: false,
      attributeOldValue: false,
      characterData: false,
      characterDataOldValue: false
    };
    
    this.selectors = this.initializeSelectors();
  }
  
  initializeSelectors() {
    return {
      // Facebook Marketplace selectors (these may change over time)
      marketplace: {
        listingLinks: [
          'a[href*="/marketplace/item/"]',
          '[data-testid*="marketplace"] a[href*="/item/"]',
          '.x1i10hfl[href*="/marketplace/item/"]'
        ],
        
        listingContainers: [
          '[data-testid="marketplace-item"]',
          '[data-testid="marketplace-search-result"]',
          '[role="main"] [data-pagelet="MarketplaceSearchResults"] > div > div',
          '.x1n2onr6[style*="cursor"]'
        ],
        
        titles: [
          '[data-testid*="title"] span',
          'h3 span[dir="auto"]',
          'h2 span[dir="auto"]',
          '.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6',
          'span[style*="font-weight"][dir="auto"]'
        ],
        
        prices: [
          '[data-testid*="price"]',
          'span:contains("$")',
          '.x193iq5w.xeuugli.x13faqbe.x1vvkbs',
          'span[style*="font-weight"]:contains("$")'
        ],
        
        sellers: [
          '[data-testid*="seller"]',
          'a[href*="/profile/"]',
          '[role="link"][href*="/people/"]'
        ],
        
        locations: [
          '[data-testid*="location"]',
          'span:contains("·")',
          '.x1i10hfl.xjbqb8w.x6umtig'
        ],
        
        descriptions: [
          '[data-testid*="description"]',
          '[data-testid="post_message"]',
          '.xdj266r.x11i5rnm.xat24cr.x1mh8g0r'
        ],
        
        images: [
          'img[src*="scontent"]',
          'img[src*="fbcdn"]',
          '[data-testid*="image"] img'
        ]
      }
    };
  }
  
  // Find elements using multiple selectors
  findElement(container, selectorArray) {
    for (const selector of selectorArray) {
      try {
        const element = container.querySelector(selector);
        if (element && element.textContent?.trim()) {
          return element;
        }
      } catch (e) {
        // Continue to next selector if current one fails
        continue;
      }
    }
    return null;
  }
  
  // Find all elements using multiple selectors
  findElements(container, selectorArray) {
    const elements = [];
    for (const selector of selectorArray) {
      try {
        const found = container.querySelectorAll(selector);
        elements.push(...Array.from(found));
      } catch (e) {
        // Continue to next selector if current one fails
        continue;
      }
    }
    return [...new Set(elements)]; // Remove duplicates
  }
  
  // Extract listing ID from various sources
  extractListingId(element) {
    // Try href attribute
    const link = element.href || element.querySelector('a')?.href;
    if (link) {
      const match = link.match(/\/marketplace\/item\/(\d+)/);
      if (match) return match[1];
    }
    
    // Try data attributes
    const testId = element.dataset?.testid;
    if (testId && testId.includes('item')) {
      const match = testId.match(/item[-_](\d+)/);
      if (match) return match[1];
    }
    
    // Try URL
    if (window.location.pathname.includes('/marketplace/item/')) {
      const match = window.location.pathname.match(/\/marketplace\/item\/(\d+)/);
      if (match) return match[1];
    }
    
    // Fallback to element position
    const parent = element.parentNode;
    if (parent) {
      const siblings = Array.from(parent.children);
      return `pos_${siblings.indexOf(element)}_${Date.now()}`;
    }
    
    return `elem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Extract text content safely
  extractText(element, maxLength = 500) {
    if (!element) return '';
    
    const text = element.textContent || element.innerText || '';
    return text.trim().substring(0, maxLength);
  }
  
  // Extract price from text
  extractPrice(text) {
    if (!text) return null;
    
    // Match various price formats
    const pricePatterns = [
      /\$[\d,]+(?:\.\d{2})?/g,
      /[\d,]+(?:\.\d{2})?\s*dollars?/gi,
      /USD\s*[\d,]+(?:\.\d{2})?/gi
    ];
    
    for (const pattern of pricePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        return matches[0];
      }
    }
    
    return null;
  }
  
  // Extract listing data from container element
  extractListingData(container) {
    const data = {
      id: this.extractListingId(container),
      url: window.location.href,
      timestamp: Date.now(),
      extractedAt: new Date().toISOString()
    };
    
    // Extract title
    const titleElement = this.findElement(container, this.selectors.marketplace.titles);
    if (titleElement) {
      data.title = this.extractText(titleElement, 200);
    }
    
    // Extract price
    const priceElement = this.findElement(container, this.selectors.marketplace.prices);
    if (priceElement) {
      const priceText = this.extractText(priceElement, 50);
      data.price = this.extractPrice(priceText) || priceText;
    }
    
    // Extract seller information
    const sellerElement = this.findElement(container, this.selectors.marketplace.sellers);
    if (sellerElement) {
      data.seller = {
        name: this.extractText(sellerElement, 100),
        profileUrl: sellerElement.href || null
      };
    }
    
    // Extract location
    const locationElement = this.findElement(container, this.selectors.marketplace.locations);
    if (locationElement) {
      data.location = this.extractText(locationElement, 100);
    }
    
    // Extract description (for detailed pages)
    const descriptionElement = this.findElement(container, this.selectors.marketplace.descriptions);
    if (descriptionElement) {
      data.description = this.extractText(descriptionElement, 1000);
    }
    
    // Extract images
    const imageElements = this.findElements(container, this.selectors.marketplace.images);
    if (imageElements.length > 0) {
      data.images = imageElements
        .map(img => img.src)
        .filter(src => src && src.includes('http'))
        .slice(0, 5); // Limit to 5 images
    }
    
    // Add metadata
    data.userAgent = navigator.userAgent;
    data.pageUrl = window.location.href;
    data.pageTitle = document.title;
    
    return data;
  }
  
  // Check if element is a listing container
  isListingContainer(element) {
    if (!element || !element.tagName) return false;
    
    // Check for listing link
    const hasListingLink = this.findElement(element, this.selectors.marketplace.listingLinks);
    if (hasListingLink) return true;
    
    // Check for marketplace data attributes
    const testId = element.dataset?.testid || '';
    if (testId.includes('marketplace') || testId.includes('item')) {
      return true;
    }
    
    // Check for price and title combination
    const hasPrice = this.findElement(element, this.selectors.marketplace.prices);
    const hasTitle = this.findElement(element, this.selectors.marketplace.titles);
    
    return hasPrice && hasTitle;
  }
  
  // Find all listing containers on the page
  findListingContainers() {
    const containers = [];
    
    // Use specific selectors first
    for (const selector of this.selectors.marketplace.listingContainers) {
      try {
        const elements = document.querySelectorAll(selector);
        containers.push(...Array.from(elements));
      } catch (e) {
        continue;
      }
    }
    
    // If no containers found, search for links and work backward
    if (containers.length === 0) {
      const links = this.findElements(document, this.selectors.marketplace.listingLinks);
      for (const link of links) {
        let parent = link.parentElement;
        let attempts = 0;
        
        while (parent && attempts < 5) {
          if (this.isListingContainer(parent)) {
            containers.push(parent);
            break;
          }
          parent = parent.parentElement;
          attempts++;
        }
      }
    }
    
    // Remove duplicates and invalid containers
    return [...new Set(containers)].filter(container => 
      container && container.isConnected && this.isListingContainer(container)
    );
  }
  
  // Create and inject warning overlay
  createWarningOverlay(container, analysisResult, listingData) {
    // Remove existing overlay
    const existingOverlay = container.querySelector('.marketshield-warning');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.className = `marketshield-warning marketshield-${analysisResult.riskLevel}`;
    
    const riskLevel = analysisResult.riskLevel || 'medium';
    const fraudProbability = Math.round((analysisResult.fraudProbability || 0) * 100);
    const reasons = analysisResult.reasons || [];
    
    overlay.innerHTML = `
      <div class="marketshield-warning-content">
        <div class="marketshield-warning-header">
          <span class="marketshield-warning-icon">⚠️</span>
          <span class="marketshield-warning-title">Fraud Risk: ${riskLevel.toUpperCase()}</span>
        </div>
        <div class="marketshield-warning-details">
          <div>Risk Level: ${fraudProbability}%</div>
          ${reasons.length > 0 ? `<div class="marketshield-reasons">${reasons.slice(0, 2).join(', ')}</div>` : ''}
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
    
    // Position the overlay
    this.positionOverlay(container, overlay);
    
    return overlay;
  }
  
  // Position overlay relative to container
  positionOverlay(container, overlay) {
    // Make container relative if it isn't already
    const containerStyle = window.getComputedStyle(container);
    if (containerStyle.position === 'static') {
      container.style.position = 'relative';
    }
    
    // Position overlay
    overlay.style.position = 'absolute';
    overlay.style.top = '8px';
    overlay.style.right = '8px';
    overlay.style.zIndex = '10000';
    overlay.style.maxWidth = '250px';
    
    // Adjust for small containers
    const containerRect = container.getBoundingClientRect();
    if (containerRect.width < 300) {
      overlay.style.right = '4px';
      overlay.style.top = '4px';
      overlay.style.maxWidth = '200px';
    }
    
    container.appendChild(overlay);
  }
  
  // Create risk indicator dot
  createRiskIndicator(container, riskLevel) {
    const existingIndicator = container.querySelector('.marketshield-risk-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    const indicator = document.createElement('div');
    indicator.className = `marketshield-risk-indicator risk-${riskLevel}`;
    indicator.title = `Fraud Risk: ${riskLevel.toUpperCase()}`;
    
    // Position indicator
    const containerStyle = window.getComputedStyle(container);
    if (containerStyle.position === 'static') {
      container.style.position = 'relative';
    }
    
    indicator.style.position = 'absolute';
    indicator.style.top = '8px';
    indicator.style.left = '8px';
    indicator.style.zIndex = '1001';
    
    container.appendChild(indicator);
    return indicator;
  }
  
  // Observe DOM changes
  observeChanges(callback) {
    const observer = new MutationObserver((mutations) => {
      let hasRelevantChanges = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if it's a listing or contains listings
              if (this.isListingContainer(node) || 
                  this.findElements(node, this.selectors.marketplace.listingLinks).length > 0) {
                hasRelevantChanges = true;
              }
            }
          });
        }
      });
      
      if (hasRelevantChanges) {
        callback();
      }
    });
    
    observer.observe(document.body, this.observerConfig);
    return observer;
  }
  
  // Utility to wait for element
  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, this.observerConfig);
      
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }
  
  // Clean up overlays and indicators
  cleanup() {
    const overlays = document.querySelectorAll('.marketshield-warning, .marketshield-risk-indicator, .marketshield-page-warning');
    overlays.forEach(overlay => overlay.remove());
  }
}

// Create global instance
window.DOMUtils = new DOMUtils();
