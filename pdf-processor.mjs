import {annotatePDF} from './pdf-annotate.mjs';
const id=new URLSearchParams(location.search).get('id'),abort=new AbortController();let meta,running=false;
function send(value){parent.postMessage({target:'ris-pdf-entry',id,...value},meta?.localSourceURL||!meta?.sourceOrigin||meta.sourceOrigin==='null'?'*':meta.sourceOrigin);}
async function store(value){const c=new MessageChannel();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{c.port1.close();reject(Error('Die PDF konnte nicht bereitgestellt werden.'));},15000);c.port1.onmessage=e=>{clearTimeout(timer);c.port1.close();e.data.error?reject(Error(e.data.error)):resolve(e.data);};navigator.serviceWorker.controller.postMessage({target:'ris-pdf-worker',type:'store',id,...value},[c.port2]);});}
async function process(original){
 if(running)return;running=true;
 try{const result=await annotatePDF(original,id,meta.settings,{signal:abort.signal,onProgress:progress=>send({type:'progress',...progress})});if(!result.citations){send({type:'empty',textPages:result.textPages});return;}const reply=await store({original,...result});send({type:'ready',...reply,processingMs:result.processingMs});}
 catch(e){send({type:'error',error:e.name==='AbortError'?'Verarbeitung abgebrochen.':e.message});}
}
window.addEventListener('message',async event=>{
 if(!meta||event.source!==parent||(event.origin!==meta.sourceOrigin&&!(meta.localSourceURL&&['null','file://'].includes(event.origin)))||event.data?.target!=='ris-pdf-processor'||event.data.id!==id)return;
 if(event.data.type==='cancel'){abort.abort();return;}
 if(event.data.type!=='input'||running||!(event.data.blob instanceof Blob))return;
 await process(event.data.blob);
});
try{meta=await chrome.runtime.sendMessage({target:'ris-pdf-worker',type:'processor',id});if(meta.error)throw Error(meta.error);if(!navigator.serviceWorker.controller)throw Error('Die PDF-Verarbeitung konnte nicht gestartet werden.');send({type:'input-ready',local:!!meta.localSourceURL});if(meta.localSourceURL){const response=await fetch(meta.localSourceURL,{signal:abort.signal});if(!response.ok)throw Error('Bitte den Zugriff auf Datei-URLs für die Erweiterung aktivieren.');await process(await response.blob());}}catch(e){send({type:'error',error:e.message});}
