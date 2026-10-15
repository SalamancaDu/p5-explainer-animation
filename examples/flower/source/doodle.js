function createScene(p,kit){
  const W=1920,H=1080,ink='#292b25',red='#c54b39';
  const paper=p.createGraphics(W,H);paper.pixelDensity(1);paper.background('#f4eedd');paper.noStroke();
  for(let i=0;i<15000;i++){paper.fill(86,70,48,12);paper.rect(kit.random('paperx'+i)*W,kit.random('papery'+i)*H,1.2,1.2);}
  const paths=[];
  function add(points,start,width=9,fill=null,id=paths.length){paths.push({points,start,width,fill,id});}
  const curve=(fn,n=70)=>Array.from({length:n+1},(_,i)=>fn(i/n));
  const ellipse=(cx,cy,rx,ry,turns=.97)=>curve(t=>[cx+rx*Math.cos(-1.9+t*Math.PI*2*turns),cy+ry*Math.sin(-1.9+t*Math.PI*2*turns)]);
  // The first frame already contains the character; the flower is drawn later.
  add(ellipse(425,470,123,142),-30,10);
  add(curve(t=>[305+t*245,410-95*Math.sin(t*Math.PI)]),-30,22,red);
  add([[345,590],[310,815],[535,815],[503,592]],-25,10);
  add([[346,664],[237,705],[220,680]],-20,10);add([[510,665],[624,577],[649,541]],-20,10);
  add([[355,817],[334,939],[289,942]],-20,11);add([[488,817],[514,936],[559,938]],-20,11);
  add(ellipse(385,459,10,16),-20,7,ink);add(ellipse(465,459,10,16),-20,7,ink);
  add(curve(t=>[391+t*62,515+22*Math.sin(t*Math.PI)]),-20,7);
  add(ellipse(699,365,129,86,.90),4,7);add([[610,427],[592,462],[648,440]],14,7);
  add(curve(t=>[645+105*t,365+22*Math.sin(t*Math.PI*4)]),22,6,red);
  add(curve(t=>[841+220*t,380-45*Math.sin(Math.PI*t)]),37,9);
  add([[1033,352],[1063,380]],52,9);add([[1063,380],[1026,397]],57,9);
  add(curve(t=>[1313+20*Math.sin(t*3),844-356*t]),63,12);
  add(curve(t=>[1318-200*Math.sin(t*Math.PI),724-96*Math.sin(t*Math.PI)*Math.cos(t*Math.PI)]),72,8,red);
  add(curve(t=>[1320+180*Math.sin(t*Math.PI),661-85*Math.sin(t*Math.PI)*Math.cos(t*Math.PI)]),80,8,red);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;add(curve(t=>{const r=45+210*Math.sin(t*Math.PI);const aa=a+(t-.5)*.72;return[1310+r*Math.sin(aa),440-r*Math.cos(aa)];}),83+i*6,8,i%2===0?red:null);}
  add(ellipse(1310,440,57,57,1.02),129,10,red);
  for(let i=0;i<3;i++){const a=-1+i*.7;add([[1310+290*Math.cos(a),440+290*Math.sin(a)],[1310+326*Math.cos(a),440+326*Math.sin(a)]],134+i*3,7);}
  function drawPath(item,frame){
    const progress=kit.smooth((frame-item.start)/18);if(progress<=0)return;
    const bucket=Math.floor((frame+item.id%3)/3),points=item.points;
    const driftX=(kit.random('dx'+item.id,bucket)-.5)*4,driftY=(kit.random('dy'+item.id,bucket)-.5)*4;
    let total=0;const lengths=[0];for(let i=1;i<points.length;i++){total+=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);lengths.push(total);}
    const visible=[];for(let i=0;i<points.length;i++){if(lengths[i]>total*progress&&visible.length>1)break;visible.push([points[i][0]+driftX+(kit.random('x'+item.id+'-'+i,bucket)-.5)*2,points[i][1]+driftY+(kit.random('y'+item.id+'-'+i,bucket)-.5)*2]);}
    if(visible.length<2)return;
    if(item.fill&&progress===1){p.noStroke();p.fill(item.fill);p.beginShape();for(const [x,y]of visible)p.vertex(x+3,y+2);p.endShape(p.CLOSE);}
    const left=[],right=[];
    for(let i=0;i<visible.length;i++){const prev=visible[Math.max(0,i-1)],next=visible[Math.min(visible.length-1,i+1)],dx=next[0]-prev[0],dy=next[1]-prev[1],len=Math.hypot(dx,dy)||1;const pressure=item.width*(.2+.8*Math.sin(Math.PI*(i+.4)/(visible.length+.1)))*(.9+.15*Math.sin(i*.4));left.push([visible[i][0]-dy/len*pressure/2,visible[i][1]+dx/len*pressure/2]);right.push([visible[i][0]+dy/len*pressure/2,visible[i][1]-dx/len*pressure/2]);}
    p.noStroke();p.fill(ink);p.beginShape();for(const q of [...left,...right.reverse()])p.vertex(...q);p.endShape(p.CLOSE);
    // Sparse paper bites affect the ink path, not the color fill.
    p.stroke('#f4eedd');p.strokeWeight(.9);for(let i=3;i<visible.length;i+=9){const [x,y]=visible[i];p.line(x,y,x+1.5,y+.4);}
  }
  return{reset(){},render(frame){p.push();p.scale(CONFIG.width/W,CONFIG.height/H);p.image(paper,0,0);for(const item of paths)drawPath(item,frame);p.pop();}};
}
