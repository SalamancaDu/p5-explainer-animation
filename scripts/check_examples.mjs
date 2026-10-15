// Real scene checks. Requires an existing Playwright installation and browser.
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {inspectVideo,assertVideo} from '../skills/p5-explainer-animation/scripts/video-checks.mjs';

const args={};for(let i=2;i<process.argv.length;i+=2){assert.ok(process.argv[i].startsWith('--')&&process.argv[i+1],'Arguments require --name value');args[process.argv[i].slice(2)]=process.argv[i+1];}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!args.output)throw new Error('Use --output <writable artifact directory>');
const output=path.resolve(args.output);await fs.mkdir(output,{recursive:true});
const playwright=await import(args['playwright-module']?pathToFileURL(path.resolve(args['playwright-module'])).href:'playwright');
const server=http.createServer(async(req,res)=>{
  try{
    const urlPath=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const file=path.resolve(root,'.'+urlPath);
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream'});res.end(body);
  }catch(error){res.writeHead(error.code==='ENOENT'?404:500);res.end('Unable to read requested example');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`,checks=[];
let browser;
const entries=[['collage','flower/a.html'],['doodle','flower/b.html'],['painting','flower/c.html'],['quantity','quantity/index.html']];
function pass(name,detail=true){checks.push({name,detail});console.log('PASS '+name);}
async function pixels(page,actual,expected){
  const diff=await page.evaluate(async([a,b])=>{
    async function read(src){const im=await createImageBitmap(await(await fetch(src)).blob());const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);im.close();return ctx.getImageData(0,0,c.width,c.height).data;}
    const x=await read(a),y=await read(b);let changed=0,max=0;for(let i=0;i<x.length;i+=4){let differs=false;for(let j=0;j<4;j++){const d=Math.abs(x[i+j]-y[i+j]);max=Math.max(max,d);if(d)differs=true;}if(differs)changed++;}return{changed,max};
  },[actual,expected]);assert.ok(diff.changed<=8&&diff.max<=32,JSON.stringify(diff));return diff;
}
try{
  browser=await playwright.chromium.launch({headless:true,...(args.browser?{executablePath:path.resolve(args.browser)}:{})});
  const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true,reducedMotion:'reduce'});
  for(const[name,file]of entries){
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/examples/${file}`);
    await page.waitForFunction(()=>window.__animation?.getState().ready||document.querySelector('#status').dataset.error==='true',null,{timeout:60000});
    assert.equal(await page.locator('#status').getAttribute('data-error'),'false',await page.locator('#status').textContent());
    const config=await page.evaluate(()=>window.__animation.config);
    const capture=frame=>page.evaluate(frame=>{window.__animation.renderAt(frame);return document.querySelector('#stage canvas').toDataURL();},frame);
    const first=await capture(0),middle=await capture(90),last=await capture(179);
    assert.notEqual(first,middle);assert.notEqual(first,last);
    for(const[label,data]of[['first',first],['middle',middle],['last',last]])await fs.writeFile(path.join(output,`${name}-${label}.png`),Buffer.from(data.split(',')[1],'base64'));
    await capture(0);const sequential=await page.evaluate(()=>{for(let f=1;f<=90;f++)window.__animation.renderAt(f);return document.querySelector('#stage canvas').toDataURL();});
    const difference=await pixels(page,sequential,middle);await pixels(page,await capture(0),first);
    await page.evaluate(()=>{window.__animation.replay();window.__animation.pause();});await pixels(page,await capture(90),middle);
    pass(name+' deterministic seek, backward reset and replay',difference);
    const nearTail=await capture(150);
    if(name==='collage'||name==='quantity')await pixels(page,nearTail,last);else assert.notEqual(nearTail,last,'Living tail must move');
    pass(name+' intended ending');
    const event=page.waitForEvent('download',{timeout:60000});await page.locator('#record').click();const download=await event;
    const videoPath=path.join(output,`${name}.webm`);await download.saveAs(videoPath);
    const stats=await page.evaluate(()=>window.__animation.getState().lastRecording);assert.equal(stats.logicalFrames,180);assert.equal(stats.lastFrame,179);
    const decoded=await inspectVideo(page,videoPath,last);assertVideo(decoded,config,stats);const {tailPNG,...metrics}=decoded;
    await fs.writeFile(path.join(output,`${name}-decoded-tail.png`),Buffer.from(tailPNG.split(',')[1],'base64'));
    pass(name+' real WebM decode, duration and tail',metrics);
    await page.setViewportSize({width:390,height:844});
    const layout=await page.locator('#stage canvas').evaluate(c=>{const r=c.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth};});
    assert.ok(!layout.overflow&&layout.left>=0&&layout.right<=layout.width+1&&layout.top>=0&&layout.bottom<=layout.height+1);
    await page.screenshot({path:path.join(output,`${name}-mobile.png`),fullPage:true});assert.deepEqual(errors,[]);pass(name+' mobile and no browser errors');
    await page.close();
  }
  const compare=await context.newPage();await compare.goto(`${base}/examples/flower/compare.html`);
  await compare.waitForFunction(()=>!document.querySelector('#play').disabled||document.querySelector('#status').dataset.error==='true',null,{timeout:60000});
  assert.notEqual(await compare.locator('#status').getAttribute('data-error'),'true');await compare.locator('#play').click();
  await compare.waitForFunction(()=>Number(document.body.dataset.frame)>110);await compare.locator('#pause').click();
  await compare.waitForFunction(()=>{const s=[...document.querySelectorAll('iframe')].map(f=>f.contentWindow.__animation.getState());return s.every(x=>x.frame===s[0].frame&&x.mode==='paused');});
  const images=await compare.evaluate(()=>[...document.querySelectorAll('iframe')].map(f=>f.contentDocument.querySelector('#stage canvas').toDataURL()));assert.equal(new Set(images).size,3);
  await compare.screenshot({path:path.join(output,'compare-desktop.png'),fullPage:true});
  await compare.setViewportSize({width:390,height:844});assert.equal(await compare.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await compare.screenshot({path:path.join(output,'compare-mobile.png'),fullPage:true});pass('three distinct creative directions synchronized on desktop and mobile');
  await context.close();await fs.writeFile(path.join(output,'result.json'),JSON.stringify({browser:browser.version(),checks,scope:'Real examples: deterministic scene rendering, actual silent WebM exports, endings, mobile and synchronized comparison. Visual review remains separate.'},null,2));
  console.log(`Validated ${checks.length} example checks.`);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
