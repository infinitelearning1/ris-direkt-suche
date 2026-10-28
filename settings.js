(function (root) {
  'use strict';
  const defaults = { mode: 'off', style: 'underline', normColor: '#c77700', caseColor: '#1b69c9',
    rsColor: '#8a46aa', fundstelleColor: '#16806a', highlightColor: '#ffed75', openIn: 'newTab',
    enabledCourts: ['OGH', 'VwGH', 'VfGH'], excludedSites: [], existingLinks: true, markFundstellen: false, markCollections: true, pdfHistoricalYear: false };
  function host(value) {
    if (typeof value !== 'string') return null;
    const text = value.trim().replace(/^\*\./, '');
    if (!text) return null;
    if (!text.includes('://') && /\s/.test(text)) return null;
    try {
      const url = new URL(text.includes('://') ? text : 'https://' + text);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname) return null;
      const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
      return /^[a-z0-9.-]+$/.test(hostname) || /^\[[a-f0-9:]+\]$/.test(hostname) ? hostname : null;
    } catch { return null; }
  }
  function sanitize(value = {}) {
    if (!value || typeof value !== 'object') value = {};
    const s = {};
    for (const name of ['mode', 'style', 'openIn']) {
      const choices = name === 'mode' ? ['both', 'web', 'pdf', 'off'] : name === 'style' ? ['underline', 'highlight', 'both'] : ['newTab'];
      s[name] = choices.includes(value[name]) ? value[name] : defaults[name];
    }
    for (const name of ['normColor', 'caseColor', 'rsColor', 'fundstelleColor', 'highlightColor'])
      s[name] = /^#[a-f\d]{6}$/i.test(value[name]) ? value[name] : defaults[name];
    s.enabledCourts = Array.isArray(value.enabledCourts) ? [...new Set(value.enabledCourts.filter(x => defaults.enabledCourts.includes(x)))] : [...defaults.enabledCourts];
    s.excludedSites = Array.isArray(value.excludedSites) ? [...new Set(value.excludedSites.map(host).filter(Boolean))] : [];
    s.existingLinks = typeof value.existingLinks === 'boolean' ? value.existingLinks : defaults.existingLinks;
    s.markFundstellen = typeof value.markFundstellen === 'boolean' ? value.markFundstellen : defaults.markFundstellen;
    s.markCollections = typeof value.markCollections === 'boolean' ? value.markCollections : defaults.markCollections;
    s.pdfHistoricalYear = typeof value.pdfHistoricalYear === 'boolean' ? value.pdfHistoricalYear : defaults.pdfHistoricalYear;
    return s;
  }
  async function read() {
    try { return sanitize((await chrome.storage.local.get('settings')).settings); }
    catch { return sanitize(); }
  }
  async function update(patch) {
    const reply=await chrome.runtime.sendMessage({type:'ris-settings-update',patch});
    if(!reply?.settings)throw new Error(reply?.error||'Einstellungen konnten nicht gespeichert werden.');
    return sanitize(reply.settings);
  }
  const accepts=(ref,s)=>{const collection=root.RISCollections?.classify(ref);return !(ref.type==='fundstelle'&&!(collection?s.markCollections&&root.RISCollections.eligible(ref):s.markFundstellen))&&(!ref.court||s.enabledCourts.includes(ref.court==='VWGH'?'VwGH':ref.court==='VFGH'?'VfGH':ref.court));};
  root.RISSettings = { defaults, sanitize, read, host, update, accepts };
  if (typeof module !== 'undefined') module.exports = root.RISSettings;
})(globalThis);
