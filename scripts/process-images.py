"""Builds the website image set from the client's original photographs.

    python scripts/process-images.py

Reads assets-source/client-photos/*.jpg and writes optimised WebP/PNG files to
public/assets/<prefix>/..., mirroring the Supabase Storage layout of the
`qalbi-naturals-media` bucket (see scripts/upload-assets.mjs).

Only crops, resizes and applies a light, uniform warm colour grade. Packaging,
labels and logo are never altered.

client-36 … client-54 are QALBI's studio renders. They carry a small sparkle
mark in the bottom-right corner, so every crop of them is kept clear of that
zone (enforced by `clear_of_mark`).
"""
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-source" / "client-photos"
OUT = ROOT / "public" / "assets"

# Sources with a corner mark → crops must avoid the bottom-right (MARK_W x MARK_H) zone.
MARKED = {13, *range(36, 55)}
MARK_W, MARK_H = 120, 100


def clear_of_mark(source: int, size: tuple[int, int], box: tuple[int, int, int, int]) -> None:
    if source not in MARKED:
        return
    W, H = size
    x, y, w, h = box
    assert x + w <= W - MARK_W or y + h <= H - MARK_H, f"crop of client-{source} includes the corner mark: {box}"


def fit_box(source: int, aspect: float, fx: float = 0.5, fy: float = 0.5, zoom: float = 1.0) -> tuple[int, int, int, int]:
    """Largest crop with the given width/height aspect, centred on (fx, fy), that stays clear of any corner mark."""
    W, H = Image.open(SRC / f"client-{source}.jpg").size
    usable_h = H - MARK_H if source in MARKED else H
    w = min(W, usable_h * aspect) / zoom
    h = w / aspect
    x = min(max(0, fx * W - w / 2), W - w)
    y = min(max(0, fy * usable_h - h / 2), usable_h - h)
    return round(x), round(y), int(w), int(h)


def grade(im: Image.Image) -> Image.Image:
    """Gentle, consistent warm grade so photos from different shoots sit together."""
    im = ImageEnhance.Contrast(im).enhance(1.04)
    im = ImageEnhance.Color(im).enhance(0.96)
    r, g, b = im.split()
    r = r.point(lambda v: min(255, int(v * 1.015)))
    b = b.point(lambda v: int(v * 0.985))
    return Image.merge("RGB", (r, g, b))


def cut(source: int, box: tuple[int, int, int, int]) -> Image.Image:
    x, y, w, h = box
    im = Image.open(SRC / f"client-{source}.jpg").convert("RGB")
    W, H = im.size
    assert x >= 0 and y >= 0 and x + w <= W and y + h <= H, f"crop outside client-{source}: {box} vs {im.size}"
    clear_of_mark(source, im.size, box)
    return grade(im.crop((x, y, x + w, y + h)))


def save(im: Image.Image, out: str, quality: int) -> None:
    dest = OUT / out
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=quality, method=6)
    print(f"{out}: {im.width}x{im.height} {dest.stat().st_size // 1024} KB")


def make(source: int, box: tuple[int, int, int, int], out: str, width: int, quality: int = 82) -> None:
    im = cut(source, box)
    if im.width > width:
        im = im.resize((width, round(width * im.height / im.width)), Image.LANCZOS)
    save(im, out, quality)


def shot(source: int, aspect: float, out: str, width: int, fx: float = 0.5, fy: float = 0.5, zoom: float = 1.0, quality: int = 82) -> None:
    """Aspect-correct crop of a studio shot (see fit_box)."""
    make(source, fit_box(source, aspect, fx, fy, zoom), out, width, quality)


def triptych(panels: list[tuple[int, float, float, float]], out: str, size: tuple[int, int] = (1600, 860), gutter: int = 8) -> None:
    """Editorial three-panel hero frame from portrait studio shots. Each panel: (source, fx, fy, zoom)."""
    W, H = size
    pw = (W - gutter * (len(panels) - 1)) // len(panels)
    canvas = Image.new("RGB", size, (248, 245, 236))
    for i, (source, fx, fy, zoom) in enumerate(panels):
        panel = cut(source, fit_box(source, pw / H, fx, fy, zoom)).resize((pw, H), Image.LANCZOS)
        canvas.paste(panel, (i * (pw + gutter), 0))
    save(canvas, out, 85)


def mosaic(sources: list[int], out: str, size: int = 600, gutter: int = 6) -> None:
    """2x2 grid of studio product shots (square), e.g. for the combos category."""
    cell = (size - gutter) // 2
    canvas = Image.new("RGB", (size, size), (248, 245, 236))
    for i, source in enumerate(sources):
        tile = cut(source, fit_box(source, 1, 0.5, 0.62, 1.35)).resize((cell, cell), Image.LANCZOS)
        canvas.paste(tile, ((i % 2) * (cell + gutter), (i // 2) * (cell + gutter)))
    save(canvas, out, 85)


def logo_mask() -> None:
    """Crisp 2x alpha mask of the logo. The site paints it with a metallic gold gradient via CSS mask-image."""
    alpha = Image.open(OUT / "brand" / "qalbi-logo.png").getchannel("A")
    alpha = alpha.resize((alpha.width * 2, alpha.height * 2), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))
    alpha = alpha.point(lambda v: 0 if v < 40 else 255 if v > 200 else int((v - 40) * 255 / 160))
    mask = Image.new("RGBA", alpha.size, (255, 255, 255, 0))
    mask.putalpha(alpha)
    dest = OUT / "brand" / "qalbi-logo-mask.png"
    mask.save(dest, optimize=True)
    print(f"brand/qalbi-logo-mask.png: {mask.width}x{mask.height} {dest.stat().st_size // 1024} KB")


def logo() -> None:
    """Gold-on-black logo → transparent PNG. Keeps the logo's true gold colours; only the
    black background is removed (alpha ramps over the anti-aliased edge pixels)."""
    im = Image.open(SRC / "client-39.jpg").convert("RGB")
    px = im.load()
    out = Image.new("RGBA", im.size)
    opx = out.load()
    for yy in range(im.height):
        for xx in range(im.width):
            r, g, b = px[xx, yy]
            m = max(r, g, b)
            a = 0 if m < 25 else 255 if m > 85 else int((m - 25) * 255 / 60)
            if a == 0:
                opx[xx, yy] = (0, 0, 0, 0)
            elif a == 255:
                opx[xx, yy] = (r, g, b, 255)
            else:  # edge pixel: recover colour from its blend with black
                k = 255 / max(a, 1)
                opx[xx, yy] = (min(255, int(r * k * 0.75)), min(255, int(g * k * 0.75)), min(255, int(b * k * 0.75)), a)
    out = out.crop(out.getbbox())
    dest = OUT / "brand" / "qalbi-logo.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, optimize=True)
    print(f"brand/qalbi-logo.png: {out.width}x{out.height} {dest.stat().st_size // 1024} KB")


def ingredient_crops() -> None:
    """Square ingredient photos for the homepage carousel (shown in ~180 px circles).

    The largest clean region of each ingredient in QALBI's photographs; never upscaled.
    Aloe vera, turmeric and neem have no usable photograph yet — the website shows a
    line icon for them until a real photo is uploaded in /admin/ingredients.
    """
    make(10, (740, 870, 320, 320), "ingredients/saffron.webp", 600, 86)
    make(25, (150, 320, 400, 400), "ingredients/rose-petals.webp", 600, 86)
    make(37, (10, 650, 340, 340), "ingredients/coconut-split.webp", 600, 86)
    make(19, (0, 420, 470, 470), "ingredients/cardamom.webp", 600, 86)


if __name__ == "__main__":
    logo()
    logo_mask()
    # Hero — desktop: full product lineup (client photo #35); mobile: botanical flat-lay (#25).
    make(35, (0, 40, 1600, 860), "hero/homepage-desktop.webp", 1600, 85)
    # Products (4:5)
    make(20, (0, 0, 1200, 1500), "products/multipurpose-booster-serum.webp", 960)
    make(23, (0, 60, 1200, 1500), "products/facial-cleanser.webp", 960)
    make(30, (460, 0, 960, 1200), "products/anti-aging.webp", 960)
    # Additional gallery views (4:5)
    # Categories (square)
    # Ingredients (square)
    # Editorial

    # --- Studio photography ------------------------------------------------
    # Hero slides 2 & 3 — editorial triptychs (desktop) and single portraits (mobile).
    triptych([(43, 0.5, 0.55, 1.0), (54, 0.5, 0.5, 1.0), (48, 0.5, 0.6, 1.0)], "hero/slide-2-desktop.webp")
    triptych([(46, 0.5, 0.55, 1.0), (13, 0.5, 0.45, 1.0), (42, 0.5, 0.6, 1.0)], "hero/slide-3-desktop.webp")
    shot(43, 4 / 5, "hero/slide-2-mobile.webp", 1080, fy=0.55, quality=85)
    shot(54, 4 / 5, "hero/slide-3-mobile.webp", 1080, quality=85)
    # Product galleries (4:5) — studio shot first, client photos after.
    shot(42, 4 / 5, "products/serum-studio.webp", 960, fy=0.66, zoom=1.35)
    shot(52, 4 / 5, "products/serum-gold.webp", 960, fy=0.55, zoom=1.25)
    shot(38, 4 / 5, "products/serum-botanical.webp", 960, fy=0.6)
    shot(34, 4 / 5, "products/serum-cutout.webp", 960)
    shot(46, 4 / 5, "products/radiance-studio.webp", 960, fy=0.6, zoom=1.2)
    shot(43, 4 / 5, "products/radiance-garden.webp", 960, fy=0.68, zoom=1.25)
    shot(47, 4 / 5, "products/radiance-forest.webp", 960, fy=0.5)
    shot(40, 4 / 5, "products/radiance-noir.webp", 960)
    shot(36, 4 / 5, "products/cleanser-studio.webp", 960, fy=0.6, zoom=1.2)
    shot(54, 4 / 5, "products/cleanser-splash.webp", 960)
    shot(37, 4 / 5, "products/cleanser-coconut.webp", 960, fy=0.55)
    shot(41, 4 / 5, "products/cleanser-roses.webp", 960, fy=0.6)
    shot(48, 4 / 5, "products/moisturizer-studio.webp", 960, fy=0.68, zoom=1.35)
    shot(44, 4 / 5, "products/moisturizer-sky.webp", 960, fy=0.72, zoom=1.25)
    shot(45, 4 / 5, "products/moisturizer-noir.webp", 960, fy=0.6)
    # Categories (square) — studio replacements.
    shot(42, 1, "categories/serums-studio.webp", 600, fy=0.62, zoom=1.5)
    shot(7, 1, "categories/face-creams-studio.webp", 600, zoom=1.15)
    shot(54, 1, "categories/face-wash-studio.webp", 600, fy=0.5, zoom=1.3)
    shot(15, 1, "categories/customised-studio.webp", 600, fy=0.7)
    # Editorial
    shot(15, 0.828, "miscellaneous/customised-skincare-studio.webp", 828, fy=0.6)
    shot(47, 3 / 4, "lookbook/ritual-forest.webp", 900, fy=0.5)
    shot(38, 4 / 5, "lookbook/ritual-bloom.webp", 800, fy=0.6)
    shot(13, 4 / 5, "lookbook/ritual-touch.webp", 800, fy=0.45)
    shot(44, 4 / 5, "lookbook/ritual-sky.webp", 800, fy=0.6)
    # Ingredients, editorial and categories from QALBI's warm botanical shots
    # (client-10's label text is never included — only its ingredient styling).
    # Only ingredients confirmed by QALBI are pictured: no cardamom, manjistha or licorice.
    make(35, (330, 0, 960, 1200), "hero/lineup-mobile.webp", 1080, 85)
    ingredient_crops()
    make(14, (0, 240, 704, 600), "ingredients/ingredients-hero-saffron.webp", 828, 85)
    shot(47, 4 / 3, "about/about-forest.webp", 1200, fy=0.55, quality=85)
    make(15, (0, 630, 240, 240), "categories/lip-care-roses.webp", 600)
    make(3, (60, 200, 800, 800), "categories/face-masks-ubtan.webp", 600)
    mosaic([42, 46, 36, 48], "categories/combos-collection.webp")
    # Instagram moments (9:16 reel format)
    for source, name, fy in [
        (43, "radiance-garden", 0.55), (54, "cleanser-splash", 0.5), (13, "skin-lightening-touch", 0.45), (37, "cleanser-coconut", 0.55),
        (44, "moisturizer-sky", 0.55), (11, "skin-lightening-duo", 0.5), (46, "radiance-sand", 0.55), (52, "serum-gold", 0.5),
    ]:
        shot(source, 9 / 16, f"reels/{name}.webp", 540, fy=fy)
