#!/usr/bin/env python3
"""Render the impasto paint smears behind the hero "New leader" card (preview variants A and B).

The paint is modelled as a height field (a palette-knife stroke: thick lips pushed to the edges,
long knife grooves along the stroke, chatter ridges where the knife paused, a pressed-flat area
for the text) and lit with a soft top-left light. Output: a transparent paint layer and a separate
soft shadow layer per variant, so position, size and opacity stay adjustable in CSS.

    python scripts/render-hero-paint.py            # writes site/assets/hero-paint/*.webp
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

OUT = Path(__file__).resolve().parent.parent / 'site' / 'assets' / 'hero-paint'


def streaks(rng, h, w, sy, sx, warp=None):
    """Noise stretched along x (knife direction), optionally warped vertically."""
    n = ndi.gaussian_filter(rng.standard_normal((h, w)), (sy, sx), mode='wrap')
    n /= n.std() + 1e-9
    if warp is not None:
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        n = ndi.map_coordinates(n, [np.clip(yy + warp, 0, h - 1), xx], order=1, mode='nearest')
    return n


def smooth1d(rng, n, sigma):
    v = ndi.gaussian_filter1d(rng.standard_normal(n), sigma, mode='wrap')
    return v / (np.abs(v).max() + 1e-9)


def render(seed, W, H, span, band, flat, relief, grooves, out_w, name, curl=1.0, drops=60, cap_depth=0.75, dry_len=0.26):
    """Thick, loaded paint on the right with a rolled lip along the top edge; towards the left the
    knife runs dry and the stroke breaks into streaks and droplets (as in the reference)."""
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    s = H / 760  # feature size follows the stroke height, so a longer stroke keeps the same texture scale
    u = xx / W
    x0, x1 = span[0] * W, span[1] * W

    # ---- outline: smooth, slightly wavy top, calmer bottom, rounded loaded end on the right
    top = band[0] * H + smooth1d(rng, W, W / 6) * H * 0.03 + smooth1d(rng, W, W / 28) * H * 0.006
    bot = band[1] * H + smooth1d(rng, W, W / 5) * H * 0.02 + smooth1d(rng, W, W / 30) * H * 0.004
    # rounded cap where the brush first touched down: the middle leads, the corners fall back
    cy, hh = (top.mean() + bot.mean()) / 2, (bot.mean() - top.mean()) / 2
    dn = np.clip(np.abs(yy[:, 0] - cy) / (hh * 1.04), 0, 1)
    cap = hh * cap_depth
    right = x1 - cap * (1 - np.sqrt(1 - dn ** 2)) + smooth1d(rng, H, H / 4) * W * 0.006
    f = np.minimum.reduce([yy - top[None, :], bot[None, :] - yy, right[:, None] - xx])
    f = ndi.gaussian_filter(f + ndi.gaussian_filter(rng.standard_normal((H, W)), 10 * s) * 22 * s, 4 * s)
    # dry end: streak lines that break up towards the left and stop around x0
    dry = np.clip((x0 + dry_len * W - xx) / (dry_len * W), 0, 1)
    lines = streaks(rng, H, W, 3.5 * s, 50 * s) + 0.6 * streaks(rng, H, W, 9 * s, 160 * s)
    f -= dry ** 1.3 * np.clip(dry * 2.2 - 0.35 - lines * 0.55, 0, None) * 160 * s
    f -= np.clip((x0 - xx) / (0.02 * W), 0, None) * 200 * s
    mask = f > 0
    # droplets: small paint beads strung along the groove lines, thinning out to the left
    beads = np.zeros((H, W), np.float32)
    for _ in range(drops):
        bx = x0 + 0.92 * dry_len * W - rng.gamma(2.0, 0.27 * dry_len) * W
        by = rng.uniform(band[0] + .06, band[1] - .06) * H
        if bx < x0 - 0.1 * W: continue
        rx, ry = rng.uniform(4, 22) * s, rng.uniform(2.5, 6) * s
        e = ((xx - bx) / rx) ** 2 + ((yy - by) / ry) ** 2
        beads = np.maximum(beads, np.clip(1 - e, 0, 1))
    mask |= beads > 0
    lab, n = ndi.label(mask)
    if n > 1:
        sizes = ndi.sum(mask, lab, range(1, n + 1)); mask = np.isin(lab, np.flatnonzero(sizes > 12 * s * s) + 1)
    d = ndi.distance_transform_edt(mask).astype(np.float32)

    # ---- height field
    load = np.clip((u - span[0]) / (span[1] - span[0]), 0, 1) ** 1.2      # paint thicker to the right
    body = np.sqrt(np.clip(d / (24 * s), 0, 1)) * (0.45 + 0.55 * load)
    warp = streaks(rng, H, W, 80 * s, 300 * s) * 10 * s
    g = 0.55 * streaks(rng, H, W, 1.6 * s, 160 * s, warp) + 0.3 * streaks(rng, H, W, 4 * s, 300 * s, warp) \
        + 0.2 * streaks(rng, H, W, 0.8 * s, 70 * s, warp)
    fx, fy, fw, fh = flat
    flat_w = np.exp(-(((u - fx) / fw) ** 4 + ((yy / H - fy) / fh) ** 4))
    h = body + grooves * g * np.clip(d / (14 * s), 0, 1) * (1 - 0.8 * flat_w) * 0.095
    # rolled lip: paint pushed up along the top edge, strongest where the stroke is loaded
    ytop = np.argmax(mask, axis=0).astype(np.float32)
    dy = yy - ytop[None, :]
    lip_w = curl * np.clip((u - span[0] - 0.25) / 0.45, 0, 1) ** 1.3 * (0.75 + 0.25 * smooth1d(rng, W, W / 12))[None, :]
    h += lip_w * 1.9 * np.exp(-((dy - 17 * s) / (15 * s)) ** 2) * mask
    # a softer bead along the bottom edge and a rounded loaded end
    ybot = (H - 1 - np.argmax(mask[::-1], axis=0)).astype(np.float32)
    h += 0.22 * np.clip(load, 0.2, 1) * np.exp(-((ybot[None, :] - yy - 10 * s) / (9 * s)) ** 2) * mask
    h += beads * 0.35
    # paint mound where the brush set down, and the rolled rim carried round the cap
    xs = (x1 - xx) / W
    h += 0.38 * np.exp(-((xs - 0.07) / 0.06) ** 2) * np.clip(d / (20 * s), 0, 1) * (1 - 0.6 * flat_w)
    h += 0.55 * np.exp(-((d - 13 * s) / (10 * s)) ** 2) * np.clip(1 - xs / 0.12, 0, 1) * mask
    h = ndi.gaussian_filter(h * relief, 1.0 * s)

    # ---- lighting: soft light from the upper left; white paint on a near-white page
    gy, gx = np.gradient(h * 22 * s)
    nz = 1 / np.sqrt(gx ** 2 + gy ** 2 + 1)
    nx, ny = -gx * nz, -gy * nz
    L = np.array([-0.35, -0.75, 0.56]); L /= np.linalg.norm(L)
    diff = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
    Hh = L + np.array([0, 0, 1.0]); Hh /= np.linalg.norm(Hh)
    spec = np.clip(nx * Hh[0] + ny * Hh[1] + nz * Hh[2], 0, 1) ** 30
    ao = np.clip((ndi.gaussian_filter(h, 14 * s) - ndi.gaussian_filter(h, 3 * s)) * 1.8, 0, 1)  # broad cavities, not every groove
    shade = diff / L[2] - 1
    lum = np.clip(1 + shade * 0.42 - ao * 0.18, 0.62, 1.1)
    light = np.array([252, 251, 248], np.float32) / 255
    dark = np.array([206, 198, 186], np.float32) / 255
    tt = np.clip((1 - lum) / 0.44, 0, 1)[..., None]
    col = light * (1 - tt) + dark * tt + spec[..., None] * 0.05
    col = np.clip(col, 0, 1)

    alpha = ndi.gaussian_filter(mask.astype(np.float32), 0.9 * s)
    rgba = np.dstack([col, alpha])
    # shadow under the paint, deeper below the loaded right side
    m = mask.astype(np.float32) * (0.5 + 0.5 * load)
    sh = 0.32 * ndi.shift(ndi.gaussian_filter(m, 18 * s), (18 * s, 4 * s), order=1) \
        + 0.24 * ndi.shift(ndi.gaussian_filter(m, 3.5 * s), (5 * s, 1.5 * s), order=1)
    sh_rgba = np.dstack([np.broadcast_to(np.array([92, 78, 62], np.float32) / 255, (H, W, 3)), np.clip(sh, 0, 1)])

    out_h = round(out_w * H / W)
    OUT.mkdir(parents=True, exist_ok=True)
    for arr, suffix in ((rgba, ''), (sh_rgba, '-shadow')):
        img = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8)).resize((out_w, out_h), Image.LANCZOS)
        img.save(OUT / f'{name}{suffix}.webp', 'WEBP', quality=88, method=6)
    print(f'{name}: {out_w}x{out_h}')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--scale', type=float, default=2.0); a = ap.parse_args()
    k = a.scale
    # A: inside the card; lower relief, fills the card width
    render(seed=7, W=int(1600 * k), H=int(560 * k), span=(.08, .91), band=(.16, .84), flat=(.5, .5, .38, .26),
           relief=0.7, grooves=0.9, out_w=1400, name='smear-a', curl=0.7, drops=50)
    # B: the smear is the carrier: long stroke (rounded brush-down end, long beaded tail), deep relief
    render(seed=21, W=int(2200 * k), H=int(700 * k), span=(.05, .965), band=(.12, .88), flat=(.58, .5, .22, .28),
           relief=1.45, grooves=0.75, out_w=2200, name='smear-b', curl=1.0, drops=170, dry_len=0.3)
