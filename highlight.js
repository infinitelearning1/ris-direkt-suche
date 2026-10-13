/* Annotate ordinary pages and existing accessible PDF text layers. */
(function () {
  'use strict';
  if (!globalThis.RIS || !globalThis.RISSettings || !document.body || globalThis.RIS_PDF_RETURNING) return;
  const pdfLayers = '.textLayer,.text-layer,[data-ris-pdf="true"]';
  const exclude = 'a,sup,sub,[role="doc-noteref"],button,script,style,noscript,textarea,input,select,option,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="button"],[role="link"],[role="menuitem"],[role="tab"],[role="option"],svg,canvas,[data-ris-ignore],[hidden],[inert],[aria-hidden="true"]';
  const blocks = 'p,li,td,th,h1,h2,h3,h4,h5,h6,pre,div,section,article,dt,dd,blockquote,header,footer,main,aside,nav,figcaption,caption,address,summary,legend,body';
  let settings, timer, active = false, revision = 0, rendering = false, urgentPending = false;
  const pending = new Set();
  const owned = new WeakSet(), references = new WeakMap(), states = new WeakMap(), hiddenRoots = new Set();
  const sourceBindings=new WeakMap(),anchorBindings=new WeakMap();
  const existingBindings=new Map();
  const accessibilityBindings=new Map();
  const risHost=host=>/(^|\.)ris\.bka\.gv\.at$/i.test(host);
  const onRIS=risHost(location.hostname);
  let selectionInput=0;
  const owner = chrome.runtime.id + ':' + [...crypto.getRandomValues(new Uint32Array(4))].map(n=>n.toString(16).padStart(8,'0')).join('');
  function state(element) { const style=getComputedStyle(element);return [style.display,style.visibility,element.isContentEditable,isPdf(element)].join(':'); }
  const observer = new MutationObserver(mutations => {
    if (!active) return;
    observer.disconnect();
    try{handleMutations(mutations);}finally{connect();}
  });
  function handleMutations(mutations){
    // A publisher can replace a marked block during scrolling. Repair that
    // small block before the next frame instead of leaving an 80 ms gap.
    if(mutations.some(m=>m.type==='childList'&&[...m.removedNodes].some(n=>!n.isConnected&&hasOwnedMark(n))))urgentPending=true;
    for (const mutation of mutations) {
      if(mutation.type==='characterData'){
        const binding=sourceBindings.get(mutation.target);
        if(binding&&binding.original===mutation.target&&binding.residual!==mutation.target.nodeValue)release(binding);
      }
      if(mutation.type==='childList')for(const removed of mutation.removedNodes)cleanRemoved(removed);
      const element = mutation.target.nodeType === Node.TEXT_NODE ? mutation.target.parentElement : mutation.target;
      if (!element || element.closest('script,style,textarea,input,select')) continue;
      if(mutation.type==='childList'){
        for(const added of mutation.addedNodes){
          const target=added.nodeType===Node.TEXT_NODE?added.parentElement:added;
          if(target?.nodeType===Node.ELEMENT_NODE){
            // Moving an intact block does not invalidate its annotations.
            if(group(target)===target&&hasOwnedMark(target)&&states.get(target)===state(target)&&!target.closest(exclude))continue;
            enqueue(group(target)||element);
          }
        }
        if([...mutation.removedNodes].some(node=>node.nodeType===Node.TEXT_NODE||node.nodeType===Node.ELEMENT_NODE&&!node.matches(blocks)))enqueue(group(element)||element);
        continue;
      }
      if(mutation.type==='attributes'&&['class','style'].includes(mutation.attributeName)){
        const next=state(element),previous=states.get(element);states.set(element,next);
        if(previous===next){for(const hidden of hiddenRoots){if(!hidden.isConnected){hiddenRoots.delete(hidden);continue;}if(element.contains(hidden)&&hidden.getClientRects().length)enqueue(group(hidden));}continue;}
      }
      enqueue(group(element) || document.body);
    }
  }
  function hasOwnedMark(node){return node.nodeType===Node.ELEMENT_NODE&&(owned.has(node)||[...node.querySelectorAll('a.ris-citation')].some(a=>owned.has(a)));}
  function pauseObserver(){
    // Changes made by the page while we yielded may still be queued. A plain
    // disconnect discards them, including newly revealed/editable content.
    const queued=observer.takeRecords();observer.disconnect();
    if(active&&queued.length)handleMutations(queued);
  }

  function release(binding,value){
    if(value!==undefined&&binding.original.parentNode===binding.parent)binding.original.nodeValue=value;
    for(const part of binding.parts)part.remove();
    sourceBindings.delete(binding.original);binding.parts.clear();
  }
  function cleanRemoved(node){
    if(node.nodeType===Node.ELEMENT_NODE&&node.isConnected)return;
    const bindings=new Set();
    hiddenRoots.delete(node);
    if(node.nodeType===Node.ELEMENT_NODE){const elements=document.createTreeWalker(node,NodeFilter.SHOW_ELEMENT);let el;while((el=elements.nextNode()))hiddenRoots.delete(el);}
    if(node.nodeType===Node.TEXT_NODE){const b=sourceBindings.get(node);if(b&&(!b.original.isConnected||b.original===node))bindings.add(b);}
    else{const walk=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let text;while((text=walk.nextNode())){const b=sourceBindings.get(text);if(b&&!b.original.isConnected)bindings.add(b);}}
    for(const binding of bindings)release(binding);
    if(node.nodeType===Node.ELEMENT_NODE)restoreExisting(node);
    if(node.nodeType===Node.ELEMENT_NODE)restoreAccessibility(node);
  }
  function selected(root){
    const selection=getSelection();
    if(!selection?.rangeCount||selection.isCollapsed||!root.contains(selection.anchorNode)||!root.contains(selection.focusNode))return null;
    const range=selection.getRangeAt(0),prefix=document.createRange();prefix.selectNodeContents(root);prefix.setEnd(range.startContainer,range.startOffset);
    const start=prefix.toString().length;return{start,end:start+range.toString().length,text:range.toString(),input:selectionInput};
  }
  function restoreSelection(root,selection){
    if(!selection||selection.input!==selectionInput||root.textContent.slice(selection.start,selection.end)!==selection.text)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node,pos=0,start,end;
    while((node=walker.nextNode())){const next=pos+node.length;if(!start&&next>=selection.start)start={node,offset:selection.start-pos};if(next>=selection.end){end={node,offset:selection.end-pos};break;}pos=next;}
    if(start&&end){const range=document.createRange();range.setStart(start.node,start.offset);range.setEnd(end.node,end.offset);getSelection().removeAllRanges();getSelection().addRange(range);}
  }

  function group(element) { return element.closest(pdfLayers) || element.closest(blocks); }
  function isPdf(element) { return document.contentType === 'application/pdf' || !!element.closest(pdfLayers); }
  function allowed(element) {
    if (!active) return false;
    return isPdf(element) ? settings.mode !== 'web' : settings.mode !== 'pdf';
  }
  function eligible(node) {
    const parent = node.parentElement;
    if (!parent || parent.isContentEditable || document.designMode==='on' || parent.closest(exclude) || onRIS&&parent.closest('.sr-only') || !allowed(parent)) return false;
    const closed=parent.closest('details:not([open])');
    if(closed&&!closed.querySelector(':scope > summary')?.contains(parent))return false;
    const style = getComputedStyle(parent);
    states.set(parent,[style.display,style.visibility,parent.isContentEditable,isPdf(parent)].join(':'));
    let visible=style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse' && !['super','sub'].includes(style.verticalAlign);
    if(visible&&style.display==='contents'){const range=document.createRange();range.selectNodeContents(node);visible=range.getClientRects().length>0;}
    else if(visible)visible=parent.getClientRects().length>0;
    if(visible)hiddenRoots.delete(parent);else hiddenRoots.add(parent);
    return visible;
  }
  function unwrap(root) {
    const bindings=new Set();
    for(const anchor of root.querySelectorAll('a.ris-citation'))if(owned.has(anchor)){const b=anchorBindings.get(anchor);if(b)bindings.add(b);}
    for(const b of bindings){
      const unchanged=b.original.parentNode===b.parent&&b.original.nodeValue===b.residual;
      const text=unchanged?[...b.parent.childNodes].filter(n=>n===b.original||b.parts.has(n)).map(n=>n.textContent).join(''):undefined;
      release(b,text);
    }
  }
  function supportedLinks(text){
    const matches=RIS.findMatches(text);
    if(!matches.length||matches.some(m=>!RISSettings.accepts(m.ref,settings)))return false;
    let previous=0;
    for(const m of matches){if(!/^(?:[\s,;()[\]–—-]|und|oder|i\.?\s*v\.?\s*m\.?|in\s+Verbindung\s+mit)*$/i.test(text.slice(previous,m.start)))return false;previous=m.end;}
    return /^[\s,;()[\]–—-]*$/.test(text.slice(previous));
  }
  function restoreAccessibility(root){
    for(const [visible,reader] of accessibilityBindings){
      if(root!==visible&&!root.contains(visible))continue;
      visible.setAttribute('aria-hidden','true');
      if(reader.original===null)reader.node.removeAttribute('aria-hidden');else reader.node.setAttribute('aria-hidden',reader.original);
      accessibilityBindings.delete(visible);
    }
  }
  function prepareAccessibility(root){
    restoreAccessibility(root);
    if(!onRIS)return;
    for(const visible of root.querySelectorAll('.embeddedContent .contentBlock span[aria-hidden="true"]')){
      const reader=visible.nextElementSibling;
      if(!reader?.matches('span.sr-only')||!RIS.findMatches(visible.textContent).length||!allowed(visible))continue;
      accessibilityBindings.set(visible,{node:reader,original:reader.getAttribute('aria-hidden')});
      visible.removeAttribute('aria-hidden');reader.setAttribute('aria-hidden','true');
    }
  }
  function restoreExisting(root,all=true){
    for(const [wrapper,original] of existingBindings){
      if(root!==wrapper&&!root.contains(wrapper))continue;
      if(!all&&settings.existingLinks&&allowed(wrapper)&&supportedLinks(wrapper.textContent))continue;
      unwrap(wrapper);
      original.replaceChildren(...wrapper.childNodes);
      wrapper.replaceWith(original);existingBindings.delete(wrapper);
    }
  }
  function prepareExisting(root){
    restoreExisting(root,false);
    if(!settings.existingLinks)return;
    for(const original of root.querySelectorAll('a[href]')){
      if(owned.has(original)||!allowed(original)||original.isContentEditable||original.hasAttribute('download')||original.querySelector('img,svg,button,input,textarea,select,[contenteditable]'))continue;
      if(original.closest(exclude.replace('a,',''))||original.closest('details:not([open])'))continue;
      const style=getComputedStyle(original);
      if(!original.getClientRects().length||style.visibility==='hidden'||style.visibility==='collapse')continue;
      let url;try{url=new URL(original.getAttribute('href'),location.href);}catch{continue;}
      if(!['https:','http:'].includes(url.protocol)||risHost(url.hostname)||!supportedLinks(original.textContent))continue;
      const wrapper=document.createElement('span');
      for(const attr of original.attributes)if(!['href','target','rel','download','ping','role','tabindex','onclick','onmousedown','onkeydown','onmouseup'].includes(attr.name)&&!attr.name.startsWith('on'))wrapper.setAttribute(attr.name,attr.value);
      wrapper.dataset.risExistingLink=owner;
      wrapper.append(...original.childNodes);original.replaceWith(wrapper);existingBindings.set(wrapper,original);
    }
  }
  async function paint(root) {
    if (!root.isConnected) return;
    const token=revision;
    let batchStarted=performance.now();
    function yieldIfNeeded(){
      if(performance.now()-batchStarted<12)return null;
      connect();return new Promise(resolve=>setTimeout(resolve,0)).then(()=>{pauseObserver();batchStarted=performance.now();});
    }
    states.set(root,state(root));
    const selection=selected(root);
    const focused=owned.has(document.activeElement)?document.activeElement.href:null;
    unwrap(root);
    prepareAccessibility(root);
    prepareExisting(root);
    const groups = new Map(), walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node, lastBlock;
    while ((node = walker.nextNode())) {
      if(!node.nodeValue)continue;
      const block = group(node.parentElement);
      if (!block) continue;
      if (!groups.has(block)) groups.set(block, []);
      if (lastBlock && lastBlock !== block) groups.get(lastBlock).push(null);
      groups.get(block).push(eligible(node) ? node : null);
      lastBlock = block;
    }
    for (let nodes of groups.values()) {
      if(token!==revision)return;
      if (globalThis.RISPdfLayout && nodes.length && nodes[0]?.parentElement.closest(pdfLayers) && !nodes.includes(null)) {
        nodes = RISPdfLayout.order(nodes.map(node => ({ node, rect: node.parentElement.getBoundingClientRect() }))).map(item => item.node);
      }
      let text = '', previous;
      const segments = [];
      for (const n of nodes) {
        if (!n) { text += '\u0000'; previous = undefined; continue; }
        if (previous && n.parentElement.closest(pdfLayers) && previous.parentElement !== n.parentElement) {
          const a = previous.parentElement.getBoundingClientRect(), b = n.parentElement.getBoundingClientRect();
          if (b.top < a.top - Math.max(3, a.height * .5)) text += '\u0000'; // New column/reading band.
          else if (Math.abs(a.top - b.top) > 2) text += '\n';
          else if (b.left - a.right > 2) text += ' ';
        } else if (previous && (previous.nextSibling?.nodeName === 'BR' || previous.parentElement!==n.parentElement&&previous.parentElement.nextSibling?.nodeName === 'BR')) text += '\n';
        segments.push({ node: n, start: text.length, end: text.length + n.nodeValue.length });
        text += n.nodeValue;
        previous = n;
      }
      const matches = RIS.findMatches(text).filter(m => RISSettings.accepts(m.ref,settings));
      for (let i = matches.length - 1; i >= 0; i--) {
        if(token!==revision)return;
        const match = matches[i];
        let firstAnchor;
        for (let j = segments.length - 1; j >= 0; j--) {
          const part = segments[j], start = Math.max(match.start, part.start), end = Math.min(match.end, part.end);
          if(start>=end||!part.node.isConnected)continue;
          if(part.node.nodeValue.slice(start-part.start,end-part.start)!==text.slice(start,end)){enqueue(group(part.node.parentElement)||root);continue;}
          if (!part.node.nodeValue.slice(start - part.start, end - part.start).trim()) continue;
          const range = document.createRange();
          let binding=sourceBindings.get(part.node);
          if(!binding){binding={original:part.node,parent:part.node.parentNode,parts:new Set(),residual:part.node.nodeValue};sourceBindings.set(part.node,binding);}
          range.setStart(part.node, start - part.start);
          range.setEnd(part.node, end - part.start);
          const anchor = document.createElement('a');
          anchor.className = 'ris-citation';
          anchor.dataset.risType = match.ref.type;
          anchor.dataset.style = settings.style;
          anchor.href = RIS.buildUrl(match.ref);
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
          anchor.tabIndex = -1;
          anchor.dataset.risOwner = owner;
          owned.add(anchor);references.set(anchor,match.ref);
          anchor.title = 'Im RIS öffnen: ' + RIS.label(match.ref);
          const color = match.ref.type === 'norm' ? settings.normColor : match.ref.type === 'rs' ? settings.rsColor :
            match.ref.type === 'fundstelle' ? settings.fundstelleColor : settings.caseColor;
          anchor.style.setProperty('--ris-color', color);
          anchor.style.setProperty('--ris-background', settings.highlightColor);
          anchor.appendChild(range.extractContents());
          range.insertNode(anchor);
          anchorBindings.set(anchor,binding);binding.parts.add(anchor);
          if(anchor.nextSibling?.nodeType===Node.TEXT_NODE){binding.parts.add(anchor.nextSibling);sourceBindings.set(anchor.nextSibling,binding);}
          binding.residual=binding.original.nodeValue;
          firstAnchor = anchor;
        }
        if (firstAnchor) firstAnchor.tabIndex = 0;
        const yieldMatch=yieldIfNeeded();if(yieldMatch)await yieldMatch;
      }
      const yieldGroup=yieldIfNeeded();if(yieldGroup)await yieldGroup;
    }
    if(focused)for(const anchor of root.querySelectorAll('a.ris-citation'))if(owned.has(anchor)&&anchor.href===focused&&anchor.tabIndex===0){anchor.focus({preventScroll:true});break;}
    restoreSelection(root,selection);
  }
  function connect() {
    if (active) observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['hidden', 'inert', 'contenteditable', 'class', 'style', 'data-ris-pdf', 'open', 'aria-hidden', 'role'] });
  }
  async function flush() {
    timer = null;
    if (!active) return;
    if(rendering){timer=setTimeout(flush,80);return;}
    rendering=true;
    pauseObserver();
    const roots = [...pending].filter(n => n.isConnected);
    pending.clear();
    try {
      for (const root of roots) if (!roots.some(other => other !== root && other.contains(root))) await paint(root);
    } finally { rendering=false;connect();if(pending.size&&!timer)timer=setTimeout(flush,80);document.dispatchEvent(new CustomEvent('ris-markings-applied',{detail:{pending:pending.size>0}})); }
  }
  function enqueue(root) {
    if (!root || !active) return;
    pending.add(root);
    if(urgentPending&&!rendering&&timer!==-1){if(timer)clearTimeout(timer);urgentPending=false;timer=-1;queueMicrotask(flush);return;}
    if (!timer) timer = setTimeout(flush, 80);
  }
  async function configure() {
    const current = ++revision, next = await RISSettings.read();
    if (current !== revision) return;
    while(rendering){await new Promise(resolve=>setTimeout(resolve,10));if(current!==revision)return;}
    rendering=true;
    settings = next;
    const hosts=[location.hostname];
    for(const origin of [self.origin,...(location.ancestorOrigins||[])])try{const host=new URL(origin).hostname;if(host)hosts.push(host);}catch{}
    active = settings.mode !== 'off' && document.designMode!=='on' && !settings.excludedSites.some(host =>
      hosts.some(current=>current===host||current.endsWith('.'+host)));
    observer.disconnect();
    if (timer) clearTimeout(timer);
    timer = null;
    pending.clear();
    urgentPending=false;
    try { if (active) await paint(document.body); else{const selection=selected(document.body);unwrap(document.body);restoreExisting(document.body);restoreAccessibility(document.body);restoreSelection(document.body,selection);} }
    finally { rendering=false;connect();if(pending.size&&!timer)timer=setTimeout(flush,80);document.dispatchEvent(new CustomEvent('ris-settings-applied'));document.dispatchEvent(new CustomEvent('ris-markings-applied',{detail:{pending:pending.size>0}})); }
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) configure();
  });
  for(const name of ['pointerdown','click','auxclick','contextmenu'])document.addEventListener(name,event=>{
    if(name==='pointerdown')selectionInput++;
    const anchor=event.target.closest?.('a.ris-citation');
    if(anchor&&owned.has(anchor)){
      anchor.href=RIS.buildUrl(references.get(anchor));
      if(name==='click'&&event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){
        event.preventDefault();
        if(anchor.closest('[data-ris-existing-link]'))event.stopImmediatePropagation();
        const fallback=()=>{const tab=window.open(anchor.href,'_blank','noopener');tab?.focus();};
        try{chrome.runtime.sendMessage({type:'ris-open-citation',url:anchor.href}).then(reply=>{if(!reply?.opened)fallback();},fallback);}catch{fallback();}
      }
    }
  },true);
  document.addEventListener('keydown',()=>selectionInput++,true);
  for(const name of ['resize','hashchange'])window.addEventListener(name,()=>{
    for(const hidden of hiddenRoots){if(!hidden.isConnected){hiddenRoots.delete(hidden);continue;}if(hidden.getClientRects().length)enqueue(group(hidden));}
  });
  configure();
})();
