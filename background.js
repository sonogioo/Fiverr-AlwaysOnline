// ============================================================================
// Fiverr Keep-Alive ULTRA-PRO - Background Service Worker
// Version: 8.0.0
// ULTRA-ADVANCED: Alarms API, Multi-Tab, Auto-Recovery, Cookie Monitoring
// ============================================================================

class FiverrKeepAliveUltraPro {
  constructor() {
    this.config = {
      enabled: false,
      mode: 'balanced',
      multiTab: true, // NEW: Multi-tab redundancy
      tabCount: 2, // NEW: Number of tabs to maintain
      notifications: true,
      autoRestart: true,
      smartRotation: true,
      cookieMonitoring: true, // NEW: Monitor session cookies
      networkKeepAlive: true // NEW: Network ping requests
    };

    this.state = {
      tabIds: [], // NEW: Multiple tabs instead of single
      currentPageIndex: 0,
      lastActivity: null,
      activitiesCount: 0,
      errors: 0,
      uptime: 0,
      startTime: null,
      tabCrashes: 0,
      lastStateSync: null, // NEW: Last persistent state save
      serviceWorkerRestarts: 0 // NEW: Track service worker resurrections
    };

    this.alarmNames = {
      activity: 'keepalive-activity',
      rotation: 'keepalive-rotation',
      heartbeat: 'keepalive-heartbeat',
      stateSync: 'keepalive-state-sync', // NEW: Periodic state save
      cookieCheck: 'keepalive-cookie-check', // NEW: Cookie monitoring
      networkPing: 'keepalive-network-ping' // NEW: Network requests
    };

    this.pages = [
      'https://www.fiverr.com/',
      'https://www.fiverr.com/inbox',
      'https://www.fiverr.com/dashboard',
      'https://www.fiverr.com/sellers',
      'https://www.fiverr.com/notifications' // NEW: More pages
    ];

    this.modeSettings = {
      stealth: {
        activityInterval: 1.5, // 1.5 minutes in Alarms API
        rotationInterval: 8,
        description: 'Modalità stealth - Ultra discreto'
      },
      balanced: {
        activityInterval: 0.5, // 30 seconds
        rotationInterval: 5,
        description: 'Modalità bilanciata - Ottimale'
      },
      aggressive: {
        activityInterval: 0.25, // 15 seconds
        rotationInterval: 3,
        description: 'Modalità aggressiva - Massima presenza'
      }
    };

    this.init();
  }

  // ========== INITIALIZATION ==========

  async init() {
    this.log('🚀 Initializing Fiverr Keep-Alive ULTRA-PRO v8.0...', 'system');

    // Setup alarm listeners FIRST (critical for resurrection)
    this.setupAlarmListeners();

    await this.loadPersistedState();
    await this.setupListeners();

    // Auto-resume if was running before
    if (this.config.enabled) {
      this.log('♻️ Auto-resuming from previous session...', 'system');
      await this.start();
    }

    this.updateBadge();
    this.log('✅ Ultra-Pro initialized successfully', 'success');
  }

  // ========== PERSISTENT STATE (NEW) ==========

  async loadPersistedState() {
    try {
      const data = await chrome.storage.local.get(['keepAliveConfig', 'keepAliveState']);

      if (data.keepAliveConfig) {
        this.config = { ...this.config, ...data.keepAliveConfig };
        this.log('📥 Config loaded from storage', 'info');
      }

      if (data.keepAliveState) {
        // Restore critical state (but not tab IDs, those are recreated)
        this.state = {
          ...this.state,
          ...data.keepAliveState,
          tabIds: [] // Always reset tabs on restart
        };
        this.log('📥 State restored from storage', 'info');
      }
    } catch (error) {
      this.log('Error loading persisted state: ' + error.message, 'error');
    }
  }

  async persistState() {
    try {
      await chrome.storage.local.set({
        keepAliveConfig: this.config,
        keepAliveState: {
          ...this.state,
          lastStateSync: Date.now()
        }
      });
      this.state.lastStateSync = Date.now();
    } catch (error) {
      this.log('Error persisting state: ' + error.message, 'error');
    }
  }

  // ========== ALARMS API (NEW) - ULTRA RELIABLE ==========

  setupAlarmListeners() {
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });

    this.log('⏰ Alarm listeners registered', 'info');
  }

  async handleAlarm(alarm) {
    if (!this.config.enabled) return;

    this.log(`⏰ Alarm triggered: ${alarm.name}`, 'debug');

    switch (alarm.name) {
      case this.alarmNames.activity:
        await this.performActivity();
        break;

      case this.alarmNames.rotation:
        await this.rotateAllTabs();
        break;

      case this.alarmNames.heartbeat:
        await this.performHeartbeat();
        break;

      case this.alarmNames.stateSync:
        await this.persistState();
        break;

      case this.alarmNames.cookieCheck:
        await this.checkAndRefreshCookies();
        break;

      case this.alarmNames.networkPing:
        await this.performNetworkKeepAlive();
        break;
    }
  }

  createAlarms() {
    const settings = this.modeSettings[this.config.mode];

    // Activity alarm
    chrome.alarms.create(this.alarmNames.activity, {
      periodInMinutes: settings.activityInterval
    });

    // Rotation alarm
    chrome.alarms.create(this.alarmNames.rotation, {
      periodInMinutes: settings.rotationInterval
    });

    // Heartbeat (every 30 seconds)
    chrome.alarms.create(this.alarmNames.heartbeat, {
      periodInMinutes: 0.5
    });

    // State sync (every 5 seconds for instant recovery)
    chrome.alarms.create(this.alarmNames.stateSync, {
      periodInMinutes: 0.083 // ~5 seconds
    });

    // Cookie check (every 10 minutes)
    if (this.config.cookieMonitoring) {
      chrome.alarms.create(this.alarmNames.cookieCheck, {
        periodInMinutes: 10
      });
    }

    // Network ping (every 2 minutes)
    if (this.config.networkKeepAlive) {
      chrome.alarms.create(this.alarmNames.networkPing, {
        periodInMinutes: 2
      });
    }

    this.log('⏰ All alarms created', 'success');
  }

  clearAllAlarms() {
    chrome.alarms.clearAll();
    this.log('⏰ All alarms cleared', 'info');
  }

  // ========== MULTI-TAB STRATEGY (NEW) ==========

  async createMultipleTabs() {
    const count = this.config.multiTab ? this.config.tabCount : 1;

    this.log(`🔄 Creating ${count} tab(s) for redundancy...`, 'info');

    for (let i = 0; i < count; i++) {
      try {
        const pageIndex = i % this.pages.length;
        const tab = await chrome.tabs.create({
          url: this.pages[pageIndex],
          active: false,
          pinned: false
        });

        this.state.tabIds.push(tab.id);
        this.log(`✅ Tab ${i + 1} created: ${tab.id}`, 'success');

        // Wait a bit between tab creations
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        this.log(`Error creating tab ${i + 1}: ${error.message}`, 'error');
        this.state.errors++;
      }
    }

    // Wait for all tabs to load
    await new Promise(r => setTimeout(r, 3000));
  }

  async closeAllTabs() {
    if (this.state.tabIds.length === 0) return;

    this.log(`🗑️ Closing ${this.state.tabIds.length} tab(s)...`, 'info');

    for (const tabId of this.state.tabIds) {
      try {
        await chrome.tabs.remove(tabId);
      } catch (error) {
        // Tab already closed
      }
    }

    this.state.tabIds = [];
  }

  // ========== LISTENERS ==========

  setupListeners() {
    // Message listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });

    // Tab removed listener - handle tab crashes
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.handleTabRemoved(tabId);
    });

    // Service worker activation (resurrection tracking)
    chrome.runtime.onStartup.addListener(() => {
      this.state.serviceWorkerRestarts++;
      this.log('🔄 Service worker restarted', 'info');
    });
  }

  async handleMessage(request, sender, sendResponse) {
    const { action } = request;

    try {
      switch (action) {
        case 'start':
          await this.start();
          sendResponse({ success: true, state: this.getState() });
          break;

        case 'stop':
          await this.stop();
          sendResponse({ success: true, state: this.getState() });
          break;

        case 'getState':
          sendResponse({ success: true, state: this.getState() });
          break;

        case 'updateConfig':
          await this.updateConfig(request.config);
          sendResponse({ success: true, config: this.config });
          break;

        case 'resetStats':
          this.resetStats();
          sendResponse({ success: true });
          break;

        case 'forceActivity':
          await this.performActivity(true);
          sendResponse({ success: true });
          break;

        case 'forceRotation':
          await this.rotateAllTabs();
          sendResponse({ success: true });
          break;

        case 'activityComplete':
          this.state.activitiesCount++;
          this.state.lastActivity = Date.now();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      this.log('Error handling message: ' + error.message, 'error');
      sendResponse({ success: false, error: error.message });
    }
  }

  // ========== CORE FUNCTIONALITY ==========

  async start() {
    if (this.config.enabled) {
      this.log('Already running', 'warn');
      return;
    }

    this.log('🚀 Starting Keep-Alive ULTRA-PRO...', 'system');

    this.config.enabled = true;
    this.state.startTime = Date.now();
    this.state.errors = 0;
    this.state.tabCrashes = 0;

    await this.persistState();

    // Create multiple tabs for redundancy
    await this.createMultipleTabs();

    // Create all alarms (much more reliable than setInterval)
    this.createAlarms();

    this.updateBadge();
    this.log('✅ Keep-Alive ULTRA-PRO started successfully', 'success');
  }

  async stop() {
    if (!this.config.enabled) {
      this.log('Already stopped', 'warn');
      return;
    }

    this.log('🛑 Stopping Keep-Alive ULTRA-PRO...', 'system');

    this.config.enabled = false;

    // Clear all alarms
    this.clearAllAlarms();

    // Close all tabs
    await this.closeAllTabs();

    await this.persistState();
    this.updateBadge();
    this.log('✅ Keep-Alive ULTRA-PRO stopped', 'success');
  }

  // ========== ACTIVITY SIMULATION ==========

  async performActivity(forced = false) {
    if (!forced && !this.config.enabled) return;

    if (this.state.tabIds.length === 0) {
      this.log('No tabs available, creating...', 'warn');
      await this.createMultipleTabs();
      return;
    }

    this.log('🔄 Performing activity on all tabs...', 'activity');

    let successCount = 0;
    let errorCount = 0;

    // Send activity to ALL tabs
    for (const tabId of this.state.tabIds) {
      try {
        const tab = await chrome.tabs.get(tabId);

        if (!tab) {
          throw new Error('Tab not found');
        }

        await chrome.tabs.sendMessage(tabId, {
          action: 'performActivity',
          mode: this.config.mode,
          timestamp: Date.now(),
          forced: forced
        });

        successCount++;
      } catch (error) {
        errorCount++;
        this.log(`Activity error on tab ${tabId}: ${error.message}`, 'error');

        // Remove dead tab from list
        this.state.tabIds = this.state.tabIds.filter(id => id !== tabId);
      }
    }

    if (successCount > 0) {
      this.state.activitiesCount++;
      this.state.lastActivity = Date.now();
      this.log(`✅ Activity completed (${successCount} tabs)`, 'success');
    }

    if (errorCount > 0) {
      this.state.errors += errorCount;
      // Recreate missing tabs
      const missingTabs = this.config.tabCount - this.state.tabIds.length;
      if (missingTabs > 0) {
        this.log(`Recreating ${missingTabs} missing tabs...`, 'warn');
        await this.createMultipleTabs();
      }
    }
  }

  async rotateAllTabs() {
    if (!this.config.enabled || !this.config.smartRotation) return;

    this.log('🔀 Rotating all tabs to new pages...', 'info');

    for (let i = 0; i < this.state.tabIds.length; i++) {
      const tabId = this.state.tabIds[i];

      try {
        this.state.currentPageIndex = (this.state.currentPageIndex + 1) % this.pages.length;
        const newUrl = this.pages[this.state.currentPageIndex];

        await chrome.tabs.update(tabId, { url: newUrl });
        this.log(`Tab ${tabId} rotated to: ${newUrl}`, 'debug');

        // Wait a bit between rotations
        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        this.log(`Rotation error on tab ${tabId}: ${error.message}`, 'error');
      }
    }
  }

  // ========== HEARTBEAT & MONITORING (NEW) ==========

  async performHeartbeat() {
    if (!this.config.enabled) return;

    // Update uptime
    if (this.state.startTime) {
      this.state.uptime = Date.now() - this.state.startTime;
    }

    // Check all tabs health
    const deadTabs = [];

    for (const tabId of this.state.tabIds) {
      try {
        const tab = await chrome.tabs.get(tabId);

        if (!tab || tab.discarded) {
          this.log(`Tab ${tabId} is dead/discarded`, 'warn');
          deadTabs.push(tabId);
        }
      } catch (error) {
        deadTabs.push(tabId);
      }
    }

    // Remove dead tabs and recreate
    if (deadTabs.length > 0) {
      this.state.tabIds = this.state.tabIds.filter(id => !deadTabs.includes(id));
      this.state.tabCrashes += deadTabs.length;

      const missingCount = this.config.tabCount - this.state.tabIds.length;
      if (missingCount > 0) {
        this.log(`🔧 Auto-recovering ${missingCount} crashed tabs...`, 'warn');
        await this.createMultipleTabs();
      }
    }
  }

  // ========== COOKIE MONITORING (NEW) ==========

  async checkAndRefreshCookies() {
    if (!this.config.cookieMonitoring) return;

    try {
      const cookies = await chrome.cookies.getAll({
        domain: '.fiverr.com'
      });

      this.log(`🍪 Monitoring ${cookies.length} Fiverr cookies`, 'debug');

      // Check for session cookies that might expire soon
      for (const cookie of cookies) {
        if (cookie.session || cookie.name.includes('session')) {
          this.log(`Session cookie found: ${cookie.name}`, 'debug');

          // If cookie expires in less than 1 hour, trigger activity
          if (cookie.expirationDate) {
            const expiresIn = cookie.expirationDate - (Date.now() / 1000);
            if (expiresIn < 3600) { // Less than 1 hour
              this.log('⚠️ Session cookie expiring soon, forcing activity', 'warn');
              await this.performActivity(true);
            }
          }
        }
      }
    } catch (error) {
      this.log('Cookie monitoring error: ' + error.message, 'error');
    }
  }

  // ========== NETWORK KEEP-ALIVE (NEW) ==========

  async performNetworkKeepAlive() {
    if (!this.config.networkKeepAlive) return;

    // Send a lightweight request to Fiverr to keep session alive
    try {
      // Try to fetch a lightweight endpoint
      const response = await fetch('https://www.fiverr.com/favicon.ico', {
        method: 'HEAD',
        credentials: 'include' // Important: include cookies
      });

      if (response.ok) {
        this.log('🌐 Network keep-alive ping successful', 'debug');
      } else {
        this.log('⚠️ Network ping returned: ' + response.status, 'warn');
      }
    } catch (error) {
      this.log('Network keep-alive error: ' + error.message, 'error');
    }
  }

  // ========== TAB MONITORING ==========

  handleTabRemoved(tabId) {
    if (this.state.tabIds.includes(tabId) && this.config.enabled) {
      this.log(`⚠️ Tab ${tabId} was closed externally`, 'warn');

      this.state.tabIds = this.state.tabIds.filter(id => id !== tabId);
      this.state.tabCrashes++;

      if (this.config.autoRestart) {
        setTimeout(async () => {
          const missingCount = this.config.tabCount - this.state.tabIds.length;
          if (missingCount > 0 && this.config.enabled) {
            this.log(`🔧 Auto-recreating ${missingCount} closed tabs`, 'info');
            await this.createMultipleTabs();
          }
        }, 2000);
      }
    }
  }

  // ========== CONFIGURATION ==========

  async updateConfig(newConfig) {
    const oldMode = this.config.mode;
    const wasEnabled = this.config.enabled;

    this.config = { ...this.config, ...newConfig };
    await this.persistState();

    // If mode changed and running, recreate alarms
    if (wasEnabled && oldMode !== this.config.mode) {
      this.log('Mode changed, updating alarms...', 'info');
      this.clearAllAlarms();
      this.createAlarms();
    }
  }

  // ========== UTILITY METHODS ==========

  getState() {
    return {
      config: this.config,
      state: {
        ...this.state,
        currentPage: this.pages[this.state.currentPageIndex],
        isRunning: this.config.enabled,
        uptimeFormatted: this.formatUptime(this.state.uptime),
        tabCount: this.state.tabIds.length
      },
      modeSettings: this.modeSettings[this.config.mode]
    };
  }

  resetStats() {
    this.state.activitiesCount = 0;
    this.state.errors = 0;
    this.state.tabCrashes = 0;
    this.state.uptime = 0;
    this.state.serviceWorkerRestarts = 0;
    this.state.startTime = this.config.enabled ? Date.now() : null;
    this.persistState();
    this.log('Statistics reset', 'info');
  }

  formatUptime(ms) {
    if (!ms) return '0s';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  updateBadge() {
    if (this.config.enabled) {
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#1DBF73' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = '[KeepAlive ULTRA]';
    const emoji = {
      system: '⚙️',
      info: 'ℹ️',
      success: '✅',
      warn: '⚠️',
      error: '❌',
      activity: '🔄',
      debug: '🔍'
    }[level] || 'ℹ️';

    console.log(`${emoji} ${prefix} [${timestamp}] ${message}`);
  }
}

// ============================================================================
// INITIALIZE
// ============================================================================

const keepAliveUltra = new FiverrKeepAliveUltraPro();

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    keepAliveUltra.log('🎉 Extension installed successfully! v8.0.0', 'system');
  } else if (details.reason === 'update') {
    keepAliveUltra.log('🔄 Extension updated to v8.0.0 ULTRA-PRO', 'system');
  }
});
