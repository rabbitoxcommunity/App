# Bundled asset credits

## Icon font — `assets/fonts/`

**Material Symbols Rounded**, by Google — [Apache License 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE).

The design (`FreshCart App.dc.html`) is drawn with Material Symbols Rounded, which
`@expo/vector-icons` does not ship, so the real font is bundled instead.

Two files are included because the design varies the font's `FILL` axis and React
Native cannot set variable-font axes at runtime:

| File | Axis values |
| --- | --- |
| `MaterialSymbolsRounded-Fill0.ttf` | `opsz 24, wght 400, FILL 0, GRAD 0` |
| `MaterialSymbolsRounded-Fill1.ttf` | `opsz 24, wght 400, FILL 1, GRAD 0` |

Both are static instances subsetted to only the 65 glyphs the design uses
(~31 KB combined, down from ~3 MB). To regenerate after adding an icon, update
the map in `src/components/Icon.tsx`, then re-run the subset with the codepoints
listed in `src/components/symbols.ts`:

```sh
pyftsubset MaterialSymbolsRounded-FillN.ttf \
  --unicodes="U+E145,U+E5C4,…" \
  --output-file=MaterialSymbolsRounded-FillN.ttf \
  --no-layout-closure --drop-tables+=GSUB
```

`GSUB` is dropped deliberately: the glyphs are rendered by codepoint rather than
by the font's ligature names, because React Native does not apply ligature
substitution reliably across platforms.

## Category photography — `assets/categories/`

All eight tiles are **CC0 1.0 (public domain dedication)** — no attribution is
legally required, and they are safe for commercial use. Sources are recorded
here for provenance only. Each was centre-cropped to a square and resized to
256×256.

| File | Title | Source |
| --- | --- | --- |
| `fruits-veg.jpg` | Fresh Organic Vegetables Ane Fruits | [rawpixel](https://www.rawpixel.com/image/5965544/fresh-organic-vegetables-ane-fruits) |
| `dairy-eggs.jpg` | Eggs Basket White | [rawpixel](https://www.rawpixel.com/image/5966665/eggs-basket-white) |
| `bakery.jpg` | Free bread loaf bakery's display | [rawpixel](https://www.rawpixel.com/image/5914820/image-public-domain-free-menu) |
| `beverages.jpg` | Fruit lemonades | [flickr](https://www.flickr.com/photos/135396164@N05/43522180855) |
| `snacks.jpg` | Cookies Snack | [stocksnap](https://stocksnap.io/photo/cookies-snack-LTLOZK09CG) |
| `meat-fish.jpg` | Free salmon fillet image | [rawpixel](https://www.rawpixel.com/image/5905213/photo-image-public-domain-leaf-blue) |
| `household.jpg` | Cleaning products | [rawpixel](https://www.rawpixel.com/image/5903626/cleaning-products-free-public-domain-cc0-photo) |
| `baby-care.jpg` | Close baby toys shelf | [rawpixel](https://www.rawpixel.com/image/5919257/photo-image-public-domain-house-home) |

Discovered via the [Openverse](https://openverse.org) API filtered to
`license=cc0,pdm`.
