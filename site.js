'use strict';
const today=()=>{const d=new Date();return[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
for(const link of document.querySelectorAll('[data-norm]')){
 const update=()=>{const u=new URL('https://www.ris.bka.gv.at/NormDokument.wxe');u.search=new URLSearchParams({Abfrage:'Bundesnormen',Gesetzesnummer:'10001622',FassungVom:today(),Paragraf:link.dataset.norm});link.href=u.href};update();link.addEventListener('pointerdown',update);link.addEventListener('click',update);
}
for(const button of document.querySelectorAll('[data-style-choice]'))button.addEventListener('click',()=>{
 document.querySelector('.demo').dataset.style=button.dataset.styleChoice;
 for(const sibling of document.querySelectorAll('[data-style-choice]'))sibling.setAttribute('aria-pressed',String(sibling===button));
});
for(const button of document.querySelectorAll('[data-browser]'))button.addEventListener('click',()=>{
 document.querySelector('#extension-address').textContent=button.dataset.browser+'://extensions';
 for(const sibling of document.querySelectorAll('[data-browser]'))sibling.setAttribute('aria-pressed',String(sibling===button));
});
for(const button of document.querySelectorAll('[data-copy]'))button.addEventListener('click',async()=>{
 const text=button.dataset.copy==='browser'?document.querySelector('#extension-address').textContent:button.dataset.copy;
 const status=document.querySelector('#copy-status');
 try{await navigator.clipboard.writeText(text);status.textContent='Kopiert: '+text;}catch{status.textContent='Bitte den Text manuell kopieren: '+text;}
});
