import sys, glob, os
from PIL import Image

slug, out = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(os.path.join("shots", slug, "*.png")))
frames = [Image.open(f).convert("RGB") for f in files]
w = 560
frames = [f.resize((w, round(f.height * w / f.width)), Image.LANCZOS) for f in frames]
pal = frames[len(frames) // 2].quantize(colors=96, method=Image.MEDIANCUT)
q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
os.makedirs(os.path.dirname(out), exist_ok=True)
q[0].save(out, save_all=True, append_images=q[1:], duration=90, loop=0, optimize=True, disposal=1)
print(out, len(q), "frames", os.path.getsize(out) // 1024, "KB")
