// background.js v4.0 - REAL KEEP-ALIVE WITH ACTIVITY SIMULATION
let isEnabled = false;
let keepAliveTabId = null;

const FIVERR_PAGES = [
  'https://www.fiverr.com/',
  'https://www.fiverr.com/inbox',
  'https://www.fiverr.com/dashboard',
  'https://www.fiverr.com/users/giovannihany/manage_gigs'
];

let currentPageIndex = 0;

// ==================== INSTALLATION ====================

chrome.runtime.onInstalled.addListener(() => {
  console.log('[KEEP-ALIVE] Extension installed');
  
  chrome.storage.sync.get(['alwaysOnline'], (result) => {
    if (result.alwaysOnline) {
      startKeepAlive();
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[KEEP-ALIVE] Browser started');
  
  chrome.storage.sync.get(['alwaysOnline'], (result) => {
    if (result.alwaysOnline) {
      startKeepAlive();
    }
  });
});

// ==================== MESSAGE LISTENER ====================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleKeepAlive') {
    if (request.enabled) {
      startKeepAlive();
      sendResponse({ success: true, message: 'Keep-alive started' });
    } else {
      stopKeepAlive();
      sendResponse({ success: true, message: 'Keep-alive stopped' });
    }
  }
  return true;
});

// ==================== KEEP-ALIVE CORE ====================

async function startKeepAlive() {
  console.log('[KEEP-ALIVE] Starting...');
  isEnabled = true;
  
  // Salva stato
  chrome.storage.sync.set({ alwaysOnline: true });
  
  // Crea tab nascosta di Fiverr
  await createKeepAliveTab();
  
  // Schedula attività ogni 3 minuti
  chrome.alarms.create('activitySimulation', {
    delayInMinutes: 3,
    periodInMinutes: 3
  });
  
  // Schedula cambio pagina ogni 15 minuti
  chrome.alarms.create('pageRotation', {
    delayInMinutes: 15,
    periodInMinutes: 15
  });
  
  // Badge verde
  chrome.action.setBadgeText({ text: 'ON' });
  chrome.action.setBadgeBackgroundColor({ color: '#1dbf73' });
  
  console.log('[KEEP-ALIVE] Started successfully');
}

async function stopKeepAlive() {
  console.log('[KEEP-ALIVE] Stopping...');
  isEnabled = false;
  
  // Salva stato
  chrome.storage.sync.set({ alwaysOnline: false });
  
  // Chiudi tab
  if (keepAliveTabId) {
    chrome.tabs.remove(keepAliveTabId).catch(() => {});
    keepAliveTabId = null;
  }
  
  // Ferma alarms
  chrome.alarms.clear('activitySimulation');
  chrome.alarms.clear('pageRotation');
  
  // Badge off
  chrome.action.setBadgeText({ text: '' });
  
  console.log('[KEEP-ALIVE] Stopped');
}

async function createKeepAliveTab() {
  try {
    // Chiudi tab esistente se presente
    if (keepAliveTabId) {
      chrome.tabs.remove(keepAliveTabId).catch(() => {});
    }
    
    // Crea nuova tab NASCOSTA (pinned + muted)
    const tab = await chrome.tabs.create({
      url: FIVERR_PAGES[0],
      active: false,
      pinned: true
    });
    
    keepAliveTabId = tab.id;
    
    // Muta l'audio della tab
    chrome.tabs.update(keepAliveTabId, { muted: true });
    
    console.log(`[KEEP-ALIVE] Tab created: ${keepAliveTabId}`);
    
    // Aspetta che carichi
    return new Promise((resolve) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === keepAliveTabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          console.log('[KEEP-ALIVE] Tab loaded');
          resolve();
        }
      });
    });
    
  } catch (error) {
    console.error('[KEEP-ALIVE] Error creating tab:', error);
  }
}

// ==================== ACTIVITY SIMULATION ====================

async function simulateActivity() {
  if (!isEnabled || !keepAliveTabId) return;
  
  console.log('[KEEP-ALIVE] Simulating activity...');
  
  try {
    // Verifica che la tab esista ancora
    const tab = await chrome.tabs.get(keepAliveTabId);
    
    if (!tab) {
      console.log('[KEEP-ALIVE] Tab lost, recreating...');
      await createKeepAliveTab();
      return;
    }
    
    // Inietta script di attività
    await chrome.scripting.executeScript({
      target: { tabId: keepAliveTabId },
      func: performActivity
    });
    
    console.log('[KEEP-ALIVE] Activity simulated ✓');
    
  } catch (error) {
    console.error('[KEEP-ALIVE] Error simulating activity:', error);
    // Ricrea tab se errore
    await createKeepAliveTab();
  }
}

function performActivity() {
  // Questa funzione viene eseguita NELLA pagina Fiverr
  
  console.log('[FIVERR-ACTIVITY] Simulating user activity...');
  
  // 1. Simula scroll random
  const scrollAmount = Math.random() * 500;
  window.scrollBy(0, scrollAmount);
  
  setTimeout(() => {
    window.scrollBy(0, -scrollAmount / 2);
  }, 1000);
  
  // 2. Simula mouse movement
  const mouseMoveEvent = new MouseEvent('mousemove', {
    view: window,
    bubbles: true,
    cancelable: true,
    clientX: Math.random() * window.innerWidth,
    clientY: Math.random() * window.innerHeight
  });
  document.dispatchEvent(mouseMoveEvent);
  
  // 3. Simula click su elemento non critico (body)
  const clickEvent = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true
  });
  document.body.dispatchEvent(clickEvent);
  
  // 4. Trigger focus sulla window (importante!)
  window.focus();
  document.dispatchEvent(new Event('focus'));
  
  // 5. Simula keyboard activity (key non critico)
  const keyEvent = new KeyboardEvent('keydown', {
    key: 'Shift',
    bubbles: true
  });
  document.dispatchEvent(keyEvent);
  
  console.log('[FIVERR-ACTIVITY] Activity complete');
}

async function rotatePage() {
  if (!isEnabled || !keepAliveTabId) return;
  
  console.log('[KEEP-ALIVE] Rotating page...');
  
  try {
    // Cambia pagina
    currentPageIndex = (currentPageIndex + 1) % FIVERR_PAGES.length;
    const newUrl = FIVERR_PAGES[currentPageIndex];
    
    await chrome.tabs.update(keepAliveTabId, { url: newUrl });
    
    console.log(`[KEEP-ALIVE] Navigated to: ${newUrl}`);
    
  } catch (error) {
    console.error('[KEEP-ALIVE] Error rotating page:', error);
    await createKeepAliveTab();
  }
}

// ==================== ALARM HANDLERS ====================

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'activitySimulation') {
    simulateActivity();
  } else if (alarm.name === 'pageRotation') {
    rotatePage();
  }
});

// ==================== TAB MONITORING ====================

// Se l'utente chiude la tab keep-alive, ricreala
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === keepAliveTabId && isEnabled) {
    console.log('[KEEP-ALIVE] Tab closed by user, recreating...');
    keepAliveTabId = null;
    setTimeout(() => createKeepAliveTab(), 2000);
  }
});

// ==================== NOTIFICATIONS ====================

async function sendNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: title,
    message: message
  });
}

// ==================== DEBUG ====================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    sendResponse({
      enabled: isEnabled,
      tabId: keepAliveTabId,
      currentPage: FIVERR_PAGES[currentPageIndex]
    });
  }
});
