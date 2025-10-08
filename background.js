// File: v3/background.js
// -----------------------------------------------------------------------------
// RIS‑Direkt‑Suche – Service‑Worker (Manifest V3)
//
//  • Omnibox‑Keyword:  ris <SUCHBEGRIFF>
//  • Erweiterung um Direktaufruf konsolidierter Fassungen via Gesetzes‑Kürzel
//    (lawMapping – alle Keys **GROßGESCHRIEBEN**, weil der Omnibox‑Text mit
//    .toUpperCase() normalisiert wird).
//
//  Weiter unten ist der komplette Original‑Code unverändert enthalten
//  (Regex, extractQuery, usw.). Nur lawMapping + Listener‑Check wurden ergänzt.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Fundstellen‑Abkürzungen (unverändert)
// -----------------------------------------------------------------------------
const abbreviations = [
  "AFS","ALJ","AnwBl","AR","ASoK","AVR","bau aktuell","bbl","BFGjournal","BRZ","DAG",
  "Dako","DJA","DRdA","DRdA-infas","DSB","EALR","eastlex","ecolex","EE","EF-Z","Ern",
  "EvBl","FamZ","FJ","GES","GeS","GesRZ","GRAU","iFamZ","immo aktuell","immolex",
  "ImmoZak","infas","JAP","JAS","JBl","JEV","JMG","JRP","JSt","JSt-NL","JSt-Slg",
  "juridikum","jusIT","migraLex","migralex","MR","MR-Int","N@HZ","NetV","NLMR","NR",
  "NV","NZ","öarr","ÖBA","ÖBl","ögswissen","ögwthema","ÖJA","ÖJZ","ÖRPfl","ÖStZ",
  "ÖStZB","ÖZK","ÖZPR","ÖZW","OZK","PSR","PV","PVInfo","PVP","RdM","RdM-Ö&G","RdU",
  "RdU-U&T","RdW","RFG","RPA","RWK","RwSt","RWZ","RZ","S&R","Sach-Sonderheft",
  "Sachverständige","SIAK-Journal","SozSi","SPWR","StAW","SWI","SWK","taxlex",
  "TiRuP","UFSaktuell","UFSjournal","UVSaktuell","VbR","wbl","WBl","wobl","WoBl",
  "Zak","ZAS","ZfG","zfhr","ZFR","ZfRV","ZfRV-LS","ZFS","ZfS","ZfV","ZIIR","ZIK",
  "ZIR","ZLB","ZNR","ZÖR","ZRB","ZSS","ZTR","ZUV","zuvo","ZVB","ZVers","ZVG","ZVR",
  "ZWF","SZ","HS","GlU","GlUNF","EF(Slg)","EFSlg","EF","MietSlg","Arb(Slg)","ArbSlg",
  "Arb"
];

// -----------------------------------------------------------------------------
// Direkt‑Mapping  (KÜRZEL → Gesetzesnummer).  **Alle Keys UPPER‑CASE**!
// -----------------------------------------------------------------------------
const rawLawMapping = {
  "A-V": "20001913",
  "ABG 2012": "20007828",
  "ABGB": "10001622",
  "ABVO": "10008994",
  "ADBG 2007": "20005360",
  "ADG": "20006450",
  "ADGMV 2010": "20006985",
  "AFG": "10012870",
  "AFGV": "10012929",
  "AGESVG": "20009892",
  "AHG": "10000227",
  "AIFMG": "20008521",
  "ALLG GAG": "10001786",
  "ALLG STRSCHV": "20011249",
  "ALLG WABG": "10010189",
  "AM-VO": "20000727",
  "AMFG": "10008239",
  "AMG": "10010441",
  "AMSANWVO": "20003242",
  "AMSBHVO": "20003532",
  "AMSG": "10008905",
  "AMSPRV": "10008919",
  "ANERBG": "10001969",
  "ANERKG": "20004231",
  "ANFO": "10001734",
  "ANGG": "10008069",
  "ANHO": "10006102",
  "ANLELAUSBO": "20003399",
  "ANMG": "10000367",
  "APG": "20003831",
  "ARG": "10008541",
  "ARG-VO": "10008556",
  "ARBGVG": "10008329",
  "ARBI G": "10008840",
  "ARBKSTVO": "20004697",
  "ASCHG": "10008910",
  "ASGG": "10000813",
  "ASVG": "10008147",
  "AStV": "20002162",
  "AÜG": "10008655",
  "AÜV": "20002507",
  "AVG": "10005768",
  "AVO G": "10011038",
  "AVRAG": "10008872",
  "AZG": "10008238",
  "AZV": "20000256",
  "B-VG": "10000138",
  "BAURG": "10001732",
  "BBG": "10008713",
  "BSVG": "10008431",
  "BSVG": "10008431",
  "BTVG": "10003474",
  "BVG": "20001917",
  "DSG": "10001597",
  "ECG": "20001703",
  "E-GOVG": "20003230",
  "EHEG": "10001871",
  "EKHG": "10001981",
  "EMRK": "10000308",
  "EPG": "20006586",
  "EPIDEMIEG": "10010265",
  "ERUStV": "20003090",
  "ERWSCHVG": "10002937",
  "ESIBEG": "10001929",
  "ESTG 1988": "10004570",
  "FERNFING": "20003383",
  "FMEDV": "10003646",
  "FSG": "10012723",
  "GEWO 1994": "10007517",
  "GMBHG": "10001720",
  "GSVG": "10008422",
  "GTG": "10010826",
  "GUG": "10002501",
  "GWH": "10001753",
  "IPRG": "10002426",
  "IO": "10001736",
  "JWG": "10008691",
  "KFG 1967": "10011384",
  "KHVG": "10012323",
  "KHVG 1994": "10002970",
  "KLGG": "10011324",
  "KSCHG": "10002462",
  "KSCHG": "10002447",
  "LFG": "10011306",
  "LFG": "10011341",
  "LIEGTEILG": "10001787",
  "LIEGTEILG": "10007965",
  "LPG": "10010330",
  "LPG": "10002264",
  "MELDEG": "10005799",
  "MRG": "10002531",
  "NAEG": "10005648",
  "NAEG": "10002652",
  "NOTAKTSG": "10001679",
  "NOTAKTSG": "10005925",
  "NOTWEGEG": "10001701",
  "NOTWEGEG": "10002373",
  "NRWO": "10001199",
  "ORGHG": "10000442",
  "ORG HG": "10010315",
  "PATVG": "20004723",
  "PATVG": "10007107",
  "PHG": "10002864",
  "POLBEG": "10000978",
  "PSTG": "20008228",
  "PSTG 2013": "20007563",
  "REO": "20011622",
  "RICHTWG": "10003166",
  "RICHTWG": "10005429",
  "RAPG": "10002683",
  "RAPG": "10011723",
  "SIGG": "10003685",
  "SIGG": "10006266",
  "SPG": "10005792",
  "STBG": "10005579",
  "STGB": "10002296",
  "STPO": "10002326",
  "STVO 1960": "10011336",
  "TEG": "10001905",
  "TEG": "10002059",
  "TSCHG": "20003541",
  "UHG": "10002310",
  "UNK": "10002854",
  "URHG": "10001848",
  "USBVO": "10002706",
  "VGG": "20011654",
  "VERSVG": "10001979",
  "VOEG": "20005369",
  "WEG": "20001921",
  "WEG 2002": "10011127",
  "WUCHERG": "10001899",
  "ZPO": "10001699",
  "ZUKG": "20000792",
  "ZUSTG": "10005522",
  "VSTG": "10005770",
  "UG": "20002128",
  "USTG 1994": "10004873",
  "AKTG": "10002070",
  "ABGB": "10001622",
  "GBG 1955": "10001941",
  "ASVG": "10008147",
  "AVG": "10005768",
  "ANGG": "10008069",
  "ARBKSTVO": "20004697",
  "AZG": "10008238",
  "BSVG": "10008431",
  "BBG": "10008713",
  "B‑VG": "10000138",
  "DSG": "10001597",
  "E‑GOVG": "20003230",
  "ESTG 1988": "10004570",
  "EPIG": "10010265",
  "EMRK": "10000308",
  "FSG": "10012723",
  "GEWO 1994": "10007517",
  "GSVG": "10008422",
  "GMBHG": "10001720",
  "KSCHG": "10002462",
  "KFG 1967": "10011384",
  "MELDEG": "10005799",
  "MRG": "10002531",
  "NRWO": "10001199",
  "SCHUG": "10009600",
  "SPG": "10005792",
  "STBG": "10005579",
  "STGB": "10002296",
  "STPO": "10002326",
  "STVO 1960": "10011336",
  "TSCHG": "20003541",
  "USTG 1994": "10004873",
  "UG": "20002128",
  "UGB": "10001702",
  "VERG": "20001917",
  "VSTG": "10005770",
  "WEG 2002": "20001921",
  "ZPO": "10001699",
  "ZUSTG": "10005522"


};

function normalizeLawKey(key) {
  return key
    .replace(/\u00A0/g, ' ')
    .replace(/[\-\u2011\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function buildLawMapping(source) {
  const target = Object.create(null);
  for (const [originalKey, value] of Object.entries(source)) {
    const normalizedKey = normalizeLawKey(originalKey);
    if (normalizedKey in target) {
      if (target[normalizedKey] !== value) {
        console.warn(`Konflikt im Gesetzes-Mapping für "${originalKey}" – verwende bestehenden Eintrag.`);
      }
      continue;
    }
    target[normalizedKey] = value;
  }
  return target;
}

const lawMapping = buildLawMapping(rawLawMapping);

// -----------------------------------------------------------------------------
// Hilfs‑Funktionen und Regex‑Definitionen
// -----------------------------------------------------------------------------
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const escapedAbbreviations = abbreviations.map(escapeRegExp);
const abbreviationsPattern = escapedAbbreviations.join('|');

const fundstelleRegex = new RegExp(
  `^\\s*(${abbreviationsPattern})\\s+` +
  `(\\d{1,4}(?:\\.\\d{1,4})?)` +
  `(?:\\s*[,/\\.]\\s*(\\d{1,5}(?:\\.\\d{1,4})?))?` +
  `\\s*$`, 'i'
);

const gerichtszahlRegex = /^\s*\d+\s+\w+\s+\d+\/\d+[a-z]?\s*$/i;
const lawProvisionRegex = /^\s*(§|Art\.?)?\s*(\d+[a-zA-Z]*)(?:\s*(Abs\.?\s*\d+))?\s*(.*)$/i;
const rsJustizRegex = /^(?:RIS[-‑]?Justiz\s*)?(RS\d{7})\s*$/i;
const oghRegex = /^(?:\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}\s+)?(?:OGH\s+)?(\d+\s*Ob(?:A)?\s*\d+\/\d+[a-z]?)(?:\s+(?:ecolex|ZAK|Z))?\s*$/i;

/**
 * Extrahiert aus dem Eingabestring (Omnibox) den relevantesten Suchbegriff.
 */
function extractQuery(input) {
  input = input.trim();

  const patterns = [
    { name: 'rsJustiz',    regex: rsJustizRegex    },
    { name: 'ogh',         regex: oghRegex         },
    { name: 'gerichtszahl',regex: gerichtszahlRegex},
    { name: 'fundstelle',  regex: fundstelleRegex  },
    { name: 'lawProvision',regex: lawProvisionRegex}
  ];

  // 1) gesamter String
  for (const p of patterns) {
    const m = input.match(p.regex);
    if (m) {
      if (p.name === 'ogh' && m[1]) return { type: p.name, query: m[1].trim() };
      return { type: p.name, query: input };
    }
  }
  // 2) Token‑weise (Semikolon‑getrennt)
  const tokens = input.split(/;/);
  for (const p of patterns) {
    for (const t0 of tokens) {
      const t = t0.trim();
      if (!t) continue;
      const m = t.match(p.regex);
      if (m) {
        if (p.name === 'ogh' && m[1]) return { type: p.name, query: m[1].trim() };
        return { type: p.name, query: t };
      }
    }
  }
  // 3) Fallback (RS‑Code / OGH‑Muster im Teilstring)
  for (const t0 of tokens) {
    const t = t0.trim();
    if (!t) continue;
    let m = t.match(/(RS\d{7})/i);
    if (m) return { type: 'rsJustiz', query: m[0] };
    m = t.match(/(?:OGH\s*)?(\d+\s*Ob(?:A)?\s*\d+\/\d+[a-z]?)/i);
    if (m) return { type: 'ogh', query: m[1].trim() };
  }
  return null;
}

// -----------------------------------------------------------------------------
// BisDatum = heute + 30 Jahre
// -----------------------------------------------------------------------------
const now = new Date();
const future = new Date(now);
future.setFullYear(now.getFullYear() + 30);
const formattedDate = future
  .toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });

// -----------------------------------------------------------------------------
// Omnibox‑Listener
// -----------------------------------------------------------------------------
chrome.omnibox.onInputEntered.addListener((text, disposition) => {

  const openUrl = url => {
    if (disposition === 'newForegroundTab') {
      chrome.tabs.create({ url, active: true });
    } else if (disposition === 'newBackgroundTab') {
      chrome.tabs.create({ url, active: false });
    } else {
      chrome.tabs.update({ url });
    }
  };

  // 0) Direkt‑Weiterleitung zur konsolidierten Fassung?
  const key = normalizeLawKey(text);
  if (lawMapping[key]) {
    openUrl(`https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=${encodeURIComponent(lawMapping[key])}`);
    return;
  }

  // 1) Spezial‑Suche (RS‑Code, OGH‑GZ, Gerichtszahl, Fundstelle, Gesetzesstelle)
  const extracted = extractQuery(text);
  if (extracted) {
    const q = extracted.query;

    if (extracted.type === 'rsJustiz') {
      const rs = rsJustizRegex.exec(q)[1].toUpperCase();
      openUrl(
        "https://ris.bka.gv.at/Ergebnis.wxe?Abfrage=Justiz" +
        "&Fachgebiet=&Gericht=&Rechtssatznummer=&Rechtssatz=&Fundstelle=&Spruch=" +
        "&Rechtsgebiet=Undefined&AenderungenSeit=Undefined&JustizEntscheidungsart=" +
        "&SucheNachRechtssatz=True&SucheNachText=False&GZ=&VonDatum=" +
        "&BisDatum=" + encodeURIComponent(formattedDate) +
        "&Norm=&ImRisSeitVonDatum=&ImRisSeitBisDatum=&ImRisSeit=Undefined" +
        "&ResultPageSize=100&Suchworte=" + encodeURIComponent(rs) +
        "&Position=1&SkipToDocumentPage=true&extensionTriggered=true"
      );
      return;
    }

    if (extracted.type === 'ogh') {
      openUrl(
        "https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Justiz" +
        "&Gericht=&Rechtssatznummer=&Rechtssatz=&Fundstelle=&AenderungenSeit=Undefined" +
        "&SucheNachRechtssatz=False&SucheNachText=True&GZ=" + encodeURIComponent(q) +
        "&VonDatum=&BisDatum=&Norm=&ImRisSeitVonDatum=&ImRisSeitBisDatum=&ImRisSeit=Undefined" +
        "&ResultPageSize=100&Suchworte=&Dokumentnummer=&kundmachungsorgan=&ImRisSeit=Undefined" +
        "&SkipToDocumentPage=true&extensionTriggered=true"
      );
      return;
    }

    if (extracted.type === 'gerichtszahl') {
      const gz = q.replace(/\s+/g, '');
      openUrl(
        "https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Justiz" +
        "&Gericht=&Rechtssatznummer=&Rechtssatz=&Fundstelle=&AenderungenSeit=Undefined" +
        "&SucheNachRechtssatz=False&SucheNachText=True&GZ=" + encodeURIComponent(gz) +
        "&VonDatum=&BisDatum=&Norm=&ImRisSeitVonDatum=&ImRisSeitBisDatum=&ImRisSeit=Undefined" +
        "&ResultPageSize=100&Suchworte=&Dokumentnummer=&kundmachungsorgan=&ImRisSeit=Undefined" +
        "&SkipToDocumentPage=true&extensionTriggered=true"
      );
      return;
    }

    if (extracted.type === 'fundstelle') {
      const m = q.match(fundstelleRegex);
      if (!m) {
        openUrl(`https://www.google.com/search?q=${encodeURIComponent(q)}`);
        return;
      }
      const abbr = m[1];
      const n1   = m[2];
      const n2   = m[3] || '';
      const del  = q.includes(',') ? ',' : q.includes('/') ? '/' : '.';
      const fs   = n2 ? `${abbr} ${n1}${del}${n2}` : `${abbr} ${n1}`;
      const quoted = `"${fs}"`;

      openUrl(
        "https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Justiz" +
        "&Fachgebiet=&Gericht=&Rechtssatznummer=&Rechtssatz=&Fundstelle=" + encodeURIComponent(quoted) +
        "&Spruch=&Rechtsgebiet=Undefined&AenderungenSeit=Undefined&JustizEntscheidungsart=" +
        "&SucheNachRechtssatz=False&SucheNachText=True&GZ=&VonDatum=&BisDatum=" + encodeURIComponent(formattedDate) +
        "&Norm=&ImRisSeitVonDatum=&ImRisSeitBisDatum=&ImRisSeit=Undefined" +
        "&ResultPageSize=100&Position=1&SkipToDocumentPage=true&extensionTriggered=true"
      );
      return;
    }

    if (extracted.type === 'lawProvision') {
      const m = q.match(lawProvisionRegex);
      const marker = m[1] ? m[1].replace('.', '').trim() : '';
      const number = m[2] ? m[2].trim() : '';
      const absatz = m[3] ? m[3].replace('.', '').trim() : '';
      const title  = m[4] ? m[4].trim() : '';

      let url = "https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Bundesnormen";
      if (title) url += `&Titel=${encodeURIComponent(title)}`;

      if (marker.toLowerCase() === 'art') {
        url += `&VonArtikel=${encodeURIComponent(number)}&BisArtikel=${encodeURIComponent(number)}`;
      } else {
        if (/[a-zA-Z]/.test(number)) {
          url += `&VonParagraf=${encodeURIComponent(number)}&BisParagraf=${encodeURIComponent(number)}`;
        } else {
          url += `&VonParagraf=${encodeURIComponent(number)}&BisParagraf=`;
        }
      }

      url += `&FassungVom=${encodeURIComponent(formattedDate)}`;
      if (absatz) url += `&Suchworte=${encodeURIComponent(absatz)}`;

      url += "&Kundmachungsorgan=&Index=&Gesetzesnummer=&VonAnlage=&BisAnlage=&Typ=&Kundmachungsnummer=" +
             "&Unterzeichnungsdatum=&VonInkrafttretedatum=&BisInkrafttretedatum=&VonAusserkrafttretedatum=" +
             "&BisAusserkrafttretedatum=&NormabschnittnummerKombination=Und&ImRisSeitVonDatum=&ImRisSeitBisDatum=" +
             "&ImRisSeit=Undefined&ResultPageSize=100&Position=1&SkipToDocumentPage=true&extensionTriggered=true";

      openUrl(url);
      return;
    }
  }

  // 2) Fallback – Google‑Suche
  openUrl(`https://www.google.com/search?q=${encodeURIComponent(text)}`);
});
