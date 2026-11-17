#!/usr/bin/env python3
"""Shrinks logo files: logos-src/<slug>.(png|jpg|jpeg|webp|gif) -> logos-opt/<slug>.webp
(max 240x240 px, transparent background kept, usually 2-8 KB). Run, then `node build.mjs`."""
import sys, glob, os
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
src, dst = os.path.join(root, 'logos-src'), os.path.join(root, 'logos-opt')
os.makedirs(dst, exist_ok=True)
for f in sorted(glob.glob(os.path.join(src, '*'))):
    slug, ext = os.path.splitext(os.path.basename(f))
    if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp', '.gif'): continue
    im = Image.open(f).convert('RGBA'); im.thumbnail((240, 240), Image.LANCZOS)
    out = os.path.join(dst, slug + '.webp'); im.save(out, 'WEBP', quality=80, method=6)
    print(f'{slug}: {os.path.getsize(f)//1024} KB -> {os.path.getsize(out)/1024:.1f} KB')
