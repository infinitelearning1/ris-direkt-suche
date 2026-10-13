import {annotatePDF} from './pdf-annotate.mjs';
const documents=new Map();let queue=Promise.resolve();
const drawKey=s=>JSON.stringify([s.style,s.normColor,s.caseColor,s.rsColor,s.fundstelleColor,s.highlightColor,s.enabledCourts,s.markFundstellen,s.markCollections]);
navigator.serviceWorker.addEventListener('message',event=>{
 const m=event.data,p=event.ports[0];if(m?.target!=='ris-pdf-cache'||!p||event.source?.scriptURL!==chrome.runtime.getURL('background.js'))return;
 (async()=>{
  if(m.type==='put'){if(!(m.original instanceof Blob)||!(m.blob instanceof Blob)||!m.blob.size)throw Error('Unvollständige PDF-Daten.');documents.set(m.id,{original:m.original,blob:m.blob,references:m.references,settingsKey:drawKey(m.settings),pages:m.pages});return{stored:true};}
  const doc=documents.get(m.id);
  if(m.type==='release'){doc?.controller?.abort();documents.delete(m.id);return{released:true};}
  if(!doc)throw Error('Die temporäre PDF ist nicht mehr verfügbar. Bitte das Original erneut öffnen.');
  if(m.type==='get')return{blob:m.original?doc.original:doc.blob};
  if(m.type==='reference')return{ref:doc.references[m.index]};
  if(m.type==='refresh'){
   const key=drawKey(m.settings);if(doc.settingsKey===key)return{unchanged:true};doc.controller?.abort();const controller=new AbortController();doc.controller=controller;
   const work=queue.catch(()=>{}).then(async()=>{if(controller.signal.aborted)throw Error('Einstellungen wurden erneut geändert.');const result=await annotatePDF(doc.original,m.id,m.settings,{signal:controller.signal,referencesSeed:doc.references,onProgress:progress=>{chrome.runtime.sendMessage({target:'ris-pdf-worker',type:'progress',id:m.id,...progress}).catch(()=>{});}});if(documents.get(m.id)!==doc||controller.signal.aborted)throw Error('Die PDF wurde bereits geschlossen.');doc.blob=result.blob;doc.references=result.references;doc.settingsKey=key;return{updated:true};});queue=work;return work;
  }
  throw Error('Unbekannter PDF-Speicheraufruf.');
 })().then(v=>p.postMessage(v),e=>p.postMessage({error:e.message})).finally(()=>p.close());
});
await chrome.runtime.sendMessage({target:'ris-pdf-worker',type:'offscreen-ready'});
