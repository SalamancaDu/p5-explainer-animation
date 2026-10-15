# 开发与验证

## 维护源

`skills/p5-explainer-animation/` 是可独立安装的 Skill。详细画风规则保留在 references，运行实现在 assets 模板，已有回归在 scripts。

根目录 LICENSE、THIRD_PARTY_NOTICES 和 licenses 是许可说明维护源；构建脚本同步一份到可安装目录，单独复制 Skill 时也能保留声明。生成示例包含自有代码的 MIT 声明与外部依赖来源。

`examples/*/source/*.js` 是本仓库示例场景的维护源。`scripts/build_examples.py` 将场景嵌入 Skill 模板，生成可单独分享的 HTML；比较页也从维护模板生成。不要直接修改生成 HTML。源码不包含外部图片。构建需要已有 Python 3.10+；静态检查另需 Node.js。

```bash
python scripts/build_examples.py
python scripts/build_examples.py --check
python scripts/check_project.py
```

## 播放器回归

需要已有 Node.js、Playwright 和 Chromium 系浏览器；可通过环境已有包发现它们，或传入明确路径：

```text
node skills/p5-explainer-animation/scripts/validate.mjs --playwright-module <playwright/index.mjs的绝对路径> --browser <浏览器可执行文件> --output .local/runtime
```

这组测试针对模板运行机制，覆盖 PNG、两次实际 WebM 及尾帧、重播与寻帧、横竖方画幅、比较联动、加载失败与错误录像反例。其比较测试使用三个相同运行样例，不代表三种画风创意验收。

## 真实场景验证

```text
node scripts/check_examples.mjs --playwright-module <playwright/index.mjs的绝对路径> --browser <浏览器可执行文件> --output .local/examples
```

此脚本针对四个实际创意场景，检查首中尾帧、逐帧与直接定位一致性、回退 / 重播、不同结尾策略、真实 WebM 解码 / 时长 / 末帧、手机画幅与三种不同画面的同步比较。输出录像、截图和结果至指定目录。代码与浏览器可能需要联网加载 CDN 和字体，失败不能记为通过。

数量案例还应目视核对只有六张卡、每组恰好三张、编号不丢失且没有复制物件。花朵案例需检查逐步成形、绘制顺序、材质识别与结尾动作。自动化不能代替这些判断。

## README 预览资产

完成上述检查后，用已有 Pillow / FFmpeg 运行：

```bash
python scripts/build_previews.py --input .local/examples
```

它从真实截图和录像生成封面、静态预览、三方向动图及发布用 WebM。不是模型生成，也不会从未运行的源码猜测画面。每次修改示例后重新检查并更新预览，避免展示与源码不符。

`.local/` 的完整测试产物和临时文件不提交。公开预览位于 `assets/previews/` 和 `assets/readme/`，图示源在构建脚本中。用于封面文字的系统字体不随仓库分发。

## 检查范围

静态检查仅证明目录、引用、语法、生成文件同步和有限敏感信息模式检查。浏览器检查证明本次指定浏览器下的运行，不证明所有平台兼容、逐词音画同步或严格逐帧编码。实时录像可能与逻辑时间线略有时长差异，检查以实际解码文件为准。
