// content.js

function checkAndRedirect() {
  const resultLink = document.querySelector('a[href*="Dokument.wxe"]');
  const noResultsText = document.querySelector('.content .message');

  if (resultLink) {
    // Falls ein Ergebnis gefunden wurde, direkt zum Dokument weiterleiten
    window.location.href = resultLink.href;
  } else {
    // Kein Ergebnis gefunden – auf Google weitersuchen
    const urlParams = new URLSearchParams(window.location.search);
    const suchworte = urlParams.get('Suchworte');

    if (suchworte) {
      var url = "https://www.google.com/search?q=" + encodeURIComponent(suchworte);
      window.location.href = url;
    }
  }
}

// Ausführen, sobald das Dokument geladen ist
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAndRedirect);
} else {
  checkAndRedirect();
}
