# 共用 HTML 运行约定

## 依赖

模板是可运行拼贴示例与播放器，固定 p5.js **1.11.11**，不随手改 latest。默认 jsDelivr 加载库、Google Fonts 加载 Noto Sans SC 900；无图片、音频、视频素材。单 HTML 需要联网，有明确加载失败提示。

完全离线时内嵌已取得且许可允许的库和字体，并保留许可。本地无文件则说明缺口，不偷偷用系统字体，不擅自安装新库或工具。

修改 `CONFIG.fontSample` 包含画面全部字符。等待样式表及实际字形成功加载后，才创建场景和开始计时；失败则停止并提示重载。

## 帧与场景

默认 1920×1080、`pixelDensity(1)`、30 fps。`CONFIG.width/height` 同时决定画布尺寸与容器比例，横屏、竖屏和方形均按视口等比完整显示。有效局部帧 `0..N-1`，`N=round(seconds*fps)`；6 秒为 180 个逻辑帧，末帧 179。

`createScene(p, kit)` 返回 `reset()` 与 `render(frame)`。reset 清空累积状态，保留不变缓存；render 支持同帧重复、向前跳转与向后回退。播放局部帧由 `p.frameCount` 减起始偏移派生。负起始帧只用于元素入场，不改变播放器从 0 开始。

固定种子、稳定元素 ID、局部帧／更新桶共同决定随机性。模板逐帧重置 p5 随机种子，提供 `kit.random(id,bucket)`。缓存也用固定种子；不在 draw 用 Math.random。仅设 randomSeed/noiseSeed 不会自动重置对象状态或调用顺序。

`kit.accumulator(events, apply, clear)` 按事件整数 frame 稳定排序，提供 seek(frame)、reset()、applied。前跳补事件，同帧不重画，后退清空重建；正常播放只画新笔。需运动的对象单独分层。

`kit.backOut(t,overshoot)`、`kit.smooth(t)`、`kit.clamp` 为进度函数。显露、漂浮、噪声、镜头、纹理换样均从局部帧计算。

## 控制

- R：从帧 0 录一轮并自动下载 WebM；录制中再次按 R 无效。
- S：保存当前 PNG；空格：播放／暂停；Home：仅重播。
- 页面按钮、可见焦点、状态文字在画布外，不录入画面。
- 减弱动效偏好下初始停在首个有效帧；用户主动播放或录制仍使用作品原节奏，不改导出时间线。
- 隐藏页面暂停预览；录制中隐藏会取消并报告，不下载截断文件。

准备好后 `window.__animation` 提供 config、getState、renderAt、play、pause、replay、record、savePNG。renderAt 只接受范围内整数帧，在改变播放状态前校验；非法输入保持原播放／暂停状态。绘制失败进入错误状态并停止，重新加载后再运行。接口供测试定位，不是用户调试面板。

比较页 `?controlled=1` 加载三个子页，等待相同 fps/totalFrames，以 A 为时钟；ready 消息还包含 width/height，用于设置各 iframe 比例，父子页需使用相同版本模板。任一子页绘制失败会上报原因，父页停止全部方案并显示错误。消息校验父子窗口与 origin。file 协议下，location.origin 与消息 origin 可能分别为 file:// 和 null；只在 file 协议且来源窗口已匹配时允许这两种来源，并用 `*` 向已确认的父子窗口发送。网络页面仍严格同源，不执行任意消息脚本。

## 录制

`canvas.captureStream(fps)` + MediaRecorder；检测 WebM MIME，优先 VP9、VP8、通用 WebM。仍处理构造、启动、编码、空 Blob 与下载失败；支持检测不证明一定成功。以实际 MIME 保存，停止事件到来后再组装数据，关闭 tracks 并释放对象 URL。

从帧 0 渲染 N 个逻辑帧，末帧保留一个帧间隔后停止；不把下一轮录入。录制中禁止寻帧、暂停、重播；重复请求复用活动任务。

调用 recorder.start 后立即绘制帧 0 并启动画面循环，不等待 onstart 再产出首帧；部分编码器要先收到画布变化才发送 onstart，等待会造成录制与绘制互相阻塞。

**实时录制不等于精确逐帧编码。** frameRate(30) 是目标，性能会改变实时时长和编码帧分布。performance.now 仅用于统计录制时间，计时器仅作超时／资源释放，不驱动画面。不得保证任意机器上精确 6.000 秒或恰好 180 个编码帧。精确交付须使用现有且获授权工具编码固定帧序列并检查，不自动安装编码库。

默认画布视频静音；输入口播文本不代表已生成或混入音频。

## 性能与验证

纸底、纤维、网点、撕边、静态阴影预生成。颗粒与重绘缓存有限版本，按帧取样。避免每帧扫描全画面像素或重建所有滤镜；先测再调整采样与缓存，保留风格识别点。

检查首帧、动作、结尾、中文、边缘与遮挡；播放检查节奏和抖动；录制检查解码、尺寸、实时时长与末帧。静态截图不替代动态验收。

## 验证命令

使用已有 Node.js、Playwright 和 Chromium 系浏览器，不自动安装包或下载浏览器。

```text
node scripts/validate.mjs --playwright-module <已安装的playwright入口> --browser <浏览器可执行文件> --output <测试产物目录>
```

省略模块参数时尝试已有 playwright 包；省略 browser 时用已有 Playwright 浏览器。可传 `--html <目标HTML>` 检查沿用接口的作品。输出到当前任务可写目录，不把录像截图装入 Skill。

脚本检查真实浏览器中的尺寸、首中尾帧、寻帧重播一致性、累积回退、PNG、两次 WebM、重复录制互斥、减弱动效、依赖失败与比较同步。回归还覆盖横／竖／方画幅在桌面与手机的实际可见边界、比较页画幅、非法寻帧不打断播放、B/C 绘制失败停止全组。它不判断材质是否真实、角色是否可爱或隐喻是否正确；仍需查看截图与短播放。具体场景按需求补检查，不机械重跑无关模式。

`scripts/video-checks.mjs` 用浏览器解码下载的 WebM，取得实际时长和尾帧，不只相信播放器内部计数。文件时长与录制实际耗时比较，容差取 0.3 秒、3 个帧间隔、实际耗时 5% 的最大值；不要求精确等于标称时长。尾帧等比缩小至最多 320×180 后，比对 RGB 平均差（≤8）及 8×8 分区最大平均差（≤24），容纳有损编码；这不代替细小文字的人工检查。故意截短与篡改尾帧的测试文件必须被拒绝，正常录像须通过。检测器与测试输出不写入作品 HTML，不增加播放依赖。

像素比较先检查完全相同；Chromium 路径栅格化的边缘舍入若产生微差，最多允许 8 个像素、单通道差 32，并记录实际差异。此容差不能覆盖物件位移、纹理变化或笔触缺失，不承诺不同浏览器／GPU 的 PNG 字节完全一致。

## API 依据

- [frameCount](https://p5js.org/reference/p5/frameCount/) / [frameRate](https://p5js.org/reference/p5/frameRate/)
- [randomSeed](https://p5js.org/reference/p5/randomSeed/) / [noiseSeed](https://p5js.org/reference/p5/noiseSeed/)
- [createGraphics](https://p5js.org/reference/p5/createGraphics/)
- [captureStream](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream)
- [MediaRecorder MIME 检测](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static)
- [FontFaceSet.load](https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/load)
