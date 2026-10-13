/* Calendar-year search: initial version plus versions starting during the year.
   Their recorded end dates also cover deletion dates of whole-law provisions. */
(function(root){
  'use strict';
  const endpoint='https://data.bka.gv.at/ris/api/v2.6/Bundesrecht';
  const list=value=>!value?[]:Array.isArray(value)?value:[value];
  function validate(ref){
    if(!ref||!['norm','law'].includes(ref.type)||!Number.isInteger(ref.year)||ref.year<1000||ref.year>9999||typeof ref.law!=='string'||ref.law.length>250)throw new Error('Ungültige Jahressuche.');
    if(ref.type==='norm'&&(!['§','Art'].includes(ref.marker)||typeof ref.number!=='string'||!/^\d+[a-z]?(?:\s*(?:bis|-)\s*\d+[a-z]?)?$/i.test(ref.number)))throw new Error('Ungültige Normnummer.');
    return ref;
  }
  function queries(ref){
    validate(ref);
    const url=new URL(endpoint),p=url.searchParams;
    p.set('Applikation','BrKons');p.set('Titel',/^HGB$/i.test(ref.law)?'UGB':/^KO$/i.test(ref.law)?'IO':ref.law);p.set('DokumenteProSeite','OneHundred');
    if(ref.type==='norm'){
      const numbers=ref.number.match(/\d+[a-z]?/gi);
      p.set('Abschnitt.Von',numbers[0]);p.set('Abschnitt.Bis',numbers.at(-1));p.set('Abschnitt.Typ',ref.marker==='Art'?'Artikel':'Paragraph');
    }
    const from=ref.year+'-01-01',to=ref.year+'-12-31';
    const seed=new URL(url),starts=new URL(url);seed.searchParams.set('Fassung.FassungVom',from);
    starts.searchParams.set('Fassung.VonInkrafttretensdatum',from);starts.searchParams.set('Fassung.BisInkrafttretensdatum',to);
    const result=[{kind:'seed',url:seed.href},{kind:'starts',url:starts.href}];
    return result;
  }
  function date(value,optional=false){
    if(value===undefined||value===null||value===''||value?.['@xsi:nil']==='true'){
      if(optional)return null;throw new Error('RIS liefert kein Inkrafttretensdatum.');
    }
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Unbekanntes RIS-Datumsformat.');
    const d=new Date(value+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)throw new Error('Ungültiges RIS-Datum.');
    return value;
  }
  function nextDay(value){const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
  function trusted(url){
    try{const value=new URL(url);return value.protocol==='https:'&&/(^|\.)ris\.bka\.gv\.at$/.test(value.hostname)?value:null;}catch{return null;}
  }
  function lawKey(value){return String(value||'').replace(/[‐‑–—−]/g,'-').replace(/\s+/g,'').toUpperCase();}
  function sameLaw(request,version){
    // RIS Titel is a full-text filter: mentioning UStG in a regulation title
    // does not make that regulation the UStG. Compare complete identifiers.
    const wanted=lawKey(request),hasYear=/\d{4}$/.test(wanted);
    const canonical=value=>{let key=lawKey(value);if(!hasYear)key=key.replace(/\d{4}$/,'');return ['KO','KONKURSORDNUNG'].includes(key)?'IO':['HGB','HANDELSGESETZBUCH'].includes(key)?'UGB':key;};
    if([version.abbreviation,version.title].some(value=>value&&canonical(value)===canonical(wanted)))return true;
    if(hasYear){
      const year=wanted.slice(-4),base=wanted.slice(0,-4),abbreviation=lawKey(version.abbreviation);
      // Some official abbreviations omit the year that is explicit in the full
      // title or original publication reference (StPO 1975, FPG/NAG 2005).
      return canonical(abbreviation)===canonical(base)&&[lawKey(version.title).match(/(\d{4})$/)?.[1],version.publicationYear].includes(year);
    }
    return false;
  }
  function records(input,year,request){
    const from=year+'-01-01',to=year+'-12-31',found=new Map();
    for(const item of input){
      const meta=item?.Data?.Metadaten,law=meta?.Bundesrecht,norm=law?.BrKons;
      const identity={title:law?.Kurztitel||law?.Abkuerzung||norm?.Abkuerzung||'',abbreviation:norm?.Abkuerzung||law?.Abkuerzung||'',publicationYear:norm?.StammnormBgblnummer?.match(/\/(\d{4})\b/)?.[1]};
      if(request&&!sameLaw(request,identity))continue;
      if(!norm||!/^NOR\d+$/.test(meta.Technisch?.ID||'')||!/^\d{8}$/.test(norm.Gesetzesnummer||''))throw new Error('Unvollständige RIS-Normdaten.');
      const start=date(norm.Inkrafttretensdatum),end=date(norm.Ausserkrafttretensdatum,true);
      if(end&&end<start)throw new Error('Widersprüchliche RIS-Gültigkeitsdaten.');
      if(start>to||(end&&end<from))continue;
      const url=trusted(law.Eli)||trusted(meta.Allgemein?.DokumentUrl);
      if(!url)throw new Error('RIS liefert kein überprüfbares Dokumentziel.');
      found.set(meta.Technisch.ID,{id:meta.Technisch.ID,lawId:norm.Gesetzesnummer,...identity,part:norm.ArtikelParagraphAnlage||'',start,end,note:typeof norm.Beachte==='string'?norm.Beachte.replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,''):'',url:url.href});
    }
    return [...found.values()].sort((a,b)=>a.lawId.localeCompare(b.lawId)||a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
  }
  function results(ref,input){
    validate(ref);const versions=records(input,ref.year,ref.law).filter(version=>{
      if(ref.type!=='norm')return true;
      const actual=version.part.match(/^(§|Art\.?|Artikel)\s*(\d+[a-z]?)(?![\p{L}\d])/iu);
      if(!actual||(actual[1]==='§'?'§':'Art')!==ref.marker)return false;
      const bounds=ref.number.match(/\d+[a-z]?/gi).map(n=>n.toLowerCase()),number=actual[2].toLowerCase();
      if(bounds.length===1)return number===bounds[0];
      const rank=n=>Number(n.match(/^\d+/)[0])*100+(n.match(/[a-z]$/)?.[0].charCodeAt(0)-96||0);
      return rank(number)>=rank(bounds[0])&&rank(number)<=rank(bounds.at(-1));
    }),from=ref.year+'-01-01',to=ref.year+'-12-31';
    if(ref.type==='norm')return versions.map(version=>{
      const selected=version.start>from?version.start:from,url=new URL(version.url);url.searchParams.set('FassungVom',selected);
      return {...version,date:selected,url:url.href,kind:'norm'};
    });
    const laws=new Map();for(const version of versions){if(!laws.has(version.lawId))laws.set(version.lawId,[]);laws.get(version.lawId).push(version);}
    const found=[];
    for(const [lawId,items]of laws){
      const dates=new Set([from]);
      for(const item of items){if(item.start>=from&&item.start<=to)dates.add(item.start);if(item.end&&item.end>=from&&item.end<to)dates.add(nextDay(item.end));}
      for(const selected of [...dates].sort()){
        if(!items.some(item=>item.start<=selected&&(!item.end||item.end>=selected)))continue;
        const url=new URL('https://www.ris.bka.gv.at/GeltendeFassung.wxe');url.searchParams.set('Abfrage','Bundesnormen');url.searchParams.set('Gesetzesnummer',lawId);url.searchParams.set('FassungVom',selected);
        found.push({lawId,title:items[0].title,date:selected,url:url.href,kind:'law'});
      }
    }
    return found;
  }
  async function search(ref,{fetcher=root.fetch,signal,onProgress=()=>{}}={}){
    const raw=[];
    // Sequential pages keep the official API load bounded and preserve errors.
    for(const query of queries(ref)){
      let page=1,total=0,expectedTotal,received=0;const ids=new Set();
      do{
        const url=new URL(query.url);url.searchParams.set('Seitennummer',String(page));
        const response=await fetcher(url.href,{credentials:'omit',headers:{Accept:'application/json'},signal});
        if(!response.ok)throw new Error('RIS-API nicht erreichbar (HTTP '+response.status+').');
        const data=await response.json(),result=data?.OgdSearchResult?.OgdDocumentResults;
        total=Number(result?.Hits?.['#text']);
        if(!Number.isInteger(total)||total<0||!result)throw new Error('Unbekannte RIS-API-Antwort.');
        if(total>10000)throw new Error('Diese Suche ist zu umfangreich. Bitte Normnummer oder genaueren Gesetzestitel angeben.');
        if(expectedTotal===undefined)expectedTotal=total;else if(total!==expectedTotal)throw new Error('Der RIS-Trefferbestand hat sich während der Suche geändert. Bitte erneut versuchen.');
        const batch=total===0?[]:list(result.OgdDocumentReference);
        if(batch.length!==Math.min(100,Math.max(0,total-(page-1)*100)))throw new Error('RIS liefert eine unvollständige Trefferseite.');
        if(result.Hits['@pageNumber']!==undefined&&Number(result.Hits['@pageNumber'])!==page)throw new Error('RIS liefert eine unerwartete Trefferseite.');
        for(const item of batch){const id=item?.Data?.Metadaten?.Technisch?.ID;if(!id||ids.has(id))throw new Error('RIS liefert doppelte oder unvollständige Trefferseiten.');ids.add(id);}
        received+=batch.length;
        raw.push(...batch);onProgress({kind:query.kind,page,pages:Math.max(1,Math.ceil(total/100)),documents:raw.length});
        page++;
      }while((page-1)*100<total);
      if(received!==expectedTotal)throw new Error('Die RIS-Ergebnisliste ist unvollständig.');
    }
    return results(ref,raw);
  }
  root.RISYears={validate,queries,records,results,search,sameLaw};
  if(typeof module!=='undefined')module.exports=root.RISYears;
})(globalThis);
