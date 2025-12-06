// content.js - versione migliorata scroll "umano"
console.log('[FIVERR] Keep-alive content script loaded');

// Notify background
try {
  chrome.runtime.sendMessage({ action: 'pageLoaded', url: window.location.href }).catch(()=>{});
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
      const evt = document.createEvent('UIEvents');
      // fallback: initEvent only
      evt.initEvent('wheel', true, true);
      evt.deltaY = deltaY;
      return evt;
    } catch (err) {
      return null;
    }
  }
}

// Human-like scroll: totalDistance px over duration ms, split in steps
function humanScroll(totalDistance = 300, duration = 600, steps = 8) {
  if (document.visibilityState !== 'visible') {
    console.log('[FIVERR] humanScroll skipped (page hidden)');
    return;
  }
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
          window.scrollBy({ top: wheelDelta, left: 0, behavior: 'auto' });
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
        window.scrollBy({ top: back, left: 0, behavior: 'auto' });
      } catch (e) { window.scrollBy(0, back); }
      console.log('[FIVERR] humanScroll bounce back', back);
    }, duration + randomInt(100, 500));
  }
}

// Small synthetic activity every 30s (mousemove)
setInterval(() => {
  if (document.visibilityState === 'visible') {
    console.log('[FIVERR-ACTIVITY] Simulating user activity...');
    const x = randomInt(50, Math.max(50, window.innerWidth - 50));
    const y = randomInt(50, Math.max(50, window.innerHeight - 50));
    const mv = createPointer('pointermove', x, y) || createMouse('mousemove', x, y);
    if (mv) {
      document.dispatchEvent(mv);
      window.dispatchEvent(mv);
    }
    console.log('[FIVERR-ACTIVITY] Activity complete');
  }
}, 30 * 1000);

// Larger scroll + click every 3 minutes
setInterval(() => {
  if (document.visibilityState === 'visible') {
    // Choose a stronger scroll: between 200 and 700 px, duration 400-1200ms
    const distance = (Math.random() < 0.5 ? 1 : -1) * randomInt(200, 700); // sometimes up, sometimes down
    const duration = randomInt(400, 1200);
    const steps = randomInt(6, 14);
    console.log('[FIVERR-ACTIVITY] humanScroll start', distance, duration, steps);
    humanScroll(distance, duration, steps);

    // light non-destructive click occasionally after scroll
    if (Math.random() < 0.6) {
      setTimeout(() => {
        const px = Math.min(window.innerWidth-10, Math.max(10, Math.floor(window.innerWidth*0.5 + (Math.random()-0.5)*300)));
        const py = Math.min(window.innerHeight-10, Math.max(10, Math.floor(window.innerHeight*0.5 + (Math.random()-0.5)*300)));
        const down = createPointer('pointerdown', px, py) || createMouse('mousedown', px, py);
        const up = createPointer('pointerup', px, py) || createMouse('mouseup', px, py);
        const target = document.elementFromPoint(px, py) || document.querySelector('body') || document.documentElement;
        if (down) target.dispatchEvent(down);
        if (up) target.dispatchEvent(up);
        console.log('[FIVERR-ACTIVITY] performed gentle click', px, py);
      }, duration + randomInt(200, 900));
    }
  } else {
    console.log('[FIVERR] 3-min action skipped (hidden)');
  }
}, 3 * 60 * 1000);

// optional debug log of visibility
setInterval(() => {
  console.log('[FIVERR] visibilityState=', document.visibilityState, 'hasFocus=', document.hasFocus());
}, 60 * 1000);