/* Publication hints only: never use PDF creation dates or years in parent folders. */
(function(root){
 'use strict';
 const journals=['ZIK','JBl','ÖJZ','OeJZ','ÖBA','OeBA','RdW','ecolex','Zak','GesRZ','RdM','ZFR','VbR','ÖZW','ÖJZ','wbl','ZVR','RdA','DRdA','ASoK','SWK','SWI','taxlex','ÖStZ','NZ','JAP','JEV','ZfV','JRP','ZÖR','JSt','ZfRV','JMG','EF-Z','EvBl','RZ','ÖJZ-LSK','immolex','wobl','AnwBl'];
 const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const journal=new RegExp('(?<![\\p{L}\\d])(?:'+journals.map(esc).join('|')+')\\s*[,;/-]?\\s*((?:18|19|20)\\d{2})(?!\\d)','giu');
 const valid=year=>Number.isInteger(year)&&year>=1800&&year<=new Date().getFullYear();
 function normalize(value){
  if(typeof value!=='string')return '';
  return value.slice(0,8192).normalize('NFKC').replace(/_/g,' ').replace(/\s+/g,' ').replace(/\.pdf(?:\s*[-–—|]\s*Microsoft Edge)?\s*$/i,'').trim();
 }
 function extract(value){
  const text=normalize(value);if(!text)return {years:[]};
  const result=(matches,kind)=>({years:[...new Set(matches.map(m=>Number(m[1])).filter(valid))],kind});
  const strong=result([...text.matchAll(journal)],'journal');if(strong.years.length)return strong;
  const book=result([...text.matchAll(/[([]\s*((?:18|19|20)\d{2})\s*[)\]]/g)],'parentheses');if(book.years.length)return book;
  // Statute years, case numbers, full dates and year ranges are not publication hints.
  const cleaned=text.replace(/\b(?:[\p{L}][\p{L}-]*(?:G|VO)|StPO|StVO|KO|IO|AO|UGB|HGB)\s+(?:18|19|20)\d{2}\b/gu,'')
   .replace(/\b\d{1,2}\.\s*\d{1,2}\.\s*(?:18|19|20)\d{2}\b/g,'')
   .replace(/\b(?:18|19|20)\d{2}[-–—/](?:\d{2}|(?:18|19|20)\d{2})\b/g,'')
   .replace(/\b\d+\s*\/\s*(?:18|19|20)\d{2}\b/g,'');
  return result([...cleaned.matchAll(/(?<![\p{L}\d])((?:18|19|20)\d{2})(?![\p{L}\d])/gu)],'year');
 }
 function filename(sourceURL){try{const last=new URL(sourceURL).pathname.split('/').at(-1);try{return decodeURIComponent(last);}catch{return last;}}catch{return '';}}
 function detect({title='',filename:name='',metadataTitle=''}={}){
  const candidates=[['Dateiname',name],['Tabtitel',title],['PDF-Titel',metadataTitle]].map(([source,text])=>({source,text,...extract(text)}));
  const strong=candidates.filter(c=>c.years.length&&c.kind!=='year');
  const selected=strong.length?strong:candidates;
  const years=[...new Set(selected.flatMap(c=>c.years))].sort((a,b)=>a-b);
  if(years.length!==1)return {status:years.length?'ambiguous':'missing',years};
  const chosen=selected.find(c=>c.years.includes(years[0]));
  return {status:'detected',year:years[0],source:chosen.source,kind:chosen.kind};
 }
 function apply(ref,settings,publication){
  if(!settings?.pdfHistoricalYear||publication?.status!=='detected'||!valid(publication.year)||!['norm','law'].includes(ref.type)||ref.date||ref.year)return ref;
  return {...ref,law:ref.lawImplicitYear?ref.law.replace(/\s+\d{4}$/,''):ref.law,year:publication.year};
 }
 function describe(publication){
  if(publication?.status==='detected')return 'Erscheinungsjahr: '+publication.year+' ('+publication.source+').';
  if(publication?.status==='ambiguous')return 'Erscheinungsjahr nicht eindeutig: '+publication.years.join(', ')+'. Keine automatische Jahressuche.';
  return 'Kein eindeutiges Erscheinungsjahr im Dateinamen oder PDF-Titel erkannt. Keine automatische Jahressuche.';
 }
 root.RISPdfHistory={extract,detect,filename,apply,describe};
 if(typeof module!=='undefined')module.exports=root.RISPdfHistory;
})(globalThis);
