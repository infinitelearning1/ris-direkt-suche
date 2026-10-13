'use strict';
const form = document.querySelector('#settings'), status = document.querySelector('#status');
let dirty = false;
const changed=new Set();
function values() {
  const settings = {};
  for (const name of ['mode', 'style', 'normColor', 'caseColor', 'rsColor', 'fundstelleColor', 'highlightColor'])
    settings[name] = form.elements.namedItem(name).value;
  settings.enabledCourts = [...form.querySelectorAll('[name=court]:checked')].map(x => x.value);
  settings.existingLinks = form.elements.namedItem('existingLinks').checked;
  settings.markFundstellen = form.elements.namedItem('markFundstellen').checked;
  settings.markCollections = form.elements.namedItem('markCollections').checked;
  settings.excludedSites = document.querySelector('#excludedSites').value.split(/\r?\n/);
  return RISSettings.sanitize(settings);
}
function preview() {
  const settings = values();
  for (const span of document.querySelectorAll('.preview span')) {
    span.style.textDecoration = settings.style === 'highlight' ? 'none' : 'underline';
    span.style.textDecorationThickness = '2px'; span.style.textUnderlineOffset = '.2em';
    span.style.textDecorationColor = settings[span.dataset.type + 'Color'];
    span.style.backgroundColor = settings.style === 'underline' ? 'transparent' : settings.highlightColor;
  }
}
function populate(settings) {
  for (const name of ['mode', 'style', 'normColor', 'caseColor', 'rsColor', 'fundstelleColor', 'highlightColor'])
    form.elements.namedItem(name).value = settings[name];
  for (const box of form.querySelectorAll('[name=court]')) box.checked = settings.enabledCourts.includes(box.value);
  form.elements.namedItem('existingLinks').checked = settings.existingLinks;
  form.elements.namedItem('markFundstellen').checked = settings.markFundstellen;
  form.elements.namedItem('markCollections').checked = settings.markCollections;
  document.querySelector('#excludedSites').value = settings.excludedSites.join('\n');
  preview();
}
form.addEventListener('input', event => {
  changed.add(event.target.name==='court'?'enabledCourts':event.target.id==='excludedSites'?'excludedSites':event.target.name);
  dirty = true; preview(); status.textContent = 'Noch nicht gespeichert.';
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  const lines = document.querySelector('#excludedSites').value.split(/\r?\n/).filter(x => x.trim());
  if (lines.some(line => !RISSettings.host(line))) {
    status.textContent = 'Bitte gültige Domains oder Webseitenadressen angeben, eine pro Zeile.'; return;
  }
  try {
    const current=values(),patch=Object.fromEntries([...changed].filter(name=>name in current).map(name=>[name,current[name]]));
    const settings = await RISSettings.update(patch);
    changed.clear();
    dirty = false; populate(settings); status.textContent = 'Gespeichert. Offene Seiten werden aktualisiert.';
  } catch { status.textContent = 'Speichern fehlgeschlagen. Bitte die Erweiterung neu laden.'; }
});
document.querySelector('#reset').addEventListener('click', () => {
  populate(RISSettings.sanitize()); dirty = true; status.textContent = 'Standardwerte gewählt. Zum Übernehmen speichern.';
  for(const name of Object.keys(RISSettings.defaults))changed.add(name);
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.settings) return;
  if (!dirty) populate(RISSettings.sanitize(changes.settings.newValue));
  else {
    const current=values(),next=RISSettings.sanitize(changes.settings.newValue);
    for(const name of changed)if(name in current)next[name]=current[name];
    populate(next);status.textContent='Andere Einstellungen wurden aktualisiert. Deine geänderten Felder bleiben erhalten.';
  }
});
RISSettings.read().then(settings => { if (!dirty) populate(settings); });
