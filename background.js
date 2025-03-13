// Liste der Abkürzungen für Fundstellen
const abbreviations = [
  "AFS", "ALJ", "AnwBl", "AR", "ASoK", "AVR", "bau aktuell", "bbl", "BFGjournal", "BRZ", "DAG", "Dako",
  "DJA", "DRdA", "DRdA-infas", "DSB", "EALR", "eastlex", "ecolex", "EE", "EF-Z", "Ern", "EvBl", "FamZ", "FJ",
  "GES", "GeS", "GesRZ", "GRAU", "iFamZ", "immo aktuell", "immolex", "ImmoZak", "infas", "JAP", "JAS",
  "JBl", "JEV", "JMG", "JRP", "JSt", "JSt-NL", "JSt-Slg", "juridikum", "jusIT", "migraLex", "migralex",
  "MR", "MR-Int", "N@HZ", "NetV", "NLMR", "NR", "NV", "NZ", "öarr", "ÖBA", "ÖBl", "ögswissen",
  "ögwthema", "ÖJA", "ÖJZ", "ÖRPfl", "ÖStZ", "ÖStZB", "ÖZK", "ÖZPR", "ÖZW", "OZK", "PSR", "PV", "PVInfo",
  "PVP", "RdM", "RdM-Ö&G", "RdU", "RdU-U&T", "RdW", "RFG", "RPA", "RWK", "RwSt", "RWZ", "RZ", "S&R",
  "Sach-Sonderheft", "Sachverständige", "SIAK-Journal", "SozSi", "SPWR", "StAW", "SWI", "SWK", "taxlex",
  "TiRuP", "UFSaktuell", "UFSjournal", "UVSaktuell", "VbR", "wbl", "WBl", "wobl", "WoBl", "Zak", "ZAS",
  "ZfG", "zfhr", "ZFR", "ZfRV", "ZfRV-LS", "ZFS", "ZfS", "ZfV", "ZIIR", "ZIK", "ZIR", "ZLB", "ZNR",
  "ZÖR", "ZRB", "ZSS", "ZTR", "ZUV", "zuvo", "ZVB", "ZVers", "ZVG", "ZVR", "ZWF", "SZ", "HS", "GlU",
  "GlUNF", "EF(Slg)", "EFSlg", "EF", "MietSlg", "Arb(Slg)", "ArbSlg", "Arb"
];

// Hilfsfunktion, um Regex-Sonderzeichen zu escapen
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Regex-Pattern aus der Liste der Fundstellenabkürzungen erstellen
const escapedAbbreviations = abbreviations.map(abbrev => escapeRegExp(abbrev));
const abbreviationsPattern = escapedAbbreviations.join('|');

// Fundstellen: Erfasst z. B. "Zak 100/20", "ZFR 2017,234" oder "ecolex 2014,599"
const fundstelleRegex = new RegExp(
  `^\\s*(${abbreviationsPattern})\\s+` +                    // Abkürzung
  `(\\d{1,4}(?:\\.\\d{1,4})?)` +                           // Erste Zahl (Jahr/Band)
  `(?:\\s*[,/\\.]\\s*(\\d{1,5}(?:\\.\\d{1,4})?))?` +       // Optionale Trennung und zweite Zahl
  `\\s*$`, 'i'
);

// Gerichtszahlen: z. B. "7 Ob 564/89"
var gerichtszahlRegex = /^\s*\d+\s+\w+\s+\d+\/\d+[a-z]?\s*$/i;

// Gesetzesstellen (z. B. Paragrafen oder Artikel)
var lawProvisionRegex = /^\s*(§|Art\.?)?\s*(\d+[a-zA-Z]*)(?:\s*(Abs\.?\s*\d+))?\s*(.*)$/i;

// RIS‑Justiz Sätze (RS‑Codes): z. B. "RS0016031" oder "RIS-Justiz RS0016031"
// Der Prefix ist optional – auch reine RS-Codes werden erkannt.
const rsJustizRegex = /^(?:RIS[-‑]?Justiz\s*)?(RS\d{7})\s*$/i;

// OGH‑Urteile:
// Erlaubt optional einen Datumsvorbau (z. B. "03.02.2025"), optional den "OGH"-Prefix
// und extrahiert als Gruppe 1 ausschließlich den relevanten GZ, z. B. "6 Ob 162/05z".
const oghRegex = /^(?:\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}\s+)?(?:OGH\s+)?(\d+\s*Ob(?:A)?\s*\d+\/\d+[a-z]?)(?:\s+(?:ecolex|ZAK|Z))?\s*$/i;

/**
 * Extrahiert aus dem Eingabestring (z. B. aus der Adresszeile) einen relevanten Suchbegriff.
 * Es wird in folgender Priorität gesucht:
 *  1. RIS‑Justiz (RS‑Code)
 *  2. OGH‑Urteil
 *  3. Gerichtszahl
 *  4. Fundstelle
 *  5. Gesetzesstelle
 *
 * Falls kein exakter Treffer gefunden wird, wird in jedem Token nach Teilstrings gesucht.
 */
function extractQuery(input) {
  input = input.trim();

  // Prioritätsreihenfolge der Muster
  const patterns = [
    { name: 'rsJustiz', regex: rsJustizRegex },
    { name: 'ogh', regex: oghRegex },
    { name: 'gerichtszahl', regex: gerichtszahlRegex },
    { name: 'fundstelle', regex: fundstelleRegex },
    { name: 'lawProvision', regex: lawProvisionRegex }
  ];

  // Zuerst prüfen, ob der gesamte Eingabestring passt.
  for (const pat of patterns) {
    let match = input.match(pat.regex);
    if (match) {
      if (pat.name === 'ogh' && match[1]) {
        return { type: pat.name, query: match[1].trim() };
      }
      return { type: pat.name, query: input };
    }
  }

  // Falls kein Treffer beim gesamten String: Aufteilen – aber nur an Semikolons, NICHT an Kommas.
  let tokens = input.split(/;/);
  for (const pat of patterns) {
    for (const token of tokens) {
      let t = token.trim();
      if (!t) continue;
      let match = t.match(pat.regex);
      if (match) {
        if (pat.name === 'ogh' && match[1]) {
          return { type: pat.name, query: match[1].trim() };
        }
        return { type: pat.name, query: t };
      }
    }
  }

  // Fallback: Suche nach RS‑Code oder OGH‑Entscheidungsformat als Teilstring.
  for (const token of tokens) {
    let t = token.trim();
    if (!t) continue;
    let match = t.match(/(RS\d{7})/i);
    if (match) {
      return { type: 'rsJustiz', query: match[0] };
    }
    match = t.match(/(?:OGH\s*)?(\d+\s*Ob(?:A)?\s*\d+\/\d+[a-z]?)/i);
    if (match) {
      return { type: 'ogh', query: match[1].trim() };
    }
  }
  return null;
}

// Berechne ein Datum 30 Jahre in der Zukunft für den Parameter "BisDatum"
var currentDate = new Date();
var futureDate = new Date(currentDate);
futureDate.setFullYear(currentDate.getFullYear() + 30);
var day = ('0' + futureDate.getDate()).slice(-2);
var month = ('0' + (futureDate.getMonth() + 1)).slice(-2);
var yearFuture = futureDate.getFullYear();
var formattedDate = day + "." + month + "." + yearFuture;

chrome.omnibox.onInputEntered.addListener(function(text) {
  // Versuche, aus dem gesamten Eingabestring den relevanten Suchbegriff zu extrahieren
  let extracted = extractQuery(text);
  if (extracted) {
    let query = extracted.query;
    
    if (extracted.type === 'rsJustiz') {
      // RIS‑Justiz Satz
      let matches = rsJustizRegex.exec(query);
      let rsCode = matches[1].toUpperCase(); // z. B. "RS0016031"
      let url = "https://ris.bka.gv.at/Ergebnis.wxe?Abfrage=Justiz" +
                "&Fachgebiet=&Gericht=&Rechtssatznummer=&Rechtssatz=&Fundstelle=&Spruch=" +
                "&Rechtsgebiet=Undefined&AenderungenSeit=Undefined&JustizEntscheidungsart=" +
                "&SucheNachRechtssatz=True&SucheNachText=False&GZ=&VonDatum=" +
                "&BisDatum=" + encodeURIComponent(formattedDate) +
                "&Norm=&ImRisSeitVonDatum=&ImRisSeitBisDatum=&ImRisSeit=Undefined" +
                "&ResultPageSize=100&Suchworte=" + encodeURIComponent(rsCode) +
                "&Position=1&SkipToDocumentPage=true&extensionTriggered=true";
      chrome.tabs.update({ url: url });
      
    } else if (extracted.type === 'ogh') {
      // OGH-Urteil: Verwende den extrahierten GZ (ohne "OGH" und Datum)
      let formattedText = query;
      let url = "https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Justiz" +
                "&Gericht=&Rechtssatznummer=&Rechtssatz=&Fundstelle=&AenderungenSeit=Undefined" +
                "&SucheNachRechtssatz=False&SucheNachText=True&GZ=" + encodeURIComponent(formattedText) +
                "&VonDatum=&BisDatum=&Norm=&ImRisSeitVonDatum=&ImRisSeitBisDatum=&ImRisSeit=Undefined" +
                "&ResultPageSize=100&Suchworte=&Dokumentnummer=&kundmachungsorgan=&ImRisSeit=Undefined" +
                "&SkipToDocumentPage=true&extensionTriggered=true";
      chrome.tabs.update({ url: url });
      
    } else if (extracted.type === 'gerichtszahl') {
      // Gerichtszahl: Leerzeichen entfernen
      let formattedText = query.replace(/\s+/g, '');
      let url = "https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Justiz" +
                "&Gericht=&Rechtssatznummer=&Rechtssatz=&Fundstelle=&AenderungenSeit=Undefined" +
                "&SucheNachRechtssatz=False&SucheNachText=True&GZ=" + encodeURIComponent(formattedText) +
                "&VonDatum=&BisDatum=&Norm=&ImRisSeitVonDatum=&ImRisSeitBisDatum=&ImRisSeit=Undefined" +
                "&ResultPageSize=100&Suchworte=&Dokumentnummer=&kundmachungsorgan=&ImRisSeit=Undefined" +
                "&SkipToDocumentPage=true&extensionTriggered=true";
      chrome.tabs.update({ url: url });
      
    } else if (extracted.type === 'fundstelle') {
      // Fundstelle: z. B. "Zak 100/20", "ZFR 2017,234" oder "ecolex 2014,599"
      let matches = query.match(fundstelleRegex);
      if (!matches) {
        // Fallback: falls kein Treffer – Google-Suche
        let url = "https://www.google.com/search?q=" + encodeURIComponent(query);
        chrome.tabs.update({ url: url });
        return;
      }
      let abbreviation = matches[1];
      let firstNumber = matches[2];
      let secondNumber = matches[3] || '';
      
      // Das ursprüngliche Trennzeichen beibehalten, falls ein Komma vorhanden ist
      let delimiter = '/';
      if (query.includes(',')) {
         delimiter = ',';
      } else if (query.includes('/')) {
         delimiter = '/';
      } else if (query.includes('.')) {
         delimiter = '.';
      }
      
      let fundstelle;
      if (secondNumber) {
        fundstelle = abbreviation + " " + firstNumber + delimiter + secondNumber;
      } else {
        fundstelle = abbreviation + " " + firstNumber;
      }
      
      // Fundstelle in Anführungszeichen setzen
      let quotedFundstelle = '"' + fundstelle + '"';
      
      let url = "https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Justiz" +
                "&Fachgebiet=&Gericht=&Rechtssatznummer=&Rechtssatz=&Fundstelle=" + encodeURIComponent(quotedFundstelle) +
                "&Spruch=&Rechtsgebiet=Undefined&AenderungenSeit=Undefined&JustizEntscheidungsart=" +
                "&SucheNachRechtssatz=False&SucheNachText=True&GZ=&VonDatum=&BisDatum=" + encodeURIComponent(formattedDate) +
                "&Norm=&ImRisSeitVonDatum=&ImRisSeitBisDatum=&ImRisSeit=Undefined" +
                "&ResultPageSize=100&Suchworte=&Position=1&SkipToDocumentPage=true&extensionTriggered=true";
      chrome.tabs.update({ url: url });
      
    } else if (extracted.type === 'lawProvision') {
      let matches = query.match(lawProvisionRegex);
      let marker = matches[1] ? matches[1].replace('.', '').trim() : '';
      let number = matches[2] ? matches[2].trim() : '';
      let absatz = matches[3] ? matches[3].replace('.', '').trim() : '';
      let lawTitle = matches[4] ? matches[4].trim() : '';
    
      let url = "https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Bundesnormen";
      if (lawTitle) {
        url += "&Titel=" + encodeURIComponent(lawTitle);
      }
      if (marker && marker.toLowerCase() === 'art') {
        url += "&VonArtikel=" + encodeURIComponent(number);
        url += "&BisArtikel=" + encodeURIComponent(number);
      } else {
        // Wenn die Paragraphenangabe ausschließlich Ziffern enthält, wird BisParagraf leer gelassen
        if (/[a-zA-Z]/.test(number)) {
          url += "&VonParagraf=" + encodeURIComponent(number);
          url += "&BisParagraf=" + encodeURIComponent(number);
        } else {
          url += "&VonParagraf=" + encodeURIComponent(number);
          url += "&BisParagraf=";
        }
      }
      
      let suchworte = '';
      if (absatz) {
        suchworte += absatz;
      }
      
      url += "&FassungVom=" + encodeURIComponent(formattedDate);
      url += "&Kundmachungsorgan=&Index=&Gesetzesnummer=&VonAnlage=&BisAnlage=&Typ=&Kundmachungsnummer=&Unterzeichnungsdatum=&VonInkrafttretedatum=&BisInkrafttretedatum=&VonAusserkrafttretedatum=&BisAusserkrafttretedatum=&NormabschnittnummerKombination=Und&ImRisSeitVonDatum=&ImRisSeitBisDatum=&ImRisSeit=Undefined&ResultPageSize=100";
      
      if (suchworte) {
        url += "&Suchworte=" + encodeURIComponent(suchworte);
      }
      
      url += "&Position=1&SkipToDocumentPage=true&extensionTriggered=true";
      chrome.tabs.update({ url: url });
    }
  } else {
    // Kein relevanter Suchbegriff gefunden – nutze den gesamten Text für eine Google-Suche
    let url = "https://www.google.com/search?q=" + encodeURIComponent(text);
    chrome.tabs.update({ url: url });
  }
});
