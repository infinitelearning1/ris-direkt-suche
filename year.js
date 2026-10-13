'use strict';
const status=document.querySelector('#status'),results=document.querySelector('#results'),retry=document.querySelector('#retry');
let running=false;
function display(value){if(!value)return'ohne Enddatum';const[y,m,d]=value.split('-');return d+'.'+m+'.'+y;}
async function load(){
  if(running)return;running=true;retry.hidden=true;results.replaceChildren();
  try{
    const ref=RISYears.validate(JSON.parse(new URLSearchParams(location.search).get('ref')));
    document.querySelector('#title').textContent=[ref.marker,ref.number,ref.law,'im Jahr',ref.year].filter(Boolean).join(' ');
    const found=await RISYears.search(ref,{onProgress:p=>{status.textContent='RIS wird abgefragt: Seite '+p.page+' von '+p.pages+' ('+p.documents+' Normdatensätze) …';}});
    if(found.length===1){status.textContent='Die einzige Fassung im Kalenderjahr wird geöffnet …';location.replace(found[0].url);return;}
    status.textContent=found.length?found.length+' Fassung'+(found.length===1?'':'en')+' im Kalenderjahr '+ref.year+'.':'Keine passende Fassung im RIS für dieses Kalenderjahr gefunden.';
    for(const item of found){
      const section=document.createElement('section'),link=document.createElement('a'),detail=document.createElement('p');
      link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.className='button';
      link.textContent=item.kind==='norm'?item.title+' '+item.part+' öffnen':item.title+' – Fassung vom '+display(item.date);
      detail.textContent=item.kind==='norm'?'Diese Normfassung gilt laut RIS vom '+display(item.start)+' bis '+display(item.end)+'.':'Gesamte Rechtsvorschrift zum ermittelten Fassungstermin.';
      link.setAttribute('aria-label',link.textContent+(item.kind==='norm'?' – gültig von '+display(item.start)+' bis '+display(item.end):''));
      link.addEventListener('click',event=>{
        if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
        event.preventDefault();chrome.runtime.sendMessage({type:'ris-open-citation',url:item.url}).then(reply=>{if(!reply?.opened)window.open(item.url,'_blank','noopener');}).catch(()=>window.open(item.url,'_blank','noopener'));
      });
      section.append(detail,link);results.append(section);
      if(item.note){const note=document.createElement('p');note.className='hint';note.textContent='Zusätzlicher RIS-Hinweis: '+item.note;section.append(note);}
    }
  }catch(error){status.textContent='Jahressuche fehlgeschlagen: '+error.message;retry.hidden=false;}
  finally{running=false;}
}
retry.addEventListener('click',load);load();
