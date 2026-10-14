# RIS-Direkt-Suche 1.14

Normen und Entscheidungen mit einem Klick aus dem Text im RIS öffnen oder mit `ris` über die Browserleiste suchen. Für Google Chrome und Microsoft Edge.

[Anleitung und Beispiele](https://infinitelearning1.github.io/ris-direkt-suche/)  
[Installations-ZIP herunterladen](https://infinitelearning1.github.io/ris-direkt-suche/ris-direkt-suche.zip)

## Installation

1. Das Installations-ZIP herunterladen und vollständig in einen Ordner entpacken. Diesen Ordner behalten.
2. Falls du RIS-Direkt-Suche schon früher installiert hast, die ältere Version deaktivieren.
3. In Chrome `chrome://extensions`, in Edge `edge://extensions` öffnen.
4. Den **Entwicklermodus** einschalten und **Entpackte Erweiterung laden** wählen.
5. Den entpackten Ordner auswählen, in dem `manifest.json` liegt.
6. Bereits geöffnete Webseiten neu laden. Erkannte Zitate werden automatisch markiert.
7. Optional für PDFs vom Computer: Unter **Details** der Erweiterung **Zugriff auf Datei-URLs zulassen** einschalten. Für PDFs aus dem Internet ist das nicht nötig.

Die Erweiterung erscheint im Erweiterungsmenü unter **RIS**. Du musst ihr Symbol nicht anheften. Dort erreichst du auch die Einstellungen.

## Suche über die Browserleiste

`ris` eingeben, die Leertaste oder Tabulatortaste drücken und den Suchbegriff ergänzen.

| Eingabe | Suche |
|---|---|
| `ris 25a IO` | Aktuelle Fassung einer Norm |
| `ris 25a IO @2007` | Fassungen, die innerhalb des Kalenderjahres galten |
| `ris 25a IO @13.5.2007` | Historische Fassung an einem genauen Tag |
| `ris 8Ob216/16s` | OGH-Entscheidung, auch mit Leerzeichen |
| `ris vwgh Ra 2024/03/0012` | VwGH-Entscheidung |
| `ris vfgh G 12/2024` | VfGH-Entscheidung |
| `ris ABGB` | Ganzes Gesetz, auch mit historischem Zusatz |
| `ris RS0033002` | RIS-Justiz-Rechtssatz |
| `ris SZ 74/90` | Entscheidungssammlung |
| `ris ZFR 2023/58` | Zeitschriftenfundstelle |

Bei einem Jahr öffnet eine einzige erfasste Fassung direkt. Mehrere Fassungen bleiben zur Auswahl. Bei mehrdeutigen älteren Geschäftszahlen hilft das Gerichtskürzel.

## Markierungen und Einstellungen

Erkannte Normen, Geschäftszahlen, Rechtssätze und unterstützte Entscheidungssammlungen werden automatisch verlinkt. Ein Klick öffnet das RIS in einem neuen fokussierten Tab. Normlisten erhalten getrennte Ziele. Vollständig erkannte Zitatlinks führen standardmäßig ebenfalls ins RIS; diese Option lässt sich ausschalten.

Du kannst zwischen Webseiten und PDFs, nur Webseiten, nur PDFs und ganz aus wählen. Unterstreichung, Hervorhebung oder beides sowie die Farben lassen sich einstellen. Zeitschriftenfundstellen sind standardmäßig aus, unterstützte Entscheidungssammlungen an. Ihre manuelle Suche über die Browserleiste bleibt immer möglich.

Die Erkennung läuft lokal. Beim Markieren erfolgen keine RIS-Vorabfragen; erst ein Klick oder eine Suche ruft RIS auf.

## Was zu beachten ist

Die Erweiterung konzentriert sich auf österreichisches Bundesrecht sowie OGH, VwGH und VfGH. Landesrecht ist derzeit nicht enthalten. Artikel werden nur bei ausgewählten österreichischen Rechtsvorschriften erkannt. Eine erkannte Zitierung garantiert nicht, dass die konkrete Normnummer oder Fundstelle im RIS vorhanden ist.

Gleiche Gesetzeskürzel in verschiedenen Ländern lassen sich ohne Länderangabe nicht zuverlässig unterscheiden. Bei `§ 12 VVG` wird von österreichischem Recht ausgegangen. Ausdrückliche fremde Kürzel wie `dVVG`, `BGB` und `InsO` werden ausgespart.

PDFs brauchen eine native oder bereits durch OCR erzeugte Textebene. Reine Bildscans werden nicht erkannt. Die markierte Ansicht verwendet den eingebauten Chrome- oder Edge-Viewer und wird beim ersten Verknüpfen einmal neu geladen. Spätere Fundstellenklicks erhalten die geladene PDF. Nach einem Browserneustart die Originaldatei erneut öffnen.

## Feedback und Pull Requests

Bei Fehlern oder Ideen freue ich mich über eine Nachricht an **samuel.loibl (at) proton.me**. [Fehlermeldungen und Vorschläge auf GitHub](https://github.com/infinitelearning1/ris-direkt-suche/issues) sind ebenfalls willkommen.

Pull Requests (PRs) für die Erweiterung sind auf GitHub willkommen.

Die enthaltenen PDF-Bibliotheken und Schriftdateien stehen unter ihren jeweiligen Lizenzen. Die Lizenztexte liegen bei.
