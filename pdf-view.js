'use strict';
(async()=>{
 const params=new URLSearchParams(location.search),id=params.get('id');
 const reply=await chrome.runtime.sendMessage({target:'ris-pdf-worker',type:'view',id});if(reply.error)throw Error(reply.error);
 document.title=reply.filename;
 const source=new URL(chrome.runtime.getURL('native.pdf'));source.searchParams.set('id',id);if(params.get('original')==='1')source.searchParams.set('original','1');source.hash=location.hash;
 const pdf=document.createElement('iframe');pdf.src=source.href;pdf.setAttribute('aria-label',reply.filename);document.body.replaceChildren(pdf);
})().catch(e=>document.querySelector('#status').textContent=e.message);
