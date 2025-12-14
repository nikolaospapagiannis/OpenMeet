#!/usr/bin/env python3
"""
Convert SVG icons to PNG format for Chrome Extension.
Chrome Web Store requires PNG icons, not SVG.
"""

import subprocess
import sys
import os

def check_and_install_package(package_name, import_name=None):
    """Check if a package is installed, install if not."""
    if import_name is None:
        import_name = package_name

    try:
        __import__(import_name)
        return True
    except ImportError:
        print(f"Installing {package_name}...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", package_name])
            return True
        except subprocess.CalledProcessError:
            return False

# Check and install required packages
packages = [
    ("cairosvg", "cairosvg"),
    ("Pillow", "PIL")
]

print("Checking dependencies...")
for pkg, import_name in packages:
    if not check_and_install_package(pkg, import_name):
        print(f"Failed to install {pkg}")
        sys.exit(1)

# Now import the packages
import cairosvg
from PIL import Image
import io

def convert_svg_to_png(svg_path, png_path, width, height):
    """Convert SVG file to PNG with specified dimensions."""
    try:
        # Convert SVG to PNG using cairosvg
        png_data = cairosvg.svg2png(
            url=svg_path,
            output_width=width,
            output_height=height
        )

        # Write to file
        with open(png_path, 'wb') as f:
            f.write(png_data)

        print(f"✓ Created {png_path} ({width}x{height}px)")
        return True
    except Exception as e:
        print(f"✗ Failed to convert {svg_path}: {e}")
        return False

def main():
    """Main conversion function."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(script_dir, 'icons')

    # Base SVG file to use
    base_svg = os.path.join(icons_dir, 'icon.svg')

    if not os.path.exists(base_svg):
        print(f"Error: {base_svg} not found!")
        sys.exit(1)

    # Icon sizes required by Chrome Extension
    sizes = [16, 32, 48, 128]

    print("\nConverting Chrome Extension icons from SVG to PNG...")
    print(f"Source: {base_svg}\n")

    success_count = 0
    for size in sizes:
        png_path = os.path.join(icons_dir, f'icon-{size}.png')
        if convert_svg_to_png(base_svg, png_path, size, size):
            success_count += 1

    print(f"\n{'='*50}")
    print(f"Conversion complete: {success_count}/{len(sizes)} icons created")
    print(f"{'='*50}")

    if success_count == len(sizes):
        print("\n✓ All icons converted successfully!")
        print("✓ Chrome Extension is now ready for Chrome Web Store submission")
        return 0
    else:
        print(f"\n✗ Some conversions failed ({len(sizes) - success_count} errors)")
        return 1

if __name__ == '__main__':
    sys.exit(main())
