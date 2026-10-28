# RIS-Direkt-Suche 1.15

Normen und Entscheidungen mit einem Klick aus dem Text im RIS öffnen oder mit `ris` über die Browserleiste suchen. Für Google Chrome und Microsoft Edge.

[Anleitung und Beispiele](https://infinitelearning1.github.io/ris-direkt-suche/)  
[Installations-ZIP herunterladen](https://infinitelearning1.github.io/ris-direkt-suche/ris-direkt-suche.zip)

## Installation

1. Das Installations-ZIP herunterladen und vollständig in einen Ordner entpacken. Diesen Ordner behalten.
2. Falls du RIS-Direkt-Suche schon früher installiert hast, die ältere Version deaktivieren.
3. In Chrome `chrome://extensions`, in Edge `edge://extensions` öffnen.
4. Den **Entwicklermodus** einschalten und **Entpackte Erweiterung laden** wählen.
5. Den entpackten Ordner auswählen, in dem `manifest.json` liegt.
6. Die Suche über die Browserleiste funktioniert sofort. Die Markierung von Zitaten auf Webseiten und in PDFs ist anfangs ausgeschaltet und lässt sich über das Erweiterungsmenü unter „RIS“ einschalten. Bereits geöffnete Seiten danach neu laden.
7. Optional für PDFs vom Computer: Unter **Details** der Erweiterung **Zugriff auf Datei-URLs zulassen** einschalten. Für PDFs aus dem Internet ist das nicht nötig.

Die Erweiterung erscheint im Erweiterungsmenü unter **RIS**. Du musst ihr Symbol nicht anheften. Dort erreichst du auch die Einstellungen.

## Suche über die Browserleiste

`ris` eingeben, die Leertaste oder Tabulatortaste drücken und den Suchbegriff ergänzen.

| Eingabe | Suche |
|---|---|
| `ris 25a IO` | Aktuelle Fassung einer Norm |
| `ris 25a IO @2007` | Fassungen, die innerhalb des Kalenderjahres galten |
| `ris 25a IO @13.5.2007` | Historische Fassung an einem genauen Tag |
| `ris 2 Ob 84/01v` | OGH-Entscheidung, auch ohne Leerzeichen als `2Ob84/01v` |
| `ris vwgh Ra 2024/03/0012` | VwGH-Entscheidung vom 25.6.2025 |
| `ris vfgh G 139/2019` | VfGH-Entscheidung vom 11.12.2020 |
| `ris 21 KO` | Letzte Fassung der Konkursordnung vom 30.06.2010; ebenso bei der AO |
| `ris ABGB` | Ganzes Gesetz, auch mit historischem Zusatz |
| `ris RS0033002` | RIS-Justiz-Rechtssatz |
| `ris SZ 2020/117` | Entscheidungssammlung, führt zu OGH 2 Ob 142/20a |
| `ris ZFR 2023/58` | Zeitschriftenfundstelle |

Bei einem Jahr öffnet eine einzige erfasste Fassung direkt. Mehrere Fassungen bleiben zur Auswahl. Bei mehrdeutigen älteren Geschäftszahlen hilft das Gerichtskürzel.

## Markierungen und Einstellungen

Ist die Markierung eingeschaltet, werden erkannte Normen, Geschäftszahlen, Rechtssätze und unterstützte Entscheidungssammlungen verlinkt. Ein Klick öffnet die Fundstelle in einem neuen Tab. Normlisten erhalten getrennte Ziele. Vollständig erkannte Zitatlinks führen standardmäßig ebenfalls ins RIS; diese Option lässt sich ausschalten.

Du kannst zwischen Webseiten und PDFs, nur Webseiten, nur PDFs und ganz aus wählen; voreingestellt ist ganz aus. Unterstreichung, Hervorhebung oder beides sowie die Farben lassen sich einstellen. Zeitschriftenfundstellen sind standardmäßig aus, unterstützte Entscheidungssammlungen an. Ihre manuelle Suche über die Browserleiste bleibt immer möglich.

Optional sucht ein Klick in einer PDF die Normfassungen, die im Erscheinungsjahr des Beitrags galten. Das Jahr wird aus Dateiname, Tabtitel oder PDF-Titel erkannt; bei mehreren Fassungen erscheint eine Auswahl. Die Option ist anfangs ausgeschaltet. Das Erscheinungsjahr ist nur ein Suchhinweis; welcher Rechtsstand im Beitrag behandelt wird, prüft die Erweiterung nicht.

Die Erkennung läuft lokal. Beim Markieren erfolgen keine RIS-Vorabfragen; erst ein Klick oder eine Suche ruft RIS auf.

## Was zu beachten ist

Die Erweiterung konzentriert sich auf österreichisches Bundesrecht sowie OGH, VwGH und VfGH. Landesrecht ist derzeit nicht enthalten. Artikel werden nur bei ausgewählten österreichischen Rechtsvorschriften erkannt. Eine Unterstreichung heißt nur, dass die Erweiterung im Text etwas erkannt hat, das wie eine Norm, Entscheidung oder Fundstelle aussieht. Ob es dazu im RIS tatsächlich einen Paragraphen oder eine Entscheidung gibt, prüft sie dabei nicht; das zeigt sich erst beim Klick.

Gleiche Gesetzeskürzel in verschiedenen Ländern lassen sich ohne Länderangabe nicht zuverlässig unterscheiden. Bei `§ 12 VVG` wird von österreichischem Recht ausgegangen. Ausdrückliche fremde Kürzel wie `dVVG`, `BGB` und `InsO` werden ausgespart.

PDFs brauchen eine native oder bereits durch OCR erzeugte Textebene. Reine Bildscans werden nicht erkannt. Die markierte Ansicht verwendet den eingebauten Chrome- oder Edge-Viewer und wird beim ersten Verknüpfen einmal neu geladen. Spätere Fundstellenklicks erhalten die geladene PDF. Nach einem Browserneustart die Originaldatei erneut öffnen.

## Feedback und Pull Requests

Bei Fehlern oder Ideen freue ich mich über eine Nachricht an **samuel.loibl (at) proton.me**. [Fehlermeldungen und Vorschläge auf GitHub](https://github.com/infinitelearning1/ris-direkt-suche/issues) sind ebenfalls willkommen.

Pull Requests (PRs) für die Erweiterung sind auf GitHub willkommen.

Die enthaltenen PDF-Bibliotheken und Schriftdateien stehen unter ihren jeweiligen Lizenzen. Die Lizenztexte liegen bei.
