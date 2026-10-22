"""Builds the eight "Shop by Category" card images (4:3) from QALBI's own photographs.

    python scripts/process-category-images.py

Studio shots come from assets-source/client-photos (same helpers and corner-mark
guard as process-images.py). The other categories use the product photos QALBI
uploaded through /admin, kept as originals in assets-source/client-uploads.
Only crops, resizes and applies the shared warm grade — packaging and labels are
never altered. Writes new files under public/assets/categories/shop-*.webp and
never overwrites the existing category images.
"""
import importlib.util
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
UPLOADS = ROOT / "assets-source" / "client-uploads"

spec = importlib.util.spec_from_file_location("process_images", ROOT / "scripts" / "process-images.py")
pi = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pi)

ASPECT = 4 / 3
WIDTH = 900  # 4-column desktop cards are ~310 px wide: sharp at 2x, and on one-column phones.


def upload_shot(name: str, out: str, fx: float = 0.5, fy: float = 0.5, zoom: float = 1.0) -> None:
    """Aspect-correct crop of a client upload, centred on (fx, fy); zoom > 1 crops tighter."""
    im = Image.open(UPLOADS / f"{name}.jpg").convert("RGB")
    W, H = im.size
    w = min(W, H * ASPECT) / zoom
    h = w / ASPECT
    x = min(max(W * fx - w / 2, 0), W - w)
    y = min(max(H * fy - h / 2, 0), H - h)
    crop = pi.grade(im.crop((round(x), round(y), round(x + w), round(y + h))))
    pi.save(crop.resize((WIDTH, round(WIDTH / ASPECT)), Image.LANCZOS), out, 84)


if __name__ == "__main__":
    pi.shot(42, ASPECT, "categories/shop-face-serums.webp", WIDTH, fy=0.6, zoom=1.3, quality=84)
    pi.shot(36, ASPECT, "categories/shop-face-wash-cleansers.webp", WIDTH, fy=0.5, quality=84)
    pi.shot(46, ASPECT, "categories/shop-face-creams-moisturizers.webp", WIDTH, fy=0.5, quality=84)
    upload_shot("ubtan-face-body-scrub", "categories/shop-scrubs-face-masks.webp", fy=0.4, zoom=1.05)
    upload_shot("jatamansi-shampoo", "categories/shop-hair-mask-shampoo.webp", fy=0.55)
    upload_shot("lip-balm", "categories/shop-lip-eye-lash-care.webp", fy=0.42, zoom=1.1)
    upload_shot("ubtan-soap", "categories/shop-body-personal-care.webp", fy=0.42, zoom=1.15)
    upload_shot("beau-tea", "categories/shop-herbal-tea.webp", fy=0.0)
