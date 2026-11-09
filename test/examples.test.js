import { test } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getStyleFuncs } from "tile-stencil";

import { initLabeler } from "../src/labeler.js";
import { createMockContext, callsOf } from "./helpers/mock-context.js";

const examplesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), "../examples"
);

const STYLE_FILES = [
  "fiord-color/fiord-color-style.json",
  "klokan-basic/klokantech-basic-style.json",
  "map-painter/klokantech-basic-style.json",
  "osm-bright/osm-bright-style.json",
  "osm-liberty/osm-liberty-style.json",
];

function loadStyle(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(examplesDir, relativePath), "utf8")
  );
}

function getSymbolLayer(relativePath, id) {
  const layer = loadStyle(relativePath).layers.find(entry => entry.id === id);
  assert.ok(layer, `style layer ${id} must exist in ${relativePath}`);
  return getStyleFuncs(layer);
}

function makeFeature(text, geometry) {
  return {
    geometry,
    properties: {
      labelText: text,
      textWidth: text.length * 8,
    },
  };
}

function renderLayer(parsedLayer, features, options = {}) {
  const zoom = options.zoom ?? 14;
  const ctx = createMockContext();
  const fontSize = parsedLayer.layout["text-size"](zoom);
  const data = {
    properties: { font: `${fontSize}px sans-serif` },
    compressed: features,
  };
  const painter = initLabeler(parsedLayer.layout, parsedLayer.paint, undefined, 512);
  painter(ctx, zoom, data, options.boxes, options.scale ?? 1);
  return ctx;
}

function assertFiniteDrawCalls(ctx, layerId) {
  ["fillText", "strokeText", "translate", "rotate", "drawImage"].forEach(method => {
    callsOf(ctx, method).forEach(args => {
      args.forEach(value => {
        if (typeof value === "number") {
          assert.ok(
            Number.isFinite(value),
            `${layerId}: ${method} received ${value}`
          );
        }
      });
    });
  });
}

test("should_repeat_labels_along_a_real_waterway_when_placement_is_line", () => {
  const layer = getSymbolLayer(
    "osm-bright/osm-bright-style.json", "waterway-name"
  );
  const ctx = renderLayer(layer, [
    makeFeature("River Creek", {
      type: "LineString", coordinates: [[0, 0], [1000, 0]],
    }),
  ]);
  assert.ok(callsOf(ctx, "fillText").length > 1);
  assertFiniteDrawCalls(ctx, "waterway-name");
});

test("should_wrap_a_long_label_from_a_real_style_when_max_width_is_small", () => {
  const layer = getSymbolLayer(
    "osm-liberty/osm-liberty-style.json", "water_name_line"
  );
  const ctx = renderLayer(layer, [
    makeFeature("Lake Something Very Long Name", {
      type: "LineString", coordinates: [[0, 0], [1000, 0]],
    }),
  ]);
  const rows = new Set(callsOf(ctx, "fillText").map(args => args[2]));
  assert.ok(rows.size > 1, "a long label must occupy more than one line");
  assertFiniteDrawCalls(ctx, "water_name_line");
});

test("should_draw_spaced_glyphs_for_a_real_style_with_letter_spacing", () => {
  const layer = getSymbolLayer(
    "klokan-basic/klokantech-basic-style.json", "road_major_label"
  );
  const ctx = renderLayer(layer, [
    makeFeature("Main St", {
      type: "LineString", coordinates: [[0, 0], [1000, 0]],
    }),
  ]);
  const draws = callsOf(ctx, "fillText");
  assert.ok(draws.length > 0);
  assert.ok(
    draws.every(args => args[0].length === 1),
    "letter spacing must draw glyphs separately"
  );
  assertFiniteDrawCalls(ctx, "road_major_label");
});

test("should_rotate_labels_to_the_line_direction_when_a_real_style_uses_map_alignment", () => {
  const layer = getSymbolLayer(
    "osm-bright/osm-bright-style.json", "waterway-name"
  );
  const ctx = renderLayer(layer, [
    makeFeature("Creek", {
      type: "LineString", coordinates: [[0, 0], [500, 300]],
    }),
  ]);
  const rotations = callsOf(ctx, "rotate");
  const expected = Math.atan2(300, 500);
  assert.ok(rotations.length > 0);
  assert.ok(rotations.some(([angle]) => Math.abs(angle - expected) < 0.2));
  assertFiniteDrawCalls(ctx, "waterway-name");
});

test("should_render_every_symbol_layer_of_every_example_style_without_invalid_coordinates", () => {
  const geometries = [
    { type: "Point", coordinates: [100, 100] },
    {
      type: "LineString",
      coordinates: [[0, 0], [400, 200], [800, 200]],
    },
  ];

  STYLE_FILES.forEach(relativePath => {
    const style = loadStyle(relativePath);
    style.layers
      .filter(layer => layer.type === "symbol")
      .forEach(rawLayer => {
        const parsedLayer = getStyleFuncs(rawLayer);
        geometries.forEach(geometry => {
          const ctx = renderLayer(parsedLayer, [
            makeFeature("Main Street West", geometry),
          ]);
          assertFiniteDrawCalls(ctx, `${relativePath}/${rawLayer.id}`);
        });
      });
  });
});
