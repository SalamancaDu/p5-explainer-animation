function createScene(p, kit) {
  const W=1920,H=1080;
  const buffer=(w,h)=>{const g=p.createGraphics(w,h);g.pixelDensity(1);return g;};
  const paper=buffer(W,H);paper.background('#a6ad82');paper.noStroke();
  for(let y=0;y<H;y+=14)for(let x=0;x<W;x+=14){paper.fill(45,48,27,14*p.noise(x*.004,y*.004));paper.rect(x,y,14,14);}
  for(let i=0;i<22000;i++){paper.fill(i%2?250:40,16);paper.rect(kit.random('px'+i)*W,kit.random('py'+i)*H,1.4,1.4);}
  for(let i=0;i<2000;i++){const x=kit.random('fx'+i)*W,y=kit.random('fy'+i)*H;paper.stroke(244,239,214,30);paper.line(x,y,x+8*kit.random('fl'+i),y+2);}
  function cutout(w,h,color,id,kind){
    const g=buffer(w+60,h+60),c=g.drawingContext,cx=(w+60)/2,cy=(h+60)/2;
    function edge(inset){c.beginPath();for(let i=0;i<=160;i++){const a=i*Math.PI*2/160,n=8*(p.noise(id,i*.08)-.5)+2.4*(p.noise(id+20,i*.7)-.5)+.8*(p.noise(id+40,i*2)-.5);const x=cx+(w/2-inset+n)*Math.cos(a),y=cy+(h/2-inset+n)*Math.sin(a);i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();}
    edge(0);c.fillStyle='#fff9e9';c.fill();c.save();edge(8);c.clip();c.fillStyle=color;c.fillRect(0,0,g.width,g.height);
    if(kind==='petal'){
      c.fillStyle='rgba(245,230,195,.4)';c.fillRect(0,0,g.width,g.height);
      for(const [deg,ink,offset]of [[15,'rgba(0,125,138,.25)',-2.5],[75,'rgba(194,45,101,.25)',2.5],[45,'rgba(35,36,28,.64)',0]]){
        const a=deg*Math.PI/180;c.fillStyle=ink;c.beginPath();
        for(let y=-220;y<220;y+=7)for(let x=-220;x<220;x+=7){const xx=cx+x*Math.cos(a)-y*Math.sin(a),yy=cy+x*Math.sin(a)+y*Math.cos(a);const r=.5+2.3*kit.clamp((xx/g.width)*.65+(yy/g.height)*.35);c.moveTo(xx+offset+r,yy);c.arc(xx+offset,yy,r,0,Math.PI*2);}c.fill();
      }
    }else{c.strokeStyle='rgba(40,50,27,.25)';c.lineWidth=2;for(let y=15;y<g.height;y+=17){c.beginPath();c.moveTo(0,y);c.lineTo(g.width,y+9);c.stroke();}}
    c.restore();g.stroke(255,249,229,170);g.strokeWeight(.8);for(let i=0;i<30;i++){const a=i*Math.PI*2/30;const x=cx+w/2*Math.cos(a),y=cy+h/2*Math.sin(a);g.line(x,y,x+3,y+4);}return g;
  }
  const petals=Array.from({length:7},(_,i)=>cutout(174,300,i%2?'#edce42':'#e5ddc2',i+1,'petal'));
  const leaf=cutout(245,105,'#526745',26,'leaf'),center=cutout(185,185,'#c54b39',33,'center');
  const grains=Array.from({length:4},(_,j)=>{const g=buffer(640,360);g.noStroke();for(let i=0;i<6500;i++){g.fill(i%2?255:0,14);g.rect(kit.random('gx'+i,j)*640,kit.random('gy'+i,j)*360,1,1);}return g;});
  function sprite(g,x,y,angle,f,start,fromX,fromY,layer){
    if(f<start)return;const t=kit.clamp((f-start)/17),e=kit.backOut(t,1.9);
    const drift=f>start+17?(p.noise(f*.012,layer)-.5)*5:0;
    p.push();p.translate(fromX+(x-fromX)*e+drift,fromY+(y-fromY)*e);p.rotate(angle+(1-t)*.12);
    const c=p.drawingContext;c.shadowColor='rgba(36,31,12,.25)';c.shadowBlur=8+layer;c.shadowOffsetY=5+layer*.4;p.image(g,-g.width/2,-g.height/2);p.pop();
  }
  return {reset(){},render(frame){
    const f=Math.min(frame,150);p.push();p.scale(CONFIG.width/W,CONFIG.height/H);p.image(paper,0,0);
    p.push();p.translate(960,540);p.scale(1.035-.035*kit.smooth(f/35)+.055*kit.smooth((f-95)/30));p.translate(-960,-540);
    p.stroke('#354e37');p.strokeWeight(22);p.noFill();p.bezier(962,920,925,730,990,650,960,430);
    sprite(leaf,852,730,-.4,f,-7,-200,850,1);sprite(leaf,1060,665,.55,f,8,2120,800,2);
    for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const x=960+Math.sin(a)*174,y=425-Math.cos(a)*174;sprite(petals[i],x,y,a,f,20+i*10,960+Math.sin(a)*1400,425-Math.cos(a)*1100,3+i);}
    sprite(center,960,425,0,f,98,960,-300,12);
    p.pop();p.image(grains[Math.floor(f/2)%4],0,0,W,H);
    if(f>=116){p.noStroke();p.fill('#24261f');p.rect(1355,803,270,116);p.fill('#fff8dd');p.textFont(CONFIG.fontFamily);p.textStyle(p.BOLD);p.textAlign(p.CENTER,p.CENTER);p.textSize(68);p.text('开花',1490,855);}
    p.pop();
  }};
}
