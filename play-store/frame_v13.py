"""Fit app screenshots into the gold phone/tablet housings (resources/Vachanamrut App gold * housing.png).

The housings are 941x1672 with a black screen area; output is 1080x1920 for Google Play.
The screen shape (curved corners included) is traced from the housing itself, so the screenshot
follows the housing's own corners and leaves its bezel and camera untouched.
Capture screens at the screen's own shape first: phone 1080x2311, tablet 1600x2376 (portrait).

Usage: python3 play-store/frame_v13.py phone|tablet RAW_DIR OUT_DIR
"""
import sys
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT_SIZE = (1080, 1920)
SS = 4  # supersampling for smooth mask edges
SPECS = {
    # dark: brightness below which a housing pixel is screen; inset: black bezel kept inside it (output px)
    'phone': dict(housing='Vachanamrut App gold phone housing.png', dark=20, inset=7, camera=True),
    # the tablet has a dark-grey bezel (~24) around a near-black screen (~7); its glare throws off
    # the measured corner, so the radius (housing px) is given
    'tablet': dict(housing='Vachanamrut App gold tablet housing.png', dark=14, inset=1, radius=10),
}


@lru_cache
def screen_mask(kind):
    """Rounded-rectangle mask of the housing's screen at OUT_SIZE, and the camera circle (or None).

    The screen's box and corner radius are measured from the housing's dark area, then drawn as a
    perfect supersampled rounded rectangle so the corners are smooth.
    """
    spec = SPECS[kind]
    housing = Image.open(ROOT / 'resources' / spec['housing']).convert('L')
    w, h = housing.size
    dark = housing.point(lambda v: 255 if v < spec['dark'] else 0)
    ImageDraw.floodfill(dark, (w // 2, h // 2), 128)
    screen = dark.point(lambda v: 255 if v == 128 else 0).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    x0, y0, x1, y1 = screen.getbbox()
    # Corner radius: walk the 45-degree diagonal in from each bbox corner to where the screen begins.
    offsets = []
    for cx, cy, dx, dy in [(x0, y0, 1, 1), (x1 - 1, y0, -1, 1), (x0, y1 - 1, 1, -1), (x1 - 1, y1 - 1, -1, -1)]:
        t = 0
        while screen.getpixel((cx + dx * t, cy + dy * t)) == 0:
            t += 1
        offsets.append(t)
    radius = spec.get('radius') or sum(sorted(offsets)[1:3]) / 2 / (1 - 0.5 ** 0.5)
    k = OUT_SIZE[0] / w
    box = [v * k for v in (x0, y0, x1, y1)]
    inset = spec['inset']
    box = [box[0] + inset, box[1] + inset, box[2] - inset, box[3] - inset]
    r = max(radius * k - inset, 0)
    big = Image.new('L', (OUT_SIZE[0] * SS, OUT_SIZE[1] * SS), 0)
    ImageDraw.Draw(big).rounded_rectangle([v * SS for v in box], r * SS, fill=255)
    mask = big.resize(OUT_SIZE, Image.LANCZOS)
    camera = None
    if spec.get('camera'):
        # Punch-hole camera: the small non-dark blob near the top centre of the screen.
        mid = (x0 + x1) // 2
        region = (mid - 40, y0, mid + 40, y0 + 80)
        blob = dark.crop(region).point(lambda v: 255 if v != 128 else 0)
        ImageDraw.floodfill(blob, (0, blob.size[1] - 1), 0)
        bx0, by0, bx1, by1 = blob.getbbox()
        cx, cy = (region[0] + (bx0 + bx1) / 2) * k, (region[1] + (by0 + by1) / 2) * k
        camera = (cx, cy, max(bx1 - bx0, by1 - by0) / 2 * k + 3)
    return mask, camera


def frame(kind, shot_path, out_path):
    spec = SPECS[kind]
    housing = Image.open(ROOT / 'resources' / spec['housing']).convert('RGB')
    mask, camera = screen_mask(kind)
    base = housing.resize(OUT_SIZE, Image.LANCZOS)
    x0, y0, x1, y1 = mask.point(lambda v: 255 if v > 8 else 0).getbbox()
    shot = ImageOps.fit(Image.open(shot_path).convert('RGB'), (x1 - x0, y1 - y0), Image.LANCZOS)
    layer = base.copy()
    layer.paste(shot, (x0, y0))
    result = Image.composite(layer, base, mask)
    # Keep the housing's camera on top of the screenshot.
    if camera:
        cx, cy, r = camera
        dot = Image.new('L', (OUT_SIZE[0] * SS, OUT_SIZE[1] * SS), 0)
        ImageDraw.Draw(dot).ellipse([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS], fill=255)
        result = Image.composite(base, result, dot.resize(OUT_SIZE, Image.LANCZOS))
    result.save(out_path, optimize=True)


if __name__ == '__main__':
    kind, raw, out = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    for shot in sorted(raw.glob('*.png')):
        frame(kind, shot, out / shot.name)
        print(out / shot.name)
