# 安装与使用

## 先体验，再决定是否安装

下载仓库后打开 [三方向比较页](../examples/flower/compare.html)。GitHub 上点击 HTML 通常看到源码，需下载后打开。默认需要连接 jsDelivr 与 Google Fonts；能打开本地文件不等于完全离线。

普通体验只需支持画布和相应视频编码器的浏览器；不需要安装 Python、Node.js 或 Playwright。首次发布实际验证了 Windows 上的 Chrome；其他环境应按实际能力验证。

单独示例的空格、Home、S、R 分别控制播放暂停、重播、截图、录一轮。R 会从头开始，录制中保持页面可见；隐藏页面会取消录制。PNG 是当前帧，WebM 为静音实时录制。比较页仅控制同步播放，导出需打开单独示例。

## 不安装也可以调用

让能访问本地文件的代理读取 [SKILL.md](../skills/p5-explainer-animation/SKILL.md)，提供口播或主题、画风和交付要求。默认值可以省略；涉及事实的数量和来源必须准确。

```text
请读取 skills/p5-explainer-animation/SKILL.md。
为“把零散的想法，变成一朵花”制作三个方向，各 6 秒。
分别采用复古拼贴、手绘涂鸦、水彩作画，提供同步比较页。
```

其他调用：

```text
用 $p5-explainer-animation 将“六段素材分成两组，每组三段”做成数量动画。
这是自拟示例；保留六个物件，交付 HTML 与静音 WebM。

用 $p5-explainer-animation 分析附件的纸纹、配色和节奏，先不改代码。

用 $p5-explainer-animation 把我已确认的线条和配色偏好保存为风格规则。
```

仅有截图时不能判断真实节奏。要求“我选一个后再继续”时，Skill 会交付比较后等待选择。

## 安装为常用 Skill

参考 [Codex 官方 Skill 说明](https://developers.openai.com/codex/skills/)选择项目级 `.agents/skills/` 或用户级 `~/.agents/skills/`。复制整个 `skills/p5-explainer-animation/` 目录，保留入口、agents、references、assets 和 scripts。不要只复制 SKILL.md，也不要把库文件放进运行模板当作完成安装。

发现已有同名安装时先比较改动，选择明确的维护源，避免重复安装或覆盖私人修改。重新加载或开启新会话后检查宿主是否发现 `$p5-explainer-animation`。其他代理可读取文档，但目录发现、工具权限和 UI 元数据需自行验证。

## 常见问题

| 现象 | 处理 |
|---|---|
| 停在加载界面或提示库 / 字体失败 | 检查 CDN 与字体网络可达性；不要静默替换字体。离线要求见[依赖说明](dependencies.md) |
| 没有自动播放 | 系统启用了减弱动效时初始暂停；主动点击播放即可 |
| R 无法生成 WebM | 查看错误，使用支持对应 MediaRecorder 编码器的浏览器；不将 MIME 检测当成导出成功 |
| 录制取消 | 保持标签页可见后重新录制；取消文件不视为完整交付 |
| 录像不是精确六秒 | 这是实时录制，需精确时长时使用已有的帧序列编码工具并检查产物 |
| 比较页等待或报错 | 三个子页需采用相同版本播放器、fps 与总帧数；任一场景失败将停止全组 |
| 修改 source 后画面没变 | 从仓库根目录运行 `python scripts/build_examples.py` 并刷新 |
| 水彩结尾不循环 | 示例默认播放一轮保留末帧；比较页仍可统一重播 |

## 当前能力边界

Skill 是指导代理创作的规则与工具，不是接收文本就自动返回视频的在线服务。代理仍需编写场景；生成代码与使用浏览器取决于所在环境。模板不提供配音、字幕时标、剪辑工程或付费模型额度。
