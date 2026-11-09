// Builds style-layer inputs matching the contract of tile-stencil's
// getStyleFuncs: every layout/paint property is a function of (zoom, feature).
const LAYOUT_DEFAULTS = {
  "visibility": "visible",
  "symbol-placement": "point",
  "symbol-spacing": 250,
  "symbol-avoid-edges": false,
  "icon-allow-overlap": false,
  "icon-ignore-placement": false,
  "icon-optional": false,
  "icon-rotation-alignment": "auto",
  "icon-size": 1,
  "icon-image": undefined,
  "icon-rotate": 0,
  "icon-padding": 2,
  "icon-keep-upright": false,
  "icon-offset": [0, 0],
  "icon-anchor": "center",
  "text-pitch-alignment": "auto",
  "text-rotation-alignment": "auto",
  "text-field": "",
  "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
  "text-size": 16,
  "text-max-width": 10,
  "text-line-height": 1.2,
  "text-letter-spacing": 0,
  "text-justify": "center",
  "text-anchor": "center",
  "text-max-angle": 45,
  "text-rotate": 0,
  "text-padding": 2,
  "text-keep-upright": true,
  "text-transform": "none",
  "text-offset": [0, 0],
  "text-allow-overlap": false,
  "text-ignore-placement": false,
  "text-optional": false,
};

const PAINT_DEFAULTS = {
  "text-color": "#000000",
  "text-halo-color": "rgba(255,255,255,1)",
  "text-halo-width": 0,
  "text-halo-blur": 0,
  "text-opacity": 1,
  "text-translate": [0, 0],
  "icon-color": "#000000",
  "icon-halo-color": "rgba(255,255,255,1)",
  "icon-halo-width": 0,
  "icon-halo-blur": 0,
  "icon-opacity": 1,
  "icon-translate": [0, 0],
};

function toStyleFuncs(values) {
  const funcs = {};
  Object.entries(values).forEach(([key, value]) => {
    const getter = (typeof value === "function")
      ? value
      : () => value;
    getter.type = (typeof value === "function") ? "property" : "constant";
    funcs[key] = getter;
  });
  return funcs;
}

export function makeStyleLayer({ layout = {}, paint = {}, sprite } = {}) {
  return {
    id: "test-symbol-layer",
    type: "symbol",
    source: "openmaptiles",
    minzoom: 0,
    maxzoom: 24,
    layout: toStyleFuncs({ ...LAYOUT_DEFAULTS, ...layout }),
    paint: toStyleFuncs({ ...PAINT_DEFAULTS, ...paint }),
    spriteObject: sprite,
  };
}

export function makePointFeature(text, x, y, properties = {}) {
  return {
    geometry: { type: "Point", coordinates: [x, y] },
    properties: {
      labelText: text,
      textWidth: String(text || "").length * 8,
      ...properties,
    },
  };
}

export function makeLineFeature(text, coordinates, properties = {}) {
  return {
    geometry: { type: "LineString", coordinates },
    properties: {
      labelText: text,
      textWidth: String(text || "").length * 8,
      ...properties,
    },
  };
}

export function makeLabelData(features, font = "16px sans-serif") {
  return { properties: { font }, compressed: features };
}

export function makeSpriteObject() {
  return {
    image: { mockImage: true },
    meta: { marker: { x: 4, y: 8, width: 20, height: 10 } },
  };
}
