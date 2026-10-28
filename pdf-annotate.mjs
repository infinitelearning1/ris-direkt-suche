/* Temporary native-viewer representation. Original Blob is never changed. */
import {getDocument,GlobalWorkerOptions,TextLayer} from './pdf-core.mjs';
GlobalWorkerOptions.workerSrc=chrome.runtime.getURL('pdf.worker.mjs');
const {PDFDocument,PDFName,PDFArray,PDFString,rgb}=globalThis.PDFLib;
const ink=value=>rgb(...value.slice(1).match(/../g).map(x=>parseInt(x,16)/255));
function layout(layer){
 const ordered=RISPdfLayout.order([...layer.querySelectorAll('span')].filter(s=>s.firstChild?.nodeType===Node.TEXT_NODE&&!s.querySelector('span')).map(s=>({node:s.firstChild,rect:s.getBoundingClientRect()})));
 let text='',previous;const segments=[];
 for(const part of ordered){if(previous){const a=previous.rect,b=part.rect;if(b.top<a.top-Math.max(3,a.height*.5))text+='\u0000';else if(Math.abs(a.top-b.top)>2)text+='\n';else if(b.left-a.right>2)text+=' ';}segments.push({...part,start:text.length,end:text.length+part.node.length});text+=part.node.nodeValue;previous=part;}
 return{text,segments};
}
const overlap=(a,b)=>Math.min(a[2],b[2])>Math.max(a[0],b[0])&&Math.min(a[3],b[3])>Math.max(a[1],b[1]);
function links(page,context){const a=page.node.lookupMaybe(PDFName.of('Annots'),PDFArray),rects=[];if(a)for(let i=0;i<a.size();i++){const v=context.lookup(a.get(i));if(v?.get?.(PDFName.of('Subtype'))?.toString()==='/Link'){const r=v.lookupMaybe(PDFName.of('Rect'),PDFArray);if(r)rects.push(r.asArray().map(n=>n.asNumber()));}}return rects;}
function link(page,context,rect,url,label){let a=page.node.lookupMaybe(PDFName.of('Annots'),PDFArray);if(!a){a=context.obj([]);page.node.set(PDFName.of('Annots'),a);}a.push(context.register(context.obj({Type:'Annot',Subtype:'Link',Rect:rect,Border:[0,0,0],Contents:PDFString.of(label),A:{Type:'Action',S:'URI',URI:PDFString.of(url)}})));}
export async function annotatePDF(original,id,settings,{signal,onProgress=()=>{},referencesSeed=[],documentContext={}}={}){
 const started=performance.now(),stage=document.querySelector('#stage');let task;const abort=()=>{if(signal?.aborted)throw new DOMException('Verarbeitung abgebrochen.','AbortError');};
 if(!(original instanceof Blob)||!original.size||original.size>256*1024*1024)throw Error('Die PDF muss kleiner als 256 MB sein.');
 const bytes=new Uint8Array(await original.arrayBuffer());if(!new TextDecoder().decode(bytes.subarray(0,1024)).includes('%PDF-'))throw Error('Die geöffnete Quelle liefert keine PDF-Datei.');abort();
 try{
  const pdf=await PDFDocument.load(bytes,{updateMetadata:false});
  if([...pdf.context.enumerateIndirectObjects()].some(([,obj])=>obj?.get?.(PDFName.of('Type'))?.toString()==='/Sig'||obj?.has?.(PDFName.of('ByteRange'))))throw Error('Signierte PDFs werden nicht verändert.');
  task=getDocument({data:bytes.slice(),isEvalSupported:false,useSystemFonts:true,standardFontDataUrl:chrome.runtime.getURL(''),disableAutoFetch:true});const decoded=await task.promise;if(decoded.numPages>5000)throw Error('Die PDF darf höchstens 5000 Seiten enthalten.');
  documentContext={...documentContext,metadataTitle:pdf.getTitle()||''};
  const publication=RISPdfHistory.detect(documentContext);
  const references=[...referencesSeed],refIds=new Map(references.map((ref,index)=>[JSON.stringify(ref),index]));let citations=0,textPages=0;
  for(let number=1;number<=decoded.numPages;number++){
   abort();onProgress({page:number,pages:decoded.numPages});const source=await decoded.getPage(number),content=await source.getTextContent();
   if(!content.items.some(item=>item.str?.trim())){source.cleanup();continue;}textPages++;
   // Load actual PDF fonts without rasterizing every page or its images.
   await source.getOperatorList();abort();const viewport=source.getViewport({scale:1}),wrapper=document.createElement('div'),layer=document.createElement('div');wrapper.style.cssText='position:relative;width:'+viewport.width+'px;height:'+viewport.height+'px';wrapper.style.setProperty('--total-scale-factor','1');layer.className='textLayer';wrapper.append(layer);stage.replaceChildren(wrapper);
   await new TextLayer({textContentSource:content,container:layer,viewport}).render();await document.fonts.ready;
   const {text,segments}=layout(layer),page=pdf.getPage(number-1),existing=links(page,pdf.context),base=wrapper.getBoundingClientRect();
   const matches=RIS.findMatches(text).filter(m=>RISSettings.accepts(m.ref,settings));
   for(const match of matches){
    const key=JSON.stringify(match.ref);let refId=refIds.get(key);if(refId===undefined){refId=references.length;refIds.set(key,refId);references.push(match.ref);}
    const targetRef=RISPdfHistory.apply(match.ref,settings,publication);
    const url=new URL(targetRef.year?'https://www.ris.bka.gv.at/':RIS.buildUrl(targetRef));url.searchParams.set('risPdfNav',id);url.searchParams.set('risPdfRef',String(refId));url.searchParams.set('risPdfPage',String(number));let written=false;
    for(const segment of segments){const start=Math.max(match.start,segment.start),end=Math.min(match.end,segment.end);if(start>=end||!text.slice(start,end).trim())continue;const range=document.createRange();range.setStart(segment.node,start-segment.start);range.setEnd(segment.node,end-segment.start);
     for(const rect of range.getClientRects()){
      const corners=[[rect.left-base.left,rect.top-base.top],[rect.right-base.left,rect.top-base.top],[rect.left-base.left,rect.bottom-base.top],[rect.right-base.left,rect.bottom-base.top]].map(([x,y])=>viewport.convertToPdfPoint(x,y));const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]),box=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];if(existing.some(r=>overlap(r,box)))continue;
      link(page,pdf.context,box,url.href,RIS.label(targetRef));written=true;const c=ink(settings[match.ref.type==='norm'?'normColor':match.ref.type==='rs'?'rsColor':match.ref.type==='fundstelle'?'fundstelleColor':'caseColor']);
      if(settings.style!=='highlight'){const a=viewport.convertToPdfPoint(rect.left-base.left,rect.bottom-base.top-1),b=viewport.convertToPdfPoint(rect.right-base.left,rect.bottom-base.top-1);page.drawLine({start:{x:a[0],y:a[1]},end:{x:b[0],y:b[1]},thickness:.7,color:c});}
      if(settings.style!=='underline')page.drawRectangle({x:box[0],y:box[1],width:box[2]-box[0],height:box[3]-box[1],color:ink(settings.highlightColor),opacity:.25});
     }
    }
    if(written)citations++;
   }
   stage.replaceChildren();source.cleanup();await new Promise(r=>setTimeout(r,0));
  }
  abort();const result=citations?new Blob([await pdf.save({useObjectStreams:true})],{type:'application/pdf'}):original;abort();
  return{blob:result,references,documentContext,publication,citations,pages:decoded.numPages,textPages,processingMs:Math.round(performance.now()-started)};
 }finally{stage.replaceChildren();if(task)await task.destroy();}
}
