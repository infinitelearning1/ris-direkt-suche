'use strict';
chrome.runtime.sendMessage({target:'ris-pdf-worker',type:'link',url:location.hash.slice(1)}).then(reply=>{if(reply.error)throw Error(reply.error);location.replace(reply.url);}).catch(e=>document.querySelector('#status').textContent='Die Fundstelle konnte nicht geöffnet werden: '+e.message);
