"""Encodes the homepage hero film into a desktop and a mobile MP4, plus posters.

    python scripts/encode-hero-video.py <source.mp4> --version v2 [--out DIR] [--mobile-source <portrait.mp4>] [--no-posters]

Needs ffmpeg with libx264: the one bundled with `pip install imageio-ffmpeg`
is used when available, otherwise `ffmpeg` on PATH. The source is expected to
be 16:9 (the current film is 1280×720) with the product centred. With
--mobile-source, the mobile file is cut from that portrait film instead (e.g.
the owner's 720×1280 hero/Mobile_Version.mp4): its centre 4:5, the part a
phone's hero frame shows anyway (object-cover, centred).

Writes (nothing is uploaded):
  <out>/qalbi-naturals-hero-<version>-desktop.mp4   1280×720, ~2.5–3 MB
  <out>/qalbi-naturals-hero-<version>-mobile.mp4    576×720 (4:5 centre crop, the phone hero frame), ~1.5 MB
  public/assets/hero/qalbi-naturals-hero-<version>-poster-desktop.webp   first frame
  public/assets/hero/qalbi-naturals-hero-<version>-poster-mobile.webp    first frame, same crop
  (no posters with --no-posters: when the film's existing posters already are its first frames)

Videos are 15+ MB-class binaries in their source form and are never kept in
the repository: <out> defaults to the source file's folder and may not be
inside the project. H.264 High, no audio (the hero is muted), yuv420p,
keyframe every 2 s and +faststart so playback starts before the download ends.
Packaging and labels are never altered: only crop, scale and re-encode.
"""
import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
POSTERS = ROOT / "public" / "assets" / "hero"

# Shared H.264 settings; CRF picked by SSIM against the source (≥ 0.99 for both).
X264 = ["-an", "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-level:v", "4.0", "-pix_fmt", "yuv420p", "-g", "48", "-movflags", "+faststart"]
VARIANTS = {
    "desktop": {"filter": "scale=1280:-2:flags=lanczos", "crf": "22", "maxrate": "6M", "bufsize": "12M"},
    # 4:5 matches the phone hero frame exactly, so the browser crops nothing further.
    "mobile": {"filter": "crop=ih*4/5:ih,scale=-2:720:flags=lanczos", "crf": "23", "maxrate": "4M", "bufsize": "8M"},
}
# Mobile from a portrait source (--mobile-source): centre 4:5 at the source's own width (720×900 from 720×1280), no rescale.
MOBILE_FROM_PORTRAIT = "crop=iw:trunc(iw*5/8)*2"


def ffmpeg_exe() -> str:
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        found = shutil.which("ffmpeg")
        if not found:
            sys.exit("ffmpeg not found: pip install imageio-ffmpeg, or install ffmpeg and add it to PATH.")
        return found


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source", type=Path)
    parser.add_argument("--version", required=True, help="new name suffix, e.g. v2 — never reuse one (files are cached for a year)")
    parser.add_argument("--out", type=Path, help="folder for the MP4s (default: the source's folder; not inside the project)")
    parser.add_argument("--mobile-source", type=Path, help="portrait film to cut the mobile file from (default: crop the source)")
    parser.add_argument("--no-posters", action="store_true", help="skip the poster WebPs")
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1252

    source = args.source.resolve()
    if not source.is_file():
        sys.exit(f"Source not found: {source}")
    mobile_source = args.mobile_source.resolve() if args.mobile_source else None
    if mobile_source and not mobile_source.is_file():
        sys.exit(f"Mobile source not found: {mobile_source}")
    out = (args.out or source.parent).resolve()
    if out == ROOT or ROOT in out.parents:
        sys.exit(f"--out must be outside the project ({ROOT}); hero videos are not committed.")
    out.mkdir(parents=True, exist_ok=True)
    ff = ffmpeg_exe()
    name = f"qalbi-naturals-hero-{args.version}"

    for variant, v in VARIANTS.items():
        video = out / f"{name}-{variant}.mp4"
        src, vf = (mobile_source, MOBILE_FROM_PORTRAIT) if variant == "mobile" and mobile_source else (source, v["filter"])
        subprocess.run(
            [ff, "-hide_banner", "-loglevel", "error", "-y", "-i", str(src), "-vf", vf, *X264, "-crf", v["crf"], "-maxrate", v["maxrate"], "-bufsize", v["bufsize"], str(video)],
            check=True,
        )
        print(f"✔ {video}  {video.stat().st_size / 1048576:.2f} MB")
        if args.no_posters:
            continue
        with tempfile.TemporaryDirectory() as tmp:
            frame = Path(tmp) / "frame.png"
            subprocess.run([ff, "-hide_banner", "-loglevel", "error", "-y", "-i", str(video), "-frames:v", "1", str(frame)], check=True)
            poster = POSTERS / f"{name}-poster-{variant}.webp"
            with Image.open(frame) as im:
                im.convert("RGB").save(poster, "WEBP", quality=80, method=6)
                size = im.size
        print(f"✔ {poster.relative_to(ROOT)}  {size[0]}×{size[1]}, {poster.stat().st_size // 1024} KB")

    print(
        f"""
Next (needs approval — nothing has been uploaded):
  1. Check both MP4s and posters by eye: correct label, no stretching.
  2. Upload the MP4s to the bucket as hero/{name}-desktop.mp4 and hero/{name}-mobile.mp4
     with Cache-Control max-age=31536000 (see the heroFilm comment in src/data/images.ts).
  3. In src/data/images.ts → heroFilm: point desktop, mobile and the two posters at the
     new names and set approved: true."""
    )


if __name__ == "__main__":
    main()
