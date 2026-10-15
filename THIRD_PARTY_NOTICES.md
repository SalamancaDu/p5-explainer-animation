# Third-party dependencies and notices

The MIT license at the repository root applies to project-owned content. The following dependencies retain their own licenses. Their library/font binaries are not bundled here; the license texts are included for reference and attribution.

| Dependency | Use | Upstream | License copy |
|---|---|---|---|
| p5.js 1.11.11 | Browser drawing runtime, loaded from jsDelivr | [p5.js release source](https://github.com/processing/p5.js/tree/v1.11.11) | [LGPL 2.1](licenses/p5-LGPL-2.1.txt) |
| Noto Sans SC | Chinese glyphs, loaded through Google Fonts | [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/notosanssc) | [SIL OFL 1.1](licenses/NotoSansSC-OFL-1.1.txt) |
| Playwright | Optional developer browser checks; supplied by the user | [Microsoft Playwright](https://github.com/microsoft/playwright) | [Apache 2.0](licenses/Playwright-Apache-2.0.txt) |

The source and license for the fixed p5.js version remain available through the upstream link above. Font CSS is a network resource; its returned subsets can vary by browser and upstream changes. Preparing an offline distribution requires retaining the relevant notices and license terms for the files actually included.

Existing Python, Node.js, browsers and optional FFmpeg/Pillow tools are used as local tooling, not redistributed. No font files are included in the README artwork. Names identify tools and do not imply endorsement.
