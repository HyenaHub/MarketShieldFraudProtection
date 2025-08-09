document.addEventListener('DOMContentLoaded', () => {
  const sensitivity = document.getElementById('sensitivity');
  const sensLabel = document.getElementById('sens-label');
  const notify = document.getElementById('notify');
  const sync = document.getElementById('sync');
  const saveBtn = document.getElementById('save');

  // Load settings
  chrome.storage.sync.get({ ms_settings: { sensitivity: 2, notify: true, sync: false } }, (res) => {
    const s = res.ms_settings;
    sensitivity.value = s.sensitivity;
    sensLabel.textContent = s.sensitivity === 1 ? 'Low' : s.sensitivity === 3 ? 'High' : 'Medium';
    notify.checked = !!s.notify;
    sync.checked = !!s.sync;
  });

  sensitivity.addEventListener('input', () => {
    const v = parseInt(sensitivity.value, 10);
    sensLabel.textContent = v === 1 ? 'Low' : v === 3 ? 'High' : 'Medium';
  });

  saveBtn.addEventListener('click', () => {
    const s = { sensitivity: parseInt(sensitivity.value, 10), notify: notify.checked, sync: sync.checked };
    chrome.storage.sync.set({ ms_settings: s }, () => {
      alert('Settings saved.');
    });
  });
});
