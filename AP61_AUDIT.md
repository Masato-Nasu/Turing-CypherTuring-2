# Turing Cypher AP61.7 Audit

## Classification

AP61 is a **No-Dot Visual Guard** build.

It is **not** a pure shape-only carrier and it is **not** a pure generative-condition carrier.

It is a visual-first carrier that removes the explicit 1px / 3x3 black-white dot layer used in AP60.2 / AP60.3.

## What changed from AP60.3

- Removed visible binary dot carrier.
- Removed bootstrap header dot layer.
- Removed fixed image header embedded as point marks.
- Reduced capacity aggressively.
- Uses AP59.5-style labyrinth values as the visual core:
  - F = 0.0305
  - k = 0.0575
  - Du = 0.16
  - Dv = 0.08
- Payload is carried as subtle paired soft modulation on existing white / black labyrinth bands.
- Reading compares the generated base labyrinth with the encoded image and reads the residual difference.

## What can be honestly said

- No fixed QR grid.
- No metadata payload.
- No LSB payload.
- No alpha payload.
- No overlay text.
- No explicit binary dot layer.
- The carrier positions are derived from the labyrinth image and passphrase/page order.
- The result prioritizes the continuous labyrinth look over capacity.

## What must not be claimed

- Do not claim that all data is stored purely in shape.
- Do not claim this is a perfect pure generative-condition carrier.
- Do not claim this has the high capacity of AP60.3.
- Do not claim robustness after screenshots, SNS upload, JPEG/WebP conversion, resizing, or image-app resaving.

## Current limitation

This version trades capacity for appearance.
Long texts will become multiple pages.
The correct test is:

1. Generate PNG.
2. Save using the app button / ZIP.
3. Re-upload the original PNG(s).
4. Use the same passphrase.
5. Confirm verifier OK.

Do not test with screenshots or chat-resaved images.


## AP61.7 adjustment

- Auto page planning is changed to prioritize **1 page first**.
- Added 6144 × 6144 experimental page size.
- If one page is possible, Auto now chooses a one-page plan instead of an early multi-page smaller canvas.
- If one page is not possible, Auto falls back to the largest supported size to minimize page count.


## AP61.7 adjustment

- Added **7168 × 7168** and **8192 × 8192** experimental sizes.
- Auto page planning still prioritizes **1 page first**.
- 6144 capacity estimate was corrected downward to a more realistic value.
- 7168 and 8192 are provided to reduce page count for long texts while keeping the no-dot visual guard approach.
- These large sizes are experimental and may be heavy in browser memory / generation time.


## AP61.7.1 fix

- Fixed browser Crypto.getRandomValues 65,536 byte per-call limit by filling large random buffers in chunks.
- This is a runtime fix only. Carrier design is unchanged from AP61.7.


## AP61.7 compression note

AP61.7 does not increase the visual-safe page capacity. It reduces page count by optimizing image files before packaging. When image compression is enabled, recovered images are JPEG derivatives, not byte-identical originals. Choose original file mode when exact file recovery is required.


## AP61.7 smart image optimization

- Image optimization now compares original image bytes, PNG, JPEG, and WebP candidates.
- This fixes the AP61.4 regression where black-and-white / line-art PNGs could become larger after forced JPEG conversion.
- One-page priority still uses the selected organic page size capacity, but chooses the smallest/safest image representation before encryption.
- If the original image is already smaller than the compressed candidates, the original file is kept.


## AP61.7 Dense Labyrinth

- Increases labyrinth band density while keeping the same visual core direction.
- Uses denser field resolution and slightly denser carrier-pair sampling.
- Raises large-page visual-safe capacity modestly.
- Goal: reduce page count without returning to visible binary dot artifacts.


## AP61.7 2-Page Priority Dense Labyrinth

- Added **9216**, **10240**, and **12288** experimental page sizes.
- Auto planning now prefers the **smallest size that fits within 2 pages**.
- If 2 pages are not possible, Auto falls back to the largest supported size to minimize page count.
- Large-page capacities were extended for the new sizes.
- Dense-labyrinth direction is kept to improve usable carrier band count while avoiding visible binary-dot artifacts.
- These ultra-large sizes are experimental and may be heavy in browser memory and generation time.
