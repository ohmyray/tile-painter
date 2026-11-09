---
title: Symbol-layer data contract from tile-stencil and tile-mixer
type: research-note
status: active
as_of: 2026-11-09
tags:
  - mapbox
  - tile-stencil
  - tile-mixer
  - symbol-labels
related:
  - adr/ADR-001-rolldown-vitest-toolchain.md
---

# Symbol-layer data contract from tile-stencil and tile-mixer

## Summary
The painter never sees raw Mapbox style JSON. `tile-stencil` turns every
layout/paint property into a function of `(zoom, feature)`, and `tile-mixer`
keeps each symbol feature's original GeoJSON geometry. Line placement therefore
has real line geometries to work with, but zoom-dependent properties must be
evaluated at render time.

## Evidence
- `getStyleFuncs` from `tile-stencil` replaces `.layout` and `.paint` with
  getters whose `.type` is `constant`, `zoom`, or `property`. Legacy
  `{base, stops}` objects become zoom functions; expression arrays are returned
  as constant arrays rather than evaluated.
- `tile-mixer`'s `initLabelParser` builds `{geometry, properties}` from
  `f.geometry`, so symbol features retain `Point`, `MultiPoint`, `LineString`,
  `MultiLineString`, `Polygon` and `MultiPolygon` geometries in tile pixel
  coordinates. `labelText`, `textWidth` and `spriteID` come from `text-field`,
  `icon-image` and `text-transform`.
- `textWidth` is measured upstream as one line with the collection-level CSS
  `font` string, which lives at `data.properties.font` rather than in a style
  getter.
- Across the example style files there are 355 layers, 74 of them symbols:
  14 use `symbol-placement: "line"`, 4 use zoom functions that switch to
  `"line"`, 44 set `text-max-width`, 8 set `text-letter-spacing` and 16 set
  `text-rotation-alignment`. No property-dependent style functions and no
  expression arrays outside `text-font` were found.
- Browser end-to-end runs on `osm-bright` and `map-painter` completed with zero
  console errors against the remote TileJSON and sprite endpoints.

## Lesson / guidance
- Always evaluate `symbol-placement` at the render zoom; reading it once at
  initialization is wrong for the zoom-function layers.
- Re-measure wrapped lines in the painter instead of trusting the upstream
  single-line `textWidth` when `text-letter-spacing` or `text-max-width` is
  active.
- Fall back to a default font when the FeatureCollection omits `properties.font`.
- For offline verification, `test/examples.test.js` parses the real example
  style JSON with `getStyleFuncs` and renders it through the labeler with a
  stubbed Canvas 2D context.

## Links
- `specs/adr/ADR-001-rolldown-vitest-toolchain.md`
- `README.md` — "Symbol labels" and "Remaining limitations"
