'use strict';
importScripts('data.js', 'norms.js', 'collections.js', 'query.js', 'settings.js', 'pdf-session.js');

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
    const ref=RIS.parseInput(text);
    if(ref.type==='search'&&!allowWebSearch)throw new Error('In der Auswahl wurde kein unterstütztes RIS-Zitat erkannt. Bitte Geschäftszahl oder Norm mit Gesetz angeben.');
    if(ref.year){
      const page=new URL(chrome.runtime.getURL('year.html'));
      page.searchParams.set('ref',JSON.stringify(ref));url=page.href;
    }else url = RIS.buildUrl(ref);
  }
  catch (error) { url = chrome.runtime.getURL('error.html') + '?message=' + encodeURIComponent(error.message) + '&query=' + encodeURIComponent(text); }
  if (disposition === 'currentTab') {
    if (Number.isInteger(tabId)) await chrome.tabs.update(tabId, {url});
    else await chrome.tabs.update({url});
  } else await chrome.tabs.create({url, active: disposition !== 'newBackgroundTab'});
}
chrome.omnibox.onInputChanged.addListener(text => {
  let description;
  try {
    const ref = RIS.parseInput(text);
    description = ref.type === 'search' ? 'Google-Suche: ' + ref.query : 'RIS: ' + RIS.label(ref) + (ref.type === 'norm' && !ref.date && !ref.year ? ' (heutige Fassung)' : '');
  } catch (error) { description = error.message; }
  chrome.omnibox.setDefaultSuggestion({description: description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')});
});
chrome.omnibox.onInputEntered.addListener((text, disposition) => search(text, disposition).catch(console.error));
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && info.selectionText) return search(info.selectionText, 'newForegroundTab', tab?.id, false).catch(console.error);
});
