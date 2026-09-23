"""Prepare the photo used by the Gaussian-splat portrait.

    python scripts/prepare-portrait.py path/to/photo.jpg

Writes two files the splat renderer (src/scene/splats.ts) reads:

  public/images/self.jpg            the photo, centre-cropped to a square
                                    (small photos are upscaled and sharpened)
  public/images/portrait-matte.png  subject mask, white = person

The mask comes from MediaPipe person segmentation, keeping only the largest
connected region so people in the background are dropped. Without MediaPipe
it falls back to region-growing from the image edges, which only works on a
plain wall. Requires Pillow, numpy and opencv-python (+ mediapipe).
"""
import argparse
from collections import deque
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
PHOTO = ROOT / "public" / "images" / "self.jpg"
MATTE = ROOT / "public" / "images" / "portrait-matte.png"
MIN_SIZE = 440


def load_square(path: Path) -> Image.Image:
    img = Image.open(path)
    if img.mode in ("RGBA", "LA") or "transparency" in img.info:
        backdrop = Image.new("RGB", img.size, (255, 255, 255))
        backdrop.paste(img, mask=img.convert("RGBA").split()[-1])
        img = backdrop
    img = img.convert("RGB")
    side = min(img.size)
    left = (img.width - side) // 2
    top = (img.height - side) // 2
    img = img.crop((left, top, left + side, top + side))
    if side < MIN_SIZE:
        img = img.resize((MIN_SIZE, MIN_SIZE), Image.LANCZOS)
        img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=70, threshold=2))
    return img


def person_mask(rgb: np.ndarray) -> np.ndarray | None:
    try:
        import mediapipe as mp
    except ImportError:
        return None
    with mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=0) as seg:
        result = seg.process(rgb)
    return result.segmentation_mask > 0.5 if result.segmentation_mask is not None else None


def wall_mask(rgb: np.ndarray, neighbour_tol=10.0, wall_tol=46.0) -> np.ndarray:
    """Subject = everything not reachable from the top/left/right edges through wall-coloured pixels."""
    img = rgb.astype(np.float32)
    h, w, _ = img.shape
    border = np.concatenate([img[:8].reshape(-1, 3), img[:, :8].reshape(-1, 3), img[:, -8:].reshape(-1, 3)])
    wall = np.median(border, axis=0)
    is_wall = np.zeros((h, w), dtype=bool)
    seeds = [(0, x) for x in range(w)] + [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)]
    queue = deque()
    for y, x in seeds:
        if np.linalg.norm(img[y, x] - wall) < wall_tol:
            is_wall[y, x] = True
            queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not is_wall[ny, nx]:
                if np.linalg.norm(img[ny, nx] - img[y, x]) < neighbour_tol and np.linalg.norm(img[ny, nx] - wall) < wall_tol:
                    is_wall[ny, nx] = True
                    queue.append((ny, nx))
    return ~is_wall


def largest_component(mask: np.ndarray) -> np.ndarray:
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=4)
    if count <= 1:
        return mask
    biggest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return labels == biggest


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("photo", type=Path, nargs="?", default=PHOTO, help="source photo (defaults to the current self.jpg)")
    args = parser.parse_args()

    img = load_square(args.photo)
    rgb = np.asarray(img)
    mask = person_mask(rgb)
    method = "mediapipe"
    if mask is None:
        mask = wall_mask(rgb)
        method = "wall flood-fill"
    mask = largest_component(mask)

    matte = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8), "L")
    # Close pinholes, pull the edge in a touch, then feather so splats fade instead of clipping.
    matte = matte.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    matte = matte.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(2.2))
    # Fade out at the left/right frame edges, where other people's shoulders tend to join the mask,
    # and along the bottom, so a cropped torso dissolves instead of ending in a hard line.
    w, h = matte.size
    x = np.arange(w)
    y = np.arange(h)
    sides = np.clip(np.minimum(x, w - 1 - x) / (0.06 * w), 0, 1)
    bottom = np.clip((h - 1 - y) / (0.16 * h), 0, 1) ** 1.5
    matte = Image.fromarray((np.asarray(matte) * sides[None, :] * bottom[:, None]).astype(np.uint8), "L")

    img.save(PHOTO, quality=92)
    matte.save(MATTE, optimize=True)
    print(f"{PHOTO.name}: {img.width}x{img.height}; {MATTE.name} via {method}, subject {100 * mask.mean():.1f}%")


if __name__ == "__main__":
    main()
