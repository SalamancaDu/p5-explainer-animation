import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

// Decode the downloaded file, rather than trusting the renderer's frame counter.
export async function inspectVideo(page, videoPath, expectedTail) {
  const bytes = [...await fs.readFile(videoPath)];
  return page.evaluate(async ({ bytes, expectedTail }) => {
    const video = document.createElement('video');
    video.muted = true; video.preload = 'auto';
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'video/webm' }));
    function waitFor(eventName, action) {
      return new Promise((resolve, reject) => {
        const finish = error => {
          clearTimeout(timer); video.removeEventListener(eventName, success); video.removeEventListener('error', failure);
          if (error) reject(error); else resolve();
        };
        const success = () => finish();
        const failure = () => finish(new Error(`WebM ${eventName} 解码失败：${video.error?.message || '媒体错误'}`));
        const timer = setTimeout(() => finish(new Error(`WebM ${eventName} 超时`)), 15000);
        video.addEventListener(eventName, success, { once: true }); video.addEventListener('error', failure, { once: true });
        try { action(); } catch (error) { finish(error); }
      });
    }
    async function seek(time) {
      if (!video.seeking && Math.abs(video.currentTime - time) < 0.000001) return;
      await waitFor('seeked', () => { video.currentTime = time; });
    }
    try {
      document.body.append(video);
      await waitFor('loadeddata', () => { video.src = url; });
      // MediaRecorder often omits duration metadata. Seeking beyond EOF makes
      // Chromium scan the actual media timestamps and expose a finite duration.
      if (!Number.isFinite(video.duration)) await seek(1e10);
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) throw new Error('无法从 WebM 文件取得有效时长');
      await seek(Math.max(0, duration - 0.0001));
      const scale = Math.min(320 / video.videoWidth, 180 / video.videoHeight, 1);
      const width = Math.max(1, Math.round(video.videoWidth * scale)), height = Math.max(1, Math.round(video.videoHeight * scale));
      const actual = document.createElement('canvas'), expected = document.createElement('canvas');
      actual.width = expected.width = width; actual.height = expected.height = height;
      const aContext = actual.getContext('2d', { willReadFrequently: true }), eContext = expected.getContext('2d', { willReadFrequently: true });
      aContext.drawImage(video, 0, 0, width, height);
      const bitmap = await createImageBitmap(await (await fetch(expectedTail)).blob());
      eContext.drawImage(bitmap, 0, 0, width, height); bitmap.close();
      const a = aContext.getImageData(0, 0, width, height).data, e = eContext.getImageData(0, 0, width, height).data;
      const sums = new Float64Array(64), counts = new Uint32Array(64);
      let sum = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4, block = Math.floor(y * 8 / height) * 8 + Math.floor(x * 8 / width);
        for (let channel = 0; channel < 3; channel++) {
          const delta = Math.abs(a[i + channel] - e[i + channel]);
          sum += delta; sums[block] += delta; counts[block]++;
        }
      }
      return {
        width: video.videoWidth, height: video.videoHeight, duration,
        tailMeanError: sum / (width * height * 3),
        tailWorstBlockError: Math.max(...sums.map((value, i) => counts[i] ? value / counts[i] : 0)),
        tailPNG: actual.toDataURL('image/png')
      };
    } finally { video.pause(); video.removeAttribute('src'); video.load(); video.remove(); URL.revokeObjectURL(url); }
  }, { bytes, expectedTail });
}

export function assertVideo(decoded, config, stats) {
  assert.deepEqual([decoded.width, decoded.height], [config.width, config.height], 'WebM 尺寸不符');
  assert.ok(Number.isFinite(stats.elapsedSeconds) && stats.elapsedSeconds > 0, '缺少录制实际耗时');
  const tolerance = Math.max(0.3, 3 / config.fps, stats.elapsedSeconds * 0.05);
  assert.ok(Math.abs(decoded.duration - stats.elapsedSeconds) <= tolerance,
    `WebM 时长不符：文件 ${decoded.duration.toFixed(3)} 秒，录制耗时 ${stats.elapsedSeconds.toFixed(3)} 秒，容差 ${tolerance.toFixed(3)} 秒`);
  // Lossy WebM cannot match PNG bytes. Check both the whole image and 8x8
  // regions so a local missing object cannot hide in a large plain background.
  assert.ok(decoded.tailMeanError <= 8 && decoded.tailWorstBlockError <= 24,
    `WebM 末帧不符：平均像素差 ${decoded.tailMeanError.toFixed(2)}，最差分区 ${decoded.tailWorstBlockError.toFixed(2)}`);
}
