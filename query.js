/* Citation parsing is shared by webpage annotation and omnibox search. */
(function(root){
  'use strict';
  const data=root.RIS_DATA||{laws:[],fundstellen:[]};
  const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const key=s=>s.replace(/[\u00a0\u202f]/g,' ').replace(/[‐‑–—−]/g,'-').replace(/\s+/g,' ').trim().toUpperCase();
  const norms=root.RISNorms||(typeof require==='function'?require('./norms.js'):null);
  const collections=root.RISCollections||(typeof require==='function'?require('./collections.js'):null);
  if(!norms)throw new Error('RIS norm parser is missing.');
  if(!collections)throw new Error('RIS collection registry is missing.');
  function project(input){
    let text='';const offsets=[];
    for(let i=0;i<input.length;i++){
      let c=input[i];if(/[\u00ad\u200b\u2060\ufeff]/.test(c))continue;
      if(c==='\r')c='\n';else if(/\s/.test(c)&&c!=='\n')c=' ';if(/[‐‑–—−]/.test(c))c='-';if(c==='／')c='/';
      offsets.push(i);text+=c;
    }
    return{text,offsets};
  }
  const lawAt=text=>norms.readLaw(text,false,'law');
  const fundstellenPattern=data.fundstellen.length?new RegExp(`(?<![\\p{L}\\d])(${[...data.fundstellen].sort((a,b)=>b.length-a.length).map(esc).join('|')})\\s+(\\d{1,5}(?:\\.\\d{3})?)(?:\\s*([,/.])\\s*(\\d{1,5}))?(?![\\p{L}\\d])`,'giu'):null;
  function findMatches(input){
    const{text,offsets}=project(input),found=[];
    const push=(start,end,ref)=>{
      if(ref.type==='case'){
      const explicit=text.slice(Math.max(0,start-65),start).match(/\b(OGH|VwGH|VfGH)\s*(?:(?:vom\s*)?\d{1,2}\.\s*\d{1,2}\.\s*\d{2,4}\s*[,;]?\s*)?$/i);
        if(explicit&&explicit[1].toUpperCase()!==ref.court.toUpperCase())return;
      }
      if(end>start)found.push({start:offsets[start],end:offsets[end-1]+1,ref});
    };
    const scan=(re,fn)=>{for(const m of text.matchAll(re))fn(m);};
    scan(/\bECLI\s*:\s*AT\s*:\s*(O\s*G\s*H(?:\s*\d){4}|OGH|VWGH|VFGH)\s*:\s*\d{4}\s*:\s*[A-Z0-9_.-]+/gi,m=>{
      let value=m[0],end=m.index+value.length;
      const court=m[1].replace(/\s/g,'').toUpperCase().startsWith('OGH')?'OGH':m[1].toUpperCase();
      const complete=s=>court==='OGH'?/^(?:E\d{5,}|[A-Z0-9]+\.[A-Z0-9]+\.\d{4}\.\d{3})$/i.test(s.split(':').at(-1)):
        court==='VWGH'?/\.[A-Z]\d{2}$/i.test(s):/\.\d{4}$/i.test(s);
      if(!complete(value.replace(/[.,]+$/,''))&&value.endsWith('.')){
        const continuation=text.slice(end).match(court==='OGH'?/^\n[ \t]*(?:\d{4}\.\d{3}|\d{3})(?![\p{L}\d])/u:/^\n[ \t]*[A-Z]\d{2}(?![\p{L}\d])/u);
        if(continuation&&complete((value+continuation[0]).replace(/\s/g,''))){value+=continuation[0];end+=continuation[0].length;}
      }
      const punctuation=value.match(/[.,]+$/)?.[0]||'';
      value=value.slice(0,value.length-punctuation.length);end-=punctuation.length;
      if(!complete(value.replace(/\s/g,'')))return;
      push(m.index,end,{type:'ecli',court,query:value.replace(/\s/g,'')});
    });
    scan(/\b(?:RIS[- ]?Justiz\s*)?RS\s*(\d{7})(?![\p{L}\d])/giu,m=>push(m.index,m.index+m[0].length,{type:'rs',query:'RS'+m[1]}));
    scan(/(?<![\p{L}\d])(?:OGH\s*)?(\d{1,2}\s*(?:ObA|ObS|Ob|Os|Ocg|Oc|Ok|Nc|Nds|Nd|Ns|N|Ds|Pr|Fsc)\s*\d+\s*\/\s*\d{2,4}(?:[a-z]|\s+[a-z](?![\p{L}\d_]))?)(?:-\d+)?(?![\p{L}\d])/giu,m=>{
      const q=m[1].match(/^(\d+)\s*([a-z]+)\s*(\d+)\s*\/\s*(\d{2,4})(?:\s*([a-z]))?$/i);
      if(/^(?:n|nc|nd|nds|ns|ds)$/i.test(q[2])&&/\b(?:BG|LG|OLG|HG|ASG|Bezirksgericht|Landesgericht|Oberlandesgericht)\s+(?:[\p{L}.-]+\s+){0,3}$/iu.test(text.slice(Math.max(0,m.index-90),m.index)))return;
      const types={ob:'Ob',oba:'ObA',obs:'ObS',os:'Os',oc:'Oc',ocg:'Ocg',ok:'Ok',nc:'Nc',ns:'Ns',nds:'Nds',nd:'Nd',n:'N',ds:'Ds',pr:'Pr',fsc:'Fsc'};
      push(m.index,m.index+m[0].length,{type:'case',court:'OGH',query:`${q[1]} ${types[q[2].toLowerCase()]} ${q[3]}/${q[4]}${(q[5]||'').toLowerCase()}`});
    });
    scan(/(?<![\p{L}\d])(?:VwGH\s*)?((?:Ra|Ro|Re|Fr|Fe|So|Ko|AW|EU)\s*\d{4}\s*\/\s*\d{2}\s*\/\s*\d{1,4})(?:-\d+)?(?![\p{L}\d])/giu,m=>push(m.index,m.index+m[0].length,{type:'case',court:'VwGH',query:m[1].replace(/\s*\/\s*/g,'/').replace(/^([a-z]{2})\s*/i,(_,p)=>/AW|EU/i.test(p)?p.toUpperCase()+' ':p[0].toUpperCase()+p[1].toLowerCase()+' ')}));
    scan(/(?<![\p{L}\d/])((?:19|20)\d{2}\s*\/\s*\d{2}\s*\/\s*\d{4})(?:-\d+)?(?![\p{L}\d/])/giu,m=>{
      if(/\b(?:Ra|Ro|Re|Fr|Fe|So|Ko|AW|EU)\s*$/i.test(text.slice(Math.max(0,m.index-12),m.index)))return;
      push(m.index,m.index+m[0].length,{type:'case',court:'VwGH',query:m[1].replace(/\s/g,'')});
    });
    scan(/\bVwGH\s*(?:(?:vom\s*)?\d{1,2}\.\s*\d{1,2}\.\s*\d{2,4}\s*[,;]?\s*)?(\d{2,4}\s*\/\s*\d{2}\s*\/\s*\d{1,4}|\d{1,5}\s*\/\s*\d{2,4})(?:-\d+)?(?!\d)/gi,m=>push(m.index,m.index+m[0].length,{type:'case',court:'VwGH',query:m[1].replace(/\s/g,'')}));
    scan(/(?<![\p{L}\d])(?:VfGH\s*)?((?:W\s*(?:III|II|I)|K\s*(?:II|I)|UA|KR|SV|[BEGVWAKUHDR])\s*-?\s*\d+\s*\/\s*\d{2,4})(?:-\d+)?(?![\p{L}\d])/gu,m=>{
      if(/\d{1,3}\s+$/.test(text.slice(Math.max(0,m.index-12),m.index)))return;
      push(m.index,m.index+m[0].length,{type:'case',court:'VfGH',query:m[1].replace(/\s*\/\s*/g,'/').replace(/^([A-Z\s]+)(-?)(?=\d)/,(_,p,dash)=>p.replace(/\s/g,'')+(dash||' '))});
    });
    scan(/\bVfGH\s*((?:W\s*(?:III|II|I)|K\s*(?:II|I)|UA|KR|SV|[BEGVWAKUHDR])\s*-?\s*\d+\s*\/\s*\d{2,4})(?:-\d+)?(?![\p{L}\d])/giu,m=>
      push(m.index,m.index+m[0].length,{type:'case',court:'VfGH',query:m[1].replace(/\s*\/\s*/g,'/').replace(/^([a-z\s]+)(-?)(?=\d)/i,(_,prefix,dash)=>prefix.replace(/\s/g,'').toUpperCase()+(dash||' '))}));
    scan(/\bVfGH\s+(\d{1,5}\s*\/\s*\d{2,4})(?![\d/]|\s*\/)/gi,m=>push(m.index,m.index+m[0].length,{type:'case',court:'VfGH',query:m[1].replace(/\s/g,'')}));
    const range=m=>{
      if(/\d{1,3}\s+$/.test(text.slice(Math.max(0,m.index-12),m.index)))return;
      const from=Number(m[2]),to=Number(m[3]);if(to<from||to-from>100)return;
      const queries=Array.from({length:to-from+1},(_,i)=>m[1].toUpperCase()+' '+(from+i)+'/'+m[4]);
      push(m.index,m.index+m[0].length,{type:'case',court:'VfGH',query:queries.join(' oder '),queries,display:m[0]});
    };
    scan(/(?<![\p{L}\d])(?:VfGH\s*)?([BEGVU])\s*(\d+)\s*-\s*(\d+)\s*\/\s*(\d{2,4})(?:-\d+)?(?![\p{L}\d])/gu,range);
    scan(/\bVfGH\s*([BEGVU])\s*(\d+)\s*-\s*(\d+)\s*\/\s*(\d{2,4})(?:-\d+)?(?![\p{L}\d])/giu,range);
    for(const m of norms.findMatches(text))push(m.start,m.end,m.ref);
    for(const m of collections.findMatches(text))push(m.start,m.end,m.ref);
    scan(/\b(VfSlg|VwSlg)\s*(\d{1,5}(?:\.\d{3})?)(?:[ \t]*([AF])(?![\p{L}]))?(?:\s*\/\s*(\d{4}))?/gu,m=>{
      if(m[1]==='VfSlg'&&m[3])return;
      push(m.index,m.index+m[0].length,{type:'fundstelle',court:m[1]==='VfSlg'?'VfGH':'VwGH',query:m[0].replace(/\s+/g,' '),collectionNumber:m[2].replace(/\./g,'')+(m[3]||'')});
    });
    if(fundstellenPattern)scan(fundstellenPattern,m=>{
      if(!m[3]&&!/Slg|^Arb$|^EF$/i.test(m[1]))return;
      if(['NR','RZ','AR','PV','EE','HS'].includes(m[1].toUpperCase())&&m[1]!==m[1].toUpperCase())return;
      if(/^NR$/i.test(m[1])&&/\b[BL]GBl[^.;§]{0,25}$/i.test(text.slice(Math.max(0,m.index-30),m.index)))return;
      push(m.index,m.index+m[0].length,{type:'fundstelle',query:`${m[1]} ${m[2]}${m[3]?m[3]+m[4]:''}`});
    });
    found.sort((a,b)=>a.start-b.start||b.end-a.end);let end=-1;
    return found.filter(m=>{if(m.start<end)return false;end=m.end;return true;});
  }
  function localDate(date=new Date()){return`${String(date.getDate()).padStart(2,'0')}.${String(date.getMonth()+1).padStart(2,'0')}.${date.getFullYear()}`;}
  function parseDate(value){
    let d,mo,y,m;
    if((m=value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)))[,d,mo,y]=m.map(Number);
    else if((m=value.match(/^(\d{4})-(\d{2})-(\d{2})$/)))[,y,mo,d]=m.map(Number);
    else throw new Error('Datum bitte als @TT.MM.JJJJ oder @JJJJ-MM-TT eingeben.');
    const date=new Date(0);date.setFullYear(y,mo-1,d);date.setHours(12,0,0,0);
    if(y<1000||y>9999||date.getFullYear()!==y||date.getMonth()!==mo-1||date.getDate()!==d)throw new Error('Dieses Datum gibt es nicht. Beispiel: @01.01.2020.');
    return localDate(date);
  }
  function parseInput(input){
    let text=input.trim(),date,year;const suffix=text.match(/\s+@\s*([^\s]+)\s*$/)||text.match(/@\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4}|\d{4})$/);
    if(suffix){
      if(/^\d{4}$/.test(suffix[1])){year=Number(suffix[1]);if(year<1000)throw new Error('Bitte ein vierstelliges Jahr zwischen 1000 und 9999 angeben.');}
      else date=parseDate(suffix[1]);
      text=text.slice(0,suffix.index).trim();
    }
    if(!text)throw new Error('Bitte eine Norm, eine Geschäftszahl oder einen Suchbegriff eingeben.');
    let ref=findMatches(text)[0]?.ref;
    if(!ref&&/^(?:W\s*(?:III|II|I)|K\s*(?:II|I)|UA|KR|SV|[BEGVWAKUHDR])\s*-?\s*\d+\s*\/\s*\d{2,4}(?:-\d+)?$/i.test(text))ref=findMatches('VfGH '+text)[0]?.ref;
    if(!ref){const bare=text.match(/^(?:§\s*)?(\d+[a-z]?)\s+(.+)$/i);if(bare){const law=lawAt(bare[2]);if(law&&law.length===bare[2].length)ref={type:'norm',marker:'§',number:bare[1],law:law.law,lawImplicitYear:law.implicitYear};}}
    if(!ref){const law=lawAt(text);if(law&&law.length===text.length)ref={type:'law',law:law.law,lawImplicitYear:law.implicitYear};}
    if(!ref)ref={type:'search',query:text};
    if(['norm','law'].includes(ref.type)&&text.includes('@'))throw new Error('Datum bitte als @TT.MM.JJJJ oder @JJJJ-MM-TT eingeben.');
    if((date||year)&&!['norm','law'].includes(ref.type))throw new Error('Der Zusatz @Datum oder @Jahr ist für Normen und ganze Gesetze vorgesehen. Das Gesetz wurde nicht erkannt.');
    if((date||year)&&ref.lawImplicitYear)ref={...ref,law:ref.law.replace(/\s+\d{4}$/, '')};
    return{...ref,date,year};
  }
  function label(ref){return['norm','law'].includes(ref.type)?[ref.marker,ref.number,ref.details,ref.law,ref.date?'@'+ref.date:ref.year?'@'+ref.year+' (Kalenderjahr)':''].filter(Boolean).join(' '):ref.display||ref.query;}
  function buildUrl(ref,today=localDate()){
    if(ref.year)throw new Error('Eine Jahressuche benötigt die Jahresübersicht der Erweiterung.');
    if(ref.type==='search')return'https://www.google.com/search?q='+encodeURIComponent(ref.query);
    const url=new URL('https://www.ris.bka.gv.at/Ergebnis.wxe'),p=url.searchParams;
    p.set('extensionTriggered','true');p.set('ResultPageSize','100');
    if(['norm','law'].includes(ref.type)){
      // RIS can interpret dotted dates as month/day. ISO avoids an ambiguous
      // 05.06 -> 06.05 swap while the input and label remain German.
      const date=ref.date||today;
      const urlDate=/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(date)?date.split('.').reverse().map((s,i)=>i?s.padStart(2,'0'):s).join('-'):date;
      const law=/^HGB$/i.test(ref.law)?'UGB':/^KO$/i.test(ref.law)?'IO':ref.law;
      const numbers=ref.type==='norm'?ref.number.match(/\d+[a-z]?/gi):[];
      if(numbers.length===1&&/^\d+$/.test(numbers[0])&&/^f\.?$/i.test(ref.details||''))numbers.push(String(Number(numbers[0])+1));
      const id=ref.marker==='Art'?data.directArticleIds?.[key(law)]:(ref.type==='norm'?data.directParagraphIds?.[key(law)]:undefined)||data.directLawIds?.[key(law)];
      const requested=ref.date?.split('.').reverse().map((s,i)=>i?s.padStart(2,'0'):s).join('-');
      const provenDate=!ref.date||!ref.lawImplicitYear&&data.directLawStarts?.[id]&&requested>=data.directLawStarts[id];
      if(id&&/^\d{8}$/.test(id)&&provenDate&&(ref.type==='law'||numbers.length===1)){
        const direct=new URL('https://www.ris.bka.gv.at/'+(ref.type==='law'?'GeltendeFassung.wxe':'NormDokument.wxe'));
        const q=direct.searchParams;q.set('Abfrage','Bundesnormen');q.set('Gesetzesnummer',id);q.set('FassungVom',urlDate);
        if(ref.type==='norm')q.set(ref.marker==='Art'?'Artikel':'Paragraf',numbers[0]);
        return direct.href;
      }
      p.set('Abfrage','Bundesnormen');p.set('Titel',law);p.set('FassungVom',urlDate);
      if(ref.type==='law'){p.set('VonParagraf','0');p.set('BisParagraf','0');p.set('risMode','law');}
      else{
        const part=ref.marker==='Art'?'Artikel':'Paragraf';
        p.set('Von'+part,numbers[0]);p.set('Bis'+part,numbers.at(-1));
        if(numbers.length>1)p.set('risAuto','false');
      }
    }else{
      const court=ref.court?.toUpperCase();p.set('Abfrage',court==='VWGH'?'Vwgh':court==='VFGH'?'Vfgh':'Justiz');
      // RIS redirects server-side only when its complete result set is unique.
      // No preliminary request and no result-page paint for a single decision.
      p.set('SkipToDocumentPage','True');
      if(ref.type==='rs'){p.set('Rechtssatznummer',ref.query);p.set('SucheNachRechtssatz','True');p.set('SucheNachText','False');}
      else if(ref.type==='ecli'){p.set('Suchworte',ref.query);p.set('SucheNachRechtssatz','True');p.set('SucheNachText','True');}
      else{p.set('SucheNachRechtssatz','False');p.set('SucheNachText','True');const query=ref.court==='VfGH'?(ref.queries||[ref.query]).map(q=>q.replace(/\s/g,'')).join(' oder '):ref.query;p.set(ref.collectionNumber?'Sammlungsnummer':ref.type==='fundstelle'?'Fundstelle':'GZ',(ref.collectionNumber?(court==='VWGH'?ref.query.replace(/(VwSlg\s+)([\d.]+)/i,(_,prefix,n)=>prefix+n.replace(/\./g,''))+( /\/\d{4}$/.test(ref.query)?'':'*'):ref.collectionNumber):null)||(ref.type==='fundstelle'?collections.phrases(ref).map(q=>'"'+q.replace(/"/g,'')+'"').join(' oder '):query));}
      if(['VWGH','VFGH'].includes(court)){p.set('Dokumenttyp','Entscheidungstext');p.set('Dokumenttyp.SucheInEntscheidungstexten','true');p.set('Dokumenttyp.SucheInRechtssaetzen','false');}
    }
    return url.href;
  }
  root.RIS={findMatches,parseInput,parseDate,localDate,buildUrl,label,key};
  if(typeof module!=='undefined')module.exports=root.RIS;
})(globalThis);
