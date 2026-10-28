'use strict';
importScripts('data.js', 'norms.js', 'collections.js', 'query.js', 'settings.js', 'pdf-history.js', 'pdf-session.js');

const MENU_ID = 'ris-direct-search';
let settingsQueue=Promise.resolve();
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(message?.type==='ris-open-citation'){
    try{
      const url=new URL(message.url);
      if(url.protocol!=='https:'||!/(^|\.)ris\.bka\.gv\.at$/.test(url.hostname))throw new Error('Ungültiges RIS-Ziel.');
      const origin=sender.tab,placement=origin?{windowId:origin.windowId,index:origin.index+1,openerTabId:origin.id}:{};
      chrome.tabs.create({url:url.href,active:true,...placement}).then(tab=>reply({opened:true,tabId:tab.id}),error=>reply({error:error.message}));
    }catch(error){reply({error:error.message});}
    return true;
  }
  if(message?.type!=='ris-settings-update')return;
  const operation=settingsQueue.then(async()=>{
    const stored=await chrome.storage.local.get('settings');
    const settings=RISSettings.sanitize({...RISSettings.sanitize(stored.settings),...message.patch});
    await chrome.storage.local.set({settings});return settings;
  });
  settingsQueue=operation.catch(()=>{});
  operation.then(settings=>reply({settings}),error=>reply({error:error.message}));
  return true;
});
function ensureMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({id: MENU_ID, title: 'Im RIS suchen: "%s"', contexts: ['selection']});
  });
}
chrome.runtime.onInstalled.addListener(ensureMenu);
chrome.runtime.onStartup.addListener(ensureMenu);

async function search(text, disposition = 'newForegroundTab', tabId, allowWebSearch = true) {
  let url;
  try {
    let ref=RIS.parseInput(text);
    if(Number.isInteger(tabId)&&['norm','law'].includes(ref.type)&&!ref.date&&!ref.year){
      const settings=await RISSettings.read();
      if(settings.pdfHistoricalYear){
        const meta=Object.entries(await chrome.storage.session.get()).find(([key,value])=>key.startsWith('risPdf:')&&value.tabId===tabId)?.[1];
        if(meta)ref=RISPdfHistory.apply(ref,settings,meta.publication);
        else {const tab=await chrome.tabs.get(tabId);if(/\.pdf(?:[?#]|$)/i.test(tab.url||''))ref=RISPdfHistory.apply(ref,settings,RISPdfHistory.detect({title:tab.title,filename:RISPdfHistory.filename(tab.url)}));}
      }
    }
    if(ref.type==='search'&&!allowWebSearch)throw new Error('In der Auswahl wurde kein unterstütztes RIS-Zitat erkannt. Bitte Geschäftszahl oder Norm mit Gesetz angeben.');
    if(ref.year){
      const page=new URL(chrome.runtime.getURL('year.html'));
      page.searchParams.set('ref',JSON.stringify(ref));url=page.href;
    }else url = RIS.buildUrl(ref);
  }
  catch (error) { url = chrome.runtime.getURL('error.html') + '?message=' + encodeURIComponent(error.message) + '&query=' + encodeURIComponent(text); }
  if (disposition === 'currentTab') {
    // Target the tab of the window the user typed in. If that tab cannot be
    // changed, open a new tab instead of silently doing nothing.
    try {
      if (!Number.isInteger(tabId)) tabId = (await chrome.tabs.query({active: true, lastFocusedWindow: true}))[0]?.id;
      if (Number.isInteger(tabId)) await chrome.tabs.update(tabId, {url});
      else await chrome.tabs.create({url, active: true});
    } catch { await chrome.tabs.create({url, active: true}); }
  } else await chrome.tabs.create({url, active: disposition !== 'newBackgroundTab'});
}
chrome.omnibox.onInputChanged.addListener(text => {
  let description;
  try {
    const ref = RIS.parseInput(text);
    description = ref.type === 'search' ? 'Google-Suche: ' + ref.query : 'RIS: ' + RIS.label(ref) + (ref.type === 'norm' && !/^(AO|Ausgleichsordnung|KO|Konkursordnung)$/i.test(ref.law) && !ref.date && !ref.year ? ' (heutige Fassung)' : '');
  } catch (error) { description = error.message; }
  chrome.omnibox.setDefaultSuggestion({description: description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')});
});
chrome.omnibox.onInputEntered.addListener((text, disposition) => search(text, disposition).catch(console.error));
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && info.selectionText) return search(info.selectionText, 'newForegroundTab', tab?.id, false).catch(console.error);
});
