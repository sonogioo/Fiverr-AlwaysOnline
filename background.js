// background.js v4.2 - FREQUENT ACTIVITY VERSION
let isEnabled = false;
let keepAliveTabId = null;
let lastUserInteractionTime = 0;
let pageChangeInProgress = false;

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
  } else if (request.action === 'userInteraction') {
    // Traccia l'interazione dell'utente
    lastUserInteractionTime = Date.now();
    console.log('[KEEP-ALIVE] User interaction detected');
  }
  return true;
});

// ==================== KEEP-ALIVE CORE ====================

async function startKeepAlive() {
  console.log('[KEEP-ALIVE] Starting...');
  isEnabled = true;
  pageChangeInProgress = false;
  lastUserInteractionTime = 0;
  
  // Salva stato
  chrome.storage.sync.set({ alwaysOnline: true });
  
  // Crea tab nascosta di Fiverr
  await createKeepAliveTab();
  
  // ATTIVITÀ OGNI 30 SECONDI (invece di 3 minuti)
  chrome.alarms.create('activitySimulation', {
    delayInMinutes: 0.5, // 30 secondi
    periodInMinutes: 0.5 // 30 secondi
  });
  
  // CAMBIO PAGINA OGNI 3 MINUTI (invece di 15)
  chrome.alarms.create('pageRotation', {
    delayInMinutes: 3,
    periodInMinutes: 3
  });
  
  // ATTIVITÀ AGGIUNTIVA OGNI 10 SECONDI (mouse move)
  chrome.alarms.create('microActivity', {
    delayInMinutes: 0.17, // 10 secondi
    periodInMinutes: 0.17 // 10 secondi
  });
  
  // Badge verde
  chrome.action.setBadgeText({ text: 'ON' });
  chrome.action.setBadgeBackgroundColor({ color: '#1dbf73' });
  
  console.log('[KEEP-ALIVE] Started successfully');
}

async function stopKeepAlive() {
  console.log('[KEEP-ALIVE] Stopping...');
  isEnabled = false;
  pageChangeInProgress = false;
  
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
  chrome.alarms.clear('microActivity'); // Aggiunto
  
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
      
      // Timeout di sicurezza dopo 10 secondi
      setTimeout(resolve, 10000);
    });
    
  } catch (error) {
    console.error('[KEEP-ALIVE] Error creating tab:', error);
  }
}

// ==================== TAB RECOVERY ====================

async function recoverKeepAliveTab() {
  if (!isEnabled) return;
  
  console.log('[KEEP-ALIVE] Attempting tab recovery...');
  
  try {
    // Prima cerca se esiste già una tab di Fiverr
    const tabs = await chrome.tabs.query({ url: '*://*.fiverr.com/*' });
    
    if (tabs.length > 0) {
      // Usa una tab esistente
      const existingTab = tabs[0];
      keepAliveTabId = existingTab.id;
      
      // Muta e pinna se non lo è già
      await chrome.tabs.update(keepAliveTabId, { 
        muted: true,
        pinned: true
      });
      
      console.log('[KEEP-ALIVE] Recovered existing tab:', keepAliveTabId);
    } else {
      // Crea nuova tab
      await createKeepAliveTab();
    }
  } catch (error) {
    console.error('[KEEP-ALIVE] Recovery failed, creating new tab:', error);
    await createKeepAliveTab();
  }
}

// ==================== ACTIVITY SIMULATION ====================

async function simulateActivity() {
  if (!isEnabled || !keepAliveTabId || pageChangeInProgress) return;
  
  // Ridotto da 2 minuti a 30 secondi
  const timeSinceLastInteraction = Date.now() - lastUserInteractionTime;
  if (timeSinceLastInteraction < 30000) { // 30 secondi
    console.log('[KEEP-ALIVE] User active, skipping activity simulation');
    return;
  }
  
  console.log('[KEEP-ALIVE] Simulating activity...');
  
  try {
    // Verifica che la tab esista ancora
    const tab = await chrome.tabs.get(keepAliveTabId);
    
    if (!tab) {
      console.log('[KEEP-ALIVE] Tab lost, recreating...');
      await createKeepAliveTab();
      return;
    }
    
    // Inietta script di attività aggressive
    await chrome.scripting.executeScript({
      target: { tabId: keepAliveTabId },
      func: performAggressiveActivity
    });
    
    console.log('[KEEP-ALIVE] Activity simulated ✓');
    
  } catch (error) {
    console.error('[KEEP-ALIVE] Error simulating activity:', error);
    // Ricrea tab se errore
    await createKeepAliveTab();
  }
}

// Funzione per micro attività (ogni 10 secondi)
async function simulateMicroActivity() {
  if (!isEnabled || !keepAliveTabId || pageChangeInProgress) return;
  
  console.log('[KEEP-ALIVE] Simulating micro activity...');
  
  try {
    const tab = await chrome.tabs.get(keepAliveTabId);
    
    if (!tab) return;
    
    await chrome.scripting.executeScript({
      target: { tabId: keepAliveTabId },
      func: performMicroActivity
    });
    
  } catch (error) {
    console.error('[KEEP-ALIVE] Micro activity error:', error);
  }
}

// Funzione per attività aggressive (ogni 30 secondi)
function performAggressiveActivity() {
  console.log('[FIVERR-ACTIVITY] Simulating AGGRESSIVE activity...');
  
  // 1. Scroll significativo
  const scrollAmount = Math.random() * 800 + 200;
  window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
  
  setTimeout(() => {
    window.scrollBy({ top: -scrollAmount / 3, behavior: 'smooth' });
  }, 500);
  
  // 2. Multipli movimenti mouse
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const mouseMoveEvent = new MouseEvent('mousemove', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: Math.random() * window.innerWidth,
        clientY: Math.random() * window.innerHeight
      });
      document.dispatchEvent(mouseMoveEvent);
    }, i * 300);
  }
  
  // 3. Click multipli
  setTimeout(() => {
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    document.body.dispatchEvent(clickEvent);
    
    // Click su elementi comuni
    const commonElements = ['a', 'button', 'div', 'span'];
    commonElements.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        const randomElement = elements[Math.floor(Math.random() * elements.length)];
        if (randomElement && randomElement.getBoundingClientRect().top < window.innerHeight) {
          randomElement.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        }
      }
    });
  }, 1000);
  
  // 4. Keyboard activity
  setTimeout(() => {
    const keys = ['Tab', 'Shift', 'Control', 'Alt', 'ArrowDown', 'ArrowUp'];
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const keyEvent = new KeyboardEvent('keydown', {
      key: randomKey,
      bubbles: true
    });
    document.dispatchEvent(keyEvent);
  }, 1500);
  
  // 5. Focus e blur per simulare attenzione
  setTimeout(() => {
    window.focus();
    document.hasFocus() && document.dispatchEvent(new Event('focus'));
  }, 2000);
  
  console.log('[FIVERR-ACTIVITY] Aggressive activity complete');
}

// Funzione per micro attività (ogni 10 secondi)
function performMicroActivity() {
  // Solo movimenti minimi per mantenere attivo
  const mouseMoveEvent = new MouseEvent('mousemove', {
    view: window,
    bubbles: true,
    cancelable: true,
    clientX: Math.random() * window.innerWidth,
    clientY: Math.random() * window.innerHeight
  });
  document.dispatchEvent(mouseMoveEvent);
  
  // Mini scroll occasionalmente
  if (Math.random() > 0.7) {
    window.scrollBy({ top: Math.random() * 50 - 25, behavior: 'smooth' });
  }
}

async function rotatePage() {
  if (!isEnabled || !keepAliveTabId) return;
  
  // Ridotto da 5 minuti a 1 minuto
  const timeSinceLastInteraction = Date.now() - lastUserInteractionTime;
  if (timeSinceLastInteraction < 60000) { // 1 minuto
    console.log('[KEEP-ALIVE] User recently active, skipping page rotation');
    return;
  }
  
  // Evita rotazioni simultanee
  if (pageChangeInProgress) {
    console.log('[KEEP-ALIVE] Page rotation already in progress, skipping');
    return;
  }
  
  pageChangeInProgress = true;
  console.log('[KEEP-ALIVE] Rotating page...');
  
  try {
    // Cambia pagina
    currentPageIndex = (currentPageIndex + 1) % FIVERR_PAGES.length;
    const newUrl = FIVERR_PAGES[currentPageIndex];
    
    await chrome.tabs.update(keepAliveTabId, { url: newUrl });
    
    console.log(`[KEEP-ALIVE] Navigated to: ${newUrl}`);
    
    // Aspetta il caricamento prima di permettere altre rotazioni
    await new Promise((resolve) => {
      const listener = (tabId, info) => {
        if (tabId === keepAliveTabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          console.log('[KEEP-ALIVE] New page loaded, resuming activity');
          pageChangeInProgress = false;
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      
      // Timeout di sicurezza ridotto
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        pageChangeInProgress = false;
        resolve();
      }, 10000);
    });
    
  } catch (error) {
    console.error('[KEEP-ALIVE] Error rotating page:', error);
    pageChangeInProgress = false;
    await createKeepAliveTab();
  }
}

// ==================== ALARM HANDLERS ====================

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'activitySimulation') {
    simulateActivity();
  } else if (alarm.name === 'pageRotation') {
    rotatePage();
  } else if (alarm.name === 'microActivity') {
    simulateMicroActivity();
  }
});

// ==================== TAB MONITORING ====================

// Se l'utente chiude la tab keep-alive, ricreala
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === keepAliveTabId && isEnabled) {
    console.log('[KEEP-ALIVE] Tab closed by user, starting recovery...');
    keepAliveTabId = null;
    pageChangeInProgress = false;
    
    // Ritardo più breve per recupero rapido
    setTimeout(() => recoverKeepAliveTab(), 1000);
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
      currentPage: FIVERR_PAGES[currentPageIndex],
      pageChangeInProgress: pageChangeInProgress,
      lastUserInteraction: lastUserInteractionTime
    });
  }
});