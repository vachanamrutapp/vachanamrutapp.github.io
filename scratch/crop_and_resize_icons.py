import os
import shutil
from PIL import Image

def process_icons():
    raw_path = 'images/app-icon-raw.png'
    orig_path = 'images/app-icon.png'
    
    # Back up the original if raw doesn't exist
    if not os.path.exists(raw_path):
        print(f"Backing up {orig_path} to {raw_path}...")
        shutil.copy(orig_path, raw_path)
    
    print(f"Loading {raw_path}...")
    img = Image.open(raw_path).convert('RGBA')
    w, h = img.size
    print(f"Image dimensions: {w}x{h}")
    
    # Bounding box of the image (covers the entire square)
    x_min, x_max = 0, w - 1
    y_min, y_max = 0, h - 1
    
    # Create a new transparent image of the same dimensions
    cropped = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    
    # Corner radius of the golden border is 230 pixels
    r = 230
    
    # Corner centers in image coordinates
    cx_left, cx_right = x_min + r, x_max - r
    cy_top, cy_bottom = y_min + r, y_max - r
    
    print("Applying smooth rounded corner crop outside the golden border...")
    
    for y in range(h):
        for x in range(w):
            # Determine if pixel is in a corner region
            in_top_left = (x < cx_left) and (y < cy_top)
            in_top_right = (x > cx_right) and (y < cy_top)
            in_bottom_left = (x < cx_left) and (y > cy_bottom)
            in_bottom_right = (x > cx_right) and (y > cy_bottom)
            
            dist_to_boundary = 999.0
            is_outside = False
            
            if in_top_left:
                dist = ((x - cx_left)**2 + (y - cy_top)**2)**0.5
                if dist > r:
                    is_outside = True
                else:
                    dist_to_boundary = r - dist
            elif in_top_right:
                dist = ((x - cx_right)**2 + (y - cy_top)**2)**0.5
                if dist > r:
                    is_outside = True
                else:
                    dist_to_boundary = r - dist
            elif in_bottom_left:
                dist = ((x - cx_left)**2 + (y - cy_bottom)**2)**0.5
                if dist > r:
                    is_outside = True
                else:
                    dist_to_boundary = r - dist
            elif in_bottom_right:
                dist = ((x - cx_right)**2 + (y - cy_bottom)**2)**0.5
                if dist > r:
                    is_outside = True
                else:
                    dist_to_boundary = r - dist
            else:
                # In the straight parts, we are inside the boundaries of the image edge
                dist_to_boundary = min(x - x_min, x_max - x, y - y_min, y_max - y)
                
            if is_outside:
                continue
                
            # Get original pixel values
            original_pixel = img.getpixel((x, y))
            r_val, g_val, b_val, a_val = original_pixel
            
            # Apply anti-aliasing at the boundary (2-pixel transition width)
            if dist_to_boundary < 2.0:
                fraction = dist_to_boundary / 2.0
                new_a = int(a_val * fraction)
            else:
                new_a = a_val
                
            cropped.putpixel((x, y), (r_val, g_val, b_val, new_a))
            
    # Save the high-resolution cropped source
    cropped_master_path = 'images/app-icon-cropped.png'
    cropped.save(cropped_master_path, 'PNG')
    print(f"Saved high-res cropped master to {cropped_master_path}")
    
    # Define sizes to generate
    # 1. 192x192 -> images/192.png
    # 2. 512x512 -> images/512.png
    # 3. 512x512 -> images/app-icon.png (high-res cropped PWA icon, replacing raw)
    sizes = {
        'images/192.png': (192, 192),
        'images/512.png': (512, 512),
        'images/app-icon.png': (512, 512)
    }
    
    for path, size in sizes.items():
        print(f"Resizing to {size[0]}x{size[1]} -> {path}...")
        resized = cropped.resize(size, Image.Resampling.LANCZOS)
        resized.save(path, 'PNG')
        print(f"Saved {path}")

if __name__ == '__main__':
    process_icons()
