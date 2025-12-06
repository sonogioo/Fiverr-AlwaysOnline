// popup.js v4.0
const toggle = document.getElementById('toggleKeepAlive');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');

// Carica stato attuale
chrome.storage.sync.get(['alwaysOnline'], (result) => {
  const isEnabled = result.alwaysOnline || false;
  toggle.checked = isEnabled;
  updateStatus(isEnabled);
});

// Listener per toggle
toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  
  chrome.runtime.sendMessage({
    action: 'toggleKeepAlive',
    enabled: enabled
  }, (response) => {
    if (response && response.success) {
      updateStatus(enabled);
      
      // Notifica
      if (enabled) {
        showNotification('Keep-Alive Attivato', 'Rimarrai sempre online su Fiverr');
      } else {
        showNotification('Keep-Alive Disattivato', 'Tornerai offline quando inattivo');
      }
    }
  });
});

function updateStatus(enabled) {
  if (enabled) {
    statusIndicator.classList.add('active');
    statusIndicator.classList.remove('inactive');
    statusText.textContent = 'Attivo - Sempre online';
  } else {
    statusIndicator.classList.remove('active');
    statusIndicator.classList.add('inactive');
    statusText.textContent = 'Disattivato';
  }
}

function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: title,
    message: message
  });
}
