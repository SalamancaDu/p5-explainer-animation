function createScene(p,kit){
  const W=1920,H=1080;
  const buffer=()=>{const g=p.createGraphics(W,H);g.pixelDensity(1);return g;};
  // Software-backed accumulation avoids GPU batch-dependent alpha rounding
  // when replaying many translucent strokes in one seek versus many draws.
  function accumulationLayer(){const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;return{canvas,drawingContext:canvas.getContext('2d',{willReadFrequently:true})};}
  const base=accumulationLayer(),plant=accumulationLayer(),paper=buffer();paper.clear();paper.noStroke();
  for(let i=0;i<25000;i++){paper.fill(115,91,52,12);paper.rect(kit.random('tx'+i)*W,kit.random('ty'+i)*H,1.5,1.2);}
  function brush(g,e){
    const c=g.drawingContext;c.save();c.translate(e.x,e.y);c.rotate(e.angle);
    const pts=[];for(let i=0;i<=30;i++){const t=i/30;const envelope=.18+.82*Math.pow(Math.sin(Math.PI*t),.65);pts.push([t*e.length,e.width*.5*envelope*(.83+.25*kit.random(e.id+'a'+i))]);}
    for(let i=30;i>=0;i--){const t=i/30;const envelope=.18+.82*Math.pow(Math.sin(Math.PI*t),.65);pts.push([t*e.length,-e.width*.5*envelope*(.83+.25*kit.random(e.id+'b'+i))]);}
    c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=`rgba(${e.color},${e.alpha||.28})`;c.fill();
    c.save();c.clip();
    // Broad bodies, bristle channels and denser pigment along one edge.
    for(let j=0;j<11;j++){const yy=(j/10-.5)*e.width;c.beginPath();c.moveTo(0,yy);c.bezierCurveTo(e.length*.3,yy+3,e.length*.7,yy-2,e.length,yy+1);c.lineWidth=1+kit.random(e.id+'width'+j)*3;c.strokeStyle=`rgba(${e.color},.10)`;c.stroke();}
    c.strokeStyle=`rgba(${e.color},.23)`;c.lineWidth=2;c.beginPath();for(let i=0;i<31;i++){const [x,y]=pts[i];i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
    c.fillStyle='rgba(248,241,223,.63)';for(let j=0;j<24;j++){const x=e.length*(.7+.3*kit.random(e.id+'dryx'+j)),y=(kit.random(e.id+'dryy'+j)-.5)*e.width;c.fillRect(x,y,2+kit.random(e.id+'dryl'+j)*14,.8);}
    c.fillStyle=`rgba(${e.color},.3)`;c.fillRect(e.length*.44,0,2.5,2);c.restore();c.restore();
  }
  const events=[];let id=0;
  function add(layer,frame,x,y,length,width,angle,color,alpha){events.push({layer,frame,x,y,length,width,angle,color,alpha,id:id++});}
  // Frame-zero broad washes cover the edges; subsequent washes create visible stages.
  for(let y=-30;y<1150;y+=65)for(let row=0;row<2;row++)add('base',0,-130,y+row*24,2200,110,.005,'222,211,183',.18);
  for(let i=0;i<80;i++)add('base',1+Math.floor(i/3),-160+kit.random('bx'+i)*1800,110+kit.random('by'+i)*800,300+kit.random('bl'+i)*500,80,kit.random('ba'+i)*.14-.07,'171,187,156',.12);
  for(let j=0;j<2;j++)for(let i=0;i<24;i++)add('plant',29+i,965+Math.sin(i*.13)*16+j*5,920-i*19,57,20,-Math.PI/2,'70,106,73',.32);
  for(const side of [-1,1])for(let i=0;i<20;i++)add('plant',50+i+(side===1?8:0),960+side*i*6,740-i*3,120,38,side===1?-.45:Math.PI+.35,'91,127,90',.27);
  for(let petal=0;petal<7;petal++){
    const a=petal*Math.PI*2/7-Math.PI/2;
    for(let layer=0;layer<2;layer++)for(let j=0;j<5;j++){
      const aa=a+(j-2)*.065;add('plant',70+petal*8+layer*3+j,960+Math.cos(aa)*32,430+Math.sin(aa)*32,235+kit.random('pl'+petal+j)*30,66,aa,layer?'180,83,67':'210,128,100',layer?.22:.29);
    }
  }
  for(let i=0;i<35;i++){const a=kit.random('ca'+i)*Math.PI*2,r=kit.random('cr'+i)*54;add('plant',128+Math.floor(i/3),960+Math.cos(a)*r,430+Math.sin(a)*r,25,21,a,'164,121,48',.6);}
  const accumulation=kit.accumulator(events,e=>brush(e.layer==='base'?base:plant,e),()=>{base.drawingContext.fillStyle='#f1e8d4';base.drawingContext.fillRect(0,0,W,H);plant.drawingContext.clearRect(0,0,W,H);});
  return{reset(){accumulation.reset();},render(frame){
    accumulation.seek(frame);p.push();p.scale(CONFIG.width/W,CONFIG.height/H);p.drawingContext.drawImage(base.canvas,0,0);
    const tail=kit.smooth((frame-144)/18);p.push();p.translate(960,900);p.rotate(Math.sin((frame-144)*.065)*.009*tail);p.drawingContext.drawImage(plant.canvas,-960,-900);p.pop();
    p.blendMode(p.MULTIPLY);p.image(paper,0,0);p.blendMode(p.BLEND);p.pop();
  }};
}
