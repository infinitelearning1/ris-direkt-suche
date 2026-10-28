/* Order accessible PDF text fragments without mixing repeated text columns. */
(function(root){
  'use strict';
  function order(items){
    if(items.length<8)return items;
    const nonempty=items.filter(i=>i.rect.width>0&&i.rect.height>0);
    if(!nonempty.length)return items;
    // A loop instead of Math.min(...list): spreading very long lists can exceed the call stack.
    let min=Infinity,max=-Infinity;for(const i of nonempty){if(i.rect.left<min)min=i.rect.left;if(i.rect.right>max)max=i.rect.right;}const width=max-min;
    const rows=[];
    for(const item of [...nonempty].sort((a,b)=>a.rect.top-b.rect.top||a.rect.left-b.rect.left)){
      let row=rows.at(-1);if(!row||Math.abs(row.y-item.rect.top)>Math.max(3,item.rect.height*.35)){row={y:item.rect.top,items:[]};rows.push(row);}row.items.push(item);
    }
    const votes=[];
    for(const row of rows){const line=row.items.sort((a,b)=>a.rect.left-b.rect.left);for(let i=1;i<line.length;i++){
      const a=line[i-1].rect,b=line[i].rect,gap=b.left-a.right,center=(b.left+a.right)/2;
      if(gap>Math.max(22,a.height*1.8)&&center>min+width*.3&&center<min+width*.7)votes.push({center,left:a.right,right:b.left});
    }}
    if(votes.length<3)return items;
    votes.sort((a,b)=>a.center-b.center);let start=0,bestStart=0,bestLength=0;
    for(let end=0;end<votes.length;end++){while(votes[end].center-votes[start].center>=48)start++;if(end-start+1>bestLength){bestStart=start;bestLength=end-start+1;}}
    const best=votes.slice(bestStart,bestStart+bestLength);
    if(best.length<3||best.length<rows.length*.15)return items;
    const left=Math.max(...best.map(v=>v.left)),right=Math.min(...best.map(v=>v.right));
    // Varying line lengths move gap midpoints into the left column. Prefer the
    // common empty gutter, so a long left-column line is never treated as a heading.
    const cut=left<right?(left+right)/2:best.reduce((a,b)=>a+b.center,0)/best.length,ordered=[];let band=[];
    function flush(){for(const side of [false,true])for(const row of band)ordered.push(...row.items.filter(i=>((i.rect.left+i.rect.right)/2>=cut)===side));band=[];}
    for(const row of rows){
      const crosses=row.items.some(i=>i.rect.left<cut-2&&i.rect.right>cut+2)||row.items.some((item,index)=>{
        const next=row.items[index+1];return next&&item.rect.right<=cut&&next.rect.left>=cut&&next.rect.left-item.rect.right<Math.max(12,item.rect.height);
      });
      if(crosses){flush();ordered.push(...row.items);}else band.push(row);
    }flush();
    // Invisible/zero-size fragments keep their source position instead of being
    // silently discarded. A page with hidden fragments stays in source order.
    return ordered.length===items.length?ordered:items;
  }
  root.RISPdfLayout={order};if(typeof module!=='undefined')module.exports=root.RISPdfLayout;
})(globalThis);
