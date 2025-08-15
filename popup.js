// Popup script for MarketShield Chrome Extension
// Handles user interface and settings management

class PopupManager {
  constructor() {
    this.settings = {};
    this.stats = {};
    
    this.init();
  }
  
  async init() {
    await this.loadSettings();
    await this.loadStats();
    
    this.setupEventListeners();
    this.updateUI();
    this.startStatsUpdater();
  }
  
  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getUserSettings' }, (response) => {
        if (response && response.success) {
          this.settings = response.data;
        }
        resolve();
      });
    });
  }
  
  async loadStats() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
        if (response && response.success) {
          this.stats = response.data;
        }
        resolve();
      });
    });
  }
  
  setupEventListeners() {
    // Main toggle
    const enableToggle = document.getElementById('enableToggle');
    enableToggle.addEventListener('change', (e) => {
      this.updateSetting('enabled', e.target.checked);
      this.updateStatusIndicator();
    });
    
    // Alert level selector
    const alertLevel = document.getElementById('alertLevel');
    alertLevel.addEventListener('change', (e) => {
      this.updateSetting('alertLevel', e.target.value);
    });
    
    // Action buttons
    document.getElementById('reportCurrentPage').addEventListener('click', () => {
      this.reportCurrentPage();
    });
    
    document.getElementById('viewSettings').addEventListener('click', () => {
      this.openSettingsModal();
    });
    
    // Settings modal
    document.getElementById('closeSettings').addEventListener('click', () => {
      this.closeSettingsModal();
    });
    
    document.getElementById('cancelSettings').addEventListener('click', () => {
      this.closeSettingsModal();
    });
    
    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveAdvancedSettings();
    });
    
    // Footer links
    document.getElementById('helpLink').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://marketshieldfraudprotection.replit.app/help' });
    });
    
    document.getElementById('privacyLink').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://marketshieldfraudprotection.replit.app/privacy' });
    });
    
    document.getElementById('feedbackLink').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://marketshieldfraudprotection.replit.app/feedback' });
    });
    
    // Modal overlay click to close
    document.getElementById('settingsModal').addEventListener('click', (e) => {
      if (e.target.id === 'settingsModal') {
        this.closeSettingsModal();
      }
    });
  }
  
  updateUI() {
    // Update toggle states
    document.getElementById('enableToggle').checked = this.settings.enabled;
    document.getElementById('alertLevel').value = this.settings.alertLevel || 'medium';
    
    // Update status indicator
    this.updateStatusIndicator();
    
    // Update statistics
    this.updateStats();
    
    // Update settings modal
    document.getElementById('autoReportToggle').checked = this.settings.autoReport;
    document.getElementById('apiEndpoint').value = this.settings.apiEndpoint || '';
  }
  
  updateStatusIndicator() {
    const indicator = document.getElementById('statusIndicator');
    const statusDot = indicator.querySelector('.status-dot');
    const statusText = indicator.querySelector('.status-text');
    
    if (this.settings.enabled) {
      statusDot.className = 'status-dot active';
      statusText.textContent = 'Active';
    } else {
      statusDot.className = 'status-dot inactive';
      statusText.textContent = 'Inactive';
    }
  }
  
  updateStats() {
    document.getElementById('totalAnalyses').textContent = this.stats.totalAnalyses || 0;
    document.getElementById('fraudDetected').textContent = this.stats.fraudDetected || 0;
    document.getElementById('reportsSubmitted').textContent = this.stats.reportsSubmitted || 0;
    
    this.updateRecentActivity();
  }
  
  updateRecentActivity() {
    const activityContainer = document.getElementById('recentActivity');
    
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
    document.getElementById('autoReportToggle').checked = this.settings.autoReport;
    document.getElementById('apiEndpoint').value = this.settings.apiEndpoint || '';
    
    // Show modal
    document.getElementById('settingsModal').style.display = 'flex';
  }
  
  closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
  }
  
  async saveAdvancedSettings() {
    const autoReport = document.getElementById('autoReportToggle').checked;
    const apiEndpoint = document.getElementById('apiEndpoint').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    
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
