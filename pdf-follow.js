'use strict';
const direct=document.querySelector('#target');
if(direct){location.replace(direct.href);}else{
const params=new URLSearchParams(location.search),target=new URL('https://www.ris.bka.gv.at/');
target.searchParams.set('risPdfNav',params.get('id')||'');target.searchParams.set('risPdfRef',params.get('ref')||'');target.searchParams.set('risPdfPage',params.get('page')||'');
chrome.runtime.sendMessage({target:'ris-pdf-worker',type:'link',url:target.href}).then(reply=>{if(reply.error)throw Error(reply.error);location.replace(reply.url);}).catch(e=>document.querySelector('#status').textContent='Die Fundstelle konnte nicht geöffnet werden: '+e.message);
}
