'use strict';
(async function() {
  if(globalThis.RIS_PDF_RETURNING)return;
  const params = new URLSearchParams(location.search);
  const inputDate=params.get('FassungVom');
  const urlDate=inputDate&&/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(inputDate)?inputDate.split('.').reverse().map((s,i)=>i?s.padStart(2,'0'):s).join('-'):inputDate;
  if (params.get('extensionTriggered') !== 'true' || params.get('risAuto') === 'false') return;
  const root=document.documentElement;
  root?.setAttribute('data-ris-resolving','');
  const reveal=()=>root?.removeAttribute('data-ris-resolving');
  const watchdog=typeof setTimeout==='function'?setTimeout(reveal,5000):undefined;
  let redirected=false;
  try {
  if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
  const documents = new Map();
  const wholeLaws = new Set();
  for (const link of document.querySelectorAll('#MainContent_DocumentsList a[href]')) {
    let url;
    try { url = new URL(link.href, location.href); } catch { continue; }
    if (url.protocol !== 'https:' || !/(^|\.)ris\.bka\.gv\.at$/.test(url.hostname)) continue;
    if(url.pathname.endsWith('/GeltendeFassung.wxe')&&url.searchParams.get('Gesetzesnummer'))wholeLaws.add(url.searchParams.get('Gesetzesnummer'));
    const id = url.pathname.endsWith('/Dokument.wxe') ? url.searchParams.get('Dokumentnummer') : url.pathname.startsWith('/eli/') ? url.pathname.match(/NOR\d+/)?.[0] : url.pathname.endsWith('/NormDokument.wxe')&&/^\d{8}$/.test(url.searchParams.get('Gesetzesnummer')||'') ? [url.searchParams.get('Gesetzesnummer'),url.searchParams.get('Paragraf'),url.searchParams.get('Artikel'),url.searchParams.get('Anlage')].join(':') : null;
    if (id) documents.set(id, url);
  }
  // Only an unambiguous result is opened; multiple results remain visible.
  const count = document.body.innerText.match(/Dokument\s+[\d.]+\s+bis\s+[\d.]+\s+von\s+([\d.]+)/i) || document.body.innerText.match(/(?:Anzahl der Dokumente|Gefundene Dokumente|Treffer)\s*:?\s*([\d.]+)/i);
  if(!count)return;
  const total = Number(count[1].replace(/\./g, ''));
  if (documents.size !== 1 || total !== 1) return;
  const url = [...documents.values()][0];
  let documentHtml;
  if(params.get('Abfrage')==='Bundesnormen'&&params.get('Titel')){
    // A unique full-text title hit can still be a different statute. Verify its
    // own title/abbreviation before opening it; leave uncertain results visible.
    try{
      const response=await fetch(url.href,{credentials:'omit'});
      if(!response.ok)return;documentHtml=await response.text();
      const parsed=new DOMParser().parseFromString(documentHtml,'text/html'),fields={};
      for(const heading of parsed.querySelectorAll('h3')){
        const name=heading.textContent.trim();
        if(name==='Kurztitel'||name==='Abkürzung'||name==='Kundmachungsorgan')fields[name]=heading.parentElement.textContent.replace(heading.textContent,'').trim();
      }
      if(!RISYears.sameLaw(params.get('Titel'),{title:fields.Kurztitel,abbreviation:fields['Abkürzung'],publicationYear:fields.Kundmachungsorgan?.match(/\/(\d{4})\b/)?.[1]}))return;
    }catch{return;}
  }
  if (params.get('risMode') === 'law') {
    let id = url.searchParams.get('Gesetzesnummer') || (wholeLaws.size===1?[...wholeLaws][0]:null);
    // Paragraph 0 result rows sometimes have only an ELI link. Resolve the
    // statute's own "GeltendeFassung" link from that verified document.
    if(!id&&typeof fetch==='function'){
      try{
        const response=documentHtml===undefined?await fetch(url.href,{credentials:'omit'}):null;
        if(documentHtml!==undefined||response.ok){const html=documentHtml??await response.text();const ids=[...new Set([...html.matchAll(/GeltendeFassung\.wxe\?[^"'<>]*?Gesetzesnummer=(\d{8})/g)].map(m=>m[1]))];if(ids.length===1)id=ids[0];}
      }catch{/* Keep the verified individual document available on failure. */}
    }
    if (id) {
      const whole = new URL('https://www.ris.bka.gv.at/GeltendeFassung.wxe');
      whole.searchParams.set('Abfrage', 'Bundesnormen');
      whole.searchParams.set('Gesetzesnummer', id);
      if(urlDate)whole.searchParams.set('FassungVom',urlDate);
      location.replace(whole.href);redirected=true;
      return;
    }
  }
  if(params.get('Abfrage')==='Bundesnormen'&&urlDate)url.searchParams.set('FassungVom',urlDate);
  location.replace(url.href);redirected=true;
  } finally {
    if(watchdog!==undefined)clearTimeout(watchdog);
    if(!redirected)reveal();
  }
})();
