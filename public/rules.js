export const RULES=Object.freeze({
  version:1,paper:'#f0e8d9',inks:{ink:'#282429',blue:'#2b4587',red:'#a74343'},
  maxStrokes:128,maxPoints:4096,maxStrokePoints:512,maxTraceSpan:1600,
  worldLimit:50000,clearance:72,cellSize:2400,maxTracesPerCell:18,
  pen:{minWidth:.48,maxWidth:1.5,minGlyph:9,maxGlyph:24},
});
export const SEEDS=Object.freeze([
  {id:'original',title:'Untranslatable',x:-450,y:-600,w:900,h:1200},
  {id:'03',title:'Where the sentence turns',x:1050,y:-1050,w:1100,h:1100},
  {id:'05',title:'Without an address',x:-2030,y:560,w:1440,h:960},
  {id:'02',title:'A page written over itself',x:-2120,y:-1610,w:1440,h:960},
  {id:'04',title:'The second hand',x:420,y:1210,w:900,h:1200},
  {id:'06',title:'The margin becomes the page',x:2410,y:400,w:900,h:1200},
  {id:'01',title:'The gap learns my shape',x:-900,y:-3040,w:900,h:1200},
  {id:'07',title:'A sentence trying to arrive',x:500,y:-3090,w:900,h:1200},
  {id:'08',title:'Between one word and the next',x:-1720,y:2100,w:1440,h:960},
  {id:'09',title:'The reply changes the question',x:1790,y:2140,w:1100,h:1100},
  {id:'10',title:'Nothing disappears cleanly',x:-3360,y:-330,w:900,h:1200},
]);
export function boundsOf(trace){
  const points=trace.strokes.flatMap(s=>s.points);
  return {x:trace.x+Math.min(...points.map(p=>p[0]))-25,y:trace.y+Math.min(...points.map(p=>p[1]))-30,
    right:trace.x+Math.max(...points.map(p=>p[0]))+30,bottom:trace.y+Math.max(...points.map(p=>p[1]))+30};
}
export function overlaps(a,b,margin=RULES.clearance){return a.x<b.right+margin&&a.right>b.x-margin&&a.y<b.bottom+margin&&a.bottom>b.y-margin;}
export function placementIssue(trace,existing=[]){
  const b=boundsOf(trace);
  if(b.x < -RULES.worldLimit || b.y < -RULES.worldLimit || b.right > RULES.worldLimit || b.bottom > RULES.worldLimit)return 'This is the edge of the manuscript. Move your trace toward the centre.';
  if(b.right-b.x>RULES.maxTraceSpan||b.bottom-b.y>RULES.maxTraceSpan)return 'Keep this trace within one page. Finish it here, then begin another.';
  if(SEEDS.some(s=>overlaps(b,{x:s.x,y:s.y,right:s.x+s.w,bottom:s.y+s.h})))return 'Leave a little paper around the existing work. Move your trace into an open space.';
  if(existing.some(s=>overlaps(b,boundsOf(s))))return 'Another trace needs a little room. Move yours into an open space.';
  const cx=Math.floor(trace.x/RULES.cellSize),cy=Math.floor(trace.y/RULES.cellSize);
  if(existing.filter(s=>Math.floor(s.x/RULES.cellSize)===cx&&Math.floor(s.y/RULES.cellSize)===cy).length>=RULES.maxTracesPerCell)return 'This part of the manuscript is full. Move outward to begin a new passage.';
  return null;
}
