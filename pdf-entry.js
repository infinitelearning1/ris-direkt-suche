/* Only a currently opened, visible native PDF; no folder or background crawl. */
(function(){
 'use strict';if(window!==top||document.contentType!=='application/pdf'||globalThis.RIS_NATIVE_PDF_ENTRY)return;globalThis.RIS_NATIVE_PDF_ENTRY=true;let busy=false,attempted=false,id,frame,banner,controller,interacted=false;
 const extOrigin=new URL(chrome.runtime.getURL('')).origin;
 function dismiss(){banner?.remove();banner=null;}
 function show(text,cancel){if(!banner){banner=document.createElement('div');banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');banner.style.cssText='position:fixed;right:16px;bottom:18px;max-width:440px;padding:12px 16px;background:#fff;color:#1c2734;border:1px solid #d5dce5;border-radius:8px;font:14px/1.5 system-ui;box-shadow:0 3px 16px #0002;z-index:2147483647';document.body.append(banner);}banner.replaceChildren(document.createTextNode(text));const button=document.createElement('button');button.textContent=cancel?'Abbrechen':'Schließen';button.style.cssText='margin-left:12px;cursor:pointer';button.addEventListener('click',cancel||dismiss);banner.append(button);}
 function stop(){controller?.abort();if(frame)frame.contentWindow.postMessage({target:'ris-pdf-processor',type:'cancel',id},extOrigin);if(id)chrome.runtime.sendMessage({target:'ris-pdf-worker',type:'release',id}).catch(()=>{});frame?.remove();frame=null;busy=false;dismiss();}
 async function begin(){if(busy||document.visibilityState!=='visible')return;const settings=await RISSettings.read();if(!['both','pdf'].includes(settings.mode)||settings.excludedSites.some(h=>location.hostname===h||location.hostname.endsWith('.'+h)))return;attempted=true;busy=true;controller=new AbortController();interacted=false;
  try{const reply=await chrome.runtime.sendMessage({target:'ris-pdf-worker',type:'start',title:document.title});if(reply.error)throw Error(reply.error);if(reply.disabled){busy=false;return;}id=reply.id;frame=document.createElement('iframe');frame.src=reply.url;frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;left:0;top:0;width:1000px;height:1000px;opacity:0;pointer-events:none;border:0;z-index:-1';document.body.append(frame);show('Fundstellen im PDF werden verlinkt …',stop);}catch(e){busy=false;show(e.message);}
 }
 window.addEventListener('message',async event=>{if(!frame||event.source!==frame.contentWindow||event.origin!==extOrigin||event.data?.target!=='ris-pdf-entry'||event.data.id!==id)return;const m=event.data;
  try{
   if(m.type==='input-ready'&&!m.local){const response=await fetch(location.href,{credentials:'include',cache:'force-cache',signal:controller.signal});if(!response.ok)throw Error('Die geöffnete PDF ist nicht direkt lesbar (HTTP '+response.status+').');const blob=await response.blob();if(!blob.size||blob.size>256*1024*1024)throw Error('Die PDF ist leer oder größer als 256 MB.');frame.contentWindow.postMessage({target:'ris-pdf-processor',type:'input',id,blob},extOrigin);}
   if(m.type==='progress')show('Fundstellen im PDF: Seite '+m.page+' von '+m.pages,stop);
   if(m.type==='empty'){stop();return;}
   if(m.type==='error'){const error=m.error;stop();show(error);return;}
   if(m.type==='ready'){
    const target=new URL(m.url);if(target.origin!==extOrigin||target.pathname!=='/pdf-view.html'||target.searchParams.get('id')!==id)throw Error('Ungültige PDF-Anzeige.');const sourceHash=new URL(location.href).hash;if(/^#(?:page=\d+|zoom=)/i.test(sourceHash))target.hash=sourceHash;
    if(interacted&&m.processingMs>1500){show(m.citations+' Fundstellen bereit. Die markierte Ansicht wird einmal neu geladen.');const button=document.createElement('button');button.textContent='Markierungen anzeigen';button.addEventListener('click',()=>location.replace(target.href));banner.append(button);}else location.replace(target.href);
   }
  }catch(e){if(e.name==='AbortError')return;stop();show(e.message);}
 });
 for(const name of ['wheel','pointerdown','keydown'])window.addEventListener(name,()=>interacted=true,true);
 // A PDF opened in a background tab starts once it becomes visible. A finished, empty, failed or cancelled run is not repeated on every tab switch.
 document.addEventListener('visibilitychange',()=>{if(!busy&&!attempted)begin();});
 chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local'||!changes.settings)return;const s=RISSettings.sanitize(changes.settings.newValue);if(!['both','pdf'].includes(s.mode))stop();else if(!busy){attempted=false;begin();}});
 begin();
})();
