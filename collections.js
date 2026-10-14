/* Austrian decision collections and explicitly named decision-report series.
   Sources, scope and coverage limits: docs/ENTSCHEIDUNGSSAMMLUNGEN.md. */
(function(root){
 'use strict';
 const entries=[
  ['SZ','Sammlung Zivilrecht',['SZ'],'volume'],
  ['SSV-NF','Sozialrechtliche Entscheidungen des OGH, neue Folge',['SSV-NF','SSV NF','SSV-NF.'],'volume'],
  ['SVSlg','Sozialversicherungsrechtliche Entscheidungen',['SVSlg','SV-Slg'],'number'],
  ['SSV','Ältere sozialversicherungsrechtliche Entscheidungen',['SSV'],'volume'],
  ['ÖJZ-LS','Entscheidungsleitsätze der Österreichischen Juristenzeitung',['ÖJZ-LS','ÖJZ LS'],'year'],
  ['ZAS-Judikatur','Judikaturteil der Zeitschrift für Arbeits- und Sozialrecht',['ZAS-Judikatur','ZAS Judikatur'],'year'],
  ['RZ-EÜ','Entscheidungsübersicht der Richterzeitung',['RZ'],'overview'],
  ['SSt','Entscheidungen in Strafsachen',['SSt'],'volume'],
  ['Arb','Sammlung arbeitsrechtlicher Entscheidungen',['Arb','ArbSlg','Arb(Slg)','Arb-Slg'],'number'],
  ['EFSlg','Familien- und erbrechtliche Entscheidungen',['EFSlg','EF-Slg','EF(Slg)','EF'],'number'],
  ['MietSlg','Mietrechtliche Entscheidungen',['MietSlg','Miet-Slg'],'number'],
  ['HS','Handelsrechtliche Entscheidungen',['HS'],'number'],
  ['GlU','Zivilrechtliche Entscheidungen, ältere Folge',['GlU','GLU'],'number'],
  ['GlUNF','Zivilrechtliche Entscheidungen, neue Folge',['GlUNF','GLUNF','GlU NF','GlU N.F.','GlU N. F.'],'number'],
  ['KH','Historische Kassationshofsammlung',['KH'],'number'],
  ['VfSlg','Sammlung des Verfassungsgerichtshofs',['VfSlg'],'court'],
  ['VwSlg','Sammlung des Verwaltungsgerichtshofs',['VwSlg'],'court'],
  ['EvBl','Evidenzblatt der Rechtsmittelentscheidungen',['EvBl'],'year'],
  ['EvBl-LS','Leitsätze im Evidenzblatt',['EvBl-LS','EvBl LS'],'year'],
  ['JSt-Slg','Entscheidungssammlung des Journals für Strafrecht',['JSt-Slg','JSt Slg'],'year'],
  ['JSt-LS','Entscheidungsleitsätze des Journals für Strafrecht',['JSt-LS OGH','JSt-LS','JSt LS'],'year'],
  ['ÖBl-LS','Leitsätze der Österreichischen Blätter für gewerblichen Rechtsschutz',['ÖBl-LS','ÖBl LS'],'year'],
  ['ZfRV-LS','Leitsätze der Zeitschrift für Europarecht, internationales Privatrecht und Rechtsvergleichung',['ZfRV-LS','ZfRV LS'],'year'],
  ['Jus-Extra OGH-Z','Entscheidungsnachweise OGH Zivilsachen',['Jus-Extra OGH-Z','Jus Extra OGH-Z'],'number'],
  ['Jus-Extra OGH-St','Entscheidungsnachweise OGH Strafsachen',['Jus-Extra OGH-St','Jus Extra OGH-St'],'number']
 ].map(([key,title,aliases,format])=>({key,title,aliases,format,automatic:!['GlU','GlUNF','KH','SSV','SVSlg'].includes(key)}));
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'\\s+');
 const prefix=e=>'('+e.aliases.slice().sort((a,b)=>b.length-a.length).map(escape).join('|')+')';
 const number='(?:\\d{1,3}(?:\\.\\d{3})+|\\d{1,7})';
 const patterns=entries.filter(e=>!['court','overview'].includes(e.format)).map(e=>({e,re:new RegExp('(?<![\\p{L}\\d])'+prefix(e)+'\\s+(?:Nr\\.?\\s*)?'+(e.format==='number'?'('+number+')':'('+(e.format==='volume'?'(?:[IVXLCDM]+|\\d{1,4})':'\\d{4}')+')\\s*([/,])\\s*(\\d{1,5})')+'(?![\\p{L}\\d]|\\.\\d)','giu')}));
 function classify(ref){if(ref?.type!=='fundstelle')return null;return entries.find(e=>e.format==='overview'?/^RZ\s+\d{4}\s+EÜ\d+$/iu.test(ref.query):new RegExp('^'+prefix(e)+'\\s','i').test(ref.query))||null;}
 function roman(value){if(!/^[IVXLCDM]+$/.test(value)||!/^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(value))return null;const n={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};return[...value].reduce((sum,c,i,a)=>sum+(n[c]<(n[a[i+1]]||0)?-n[c]:n[c]),0);}
 function findMatches(text){const out=[];for(const{e,re}of patterns)for(const m of text.matchAll(re)){if(['HS','KH'].includes(e.key)&&m[1]!==m[1].toUpperCase())continue;if(e.format==='volume'&&/^[A-Z]+$/i.test(m[2])&&!roman(m[2].toUpperCase()))continue;const query=e.key+(/ OGH$/i.test(m[1])?' OGH':'')+' '+m[2]+(m[3]?m[3]+m[4]:'');out.push({start:m.index,end:m.index+m[0].length,ref:{type:'fundstelle',query}});}for(const m of text.matchAll(/\bRZ\s+(\d{4})(?:\s*[,/]\s*\d+)?\s+EÜ\s*(\d+)(?![\p{L}\d])/giu))out.push({start:m.index,end:m.index+m[0].length,ref:{type:"fundstelle",query:"RZ "+m[1]+" EÜ"+m[2]}});return out;}
 function phrases(ref){const entry=classify(ref);if(!entry||['court','overview'].includes(entry.format))return[ref.query];const value=(ref.query.toUpperCase().startsWith(entry.key.toUpperCase())?ref.query.slice(entry.key.length):ref.query.replace(new RegExp('^'+prefix(entry),'i'),'')).trim(),values=new Set([value]); // the text may use an alias such as EF instead of EFSlg
  if(entry.format==='number'){values.add(value.replace(/\./g,''));const digits=value.replace(/\./g,'');if(digits.length>3)values.add(digits.replace(/\B(?=(\d{3})+(?!\d))/g,'.'));}
  if(entry.format==='volume'){const m=value.match(/^([IVXLCDM]+)([/,])(\d+)$/i);if(m)values.add(roman(m[1].toUpperCase())+m[2]+m[3]);}
  const names=entry.key==='Arb'?['Arb','ArbSlg']:entry.key==='EFSlg'?['EFSlg','EF-Slg']:entry.key==='GlUNF'?['GlUNF','GlU NF']:[entry.key];
  return[...new Set(names.flatMap(name=>[...values].map(v=>name+' '+v)))];
 }
 function eligible(ref){const e=classify(ref);if(!e||!e.automatic)return false;if(e.format==='year'&&Number(ref.query.match(/\b\d{4}\b/)?.[0])<1946)return false;if(e.key==='VwSlg'&&!(Number(ref.query.match(/\/(\d{4})$/)?.[1])>=1990))return false;if(e.key==='SZ'||e.key==='SSt'){const part=ref.query.match(/\s([IVXLCDM]+|\d+)[/,]/i)?.[1],n=/^\d+$/.test(part||'')?Number(part):roman((part||'').toUpperCase());return n>=(n>=1000?(e.key==='SZ'?1946:1976):(e.key==='SZ'?21:47));}return true;}
 root.RISCollections={entries,classify,findMatches,phrases,eligible};if(typeof module!=='undefined')module.exports=root.RISCollections;
})(globalThis);
