// Popup script for MarketShield Chrome Extension
// Handles user interface and settings management

class PopupManager {
  constructor() {
    this.settings = {};
    this.stats = {};
    
    this.init();
  }
  
  async init() {
    try {
      console.log('MarketShield popup initializing...');
      await this.loadSettings();
      await this.loadStats();
      
      this.setupEventListeners();
      this.updateUI();
      this.startStatsUpdater();
      console.log('MarketShield popup initialized successfully');
    } catch (error) {
      console.error('MarketShield popup initialization failed:', error);
    }
  }
  
  async loadSettings() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: 'getUserSettings' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome runtime error:', chrome.runtime.lastError.message);
            // Use default settings
            this.settings = {
              enabled: true,
              alertLevel: 'medium',
              autoReport: false,
              apiEndpoint: 'https://marketshieldfraudprotection.replit.app'
            };
          } else if (response && response.success) {
            this.settings = response.data;
          } else {
            console.warn('Failed to load settings, using defaults');
            this.settings = {
              enabled: true,
              alertLevel: 'medium',
              autoReport: false,
              apiEndpoint: 'https://marketshieldfraudprotection.replit.app'
            };
          }
          resolve();
        });
      } catch (error) {
        console.error('Error loading settings:', error);
        this.settings = {
          enabled: true,
          alertLevel: 'medium',
          autoReport: false,
          apiEndpoint: 'https://marketshieldfraudprotection.replit.app'
        };
        resolve();
      }
    });
  }
  
  async loadStats() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome runtime error loading stats:', chrome.runtime.lastError.message);
            this.stats = {
              totalAnalyses: 0,
              fraudDetected: 0,
              reportsSubmitted: 0,
              lastAnalysis: null
            };
          } else if (response && response.success) {
            this.stats = response.data;
          } else {
            console.warn('Failed to load stats, using defaults');
            this.stats = {
              totalAnalyses: 0,
              fraudDetected: 0,
              reportsSubmitted: 0,
              lastAnalysis: null
            };
          }
          resolve();
        });
      } catch (error) {
        console.error('Error loading stats:', error);
        this.stats = {
          totalAnalyses: 0,
          fraudDetected: 0,
          reportsSubmitted: 0,
          lastAnalysis: null
        };
        resolve();
      }
    });
  }
  
  setupEventListeners() {
    // Main toggle
    const enableToggle = document.getElementById('enableToggle');
    if (enableToggle) {
      enableToggle.addEventListener('change', (e) => {
        this.updateSetting('enabled', e.target.checked);
        this.updateStatusIndicator();
      });
    }
    
    // Alert level selector
    const alertLevel = document.getElementById('alertLevel');
    if (alertLevel) {
      alertLevel.addEventListener('change', (e) => {
        this.updateSetting('alertLevel', e.target.value);
      });
    }
    
    // Action buttons
    const reportCurrentPage = document.getElementById('reportCurrentPage');
    if (reportCurrentPage) {
      reportCurrentPage.addEventListener('click', () => {
        this.reportCurrentPage();
      });
    }
    
    const viewSettings = document.getElementById('viewSettings');
    if (viewSettings) {
      viewSettings.addEventListener('click', () => {
        this.openSettingsModal();
      });
    }
    
    // Settings modal
    const closeSettings = document.getElementById('closeSettings');
    if (closeSettings) {
      closeSettings.addEventListener('click', () => {
        this.closeSettingsModal();
      });
    }
    
    const cancelSettings = document.getElementById('cancelSettings');
    if (cancelSettings) {
      cancelSettings.addEventListener('click', () => {
        this.closeSettingsModal();
      });
    }
    
    const saveSettings = document.getElementById('saveSettings');
    if (saveSettings) {
      saveSettings.addEventListener('click', () => {
        this.saveAdvancedSettings();
      });
    }
    
    // Footer links
    const helpLink = document.getElementById('helpLink');
    if (helpLink) {
      helpLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'https://marketshieldfraudprotection.replit.app/help' });
      });
    }
    
    const privacyLink = document.getElementById('privacyLink');
    if (privacyLink) {
      privacyLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'https://marketshieldfraudprotection.replit.app/privacy' });
      });
    }
    
    const feedbackLink = document.getElementById('feedbackLink');
    if (feedbackLink) {
      feedbackLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'https://marketshieldfraudprotection.replit.app/feedback' });
      });
    }
    
    // Modal overlay click to close
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      settingsModal.addEventListener('click', (e) => {
        if (e.target.id === 'settingsModal') {
          this.closeSettingsModal();
        }
      });
    }
  }
  
  updateUI() {
    // Update toggle states
    const enableToggle = document.getElementById('enableToggle');
    if (enableToggle) {
      enableToggle.checked = this.settings.enabled;
    }
    
    const alertLevel = document.getElementById('alertLevel');
    if (alertLevel) {
      alertLevel.value = this.settings.alertLevel || 'medium';
    }
    
    // Update status indicator
    this.updateStatusIndicator();
    
    // Update statistics
    this.updateStats();
    
    // Update settings modal
    const autoReportToggle = document.getElementById('autoReportToggle');
    if (autoReportToggle) {
      autoReportToggle.checked = this.settings.autoReport;
    }
    
    const apiEndpoint = document.getElementById('apiEndpoint');
    if (apiEndpoint) {
      apiEndpoint.value = this.settings.apiEndpoint || '';
    }
  }
  
  updateStatusIndicator() {
    const indicator = document.getElementById('statusIndicator');
    if (!indicator) return;
    
    const statusDot = indicator.querySelector('.status-dot');
    const statusText = indicator.querySelector('.status-text');
    
    if (statusDot && statusText) {
      if (this.settings.enabled) {
        statusDot.className = 'status-dot active';
        statusText.textContent = 'Active';
      } else {
        statusDot.className = 'status-dot inactive';
        statusText.textContent = 'Inactive';
      }
    }
  }
  
  updateStats() {
    const totalAnalyses = document.getElementById('totalAnalyses');
    if (totalAnalyses) {
      totalAnalyses.textContent = this.stats.totalAnalyses || 0;
    }
    
    const fraudDetected = document.getElementById('fraudDetected');
    if (fraudDetected) {
      fraudDetected.textContent = this.stats.fraudDetected || 0;
    }
    
    const reportsSubmitted = document.getElementById('reportsSubmitted');
    if (reportsSubmitted) {
      reportsSubmitted.textContent = this.stats.reportsSubmitted || 0;
    }
    
    this.updateRecentActivity();
  }
  
  updateRecentActivity() {
    const activityContainer = document.getElementById('recentActivity');
    if (!activityContainer) return;
    
    if (this.stats.lastAnalysis) {
      const lastAnalysisTime = new Date(this.stats.lastAnalysis);
      const timeAgo = this.getTimeAgo(lastAnalysisTime);
      
      activityContainer.innerHTML = `
        <div class="activity-item">
          <div class="activity-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4"></path>
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
          </div>
          <div class="activity-text">Last analysis: ${timeAgo}</div>
        </div>
      `;
    } else {
      activityContainer.innerHTML = `
        <div class="activity-item">
          <div class="activity-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12,6 12,12 16,14"></polyline>
            </svg>
          </div>
          <div class="activity-text">Waiting for activity...</div>
        </div>
      `;
    }
  }
  
  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }
  
  async updateSetting(key, value) {
    this.settings[key] = value;
    
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      data: { [key]: value }
    }, (response) => {
      if (response && response.success) {
        // Notify content scripts of settings update
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'settingsUpdated' });
          }
        });
      }
    });
  }
  
  async reportCurrentPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      
      if (!currentTab.url.includes('facebook.com/marketplace')) {
        this.showNotification('Please navigate to Facebook Marketplace to report listings', 'warning');
        return;
      }
      
      // Get current page data
      chrome.tabs.sendMessage(currentTab.id, { action: 'getCurrentPageData' }, (response) => {
        if (response && response.success) {
          const reportData = {
            url: currentTab.url,
            title: currentTab.title,
            reportType: 'manual_report',
            reportedFrom: 'extension_popup',
            timestamp: Date.now()
          };
          
          chrome.runtime.sendMessage({
            action: 'reportFraud',
            data: reportData
          }, (reportResponse) => {
            if (reportResponse && reportResponse.success) {
              this.showNotification('Report submitted successfully', 'success');
              this.loadStats(); // Refresh stats
            } else {
              this.showNotification('Failed to submit report', 'error');
            }
          });
        } else {
          this.showNotification('Unable to analyze current page', 'error');
        }
      });
    });
  }
  
  openSettingsModal() {
    // Load current settings into modal
    const autoReportToggle = document.getElementById('autoReportToggle');
    if (autoReportToggle) {
      autoReportToggle.checked = this.settings.autoReport;
    }
    
    const apiEndpoint = document.getElementById('apiEndpoint');
    if (apiEndpoint) {
      apiEndpoint.value = this.settings.apiEndpoint || '';
    }
    
    // Show modal
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      settingsModal.style.display = 'flex';
    }
  }
  
  closeSettingsModal() {
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      settingsModal.style.display = 'none';
    }
  }
  
  async saveAdvancedSettings() {
    const autoReportToggle = document.getElementById('autoReportToggle');
    const apiEndpointEl = document.getElementById('apiEndpoint');
    const apiKeyEl = document.getElementById('apiKey');
    
    const autoReport = autoReportToggle ? autoReportToggle.checked : false;
    const apiEndpoint = apiEndpointEl ? apiEndpointEl.value.trim() : '';
    const apiKey = apiKeyEl ? apiKeyEl.value.trim() : '';
    
    const newSettings = {
      autoReport: autoReport,
      apiEndpoint: apiEndpoint || 'https://marketshieldfraudprotection.replit.app',
      ...(apiKey && { apiKey: apiKey })
    };
    
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      data: newSettings
    }, (response) => {
      if (response && response.success) {
        this.settings = { ...this.settings, ...newSettings };
        this.showNotification('Settings saved successfully', 'success');
        this.closeSettingsModal();
      } else {
        this.showNotification('Failed to save settings', 'error');
      }
    });
  }
  
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `popup-notification popup-notification-${type}`;
    notification.textContent = message;
    
    // Insert into popup
    const container = document.querySelector('.popup-container');
    container.insertBefore(notification, container.firstChild);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }
  
  startStatsUpdater() {
    // Update stats every 30 seconds
    setInterval(() => {
      this.loadStats().then(() => {
        this.updateStats();
      });
    }, 30000);
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
