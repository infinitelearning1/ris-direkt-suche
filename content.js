// File: v3/content.js
function checkAndRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  // Nur weiterleiten, wenn der Request von der Extension stammt
  if (urlParams.get("extensionTriggered") !== "true") {
    return;
  }
  
  const resultLink = document.querySelector('a[href*="Dokument.wxe"]');

  if (resultLink) {
    // Falls ein Ergebnis gefunden wurde, direkt zum Dokument weiterleiten
    window.location.href = resultLink.href;
  } else {
    // Kein Ergebnis gefunden – auf Google weitersuchen
    const suchworte = urlParams.get('Suchworte');
    if (suchworte) {
      var url = "https://www.google.com/search?q=" + encodeURIComponent(suchworte);
      window.location.href = url;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAndRedirect);
} else {
  checkAndRedirect();
}
