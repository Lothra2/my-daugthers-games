#!/usr/bin/env python3
"""Bitmap font (BMFont XML + PNG) for crisp in-world text, rendered from Pixelify Sans without antialiasing."""
import sys, os
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'assets/fonts/PixelifySans-latin.woff2')
TTF = '/tmp/PixelifySans.ttf'
CHARS = ''.join(chr(c) for c in range(32, 127)) + 'áéíóúüñÁÉÍÓÚÑ¡¿·×'
SIZE = int(sys.argv[1]) if len(sys.argv) > 1 else 16
CREAM, PLUM = (255, 244, 220, 255), (30, 19, 48, 255)


def main():
    if not os.path.exists(TTF):
        f = TTFont(FONT); f.flavor = None; f.save(TTF)
    font = ImageFont.truetype(TTF, SIZE, layout_engine=ImageFont.Layout.BASIC)
    glyphs = []
    for ch in CHARS:
        w = max(1, int(font.getlength(ch)))
        im = Image.new('L', (w + 6, SIZE + 8), 0)
        d = ImageDraw.Draw(im); d.fontmode = '1'
        d.text((3, 3), ch, font=font, fill=255)
        bb = im.getbbox()
        glyphs.append((ch, im, bb, w))
    pad = 1
    cols, cw, chh = 16, SIZE + 8, SIZE + 8
    rows = (len(glyphs) + cols - 1) // cols
    atlas = Image.new('RGBA', (cols * (cw + 2), rows * (chh + 2)), (0, 0, 0, 0))
    lines = []
    for i, (ch, im, bb, w) in enumerate(glyphs):
        mask = im.point(lambda v: 255 if v > 127 else 0)
        # outline = dilate by 1 px
        from PIL import ImageFilter
        out = mask.filter(ImageFilter.MaxFilter(3))
        cell = Image.new('RGBA', mask.size, (0, 0, 0, 0))
        cell.paste(Image.new('RGBA', mask.size, PLUM), (0, 0), out)
        cell.paste(Image.new('RGBA', mask.size, CREAM), (0, 0), mask)
        x, y = (i % cols) * (cw + 2) + 1, (i // cols) * (chh + 2) + 1
        atlas.paste(cell, (x, y))
        lines.append(f'<char id="{ord(ch)}" x="{x}" y="{y}" width="{mask.size[0]}" height="{mask.size[1]}" xoffset="-3" yoffset="-3" xadvance="{w + 1}" page="0" chnl="15"/>')
    atlas.save(os.path.join(ROOT, 'assets/fonts/pixfont.png'), optimize=True)
    xml = (f'<?xml version="1.0"?>\n<font>\n<info face="pixfont" size="{SIZE}" bold="0" italic="0"/>\n'
           f'<common lineHeight="{SIZE + 2}" base="{SIZE - 2}" scaleW="{atlas.width}" scaleH="{atlas.height}" pages="1"/>\n'
           f'<pages><page id="0" file="pixfont.png"/></pages>\n<chars count="{len(lines)}">\n' + '\n'.join(lines) + '\n</chars>\n</font>\n')
    open(os.path.join(ROOT, 'assets/fonts/pixfont.xml'), 'w').write(xml)
    prev = atlas.resize((atlas.width * 2, atlas.height * 2), Image.NEAREST)
    bg = Image.new('RGBA', prev.size, (156, 127, 224, 255)); bg.alpha_composite(prev); bg.save('/tmp/pixfont_prev.png')
    print('font', SIZE, len(lines), 'glyphs', atlas.size)


main()
