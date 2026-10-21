"""Square ingredient crops from the public-domain photos in assets-source/licensed/.

    python scripts/process-licensed-images.py

Same treatment as QALBI's own ingredient crops (scripts/process-images.py): the
same warm grade and a 600 px WebP, never upscaled. See assets-source/licensed/LICENSES.md.
"""
import importlib.util
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-source" / "licensed"

_spec = importlib.util.spec_from_file_location("process_images", ROOT / "scripts" / "process-images.py")
_pi = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_pi)


def square(name: str, box: tuple[int, int, int], out: str, width: int = 600) -> None:
    """box = (x, y, side) of the square crop in the original photo."""
    # Phone photos store their rotation in EXIF: apply it so the box matches the photo as viewed.
    im = ImageOps.exif_transpose(Image.open(SRC / name)).convert("RGB")
    x, y, side = box
    assert x >= 0 and y >= 0 and x + side <= im.width and y + side <= im.height, f"crop outside {name}: {box} vs {im.size}"
    im = _pi.grade(im.crop((x, y, x + side, y + side)))
    if im.width > width:
        im = im.resize((width, width), Image.LANCZOS)
    _pi.save(im, out, 86)


if __name__ == "__main__":
    # Rosette of leaves; the pot and the ground below are left out.
    square("aloe-vera-madagascar.jpg", (630, 1150, 1800), "ingredients/aloe-vera.webp")
    # The pile of powder, centred.
    square("turmeric-lakadong-powder.jpg", (200, 0, 1000), "ingredients/turmeric.webp")
    # The upper leaves only, so the photographer's caption at the bottom is never shown.
    square("neem-leaves.jpg", (0, 40, 960), "ingredients/neem.webp")
