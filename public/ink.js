import {RULES} from './rules.js';
const cache=new WeakMap();
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function compile(stroke){
  const found=cache.get(stroke);if(found?.length===stroke.points.length)return found.marks;
  const rand=random(stroke.seed),r=(a,b)=>a+(b-a)*rand(),marks=[];
  const color=RULES.inks[stroke.ink];
  if(stroke.kind==='thread'){
    const p=stroke.points,path=new Path2D();path.moveTo(p[0][0],p[0][1]);
    for(let i=1;i<p.length-1;i++)path.quadraticCurveTo(p[i][0],p[i][1],(p[i][0]+p[i+1][0])/2,(p[i][1]+p[i+1][1])/2);
    if(p.length>1)path.lineTo(p.at(-1)[0],p.at(-1)[1]);
    marks.push({path,color,width:.65,alpha:.54,x:0,y:0,angle:0});
  }else{
    let distance=0,next=0;
    for(let i=1;i<stroke.points.length;i++){
      const a=stroke.points[i-1],b=stroke.points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if(!length)continue;
      while(next<=distance+length){
        const f=(next-distance)/length,size=r(RULES.pen.minGlyph,RULES.pen.maxGlyph),height=r(7,17),gestures=2+Math.floor(rand()*4);
        const path=new Path2D();let px=0,py=r(-2,2);path.moveTo(px,py);
        for(let k=0;k<gestures;k++){
          const step=size/gestures,nx=px+step,ny=r(-3,3);
          path.bezierCurveTo(px+step*.15,py-height*r(.5,1.4),nx+step*.6,ny+height*r(-.3,.8),nx,ny);px=nx;py=ny;
        }
        if(rand()<.29){path.moveTo(size*.52,-4);path.quadraticCurveTo(size*.77,-height*1.4,size*.86,-height*.7);}
        const pressure=a[2]+(b[2]-a[2])*f;
        marks.push({path,x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),width:r(RULES.pen.minWidth,RULES.pen.maxWidth)*(.75+pressure*.5),alpha:r(.65,.94),color:stroke.ink==='ink'&&rand()<.16?RULES.inks.blue:color});
        next+=size+r(4,9);
      }
      distance+=length;
    }
  }
  cache.set(stroke,{length:stroke.points.length,marks});return marks;
}
export function drawTrace(ctx,trace,{time=0,motion=false,alpha=1}={}){
  ctx.save();ctx.translate(trace.x,trace.y);ctx.lineCap='round';ctx.lineJoin='round';
  for(const stroke of trace.strokes){
    const marks=compile(stroke);
    for(let i=0;i<marks.length;i++){
      const m=marks[i];ctx.save();ctx.translate(m.x,m.y+(motion&&stroke.kind==='script'?Math.sin(time*.2+i*.09+stroke.seed)*.8:0));ctx.rotate(m.angle);
      ctx.strokeStyle=m.color;ctx.lineWidth=m.width;ctx.globalAlpha=m.alpha*alpha;ctx.stroke(m.path);ctx.restore();
    }
  }
  ctx.restore();
}
