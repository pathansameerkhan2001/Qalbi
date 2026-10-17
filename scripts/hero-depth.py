"""Optional: builds the depth-of-field desktop hero from the client's lineup photo (#35).

Requires `rembg` (run in a separate virtualenv):  python scripts/hero-depth.py
Writes assets-source/derived/hero-lineup-depth.jpg, which process-images.py uses
for hero/homepage-desktop.webp.

What it does: separates the five QALBI products (unaltered pixels) from the
room behind them, then renders only that background as soft, warm bokeh —
the same effect as shooting with a wide-aperture lens. Labels, packaging and
colours of the products are left untouched.
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-source" / "client-photos" / "client-35.jpg"
OUT = ROOT / "assets-source" / "derived" / "hero-lineup-depth.jpg"

photo = Image.open(SRC).convert("RGB")
W, H = photo.size

# 1. Product mask (salient-object segmentation), cleaned and feathered.
raw = remove(photo, session=new_session("birefnet-general"), only_mask=True).convert("L")
raw.save(OUT.with_name("hero-lineup-rawmask.png")) if OUT.parent.exists() else None

# Restrict to hand-measured product regions so room clutter can never be kept sharp.
products = Image.new("L", (W, H), 0)
d = ImageDraw.Draw(products)
for box in [
    (120, 290, 360, 860),   # Multipurpose Booster Serum
    (340, 125, 570, 850),   # Radiance Glow Cream
    (555, 570, 875, 880),   # Anti-Aging jar
    (855, 0, 1110, 870),    # Facial Cleanser
    (1060, 40, 1600, 900),  # Moisturizer (incl. pump spout)
]:
    d.rectangle(box, fill=255)
mask = ImageChops.multiply(raw, products)
mask = mask.point(lambda v: 255 if v > 100 else 0).filter(ImageFilter.GaussianBlur(1.4))

# The marble surface the products stand on stays sharp near their base, then falls off.
surface = Image.new("L", (W, H), 0)
for y in range(H):
    v = 0 if y < 820 else min(255, int((y - 820) * 255 / 140))
    surface.paste(v, (0, y, W, y + 1))
keep = ImageChops.lighter(mask, surface)

# 2. Background: wide-aperture blur, lifted toward warm cream, gentle desaturation.
bg = photo.filter(ImageFilter.GaussianBlur(26))
bg = ImageEnhance.Color(bg).enhance(0.72)
bg = ImageEnhance.Brightness(bg).enhance(1.08)
bg = Image.blend(bg, Image.new("RGB", (W, H), (246, 236, 214)), 0.28)

# 3. Composite + subtle warm vignette.
out = Image.composite(photo, bg, keep)
vignette = Image.radial_gradient("L").resize((W, H)).point(lambda v: max(0, int((v - 150) * 0.5)))
out = Image.composite(Image.blend(out, Image.new("RGB", (W, H), (150, 118, 72)), 0.3), out, vignette)

OUT.parent.mkdir(parents=True, exist_ok=True)
out.save(OUT, quality=95)
mask.save(OUT.with_name("hero-lineup-mask.png"))
print(f"wrote {OUT}")
