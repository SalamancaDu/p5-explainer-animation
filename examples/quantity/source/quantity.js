function createScene(p,kit){
  const W=1920,H=1080;
  const paper=p.createGraphics(W,H);paper.pixelDensity(1);paper.background('#eee8d9');paper.noStroke();
  for(let i=0;i<17000;i++){paper.fill(55,51,35,15);paper.rect(kit.random('x'+i)*W,kit.random('y'+i)*H,1,1);}
  const colors=['#d3ac58','#cd765c','#a6ad82','#d3ac58','#cd765c','#a6ad82'];
  const cards=colors.map((color,id)=>{const g=p.createGraphics(230,280);g.pixelDensity(1);g.clear();g.noStroke();
    function edge(inset){g.beginShape();for(const [x,y,dx,dy,len]of [[inset,inset,1,0,230-2*inset],[230-inset,inset,0,1,280-2*inset],[230-inset,280-inset,-1,0,230-2*inset],[inset,280-inset,0,-1,280-2*inset]])for(let d=0;d<len;d+=3){const n=(p.noise(id+3,d*.03,x+y)-.5)*9+(p.noise(id+12,d*.4)-.5)*3;g.vertex(x+dx*d-dy*n,y+dy*d+dx*n);}g.endShape(p.CLOSE);}
    g.fill('#fffaf0');edge(8);g.fill(color);edge(17);g.fill('#292b25');g.rect(34,39,162,120,4);g.fill(color);for(let x=45;x<190;x+=26){g.rect(x,46,12,10);g.rect(x,142,12,10);}g.fill('#eee8d9');g.triangle(99,78,99,125,137,102);g.textFont(CONFIG.fontFamily);g.textStyle(p.BOLD);g.textAlign(p.CENTER,p.CENTER);g.textSize(60);g.fill('#292b25');g.text(String(id+1),115,215);return g;});
  return{reset(){},render(frame){const f=Math.min(frame,150);p.push();p.scale(CONFIG.width/W,CONFIG.height/H);p.image(paper,0,0);
    const split=kit.smooth((f-68)/45);
    if(split>0){p.noFill();p.stroke('#797d61');p.strokeWeight(4);for(const cx of[535,1385]){p.beginShape();p.vertex(cx-365,715);p.vertex(cx-365,755);p.vertex(cx+365,755);p.vertex(cx+365,715);p.endShape();}}
    for(let i=0;i<6;i++){const appear=kit.backOut((f-(i*7-6))/17,1.7);if(f<i*7-6)continue;const sx=660+i*120,sy=485+(i%2)*20,tx=(i<3?280:1130)+(i%3)*255,ty=505;const x=sx+(tx-sx)*split,y=-300+(sy+300)*appear+(ty-sy)*split;const angle=(kit.random('angle'+i)-.5)*.35*(1-split);p.push();p.translate(x,y);p.rotate(angle);const c=p.drawingContext;c.shadowColor='rgba(38,30,12,.22)';c.shadowBlur=14;c.shadowOffsetY=8;p.image(cards[i],-115,-140);p.pop();}
    p.noStroke();p.fill('#292b25');p.textFont(CONFIG.fontFamily);p.textStyle(p.BOLD);p.textAlign(p.CENTER,p.CENTER);p.textSize(82);p.text(f<90?'6':'2 × 3 = 6',960,220);p.textSize(30);p.fill('#63684e');p.text('示例',960,930);p.pop();}};
}
