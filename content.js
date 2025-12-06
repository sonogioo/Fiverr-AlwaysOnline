// content.js - versione ULTRA FREQUENTE scroll "umano" + user interaction tracking
console.log('[FIVERR] Keep-alive content script loaded');

// Notify background
try {
  chrome.runtime.sendMessage({ action: 'pageLoaded', url: window.location.href }). catch(()=>{});
} catch (e) {}

// utils
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max) { return Math.random() * (max - min) + min; }

function createMouse(type, x = 100, y = 100) {
  try {
    return new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, screenX: x, screenY: y });
  } catch (e) {
    try {
      const evt = document.createEvent('MouseEvents');
      evt.initMouseEvent(type, true, true, window, 1, 0, 0, x, y, false, false, false, false, 0, null);
      return evt;
    } catch (err) {
      return null;
    }
  }
}
function createPointer(type, x = 100, y = 100) {
  try { return new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: 'mouse' }); }
  catch (e) { return createMouse(type, x, y); }
}
function createWheel(deltaY = 100, x = 100, y = 100) {
  try {
    return new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY, clientX: x, clientY: y });
  } catch (e) {
    try {
      const evt = document. createEvent('UIEvents');
      // fallback: initEvent only
      evt.initEvent('wheel', true, true);
      evt.deltaY = deltaY;
      return evt;
    } catch (err) {
      return null;
    }
  }
}

// ==================== USER INTERACTION TRACKING ====================

let lastRealUserInteraction = 0;
let isSimulatingActivity = false;

/**
 * Notifica al background che l'utente ha interagito
 */
function notifyUserInteraction(eventType) {
  lastRealUserInteraction = Date. now();
  console.log(`[FIVERR] User interaction detected: ${eventType}`);
  
  try {
    chrome.runtime.sendMessage({ 
      action: 'userInteraction',
      type: eventType,
      timestamp: lastRealUserInteraction
    }).catch(() => {});
  } catch (e) {
    console.warn('[FIVERR] Failed to send userInteraction message:', e);
  }
}

/**
 * Traccia i veri movimenti del mouse dell'utente
 */
document.addEventListener('mousemove', (e) => {
  // Ignora mousemove generati dagli script (synthethic events)
  if (isSimulatingActivity) return;
  
  // Ignora movimenti vicino ai bordi (spesso sono generati)
  if (e.clientX < 5 || e.clientX > window.innerWidth - 5 || 
      e.clientY < 5 || e.clientY > window.innerHeight - 5) {
    return;
  }
  
  notifyUserInteraction('mousemove');
}, { passive: true });

/**
 * Traccia i veri click dell'utente
 */
document.addEventListener('mousedown', (e) => {
  if (isSimulatingActivity) return;
  notifyUserInteraction('mousedown');
}, { passive: true });

document.addEventListener('mouseup', (e) => {
  if (isSimulatingActivity) return;
  notifyUserInteraction('mouseup');
}, { passive: true });

/**
 * Traccia i veri scroll dell'utente
 */
document.addEventListener('wheel', (e) => {
  if (isSimulatingActivity) return;
  notifyUserInteraction('wheel');
}, { passive: true });

/**
 * Traccia i tasti premuti
 */
document.addEventListener('keydown', (e) => {
  if (isSimulatingActivity) return;
  notifyUserInteraction('keydown');
}, { passive: true });

/**
 * Traccia i tap/touch
 */
document.addEventListener('touchstart', (e) => {
  if (isSimulatingActivity) return;
  notifyUserInteraction('touch');
}, { passive: true });

/**
 * Traccia il focus della finestra
 */
window.addEventListener('focus', (e) => {
  notifyUserInteraction('windowFocus');
}, { passive: true });

// ==================== HUMAN-LIKE SCROLL ====================

// Human-like scroll: totalDistance px over duration ms, split in steps
function humanScroll(totalDistance = 300, duration = 600, steps = 8) {
  if (document.visibilityState !== 'visible') {
    console.log('[FIVERR] humanScroll skipped (page hidden)');
    return;
  }
  
  isSimulatingActivity = true;
  
  const stepDelay = Math.max(10, Math.floor(duration / steps));
  let remaining = Math.abs(totalDistance);
  const direction = totalDistance >= 0 ? 1 : -1;
  let done = 0;

  const clientX = Math.min(Math.max(10, Math.floor(window.innerWidth * 0.5 + (Math.random()-0.5)*200)), window.innerWidth-10);
  const clientY = Math.min(Math.max(10, Math.floor(window.innerHeight * 0.5 + (Math.random()-0.5)*200)), window.innerHeight-10);

  for (let i = 0; i < steps; i++) {
    // choose step size (smaller near end)
    const remainingSteps = steps - i;
    const stepSize = Math.round(remaining / remainingSteps * (0.6 + Math.random() * 0.8));
    const delta = Math.min(remaining, stepSize);
    remaining -= delta;
    const wheelDelta = delta * direction;

    setTimeout(() => {
      try {
        // dispatch pointermove/mousemove to emulate hand moving
        const pm = createPointer('pointermove', clientX + randomInt(-30, 30), clientY + randomInt(-30, 30)) ||
                   createMouse('mousemove', clientX + randomInt(-30, 30), clientY + randomInt(-30, 30));
        if (pm) {
          document.dispatchEvent(pm);
          window.dispatchEvent(pm);
        }

        // perform scrollBy small increment
        try {
          window.scrollBy({ top: wheelDelta, left: 0, behavior: 'smooth' });
        } catch (e) {
          window.scrollBy(0, wheelDelta);
        }

        // dispatch wheel event
        const wh = createWheel(wheelDelta, clientX, clientY);
        if (wh) {
          (document.elementFromPoint(clientX, clientY) || document.body).dispatchEvent(wh);
        }

        done += Math.abs(wheelDelta);
      } catch (err) {
        console.warn('[FIVERR] humanScroll step error', err);
      }
    }, i * stepDelay + randomInt(0, 60));
  }

  // small bounce back sometimes to look natural
  if (Math.random() < 0.35) {
    setTimeout(() => {
      const back = Math.round(Math.min(60, Math.max(10, totalDistance * 0.08)))*-Math.sign(totalDistance);
      try {
        window.scrollBy({ top: back, left: 0, behavior: 'smooth' });
      } catch (e) { window.scrollBy(0, back); }
      console.log('[FIVERR] humanScroll bounce back', back);
      
      isSimulatingActivity = false;
    }, duration + randomInt(100, 500));
  } else {
    setTimeout(() => {
      isSimulatingActivity = false;
    }, duration + randomInt(100, 300));
  }
}

// ==================== ACTIVITY SIMULATION ====================

// Attività micro ogni 15 secondi (invece di 30)
setInterval(() => {
  if (document.visibilityState === 'visible' && document.hasFocus()) {
    console.log('[FIVERR-ACTIVITY] Simulating micro user activity...');
    isSimulatingActivity = true;
    
    const x = randomInt(50, Math.max(50, window.innerWidth - 50));
    const y = randomInt(50, Math.max(50, window.innerHeight - 50));
    const mv = createPointer('pointermove', x, y) || createMouse('mousemove', x, y);
    if (mv) {
      document.dispatchEvent(mv);
      window.dispatchEvent(mv);
    }
    
    // Mini scroll 30% delle volte
    if (Math.random() < 0.3) {
      window.scrollBy({ top: randomInt(-20, 20), behavior: 'smooth' });
    }
    
    isSimulatingActivity = false;
  }
}, 15 * 1000); // 15 secondi

// Attività principale ogni 45 secondi (invece di 3 minuti)
setInterval(() => {
  if (document.visibilityState === 'visible' && document.hasFocus()) {
    const distance = (Math.random() < 0.5 ? 1 : -1) * randomInt(300, 800);
    const duration = randomInt(300, 900);
    const steps = randomInt(8, 16);
    console.log('[FIVERR-ACTIVITY] humanScroll start', distance, duration, steps);
    humanScroll(distance, duration, steps);

    // Click più frequente (80% delle volte)
    if (Math.random() < 0.8) {
      setTimeout(() => {
        isSimulatingActivity = true;
        
        const px = Math.min(window.innerWidth-10, Math.max(10, Math.floor(window.innerWidth*0.5 + (Math.random()-0.5)*300)));
        const py = Math.min(window.innerHeight-10, Math.max(10, Math.floor(window.innerHeight*0.5 + (Math.random()-0.5)*300)));
        
        // Mouse over prima del click
        const over = createMouse('mouseover', px, py);
        const down = createPointer('pointerdown', px, py) || createMouse('mousedown', px, py);
        const up = createPointer('pointerup', px, py) || createMouse('mouseup', px, py);
        const click = createMouse('click', px, py);
        
        const target = document.elementFromPoint(px, py) || document.querySelector('body') || document.documentElement;
        
        // Sequenza di eventi realistici
        if (over) target.dispatchEvent(over);
        setTimeout(() => {
          if (down) target.dispatchEvent(down);
          setTimeout(() => {
            if (up) target.dispatchEvent(up);
            if (click) target.dispatchEvent(click);
          }, 50);
        }, 100);
        
        isSimulatingActivity = false;
      }, duration + randomInt(100, 500));
    }
  } else {
    console.log('[FIVERR] Main activity skipped (page hidden)');
  }
}, 45 * 1000); // 45 secondi

// Attività extra ogni 60 secondi (scroll casuale)
setInterval(() => {
  if (document.visibilityState === 'visible' && document.hasFocus() && Math.random() < 0.7) {
    console.log('[FIVERR-ACTIVITY] Extra random scroll');
    isSimulatingActivity = true;
    
    const scrollDistance = randomInt(-150, 150);
    window.scrollBy({ top: scrollDistance, behavior: 'smooth' });
    
    // Piccolo movimento mouse
    setTimeout(() => {
      const x = randomInt(50, Math.max(50, window.innerWidth - 50));
      const y = randomInt(50, Math.max(50, window.innerHeight - 50));
      const mv = createPointer('pointermove', x, y) || createMouse('mousemove', x, y);
      if (mv) {
        document.dispatchEvent(mv);
      }
      isSimulatingActivity = false;
    }, 300);
  }
}, 60 * 1000); // 60 secondi

// optional debug log of visibility
setInterval(() => {
  console.log('[FIVERR] visibilityState=', document.visibilityState, 'hasFocus=', document.hasFocus(), 'lastInteraction=', Date.now() - lastRealUserInteraction);
}, 120 * 1000);