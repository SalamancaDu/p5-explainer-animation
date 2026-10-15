"""Package real browser captures for the README. Requires existing Pillow/FFmpeg."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--font', type=Path, help='An existing Chinese-capable font; never copied into the repo')
    args = parser.parse_args()
    windir = os.environ.get('WINDIR')
    font = args.font or (Path(windir) / 'Fonts/msyh.ttc' if windir else None)
    if not font or not font.exists():
        parser.error('Use --font to select an existing Chinese-capable font')
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        parser.error('FFmpeg must already be available on PATH')
    previews, art = ROOT / 'assets/previews', ROOT / 'assets/readme'
    previews.mkdir(parents=True, exist_ok=True)
    art.mkdir(parents=True, exist_ok=True)
    for name in ('collage', 'doodle', 'painting', 'quantity'):
        image = Image.open(args.input / f'{name}-last.png').convert('RGB')
        image.resize((960, 540), Image.Resampling.LANCZOS).save(previews / f'{name}.png', optimize=True)
        shutil.copyfile(args.input / f'{name}.webm', previews / f'{name}.webm')
    cover = Image.new('RGB', (1600, 930), '#f5f0e4')
    draw = ImageDraw.Draw(cover)
    def text(pos, value, size, color='#292b25'):
        draw.text(pos, value, font=ImageFont.truetype(str(font), size), fill=color)
    draw.rectangle((68, 72, 77, 245), fill='#c54b39')
    text((108, 68), 'p5-explainer-animation', 59)
    text((108, 160), '把一句话，画成会动的解释。', 52)
    text((110, 248), 'CODE-DRAWN EXPLAINERS  /  BY SALAMANCADU', 21, '#657052')
    names=[('collage','01  纸片组装','PRINT COLLAGE'),('doodle','02  逐笔显露','HAND-DRAWN DOODLE'),('painting','03  笔触累积','WATERCOLOR')]
    for i,(name,label,en) in enumerate(names):
        x=68+i*494
        sample=Image.open(previews/f'{name}.png').resize((476,268),Image.Resampling.LANCZOS)
        cover.paste(sample,(x,348))
        text((x,646),label,31)
        text((x,702),en,18,'#657052')
    draw.line((68,785,1532,785),fill='#bcb9a6',width=2)
    text((68,817),'口播  →  视觉命题  →  画风  →  实现  →  验证  →  导出',27)
    cover.save(art/'cover.png',optimize=True)
    graph=';'.join(f'[{i}:v]fps=12,scale=320:180:flags=lanczos,setsar=1[v{i}]' for i in range(3))
    graph+=';[v0][v1][v2]hstack=inputs=3:shortest=1,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3'
    command=[ffmpeg,'-hide_banner','-loglevel','error','-y']
    for name,_,_ in names:
        command+=['-i',str(previews/f'{name}.webm')]
    command+=['-filter_complex',graph,'-loop','0',str(art/'three-directions.gif')]
    subprocess.run(command,check=True)
    print('Packaged real previews, cover and three-direction GIF.')

if __name__=='__main__':
    main()
