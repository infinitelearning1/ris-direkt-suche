'use strict';
const mode=document.querySelector('#mode'),history=document.querySelector('#pdfHistoricalYear'),status=document.querySelector('#status'),yearStatus=document.querySelector('#pdf-year');
let storageRevision=0;
function populate(settings){mode.value=settings.mode;history.checked=settings.pdfHistoricalYear;}
for(const control of [mode,history])control.disabled=true;
RISSettings.read().then(settings=>{if(storageRevision===0)populate(settings);})
 .catch(()=>{status.textContent='Einstellungen konnten nicht geladen werden. Bitte erneut öffnen.';})
 .finally(()=>{for(const control of [mode,history])control.disabled=false;});
for(const control of [mode,history])control.addEventListener('change',async()=>{
 if(control.disabled)return;
 const patch=control===mode?{mode:mode.value}:{pdfHistoricalYear:history.checked};
 for(const item of [mode,history])item.disabled=true;
 try{populate(await RISSettings.update(patch));status.textContent='Einstellung gespeichert. Die PDF wird aktualisiert.';}
 catch{status.textContent='Speichern fehlgeschlagen. Bitte erneut versuchen.';populate(await RISSettings.read());}
 finally{for(const item of [mode,history])item.disabled=false;}
});
chrome.storage.onChanged.addListener((changes,area)=>{
 if(area==='local'&&changes.settings){storageRevision++;populate(RISSettings.sanitize(changes.settings.newValue));}
});
document.querySelector('#options').addEventListener('click',()=>chrome.runtime.openOptionsPage());
async function showPdfContext(tab){
 const meta=Object.entries(await chrome.storage.session.get()).find(([key,value])=>key.startsWith('risPdf:')&&value.tabId===tab.id)?.[1];
 const source=meta?.sourceURL||tab.url||'';
 if(!meta&&!/\.pdf(?:[?#]|$)/i.test(source))return;
 yearStatus.textContent=RISPdfHistory.describe(meta?.publication||RISPdfHistory.detect({title:tab.title,filename:RISPdfHistory.filename(source)}))+' Bei aktivierter Option werden Normen in diesem Kalenderjahr gesucht.';
 if(!meta?.pages)return;
 const n=value=>Number(value||0).toLocaleString('de-AT');
 let line=document.querySelector('#pdf-stats');
 if(!line){line=document.createElement('p');line.className='hint';line.id='pdf-stats';status.after(line);}
 line.textContent=`Diese PDF: ${n(meta.pages)} ${meta.pages===1?'Seite':'Seiten'}, ${n(meta.citations)} ${meta.citations===1?'markiertes Zitat':'markierte Zitate'}, verlinkt in ${(Number(meta.processingMs||0)/1000).toLocaleString('de-AT',{maximumFractionDigits:1})} Sekunden.`;
}
chrome.tabs.query({active:true,currentWindow:true}).then(([tab])=>tab&&showPdfContext(tab)).catch(()=>{});
