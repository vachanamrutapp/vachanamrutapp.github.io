"""Place app screenshots into the decorative phone templates for the Play Store.

Each template in screenshot-ref/ has a blank white phone screen. This finds that
screen (the white area around the image centre), fits the screenshot into it,
keeps the rounded corners and camera dot, and writes 1080x1920 PNGs.

Capture each screenshot at its template's screen ratio first (see listing.md),
e.g. `adb shell wm size 1080x2382` for Poster-1.

Usage:  python3 play-store/frame_screenshots.py RAW_DIR OUT_DIR
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "screenshot-ref"
OUT_SIZE = (1080, 1920)

# Screenshot name -> template, cycling through the three backdrops.
FRAMES = {
    "01-home-gujarati": "Vachanamrut App Launch Poster-1.png",
    "02-reading-audio": "Royal Vachanamrut App Launch-2.png",
    "03-partharo": "Royal Vachanamrut App Launch-3.png",
    "04-glossary": "Vachanamrut App Launch Poster-1.png",
    "05-facts": "Royal Vachanamrut App Launch-2.png",
    "06-reading-english": "Royal Vachanamrut App Launch-3.png",
    "07-dark-theme": "Vachanamrut App Launch Poster-1.png",
    "08-journey": "Royal Vachanamrut App Launch-2.png",
}


def screen_mask(template):
    """Return (mask, bbox, camera) for the white phone screen in the template."""
    w, h = template.size
    white = template.convert("L").point(lambda v: 255 if v > 225 else 0)
    # Only the white area connected to the centre is the screen.
    ImageDraw.floodfill(white, (w // 2, h // 2), 128)
    screen = white.point(lambda v: 255 if v == 128 else 0)

    # Fill enclosed holes (the camera dot) so the screenshot covers them too.
    outside = screen.copy()
    ImageDraw.floodfill(outside, (0, 0), 50)
    holes = outside.point(lambda v: 255 if v == 0 else 0)
    camera = holes.getbbox()
    mask = Image.composite(Image.new("L", screen.size, 255), screen, holes)

    bbox = mask.getbbox()
    # Grow 2px to swallow the anti-aliased white edge, then soften it.
    mask = mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    return mask, bbox, camera


def draw_camera(image, camera):
    x0, y0, x1, y1 = camera
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    r = max(x1 - x0, y1 - y0) / 2 + 1
    scale = 4  # supersample for a smooth edge
    size = int(r * 2 + 4)
    dot = Image.new("L", (size * scale, size * scale), 0)
    ImageDraw.Draw(dot).ellipse([2 * scale, 2 * scale, (2 + 2 * r) * scale, (2 + 2 * r) * scale], fill=255)
    dot = dot.resize((size, size), Image.LANCZOS)
    image.paste((12, 12, 14), (int(cx - r - 2), int(cy - r - 2)), dot)


def frame(raw_path, template_path, out_path):
    template = Image.open(template_path).convert("RGB").resize(OUT_SIZE, Image.LANCZOS)
    mask, (x0, y0, x1, y1), camera = screen_mask(template)
    shot = Image.open(raw_path).convert("RGB").resize((x1 - x0, y1 - y0), Image.LANCZOS)
    layer = Image.new("RGB", OUT_SIZE)
    layer.paste(shot, (x0, y0))
    result = Image.composite(layer, template, mask)
    if camera:
        draw_camera(result, camera)
    result.save(out_path, optimize=True)
    return (x1 - x0, y1 - y0)


def main():
    raw_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, template in FRAMES.items():
        size = frame(raw_dir / f"{name}.png", TEMPLATES / template, out_dir / f"{name}.png")
        print(f"{name}: screen {size[0]}x{size[1]} in {template}")


if __name__ == "__main__":
    main()
