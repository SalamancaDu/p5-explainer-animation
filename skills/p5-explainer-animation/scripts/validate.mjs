import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inspectVideo, assertVideo } from './video-checks.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, list) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), list[index + 1]]);
  return pairs;
}, []));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!args.output) throw new Error('请用 --output 指定当前任务可写的验证产物目录');
const output = path.resolve(args.output);
await fs.mkdir(output, { recursive: true });
const htmlPath = path.resolve(args.html || path.join(root, 'assets/index.template.html'));
const html = await fs.readFile(htmlPath, 'utf8');
const compare = await fs.readFile(path.join(root, 'assets/compare.template.html'), 'utf8');
function fixture(width = 640, height = 360, failAt = null) {
  const configSource = html.match(/const CONFIG = Object\.freeze\([\s\S]*?\);/)?.[0];
  assert.ok(configSource, '回归样例需要模板的 CONFIG 配置');
  const scene = `${configSource.replace('const CONFIG =', 'const SOURCE_CONFIG =')}
const CONFIG=Object.freeze({...SOURCE_CONFIG,width:${width},height:${height},seconds:2,fps:30,loop:true});
function createScene(p,kit){return{reset(){},render(frame){
  if(${failAt}!==null&&frame>=${failAt})throw new Error('回归测试：第 10 帧绘制失败');
  const tail=frame>=kit.totalFrames-15;
  p.background('#eadfc5');p.noStroke();
  p.fill(tail?(window.__wrongTail?'#194fbd':'#bd4b35'):'#526047');
  p.rect(CONFIG.width*.125,CONFIG.height*.125,CONFIG.width*.75,CONFIG.height*.75);
  p.fill('#fff7e2');p.circle(CONFIG.width*(.2+.3*Math.min(frame,45)/45),CONFIG.height*.5,CONFIG.height*.15);
}};}`;
  const result = html.replace(/(<script id="animation-scene">)[\s\S]*?<\/script>/, (_, tag) => `${tag}\n${scene}\n</script>`);
  assert.notEqual(result, html, '回归样例需要 animation-scene 脚本');
  return result;
}
const routes = { '/index.html': html, '/compare.html': compare, '/a.html': html, '/b.html': html, '/c.html': html,
  '/fixture.html': fixture(), '/aspect/compare.html': compare,
  '/aspect/a.html': fixture(1920,1080), '/aspect/b.html': fixture(1080,1920), '/aspect/c.html': fixture(1080,1080) };
for (const failed of ['b', 'c']) {
  routes[`/fault-${failed}/compare.html`] = compare;
  for (const child of ['a','b','c']) routes[`/fault-${failed}/${child}.html`] = fixture(640,360,child === failed ? 10 : null);
}
const checks = [], warnings = [];
function pass(name, detail = true) { checks.push({ name, detail }); console.log(`PASS ${name}`); }
function hash(text) { return createHash('sha256').update(text).digest('hex'); }
async function sameRaster(page, actual, expected, name) {
  if (hash(actual) === hash(expected)) return;
  const difference = await page.evaluate(async ([actual, expected]) => {
    async function pixels(url) {
      const bitmap = await createImageBitmap(await (await fetch(url)).blob());
      const canvas = document.createElement('canvas'); canvas.width=bitmap.width;canvas.height=bitmap.height;
      const context = canvas.getContext('2d', {willReadFrequently:true}); context.drawImage(bitmap,0,0);
      bitmap.close(); return context.getImageData(0,0,canvas.width,canvas.height).data;
    }
    const a=await pixels(actual), b=await pixels(expected);let changed=0,maxDelta=0;
    if(a.length!==b.length)return {changed:Infinity,maxDelta:Infinity};
    for(let i=0;i<a.length;i+=4){let differs=false;for(let c=0;c<4;c++){const delta=Math.abs(a[i+c]-b[i+c]);maxDelta=Math.max(maxDelta,delta);if(delta)differs=true;}if(differs)changed++;}
    return {changed,maxDelta};
  }, [actual,expected]);
  // A few edge pixels can round differently in Chromium's cached path rasterizer.
  // This bound cannot hide a displaced object, changed texture or missing stroke.
  assert.ok(difference.changed <= 8 && difference.maxDelta <= 32, `${name}: ${JSON.stringify(difference)}`);
  warnings.push({name, antialiasDifference:difference});
}

async function assertContained(surface) {
  const layout = await surface.evaluate(() => {
    const canvas = document.querySelector('#stage canvas').getBoundingClientRect(), stage = document.querySelector('#stage').getBoundingClientRect();
    const config = window.__animation.config;
    return { ratio:canvas.width/canvas.height, expectedRatio:config.width/config.height,
      canvas:canvas.toJSON(), stage:stage.toJSON(), viewport:{width:innerWidth,height:innerHeight},
      overflow:document.documentElement.scrollWidth>innerWidth };
  });
  assert.equal(layout.overflow, false, '画面不应横向溢出');
  assert.ok(Math.abs(layout.ratio-layout.expectedRatio)<.001, '显示比例应与画布一致');
  assert.ok(layout.canvas.top>=layout.stage.top-1 && layout.canvas.left>=layout.stage.left-1 &&
    layout.canvas.bottom<=layout.stage.bottom+1 && layout.canvas.right<=layout.stage.right+1,
    `画布被容器裁切：${JSON.stringify(layout)}`);
  assert.ok(layout.canvas.left>=-1 && layout.canvas.right<=layout.viewport.width+1 &&
    layout.canvas.top>=-1 && layout.canvas.bottom<=layout.viewport.height+1,
    `画布没有完整适配视口：${JSON.stringify(layout)}`);
  return layout;
}

for (const document of [html, compare]) {
  for (const match of document.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
}
pass('inline JavaScript syntax');
const utilities = html.match(/<script id="animation-utils">([\s\S]*?)<\/script>/)?.[1];
assert.ok(utilities, '共用工具脚本缺失');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(utilities, sandbox);
const marks = [];
const accumulation = sandbox.createAccumulator([{ frame: 4, id: 'late' }, { frame: 0, id: 'first' }, { frame: 2, id: 'middle' }], event => marks.push(event.id), () => { marks.length = 0; });
accumulation.seek(2); assert.deepEqual(marks, ['first', 'middle']);
accumulation.seek(2); assert.equal(marks.length, 2);
accumulation.seek(4); assert.equal(marks.length, 3);
accumulation.seek(0); assert.deepEqual(marks, ['first']);
accumulation.reset(); assert.equal(marks.length, 0);
assert.throws(() => accumulation.seek(1.5));
assert.equal(sandbox.seededValue(42, 'a', 3), sandbox.seededValue(42, 'a', 3));
assert.notEqual(sandbox.seededValue(42, 'a', 3), sandbox.seededValue(42, 'b', 3));
pass('accumulator replay, backward seek, duplicate frame, input validation');

let playwright;
try { playwright = await import(args['playwright-module'] ? pathToFileURL(path.resolve(args['playwright-module'])).href : 'playwright'); }
catch (error) { throw new Error(`找不到已安装的 Playwright；脚本不会自动安装。${error.message}`); }
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  if (routes[pathname]) { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(routes[pathname]); }
  else { response.writeHead(pathname === '/favicon.ico' ? 204 : 404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await playwright.chromium.launch({ headless: true, ...(args.browser ? { executablePath: path.resolve(args.browser) } : {}) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__animation?.getState().ready || document.querySelector('#status')?.dataset.error === 'true', null, { timeout: 60000 });
  assert.equal(await page.locator('#status').getAttribute('data-error'), 'false', await page.locator('#status').textContent());
  const config = await page.evaluate(() => window.__animation.config);
  const middle = Math.floor(config.totalFrames / 2), last = config.totalFrames - 1;
  assert.deepEqual(await page.locator('canvas').first().evaluate(canvas => [canvas.width, canvas.height]), [config.width, config.height]);
  assert.equal(await page.evaluate(() => window.__animation.getState().mode), 'paused');
  pass('font readiness, logical resolution, reduced-motion start', { frames: config.totalFrames, fps: config.fps });
  const captures = {};
  for (const [name, frame] of [['first', 0], ['middle', middle], ['last', last]]) {
    const data = await page.evaluate(frame => { window.__animation.renderAt(frame); return document.querySelector('#stage canvas').toDataURL('image/png'); }, frame);
    captures[name] = data;
    await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(data.split(',')[1], 'base64'));
  }
  assert.notEqual(captures.first, captures.middle, '首帧与中段应存在变化');
  const sequential = await page.evaluate(middle => {
    window.__animation.renderAt(0);
    for (let frame = 1; frame <= middle; frame++) window.__animation.renderAt(frame);
    return document.querySelector('#stage canvas').toDataURL('image/png');
  }, middle);
  await fs.writeFile(path.join(output, 'sequential-middle.png'), Buffer.from(sequential.split(',')[1], 'base64'));
  await sameRaster(page, sequential, captures.middle, 'sequential versus direct middle');
  await page.evaluate(() => { window.__animation.replay(); window.__animation.pause(); });
  await sameRaster(page, await page.locator('#stage canvas').evaluate(canvas => canvas.toDataURL()), captures.first, 'replay first');
  await page.evaluate(frame => window.__animation.renderAt(frame), middle);
  await sameRaster(page, await page.locator('#stage canvas').evaluate(canvas => canvas.toDataURL()), captures.middle, 'replay middle');
  assert.equal(await page.evaluate(() => { try { window.__animation.renderAt(-1); return false; } catch (error) { return error.message.includes('帧'); } }), true);
  pass('first/middle/last captures and deterministic seek/replay');
  if (!args.html) {
    const hold = await page.evaluate(frame => { window.__animation.renderAt(frame); return document.querySelector('#stage canvas').toDataURL(); }, config.totalFrames - config.fps);
    await sameRaster(page, hold, captures.last, 'frozen final second');
    pass('collage last-second freeze includes texture and camera');
  }
  const pngDownload = page.waitForEvent('download');
  await page.keyboard.press('s');
  const png = await pngDownload;
  await png.saveAs(path.join(output, 'keyboard-s.png'));
  assert.equal((await fs.readFile(path.join(output, 'keyboard-s.png'))).subarray(1,4).toString(), 'PNG');
  pass('S keyboard PNG download');

  for (let run = 1; run <= 2; run++) {
    const downloadEvent = page.waitForEvent('download', { timeout: Math.max(60000, config.seconds * 4000) });
    if (run === 1) {
      await page.keyboard.press('r');
      const mutualExclusion = await page.evaluate(() => {
        const a = window.__animation.record(), b = window.__animation.record();
        a.catch(error => { window.__recordingTestError = error.message; }); b.catch(error => { window.__recordingTestError = error.message; });
        let guarded = false;
        try { window.__animation.renderAt(0); } catch (error) { guarded = error.message.includes('录制'); }
        return { samePromise: a === b, guarded };
      });
      assert.deepEqual(mutualExclusion, { samePromise: true, guarded: true });
      await page.keyboard.press('r');
    } else await page.locator('#record').click();
    const video = await downloadEvent;
    const videoPath = path.join(output, `recording-${run}.webm`);
    await video.saveAs(videoPath);
    const stats = await page.evaluate(() => window.__animation.getState().lastRecording);
    assert.ok(stats.bytes > 1000); assert.equal(stats.lastFrame, last); assert.equal(stats.logicalFrames, config.totalFrames);
    assert.equal(await page.evaluate(() => window.__animation.getState().recording), false);
    pass(`WebM recording ${run}`, stats);
    const decoded = await inspectVideo(page, videoPath, captures.last);
    assertVideo(decoded, config, stats);
    const {tailPNG,...metrics}=decoded;
    await fs.writeFile(path.join(output, `recording-${run}-decoded-tail.png`),Buffer.from(tailPNG.split(',')[1],'base64'));
    pass(`downloaded WebM ${run} actual duration and final image`, metrics);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await assertContained(page);
  await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
  pass('mobile containment and aspect ratio');
  assert.deepEqual(errors, []);
  pass('no page JavaScript errors');
  const unsupported = await page.evaluate(async () => {
    const detector=MediaRecorder.isTypeSupported;
    try { MediaRecorder.isTypeSupported=()=>false; await window.__animation.record(); return false; }
    catch(error){return error.message.includes('WebM')&&!window.__animation.getState().recording;}
    finally{MediaRecorder.isTypeSupported=detector;}
  });
  assert.equal(unsupported,true);
  pass('unsupported recording codec leaves player usable');

  // Intentional failure cases are isolated from the healthy page.
  for (const [name, pattern] of [['p5', '**/p5.min.js'], ['font', '**/fonts.googleapis.com/**']]) {
    const failurePage = await context.newPage();
    await failurePage.route(pattern, route => route.abort('failed'));
    await failurePage.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
    await failurePage.waitForFunction(() => document.querySelector('#status')?.dataset.error === 'true', null, { timeout: 30000 });
    assert.equal(await failurePage.evaluate(() => Boolean(window.__animation)), false);
    assert.equal(await failurePage.locator('#reload').isVisible(), true);
    pass(`${name} failure is visible and does not start animation`);
    await failurePage.close();
  }

  const comparison = await context.newPage();
  await comparison.goto(`${base}/compare.html`, { waitUntil: 'domcontentloaded' });
  await comparison.waitForFunction(() => !document.querySelector('#play').disabled || document.querySelector('#status').dataset.error === 'true', null, { timeout: 60000 });
  assert.notEqual(await comparison.locator('#status').getAttribute('data-error'), 'true', await comparison.locator('#status').textContent());
  await comparison.locator('#play').click();
  await comparison.waitForFunction(() => Number(document.body.dataset.frame) >= 15);
  await comparison.locator('#pause').click();
  await comparison.waitForFunction(() => {
    const states=[...document.querySelectorAll('iframe')].map(frame=>frame.contentWindow.__animation.getState());
    return states.every(state=>state.mode==='paused'&&state.frame===states[0].frame);
  });
  pass('comparison uses a shared logical frame');
  await comparison.locator('#restart').click();
  await comparison.waitForFunction(() => Number(document.body.dataset.frame) < 10);
  await comparison.locator('#pause').click();
  await comparison.close();

  // Actual layout, not only the intrinsic canvas ratio: catch hidden clipping.
  const shapes = await context.newPage();
  for (const [name,letter] of [['landscape','a'],['portrait','b'],['square','c']]) {
    await shapes.goto(`${base}/aspect/${letter}.html`);
    await shapes.waitForFunction(()=>window.__animation?.getState().ready,null,{timeout:60000});
    for (const viewport of [{width:1280,height:900},{width:390,height:844}]) {
      await shapes.setViewportSize(viewport);
      await assertContained(shapes);
    }
    await shapes.screenshot({path:path.join(output,`${name}-mobile.png`),fullPage:true});
  }
  pass('landscape, portrait and square fully fit desktop and mobile');
  await shapes.setViewportSize({width:1280,height:900});
  await shapes.goto(`${base}/aspect/compare.html`);
  await shapes.waitForFunction(()=>!document.querySelector('#play').disabled,null,{timeout:60000});
  for (const viewport of [{width:1280,height:900},{width:390,height:844}]) {
    await shapes.setViewportSize(viewport);
    for (const child of shapes.frames().filter(frame=>frame.parentFrame())) await assertContained(child);
  }
  pass('comparison iframe sizes follow each child canvas');
  await shapes.close();

  const seekPage = await context.newPage();
  await seekPage.goto(`${base}/fixture.html`);
  await seekPage.waitForFunction(()=>window.__animation?.getState().ready,null,{timeout:60000});
  await seekPage.evaluate(()=>window.__animation.play());
  await seekPage.waitForFunction(()=>window.__animation.getState().frame>=4);
  for (const mode of ['playing','paused']) {
    if (mode==='paused') await seekPage.evaluate(()=>window.__animation.pause());
    const checked = await seekPage.evaluate(()=>{
      const api=window.__animation,before=api.getState(),rejections=[];
      for(const frame of [-1,before.totalFrames,.5,NaN,Infinity]) {
        try{api.renderAt(frame);rejections.push(false);}catch(error){rejections.push(error.message.includes('帧'));}
      }
      return {before,after:api.getState(),rejections};
    });
    assert.ok(checked.rejections.every(Boolean));
    assert.equal(checked.before.mode,mode);assert.equal(checked.after.mode,mode);
    assert.equal(checked.after.frame,checked.before.frame);
    if(mode==='playing')await seekPage.waitForFunction(frame=>window.__animation.getState().frame>=frame+4,checked.after.frame,{timeout:5000});
  }
  pass('invalid seeks preserve playback and paused state');
  await seekPage.close();

  for (const failed of ['b','c']) {
    const fault = await context.newPage();
    await fault.goto(`${base}/fault-${failed}/compare.html`);
    await fault.waitForFunction(()=>!document.querySelector('#play').disabled,null,{timeout:60000});
    await fault.locator('#play').click();
    await fault.waitForFunction(()=>document.querySelector('#status').dataset.error==='true',null,{timeout:5000});
    assert.match(await fault.locator('#status').textContent(),new RegExp(`方案 ${failed.toUpperCase()}.*第 10 帧`));
    assert.equal(await fault.locator('button:enabled').count(),0);
    await fault.waitForFunction(()=>[...document.querySelectorAll('iframe')].every(f=>['paused','error'].includes(f.contentWindow.__animation.getState().mode)));
    const states=await fault.evaluate(()=>[...document.querySelectorAll('iframe')].map(f=>f.contentWindow.__animation.getState()));
    assert.equal(states[failed==='b'?1:2].mode,'error');
    await fault.waitForTimeout(250);
    assert.deepEqual(await fault.evaluate(()=>[...document.querySelectorAll('iframe')].map(f=>f.contentWindow.__animation.getState().frame)),states.map(s=>s.frame));
    pass(`child ${failed.toUpperCase()} render failure stops comparison and reports its cause`);
    await fault.close();
  }

  // Negative controls: a short but decodable file, then a full-length file
  // whose final picture is wrong. Both retain plausible internal frame counts.
  for (const defect of ['truncated','wrong-tail']) {
    const bad = await context.newPage();
    await bad.addInitScript(()=>{
      const NativeRecorder=window.MediaRecorder;
      window.MediaRecorder=class extends NativeRecorder {
        constructor(...args){super(...args);window.__testRecorder=this;}
      };
    });
    await bad.goto(`${base}/fixture.html`);
    await bad.waitForFunction(()=>window.__animation?.getState().ready,null,{timeout:60000});
    const expected=await bad.evaluate(()=>{const api=window.__animation;api.renderAt(api.config.totalFrames-1);return document.querySelector('#stage canvas').toDataURL();});
    if(defect==='wrong-tail')await bad.evaluate(()=>{window.__wrongTail=true;});
    const downloadEvent=bad.waitForEvent('download',{timeout:15000});
    await bad.evaluate(()=>{window.__animation.record().catch(error=>{window.__recordingTestError=error.message;});});
    if(defect==='truncated') {
      await bad.waitForFunction(()=>window.__animation.getState().frame>=8);
      await bad.evaluate(()=>window.__testRecorder.pause());
    }
    const video=await downloadEvent,videoPath=path.join(output,`reject-${defect}.webm`);
    await video.saveAs(videoPath);
    const {cfg,stats}=await bad.evaluate(()=>({cfg:window.__animation.config,stats:window.__animation.getState().lastRecording}));
    assert.equal(stats.logicalFrames,cfg.totalFrames);assert.equal(stats.lastFrame,cfg.totalFrames-1);
    const decoded=await inspectVideo(bad,videoPath,expected);
    assert.throws(()=>assertVideo(decoded,cfg,stats),defect==='truncated'?/时长不符/:/末帧不符/);
    const {tailPNG,...metrics}=decoded;
    pass(`rejects ${defect} WebM despite complete logical frames`,metrics);
    await bad.close();
  }
  await context.close();
  const normal = await browser.newContext({ reducedMotion: 'no-preference' });
  const auto = await normal.newPage();
  await auto.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
  await auto.waitForFunction(() => window.__animation?.getState().frame > 2, null, { timeout: 60000 });
  assert.equal(await auto.evaluate(() => window.__animation.getState().mode), 'playing');
  pass('default autoplay');
  await auto.goto(pathToFileURL(htmlPath).href, {waitUntil:'domcontentloaded'});
  await auto.waitForFunction(()=>window.__animation?.getState().frame>2,null,{timeout:60000});
  pass('standalone file opens without a web server');
  const fileFixtures=path.join(output,'file-comparison-fixtures');
  await fs.mkdir(fileFixtures,{recursive:true});
  for(const name of ['a.html','b.html','c.html'])await fs.writeFile(path.join(fileFixtures,name),html);
  await fs.writeFile(path.join(fileFixtures,'compare.html'),compare);
  await auto.goto(pathToFileURL(path.join(fileFixtures,'compare.html')).href,{waitUntil:'domcontentloaded'});
  await auto.waitForFunction(()=>Number(document.body.dataset.frame)>3,null,{timeout:60000});
  await auto.locator('#pause').click();
  pass('file-origin comparison messages work');
  await normal.close();
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ htmlPath, browser: browser.version(), checks, warnings, scope: 'Template runtime checks; comparison uses three identical runtime fixtures, not three completed creative directions.' }, null, 2));
  console.log(`Validated ${checks.length} checks. Artifacts: ${output}`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
