'use strict';
const mode = document.querySelector('#mode'), status = document.querySelector('#status');
let storageRevision=0;
mode.disabled=true;
RISSettings.read().then(settings => { if(storageRevision===0)mode.value=settings.mode; })
  .catch(()=>{status.textContent='Einstellungen konnten nicht geladen werden. Bitte erneut öffnen.';})
  .finally(()=>{mode.disabled=false;});
mode.addEventListener('change', async () => {
  if(mode.disabled)return;
  const selected = mode.value; mode.disabled = true;
  try {
    await RISSettings.update({mode:selected});status.textContent = 'Einstellung gespeichert.';
  } catch { status.textContent = 'Speichern fehlgeschlagen. Bitte erneut versuchen.'; }
  finally { mode.disabled = false; }
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) {storageRevision++;mode.value = RISSettings.sanitize(changes.settings.newValue).mode;}
});
document.querySelector('#options').addEventListener('click', () => chrome.runtime.openOptionsPage());
