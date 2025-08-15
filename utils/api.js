// API utility functions for MarketShield Chrome Extension
// Handles communication with the MarketShieldFraudProtection Replit app

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
  
  // Rate-limited request wrapper
  async makeRequest(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ endpoint, options, resolve, reject });
      this.processQueue();
    });
  }
  
  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.rateLimitDelay) {
        await this.sleep(this.rateLimitDelay - timeSinceLastRequest);
      }
      
      const { endpoint, options, resolve, reject } = this.requestQueue.shift();
      
      try {
        const result = await this._performRequest(endpoint, options);
        resolve(result);
      } catch (error) {
        reject(error);
      }
      
      this.lastRequestTime = Date.now();
    }
    
    this.isProcessingQueue = false;
  }
  
  async _performRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'User-Agent': 'MarketShield-Extension/1.0.0'
      }
    };
    
    const requestOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {})
      }
    };
    
    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      if (error.name === 'NetworkError' || error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to MarketShield API');
      }
      throw error;
    }
  }
  
  // Analyze listing for fraud indicators
  async analyzeListing(listingData) {
    try {
      const result = await this.makeRequest('/api/analyze-listing', {
        method: 'POST',
        body: JSON.stringify({
          listing: listingData,
          timestamp: Date.now(),
          source: 'chrome_extension',
          version: '1.0.0'
        })
      });
      
      return this.validateAnalysisResult(result);
    } catch (error) {
      console.error('Failed to analyze listing:', error);
      
      // Return fallback analysis based on basic heuristics
      return this.performBasicAnalysis(listingData);
    }
  }
  
  // Submit fraud report
  async reportFraud(reportData) {
    try {
      const result = await this.makeRequest('/api/report-fraud', {
        method: 'POST',
        body: JSON.stringify({
          ...reportData,
          timestamp: Date.now(),
          source: 'chrome_extension',
          userAgent: navigator.userAgent
        })
      });
      
      return result;
    } catch (error) {
      console.error('Failed to submit fraud report:', error);
      throw error;
    }
  }
  
  // Get fraud detection rules and patterns
  async getFraudRules() {
    try {
      const result = await this.makeRequest('/api/fraud-rules');
      return result;
    } catch (error) {
      console.error('Failed to fetch fraud rules:', error);
      
      // Return basic fraud rules as fallback
      return this.getBasicFraudRules();
    }
  }
  
  // Submit user feedback
  async submitFeedback(feedbackData) {
    try {
      const result = await this.makeRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          ...feedbackData,
          timestamp: Date.now(),
          source: 'chrome_extension'
        })
      });
      
      return result;
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw error;
    }
  }
  
  // Get extension statistics and metrics
  async getExtensionMetrics() {
    try {
      const result = await this.makeRequest('/api/extension-metrics');
      return result;
    } catch (error) {
      console.error('Failed to fetch extension metrics:', error);
      return null;
    }
  }
  
  // Validate analysis result structure
  validateAnalysisResult(result) {
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid analysis result format');
    }
    
    const validated = {
      riskLevel: result.riskLevel || 'low',
      fraudProbability: Math.max(0, Math.min(1, result.fraudProbability || 0)),
      reasons: Array.isArray(result.reasons) ? result.reasons : [],
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      recommendation: result.recommendation || 'proceed_with_caution',
      analysisId: result.analysisId || this.generateId(),
      timestamp: result.timestamp || Date.now()
    };
    
    // Ensure risk level is valid
    if (!['low', 'medium', 'high'].includes(validated.riskLevel)) {
      validated.riskLevel = 'medium';
    }
    
    return validated;
  }
  
  // Perform basic client-side analysis as fallback
  performBasicAnalysis(listingData) {
    const suspiciousPatterns = this.getBasicFraudRules();
    let riskScore = 0;
    const reasons = [];
    
    // Check title for suspicious patterns
    if (listingData.title) {
      const title = listingData.title.toLowerCase();
      
      if (suspiciousPatterns.suspiciousWords.some(word => title.includes(word))) {
        riskScore += 0.3;
        reasons.push('Title contains suspicious keywords');
      }
      
      if (title.length < 10) {
        riskScore += 0.2;
        reasons.push('Very short title');
      }
      
      if (/urgent|limited time|act fast|won't last|must go/i.test(title)) {
        riskScore += 0.25;
        reasons.push('Pressure tactics in title');
      }
    }
    
    // Check price patterns
    if (listingData.price) {
      const priceMatch = listingData.price.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1].replace(/,/g, ''));
        
        // Suspiciously low prices
        if (price < 100 && listingData.title && 
            /car|vehicle|iphone|laptop|macbook|tv|xbox|playstation/i.test(listingData.title)) {
          riskScore += 0.4;
          reasons.push('Price too low for item type');
        }
        
        // Round numbers often indicate scams
        if (price % 100 === 0 && price >= 1000) {
          riskScore += 0.1;
          reasons.push('Suspiciously round price');
        }
      }
    }
    
    // Check description patterns
    if (listingData.description) {
      const desc = listingData.description.toLowerCase();
      
      if (suspiciousPatterns.suspiciousPhrases.some(phrase => desc.includes(phrase))) {
        riskScore += 0.3;
        reasons.push('Description contains suspicious phrases');
      }
      
      if (desc.length < 20) {
        riskScore += 0.15;
        reasons.push('Very brief description');
      }
    }
    
    // Determine risk level
    let riskLevel = 'low';
    if (riskScore >= 0.7) {
      riskLevel = 'high';
    } else if (riskScore >= 0.4) {
      riskLevel = 'medium';
    }
    
    return {
      riskLevel,
      fraudProbability: Math.min(1, riskScore),
      reasons,
      confidence: 0.6, // Lower confidence for basic analysis
      recommendation: riskLevel === 'high' ? 'avoid' : 'proceed_with_caution',
      analysisId: this.generateId(),
      timestamp: Date.now(),
      source: 'basic_analysis'
    };
  }
  
  // Get basic fraud detection rules
  getBasicFraudRules() {
    return {
      suspiciousWords: [
        'urgent', 'limited', 'exclusive', 'guaranteed', 'risk-free',
        'no questions asked', 'cash only', 'wire transfer', 'western union',
        'nigerian', 'inheritance', 'lottery', 'winner', 'congratulations'
      ],
      suspiciousPhrases: [
        'act now', 'limited time offer', 'this won\'t last',
        'must sell today', 'leaving country', 'moving abroad',
        'cash in hand', 'no checks', 'wire money', 'send payment',
        'advance payment', 'deposit required', 'shipping agent'
      ],
      priceThresholds: {
        tooLowForCars: 1000,
        tooLowForElectronics: 50,
        suspiciouslyRound: 100
      }
    };
  }
  
  // Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Health check
  async checkAPIHealth() {
    try {
      const result = await this.makeRequest('/api/health');
      return { status: 'healthy', ...result };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

// Create global instance
window.MarketShieldAPI = new MarketShieldAPI();
