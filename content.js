// content.js v4.0 - Minimal presence detector
console.log('[FIVERR] Keep-alive content script loaded');

// Notifica al background che siamo su Fiverr
chrome.runtime.sendMessage({ 
  action: 'pageLoaded',
  url: window.location.href 
}).catch(() => {});

// Mantieni la pagina "viva"
setInterval(() => {
  // Tiny activity ogni 30 secondi
  document.dispatchEvent(new Event('mousemove'));
}, 30000);
