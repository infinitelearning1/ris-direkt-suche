/* Statute names, norm details and shared-law clauses. Source offsets stay intact. */
(function (root) {
  'use strict';
  const data = root.RIS_DATA || {};
  const key = text => text.replace(/[‐‑–—−]/g, '-').replace(/\s+/g, ' ').trim().toUpperCase();
  const aliases = { ESTG: 'EStG 1988', USTG: 'UStG 1994', GEWO: 'GewO 1994', STVO: 'StVO 1960', KFG: 'KFG 1967', WEG: 'WEG 2002', KHVG: 'KHVG 1994', WG:'Wehrgesetz 2001', MARKENSCHG:'Markenschutzgesetz 1970' };
  const articleAliases={WG:'Wechselgesetz 1955',SCHECKG:'Scheckgesetz 1955',...(data.articleAliases||{})};
  const mappings={'§':aliases,law:aliases,Art:{...aliases,...articleAliases}};
  const exactAliases={'MSCHG 1970':'Markenschutzgesetz 1970','MSCHG 1979':'Mutterschutzgesetz 1979'};
  const excluded = new Set(['DSGVO', 'AEUV', 'EUV', 'EU', 'EG', 'EWG', 'EGKS', 'GRC', 'BGB', 'GG', 'VWGO', 'INSO', 'REGE', 'AVB', 'ARB', 'SGB', 'INSVV', 'ZVG']);
  const ambiguousWords=new Set(['VOR','ARG','AU','AM','IM','IN','ZU','BEI','DES','DER','DEM','DIE','DAS','NACH','ODER','UND','FÜR']);
  const extras = ['VwGG', 'VfGG', 'EO', 'JN', 'AußStrG', 'BAO', 'VwGVG', 'KO', 'PSG', 'RAO', 'NO', 'GBG', 'WGG', 'KartG', 'UVG', 'StAG', 'JGG', 'GOG', 'GebAG', 'GGG', 'VBG', 'BDG', 'GehG', 'NAG', 'AsylG', 'FPG', 'KStG', 'UWG', 'PatG', 'MarkenSchG', 'MSchG', 'TKG', 'TKG 2003', 'TKG 2021', 'COVID-19-MG'];
  extras.push('HGB','AO','AußStrG 1854','UStG 1972','EStG 1972','VVG','VVG 1991');
  const articleLaws=new Set((data.articleLaws||[]).map(key));
  const officialNames=new Set([...(data.registeredAbbreviations||[]),...(data.registeredTitles||[])].map(key));
  const curatedNames=new Set([...Object.keys(aliases),...extras].map(key));
  const legacyNames=(data.laws||[]).filter(n=>!officialNames.size||officialNames.has(key(n))||curatedNames.has(key(n)));
  const names = [...legacyNames, ...(data.registeredAbbreviations || []), ...(data.registeredTitles || []), ...(data.articleLaws||[]), ...Object.keys(aliases),...Object.keys(articleAliases),...Object.keys(exactAliases), ...extras];
  const articleOnly=new Set([...articleLaws].filter(n=>!/^USTG(?: 1994)?$/.test(n)));
  const registered = new Set(names.map(key));
  const historicalYears={STVO:['1954','1960'],STPO:['1975'],KFG:['1967'],BDG:['1979'],ASYLG:['1991','1997','2005'],FPG:['2005'],NAG:['2005'],VVG:['1925','1950','1991'],AUSSSTRG:['1854','2003'],TKG:['1997','2003','2021']};
  const acceptsYear = (base,year) => registered.has(key(base)+' '+year)||historicalYears[key(base)]?.includes(year)||aliases[key(base)]?.endsWith(' '+year);
  const trie = Object.create(null);
  for (const name of names) {
    const normalized = key(name);
    if (excluded.has(normalized) || !normalized) continue;
    let node = trie;
    for (const c of normalized) node = node[c] || (node[c] = Object.create(null));
    node.value = normalized;
  }
  const fullNames = [
    [/^allgemein(?:es|en|e|er)?\s+bürgerlich(?:es|en|e|er)?\s+gesetzbuch(?:s|es)?/iu, 'ABGB'],
    [/^bundes[- ]verfassungsgesetz(?:es|s)?/iu, 'B-VG'],
    [/^europäisch(?:e|en|er)?\s+menschenrechtskonvention/iu, 'EMRK'],
    [/^insolvenzordnung/iu, 'IO'], [/^konkursordnung/iu, 'KO'],
    [/^zivilproze(?:ss|ß)ordnung/iu, 'ZPO'], [/^strafproze(?:ss|ß)ordnung/iu, 'StPO'],
    [/^strafgesetzbuch(?:s|es)?/iu, 'StGB'], [/^konsumentenschutzgesetz(?:es|s)?/iu, 'KSchG'],
    [/^mietrechtsgesetz(?:es|s)?/iu, 'MRG'], [/^versicherungsvertragsgesetz(?:es|s)?/iu, 'VersVG'],
    [/^telekommunikationsgesetz(?:es|s)?(?:\s+\d{4})?/iu, 'TKG']
  ];
  const detailStart = /^(?:Abs(?:atz|ätze)?\s*\.?\s*\d|Z(?:iffer|iff)?\s*\.?\s*\d|(?:sub)?lit\s*\.?\s*[a-z]|S(?:atz|ätze)?\s*\.?\s*\d|Halbsatz\s*\d|Hs\s*\.?\s*\d|Fall\s*\d|Alternative\s*\d|(?:vorletzte[rnms]?|letzte[rnms]?|erste[rnms]?|zweite[rnms]?|dritte[rnms]?)\s+(?:S|Fall|Halbsatz)|(?:aF|nF|idF)(?![\p{L}]))/iu;
  const word = c => !!c && /[\p{L}\d]/u.test(c);
  const spaces = (text, pos) => { const m = text.slice(pos).match(/^\s*/u); return pos + m[0].length; };

  function readLaw(text,repaired=false,marker='§') {
    const mapping=mappings[marker];
    const leading = text.match(/^\s*(?:(?:des|der)\s+)?/iu)[0].length;
    const tail = text.slice(leading);
    for (const [pattern, canonical] of fullNames) {
      const m = tail.match(pattern);
      if (!m || word(tail[m[0].length]) || /^-[\p{L}\d]/u.test(tail.slice(m[0].length))) continue;
      let explicit = tail.slice(m[0].length).match(/^\s+(\d{4})(?!\d)/u);
      if(explicit&&!acceptsYear(canonical,explicit[1])&&!acceptsYear(m[0],explicit[1]))explicit=null;
      const embeddedYear=m[0].match(/\d{4}$/)?.[0];
      if(embeddedYear&&!acceptsYear(canonical,embeddedYear))return null;
      const year = embeddedYear || explicit?.[1];
      const law=year?canonical+' '+year:canonical;
      if(marker==='§'&&articleOnly.has(key(law)))return null;
      return { law, length: leading + m[0].length + (explicit?.[0].length || 0), implicitYear: false };
    }
    let node = trie, pos = 0, best;
    while (pos < tail.length) {
      let c = tail[pos].toUpperCase().replace(/[‐‑–—−]/g, '-');
      if (/\s/u.test(c)) { c = ' '; pos = spaces(tail, pos); } else pos++;
      for (const letter of c) { node = node[letter]; if (!node) break; }
      if (!node) break;
      if (node.value && ((!word(tail[pos]) && !/^-[\p{L}\d]/u.test(tail.slice(pos))) || detailStart.test(tail.slice(pos)) || /^i\.?\s*v\.?\s*m\.?/i.test(tail.slice(pos)))) best = { end: pos, normalized: node.value };
    }
    if (best) {
      let raw = tail.slice(0, best.end).trim(), end = best.end;
      if(ambiguousWords.has(key(raw))&&raw!==raw.toUpperCase())best=null;
      if(!best)return null;
      // An explicitly written year always wins over a default year/abbreviation.
      const explicit = tail.slice(end).match(/^\s+(\d{4})(?!\d)/u);
      const defaultYear=mapping[key(raw)]?.match(/\d{4}$/)?.[0];
      if(explicit&&!acceptsYear(raw,explicit[1])&&defaultYear&&Number(explicit[1])<Number(defaultYear))return null;
      if (explicit && !/\d{4}$/.test(raw) && acceptsYear(raw,explicit[1])) { raw += ' ' + explicit[1]; end += explicit[0].length; }
      const hasYear = /\d{4}$/.test(raw);
      const base = key(raw.replace(/\s+\d{4}$/, ''));
      let law = raw.replace(/\s+/g, ' ').replace(/[‐‑–—−]/g, '-'), implicitYear = false;
      if(exactAliases[key(raw)])law=exactAliases[key(raw)];
      else if (hasYear && mapping[base]) law = mapping[base].replace(/\s+\d{4}$/, '') + ' ' + raw.match(/\d{4}$/)[0];
      else if (!hasYear && mapping[key(raw)]) { law = mapping[key(raw)]; implicitYear = true; }
      if(key(raw)==='MSCHG')return null; // Mutterschutz and Markenschutz use this citation.
      if(marker==='§'&&(articleOnly.has(key(law))||articleAliases[key(raw)]&&!mapping[key(raw)]))return null;
      return { law, length: leading + end, implicitYear };
    }
    if(!repaired&&/-[ \t]*\n/u.test(text.slice(0,240))){
      for(const retain of [true,false]){
        let fixed='',offsets=[];
        for(let i=0;i<Math.min(text.length,260);i++){
          const gap=text.slice(i).match(/^-[ \t]*\n[ \t]*(?=[\p{L}])/u);
          if(gap){if(retain){fixed+='-';offsets.push(i);}i+=gap[0].length-1;continue;}
          fixed+=text[i];offsets.push(i);
        }
        const found=readLaw(fixed,true,marker);
        if(found)return{...found,length:offsets[found.length-1]+1};
      }
    }
    return null;
  }

  function readNumber(text, pos) {
    const m = text.slice(pos).match(/^\d+/u);
    if (!m) return null;
    let end = pos + m[0].length;
    const c = text[end], rest = text.slice(end);
    if (c && /[a-z]/i.test(c) && !detailStart.test(rest) && !readLaw(rest,false,'law')) {
      const after = text.slice(end + 1);
      if (!word(text[end + 1]) || detailStart.test(after) || readLaw(after,false,'law')) end++;
    }
    return { start: pos, end, value: text.slice(pos, end) };
  }

  function numberList(text, start, stopBeforeRepeatedUnit) {
    const first = readNumber(text, start);
    if (!first) return null;
    const parts = [first]; let end = first.end;
    while (true) {
      const separator = text.slice(end).match(/^\s*(,|und\b|oder\b|bis\b|-)\s*/iu);
      if (!separator) break;
      const next = readNumber(text, end + separator[0].length);
      if (!next) break;
      if (stopBeforeRepeatedUnit && /^(?:Abs(?:atz|ätze)?\s*\.?)/iu.test(text.slice(spaces(text, next.end)))) break;
      if (stopBeforeRepeatedUnit && /^\.\s*(?:Satz|S\.?|Fall|Halbsatz|Hs\.?|Alternative|Alt\.?)(?![\p{L}])/iu.test(text.slice(next.end))) break;
      if (separator[1] === '-' || separator[1].toLowerCase() === 'bis') {
        const previous = parts.at(-1);
        previous.end = next.end;
        previous.value = text.slice(previous.start, next.end).replace(/\s+/g, ' ');
      } else parts.push(next);
      end = next.end;
    }
    return { parts, end };
  }

  function readDetails(text, start) {
    let pos = start, lastEnd = start;
    while (true) {
      let candidate = spaces(text, pos);
      const join = text.slice(candidate).match(/^(?:,|und\b|oder\b|i\.?\s*v\.?\s*m\.?|in\s+Verbindung\s+mit)\s*/iu);
      if (join) candidate = spaces(text, candidate + join[0].length);
      const remaining = text.slice(candidate);
      const ordinal = remaining.match(/^(?:\d+\.|erste[rnms]?|zweite[rnms]?|dritte[rnms]?|vierte[rnms]?|vorletzte[rnms]?|letzte[rnms]?)\s*/iu);
      if (ordinal) {
        const unit = text.slice(candidate + ordinal[0].length).match(/^(?:Satz|S\s*\.?|Halbsatz|Hs\s*\.?|Fall|F\.|Alternative|Alt\s*\.?)(?![\p{L}])/iu);
        if (!unit) break;
        pos = candidate + ordinal[0].length + unit[0].length; lastEnd = pos; continue;
      }
      const follows = remaining.match(/^f{1,2}\.?(?![\p{L}])/iu);
      if (follows) { pos = candidate + follows[0].length; lastEnd = pos; continue; }
      const version = remaining.match(/^(?:aF|nF|idF|i\.d\.F\.)(?![\p{L}])/iu);
      if(version){pos=candidate+version[0].length;lastEnd=pos;continue;}
      const unit = remaining.match(/^(Abs(?:atz|ätze)?|Unterabs(?:atz)?|Z(?:iffer|iff)?|sublit|lit|S(?:atz|ätze)?|Halbsatz|Hs|Fall|F\.|Alternative|Alt|Spiegelstrich|Teilstrich|Pkt|Punkt)\s*\.?\s*/iu);
      if (!unit) break;
      const valueStart = candidate + unit[0].length;
      if (/^(?:sub)?lit$/i.test(unit[1])) {
        let size=0;
        for(const n of [2,1])if(new RegExp('^[a-z]{'+n+'}$','i').test(text.slice(valueStart,valueStart+n))&&(!word(text[valueStart+n])||readLaw(text.slice(valueStart+n))||detailStart.test(text.slice(valueStart+n)))){size=n;break;}
        if(!size)break;
        pos = valueStart + size;
        while (true) {
          const another = text.slice(pos).match(/^\s*(?:,|und\b|oder\b)\s*([a-z])(?![\p{L}])/iu);
          if (!another) break;
          pos += another[0].length;
        }
      } else {
        const numbers = numberList(text, valueStart, true);
        if (!numbers) break;
        pos = numbers.end;
      }
      lastEnd = pos;
    }
    return { end: lastEnd, value: text.slice(start, lastEnd).trim().replace(/\s+/g, ' ') };
  }

  function leadingLaw(text, markerStart,marker='§') {
    const windowStart = Math.max(0, markerStart - 220);
    const before = text.slice(windowStart, markerStart);
    let best;
    for (let i = 0; i < before.length; i++) {
      if (i && word(before[i - 1])) continue;
      const law = readLaw(before.slice(i),false,marker);
      if (law && !before.slice(i + law.length).trim()) {
        const prefix=before.slice(i).match(/^\s*(?:(?:des|der)\s+)?/iu)[0].length;
        best = { ...law, start: windowStart + i + prefix };
        break;
      }
    }
    return best;
  }

  function connected(gap) {
    if (/\n\s*\n/u.test(gap)) return false;
    return /^(?:\s|,|und|oder|sowie|i\.?\s*v\.?\s*m\.?|in\s+Verbindung\s+mit)*$/iu.test(gap);
  }

  function findMatches(text) {
    const groups = [];
    for (const m of text.matchAll(/§{1,2}|\bArt(?:ikel)?\.?/giu)) {
      const marker = m[0].startsWith('§') ? '§' : 'Art';
      const header = numberList(text, spaces(text, m.index + m[0].length));
      if (!header) continue;
      const members = header.parts.map((p, i) => ({ start: i ? p.start : m.index, end: p.end, ref: { type: 'norm', marker, number: p.value, details: '' } }));
      let tail = readDetails(text, header.end);
      members.at(-1).ref.details = tail.value;
      members.at(-1).end = tail.end;
      // A repeated Absatz designator makes an omitted paragraph marker explicit:
      // §§ 5 Abs 1, 6 Abs 2 ABGB has two paragraphs, not Absatz 1 and 6.
      while (true) {
        const join = text.slice(tail.end).match(/^\s*(?:,|und\b|oder\b)\s*/iu);
        if (!join) break;
        const next = readNumber(text, tail.end + join[0].length);
        if (!next || !/^Abs(?:atz|ätze)?\s*\.?/iu.test(text.slice(spaces(text, next.end)))) break;
        tail = readDetails(text, next.end);
        members.push({ start: next.start, end: tail.end, ref: { type: 'norm', marker, number: next.value, details: tail.value } });
      }
      let end = tail.end;
      const after = readLaw(text.slice(end),false,marker);
      let before = after?null:leadingLaw(text, m.index,marker);
      if(before&&groups.at(-1)?.end>before.start)before=null;
      const law = after || before;
      if (after) {
        end += after.length;
        const trailing = readDetails(text, end);
        if (trailing.end > end) {
          members.at(-1).ref.details = [members.at(-1).ref.details, trailing.value].filter(Boolean).join(' ');
          end = trailing.end;
        }
        members.at(-1).end = end;
      } else if (before) members[0].start = before.start;
      groups.push({ start: members[0].start, end, marker, law, members });
      // A comma after an explicitly named law can omit the next paragraph sign.
      // The omitted clause must itself name a recognized law; unrelated numbers
      // in prose are never assigned an arbitrary statute.
      if(after)while(true){
        const join=text.slice(end).match(/^\s*(?:,|und\b)\s*/iu);if(!join)break;
        const list=numberList(text,end+join[0].length);if(!list)break;
        const detail=readDetails(text,list.end),own=readLaw(text.slice(detail.end),false,marker);if(!own)break;
        const extra=list.parts.map(p=>({start:p.start,end:p.end,ref:{type:'norm',marker,number:p.value,details:''}}));
        end=detail.end+own.length;extra.at(-1).end=end;extra.at(-1).ref.details=detail.value;
        groups.push({start:extra[0].start,end,marker,law:own,members:extra});
      }
    }
    // An explicit unsupported/foreign name must never inherit a different law.
    for(const group of groups)if(!group.law){
      const token=text.slice(group.end).match(/^\s*(?:(?:des|der)\s+)?(?:\d+\.\s*)?([\p{L}][\p{L}\d-]*)/u)?.[1];
      group.blocked=!!token&&!/^(?:und|oder|sowie|iVm|in)$/i.test(token)&&(/[A-ZÄÖÜ]/u.test(token)||/^deutsch/iu.test(token));
    }
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (group.law||group.blocked) continue;
      // Prefer the nearest explicitly stated law to the right of an omitted law.
      // Do not propagate across norm kinds, paragraph breaks or unrelated prose.
      for (let j = i + 1; j < groups.length; j++) {
        if (groups[j].blocked||groups[j].marker !== group.marker || !connected(text.slice(groups[j - 1].end, groups[j].start))) break;
        if (groups[j].law) { group.inherited = groups[j].law; break; }
      }
      if (!group.inherited) {
        for (let j = i - 1; j >= 0; j--) {
          if (groups[j].blocked||groups[j].marker !== group.marker || !connected(text.slice(groups[j].end, groups[j + 1].start))) break;
          if (groups[j].law) { group.inherited = groups[j].law; break; }
        }
      }
    }
    return groups.flatMap(group => {
      const law = group.law || group.inherited;
      if (!law) return [];
      if(group.marker==='Art'&&!articleLaws.has(key(law.law)))return [];
      return group.members.map(member => ({ ...member, ref: { ...member.ref, law: law.law, lawImplicitYear: !!law.implicitYear } }));
    });
  }

  root.RISNorms = { readLaw, findMatches, key };
  if (typeof module !== 'undefined') module.exports = root.RISNorms;
})(globalThis);
