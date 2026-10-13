'use strict';
const params=new URLSearchParams(location.search);
document.querySelector('#message').textContent=params.get('message')||'Bitte die Suche prüfen.';
document.querySelector('#query').textContent=params.get('query')||'';
