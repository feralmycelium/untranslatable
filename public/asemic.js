(() => {
  const PAPER='#f0e8d9',INK='#282429',BLUE='#2b4587',RED='#a74343';
  const titles=['The gap learns my shape','A page written over itself','Where the sentence turns','The second hand','Without an address','The margin becomes the page','A sentence trying to arrive','Between one word and the next','The reply changes the question','Nothing disappears cleanly'];
  const configs=[
    [900,1200,3000,4000],[1440,960,4000,2666],[1100,1100,3600,3600],
    [900,1200,3000,4000],[1440,960,4000,2666],[900,1200,3000,4000],
    [900,1200,1080,1440],[1440,960,1920,1280],[1100,1100,1440,1440],[900,1200,1080,1440],
  ];
  const durations={7:36,8:28,9:32,10:40};
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  const n=x=>Number(x.toFixed(3));
  function build(id){
    const index=Number(id),[w,h,pw,ph]=configs[index-1];
    let seed=73026+index*173;
    const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const r=(a,b)=>a+(b-a)*rand();
    const marks=[];
    const add=m=>{marks.push({x:0,y:0,angle:0,alpha:1,width:1,color:INK,reveal:1,...m});return marks.at(-1);};
    function glyph(x,y,size=r(9,24),height=r(7,18),color){
      const gestures=2+Math.floor(rand()*4);let px=0,py=r(-2,2),d=`M0 ${n(py)}`;
      for(let k=0;k<gestures;k++){
        const step=size/gestures,nx=px+step,ny=r(-3,3);
        d+=` C${n(px+step*.15)} ${n(py-height*r(.5,1.4))} ${n(nx+step*.6)} ${n(ny+height*r(-.3,.8))} ${n(nx)} ${n(ny)}`;
        px=nx;py=ny;
      }
      if(rand()<.29)d+=` M${n(size*.52)} -4 Q${n(size*.77)} ${n(-height*1.4)} ${n(size*.86)} ${n(-height*.7)}`;
      return {d,x,y,angle:0,alpha:r(.58,.94),width:r(.48,1.5),color:color||(rand()<.17?BLUE:INK),size,reveal:1};
    }
    function passage({x=70,y=90,span=w-140,rows=40,leading=25,color,modify=()=>{}}={}){
      for(let row=0;row<rows;row++){
        let px=x+r(-5,8),col=0;
        while(px<x+span-24){
          const size=r(9,24),m=glyph(px,y+row*leading+r(-2.8,2.8),size,r(7,17),color);
          m.row=row;m.col=col++;m.role='writing';m.rank=marks.length;
          if(modify(m,row)!==false){add(m);if(rand()<.045)add({d:`M0 0 Q${n(size*.8)} -3 ${n(size*1.6)} -1`,x:m.x-2,y:m.y+5,width:.65,color:RED,alpha:.65,size:size*1.6,role:'correction',row});}
          px+=size+r(3,7)+(rand()<.07?r(15,30):0);
        }
      }
    }
    function thread(x,y,segments=8,reach=55,drop=35,alpha=.3,color=BLUE){
      let px=0,py=0,d='M0 0';
      for(let k=0;k<segments;k++){
        const nx=px+r(-reach,reach),ny=py+r(drop*.35,drop*1.7);
        d+=` C${n(px+r(-reach,reach))} ${n(py-drop)} ${n(nx-reach*.65)} ${n(ny+drop*.3)} ${n(nx)} ${n(ny)}`;
        px=nx;py=ny;
      }
      add({d,x,y,color,alpha,width:r(.3,.72),role:'thread',phase:r(0,Math.PI*2)});
    }
    if(index===1){
      passage({rows:44,leading:23.5,modify(m,row){
        const centre=440+44*Math.sin(row*.16)+13*Math.cos(row*.48);
        const gap=12+48*Math.sin(row/43*Math.PI)**2;
        if(Math.abs(m.x-centre)<gap)return false;
        m.y+=6*Math.sin(m.x*.009+row*.2);
        if(Math.abs(m.x-centre)<gap+45){m.angle=(m.x>centre?1:-1)*r(0,.13);m.width*=1.18;}
      }});
      for(let k=0;k<30;k++)thread(455+r(-22,22),325+r(-20,30),11,60,35,r(.12,.37),k%7===0?RED:BLUE);
    }
    if(index===2){
      for(let layer=0;layer<6;layer++){
        passage({x:130+layer*9,y:265+layer*7,span:1170-layer*7,rows:20,leading:20,
          color:layer===0||layer===4?BLUE:INK,modify(m,row){
            m.y+=17*Math.sin(m.x*.005+row*.17)+layer*2*Math.sin(row*.7);
            m.x+=11*Math.sin(row*.6+layer);m.alpha*=layer<2?.48:.85;m.width*=1.2;
            if((row+layer)%7===0&&m.x>680&&m.x<890)return false;
          }});
      }
      for(let k=0;k<14;k++)thread(970+r(-220,120),340+r(-45,40),9,70,34,.18,k%5===0?RED:BLUE);
      for(let k=0;k<9;k++)add({d:`M0 0 Q${n(r(70,160))} ${n(r(-8,8))} ${n(r(240,500))} ${n(r(-10,10))}`,x:r(160,730),y:310+k*39,color:RED,width:.7,alpha:.58});
    }
    if(index===3){
      let a=-Math.PI*.6,rad=468,order=0;
      while(rad>39){
        const size=r(10,23),rr=rad+4*Math.sin(a*5)+2*Math.cos(a*9);
        const m=glyph(550+rr*Math.cos(a),550+rr*Math.sin(a),size,r(7,17));
        m.angle=a+Math.PI/2;m.role='writing';m.rank=order++;
        if(!(rad>240&&rad<280&&Math.cos(a)>.6))add(m);
        const step=(size+r(5,9))/rad;a+=step;rad-=step*5.1;
      }
      for(let k=0;k<12;k++)thread(551+r(-12,12),492+r(-8,12),5,25,14,.33,k%4?BLUE:RED);
      for(let k=0;k<7;k++)add({d:'M0 0 q 10 -5 26 -2',x:550+r(50,330),y:550+r(-250,170),color:RED,alpha:.55,width:.6});
    }
    if(index===4){
      passage({x:70,y:105,span:335,rows:40,leading:25,color:INK,modify(m,row){m.x+=8*Math.sin(row*.3);m.y+=2*Math.sin(m.x*.02);if(row===12||row===27)return rand()>.65;}});
      passage({x:480,y:104,span:345,rows:40,leading:25,color:BLUE,modify(m,row){m.x+=9*Math.cos(row*.24);m.y+=3*Math.sin(m.x*.02);m.alpha*=.83;if(row===13||row===28)return rand()>.7;}});
      for(let k=0;k<18;k++)thread(413+r(-20,10),290+k*27,5,43,25,.22,k%6?BLUE:RED);
      const echoes=marks.filter(m=>m.role==='writing'&&m.color===INK&&m.row%6===0).map(m=>({...m,x:m.x+415,y:m.y+9,alpha:.1,width:.5,color:INK}));marks.push(...echoes);
    }
    if(index===5){
      passage({x:125,y:160,span:670,rows:27,leading:23,modify(m,row){
        m.x+=row*15;m.y+=9*Math.sin(m.x*.012+row*.1);m.angle=.035*Math.sin(row*.5);
        if(row>15&&rand()<(row-15)*.045)return false;
        m.alpha*=1-row*.013;
      }});
      for(let k=0;k<21;k++)thread(800+r(-120,100),380+r(-60,100),8,80,37,r(.1,.28),k%7?BLUE:RED);
      for(let k=0;k<12;k++){const m=glyph(640+k*44,785+18*Math.sin(k*.7),r(14,26),r(10,20),BLUE);m.alpha*=.7-k*.025;add(m);}
    }
    if(index===6){
      passage({x:58,y:81,span:790,rows:46,leading:23,modify(m,row){
        const left=232+12*Math.sin(row*.4),right=679+12*Math.sin(row*.27);
        if(row>7&&row<36&&m.x>left&&m.x<right)return false;
        if(row>7&&row<36)m.alpha*=.75;
      }});
      for(let k=0;k<26;k++)thread(669+r(-20,20),365+r(-60,30),10,44,35,r(.14,.35),k%7?BLUE:RED);
      const lone=glyph(390,644,83,36,BLUE);lone.width=.9;lone.alpha=.72;add(lone);
      add({d:'M0 0 Q64 -10 131 -4',x:372,y:658,color:RED,width:.8,alpha:.72});
    }
    if(index===7||index===10){
      passage({rows:44,leading:23.5,modify(m,row){
        m.gap=Math.abs(m.x-(451+37*Math.sin(row*.19)))<33+35*Math.sin(row*.12)**2;
        m.normal=(m.x-70)/(w-140);m.y+=3*Math.sin(row*.2+m.x*.009);
      }});
      for(let k=0;k<22;k++)thread(465+r(-33,33),358+r(-70,30),11,55,30,r(.12,.35),k%7?BLUE:RED);
    }
    if(index===8){
      passage({x:105,y:114,span:1230,rows:32,leading:24,modify(m,row){
        const centre=710+36*Math.sin(row*.2),side=m.x<centre?-1:1;
        if(Math.abs(m.x-centre)<28)return false;
        m.side=side;m.proximity=Math.exp(-Math.abs(m.x-centre)/380);
        m.y+=3*Math.sin(row*.21+m.x*.006);
      }});
      for(let k=0;k<31;k++)thread(715+r(-30,30),285+r(-30,30),10,80,35,r(.13,.35),k%8?BLUE:RED);
    }
    if(index===9){
      passage({x:100,y:135,span:905,rows:34,leading:25,color:INK,modify(m,row){m.y+=2*Math.sin(row*.3);}});
      const first=marks.filter(m=>m.role==='writing');
      for(const m of first){
        const second=glyph(m.x+r(-7,6),m.y+r(-5,5),m.size*r(.8,1.3),r(9,21),BLUE);
        add({...second,row:m.row,role:'reply',alpha:r(.4,.77),width:r(.6,1.45),phase:r(0,6.28)});
      }
      for(let k=0;k<18;k++)thread(530+r(-90,90),350+r(-70,30),11,65,29,.2,k%6?BLUE:RED);
    }
    const work={id:String(index).padStart(2,'0'),title:titles[index-1],w,h,pw,ph,paper:PAPER,marks,duration:durations[index]||0,loop:index===8};
    const writing=marks.filter(m=>m.role==='writing');writing.forEach((m,i)=>{m.order=i/writing.length;});
    return work;
  }
  function frame(work,seconds=0){
    if(!work.duration)return work.marks;
    const t=work.loop?((seconds%work.duration)+work.duration)%work.duration:Math.max(0,Math.min(work.duration,seconds));
    const id=Number(work.id);
    return work.marks.map(m=>{
      const q={...m};
      if(id===7){
        if(m.role==='writing'){
          q.reveal=clamp((t-1.5-m.order*21)/.48);
          if(m.gap)q.alpha*=1-smooth((t-23)/7)*.94;
        }else if(m.role==='thread')q.alpha*=smooth((t-24)/6);
        else q.reveal=clamp((t-4-(m.row||0)*.43)/.5);
      }
      if(id===8){
        const breath=(1-Math.cos(t/work.duration*Math.PI*2))*.5;
        if(m.role==='writing'){q.x+=m.side*breath*(28+52*m.proximity);q.y+=2.5*Math.sin(t/work.duration*Math.PI*2+m.row*.13)*m.proximity;}
        else if(m.role==='thread'){q.x+=Math.sin(t/work.duration*Math.PI*2+m.phase)*breath*15;q.alpha*=.6+.4*breath;}
      }
      if(id===9){
        if(m.role==='reply')q.reveal=clamp((t-2-(m.row/34)*20-(m.x/1100)*2)/1.3);
        else if(m.role==='writing'){
          const wave=smooth((t-4-(m.row/34)*20)/3);
          q.alpha*=1-.55*wave;q.x-=wave*7*Math.sin(m.row*.5);q.y+=wave*3;
        }else if(m.role==='thread')q.alpha*=smooth((t-18)/8);
      }
      if(id===10){
        const erase=smooth((t-5)/26);
        if(m.role==='writing'){
          const wave=clamp((erase*1.2-m.normal-.045*Math.sin(m.row*.63))/.14);
          q.alpha*=1-wave*.94;q.x+=wave*4*Math.sin(m.row*.6);q.y+=wave*3;
          if(m.gap){q.alpha*=.15;q.y+=wave*13;}
        }else if(m.role==='thread')q.alpha*=.4+.6*erase;
        else q.alpha*=1-erase*.55;
      }
      return q;
    });
  }
  function svg(work,time=0){
    const paths=frame(work,time).filter(m=>m.reveal>0).map(m=>`<path d="${m.d}" transform="translate(${n(m.x)} ${n(m.y)}) rotate(${n(m.angle*180/Math.PI)})" stroke="${m.color}" stroke-width="${n(m.width)}" opacity="${n(m.alpha)}"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${work.pw}" height="${work.ph}" viewBox="0 0 ${work.w} ${work.h}" role="img" aria-label="${work.title}. Asemic ink drawing."><rect width="${work.w}" height="${work.h}" fill="${work.paper}"/><g fill="none" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
  }
  const cache=new Map();
  function draw(canvas,work,time=0){
    const ctx=canvas.getContext('2d');ctx.setTransform(canvas.width/work.w,0,0,canvas.height/work.h,0,0);
    ctx.fillStyle=work.paper;ctx.fillRect(0,0,work.w,work.h);ctx.lineCap='round';ctx.lineJoin='round';
    for(const m of frame(work,time)){
      if(m.reveal<=0||m.alpha<=0)continue;
      let path=cache.get(m.d);if(!path){path=new Path2D(m.d);cache.set(m.d,path);}
      ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.angle);
      if(m.reveal<1&&m.size){ctx.beginPath();ctx.rect(-4,-80,(m.size+8)*m.reveal,160);ctx.clip();}
      ctx.strokeStyle=m.color;ctx.lineWidth=m.width;ctx.globalAlpha=m.alpha;ctx.stroke(path);ctx.restore();
    }
    ctx.globalAlpha=1;
  }
  globalThis.Asemic={build,frame,svg,draw,titles};
})();
