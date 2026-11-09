import { test } from "vitest";
import assert from "node:assert/strict";

import { initLabeler } from "../src/labeler.js";
import {
  makeStyleLayer, makePointFeature, makeLineFeature,
  makeLabelData, makeSpriteObject,
} from "./helpers/style-fixtures.js";
import { createMockContext, callsOf } from "./helpers/mock-context.js";

const lineGeometry = [[0, 0], [500, 0]];

function render(layout, paint, features, options = {}) {
  const {
    boxes, zoom = 14, scale = 1, sprite,
    font = "16px sans-serif", tileSize = 512,
  } = options;
  const layer = makeStyleLayer({ layout, paint });
  const ctx = createMockContext();
  const painter = initLabeler(layer.layout, layer.paint, sprite, tileSize);
  const data = makeLabelData(features, font);
  painter(ctx, zoom, data, boxes, scale);
  return { ctx, boxes, data, layer };
}

test("should_draw_one_point_label_when_placement_is_point", () => {
  const { ctx } = render({}, {}, [makePointFeature("ABCD", 100, 100)]);
  assert.deepEqual(callsOf(ctx, "fillText").map(args => args[0]), ["ABCD"]);
});

test("should_draw_wrapped_lines_when_text_max_width_is_small", () => {
  const { ctx } = render({ "text-max-width": 5 }, {}, [
    makePointFeature("AAAA BBBB CCCC", 100, 100),
  ]);
  assert.deepEqual(
    callsOf(ctx, "fillText").map(args => args[0]),
    ["AAAA BBBB", "CCCC"]
  );
});

test("should_draw_glyphs_separately_when_letter_spacing_is_set", () => {
  const { ctx } = render({ "text-letter-spacing": 0.25 }, {}, [
    makePointFeature("ABCD", 100, 100),
  ]);
  assert.deepEqual(
    callsOf(ctx, "fillText").map(args => args[0]),
    ["A", "B", "C", "D"]
  );
});

test("should_rotate_the_canvas_when_text_rotate_is_set", () => {
  const { ctx } = render({ "text-rotate": 30 }, {}, [
    makePointFeature("ABCD", 100, 100),
  ]);
  assert.ok(Math.abs(callsOf(ctx, "rotate")[0][0] - Math.PI / 6) < 1e-9);
});

test("should_place_labels_along_a_line_when_placement_is_line", () => {
  const { ctx } = render({
    "symbol-placement": "line",
    "symbol-spacing": 200,
  }, {}, [makeLineFeature("ABCD", lineGeometry)]);
  assert.equal(callsOf(ctx, "fillText").length, 2);
});

test("should_place_one_label_when_placement_is_line_center", () => {
  const { ctx } = render({
    "symbol-placement": "line-center",
    "symbol-spacing": 200,
  }, {}, [makeLineFeature("ABCD", lineGeometry)]);
  assert.equal(callsOf(ctx, "fillText").length, 1);
});

test("should_skip_labels_across_a_sharp_bend_when_max_angle_is_low", () => {
  const { ctx } = render({
    "symbol-placement": "line",
    "symbol-spacing": 200,
    "text-max-angle": 30,
  }, {}, [makeLineFeature("A".repeat(22), [[0, 0], [100, 0], [100, 100]])]);
  assert.equal(callsOf(ctx, "fillText").length, 0);
});

test("should_space_labels_by_symbol_spacing_when_spacing_is_small", () => {
  const { ctx } = render({
    "symbol-placement": "line",
    "symbol-spacing": 100,
    "text-max-width": 0,
  }, {}, [makeLineFeature("ABCD", lineGeometry)]);
  assert.equal(callsOf(ctx, "fillText").length, 5);
});

test("should_place_labels_on_every_line_when_geometry_is_multi_line", () => {
  const feature = makeLineFeature("ABCD", lineGeometry);
  feature.geometry = {
    type: "MultiLineString",
    coordinates: [lineGeometry, [[0, 200], [500, 200]]],
  };
  const { ctx } = render({
    "symbol-placement": "line",
    "symbol-spacing": 200,
  }, {}, [feature]);
  assert.equal(callsOf(ctx, "fillText").length, 4);
});

test("should_rotate_line_labels_to_the_line_direction_when_alignment_is_map", () => {
  const { ctx } = render({
    "symbol-placement": "line",
    "symbol-spacing": 200,
    "text-rotation-alignment": "map",
    "text-keep-upright": false,
  }, {}, [makeLineFeature("ABCD", [[0, 0], [0, 500]])]);
  const rotations = callsOf(ctx, "rotate");
  assert.ok(rotations.length > 0);
  assert.ok(rotations.every(([angle]) => {
    return Math.abs(angle - Math.PI / 2) < 1e-9;
  }));
});

test("should_keep_backward_line_labels_upright_when_keep_upright_is_true", () => {
  const { ctx } = render({
    "symbol-placement": "line",
    "symbol-spacing": 200,
  }, {}, [makeLineFeature("ABCD", [[500, 0], [0, 0]])]);
  const rotations = callsOf(ctx, "rotate");
  assert.ok(rotations.length > 0);
  assert.ok(rotations.every(([angle]) => Math.abs(angle) < 1e-9));
});

test("should_skip_a_colliding_label_when_a_box_covers_the_anchor", () => {
  const boxes = [[[80, 80], [120, 120]]];
  const { ctx } = render({}, {}, [makePointFeature("ABCD", 100, 100)], { boxes });
  assert.equal(callsOf(ctx, "fillText").length, 0);
  assert.equal(boxes.length, 1);
});

test("should_detect_collisions_without_boxes_when_boxes_are_omitted", () => {
  const { ctx } = render({}, {}, [
    makePointFeature("ABCD", 100, 100),
    makePointFeature("ABCD", 100, 100),
  ]);
  assert.equal(callsOf(ctx, "fillText").length, 1);
});

test("should_record_non_colliding_boxes_when_boxes_are_supplied", () => {
  const boxes = [];
  render({}, {}, [makePointFeature("ABCD", 100, 100)], { boxes });
  assert.equal(boxes.length, 1);
});

test("should_draw_both_text_and_sprite_when_both_are_present", () => {
  const feature = makePointFeature("ABCD", 100, 100, { spriteID: "marker" });
  const { ctx } = render({}, {}, [feature], { sprite: makeSpriteObject() });
  assert.equal(callsOf(ctx, "drawImage").length, 1);
  assert.equal(callsOf(ctx, "fillText").length, 1);
});

test("should_not_draw_outside_the_tile_when_the_label_is_out_of_bounds", () => {
  const { ctx } = render({}, {}, [makePointFeature("ABCD", 1000, 1000)]);
  assert.equal(callsOf(ctx, "fillText").length, 0);
});

test("should_evaluate_placement_at_the_current_zoom_when_it_is_a_function", () => {
  const placement = zoom => zoom >= 11 ? "line" : "point";
  const layout = { "symbol-placement": placement, "symbol-spacing": 200 };
  const feature = makeLineFeature("ABCD", lineGeometry);
  const pointRender = render(layout, {}, [feature], { zoom: 10 });
  assert.equal(callsOf(pointRender.ctx, "fillText").length, 0);
  const lineRender = render(layout, {}, [feature], { zoom: 11 });
  assert.equal(callsOf(lineRender.ctx, "fillText").length, 2);
});

test("should_scale_the_context_twice_when_scale_is_not_one", () => {
  const { ctx } = render({}, {}, [], { scale: 2 });
  assert.equal(callsOf(ctx, "scale").length, 2);
});

test("should_use_a_default_font_when_the_collection_has_no_font", () => {
  const { ctx } = render({}, {}, [makePointFeature("ABCD", 100, 100)], {
    font: undefined,
  });
  assert.equal(ctx.font, "16px sans-serif");
});

test("should_not_throw_when_data_has_no_compressed_features", () => {
  const layer = makeStyleLayer();
  const ctx = createMockContext();
  const painter = initLabeler(layer.layout, layer.paint, undefined, 512);
  assert.doesNotThrow(() => {
    painter(ctx, 14, { properties: { font: "16px sans-serif" } }, [], 1);
  });
});

test("should_use_a_default_font_when_data_has_no_properties", () => {
  const layer = makeStyleLayer();
  const ctx = createMockContext();
  const painter = initLabeler(layer.layout, layer.paint, undefined, 512);
  assert.doesNotThrow(() => painter(ctx, 14, { compressed: [] }, [], 1));
  assert.equal(ctx.font, "16px sans-serif");
});

test("should_skip_features_without_text_or_sprite", () => {
  const { ctx } = render({}, {}, [makePointFeature("", 100, 100)]);
  assert.equal(callsOf(ctx, "fillText").length, 0);
  assert.equal(callsOf(ctx, "drawImage").length, 0);
});

test("should_draw_an_icon_only_symbol_when_the_label_has_no_text", () => {
  const feature = makePointFeature("", 100, 100, { spriteID: "marker" });
  const { ctx } = render({}, {}, [feature], { sprite: makeSpriteObject() });
  assert.equal(callsOf(ctx, "drawImage").length, 1);
  assert.equal(callsOf(ctx, "fillText").length, 0);
});

test("should_not_draw_an_icon_outside_the_tile", () => {
  const feature = makePointFeature("ABCD", 1000, 1000, {
    spriteID: "marker",
  });
  const { ctx } = render({}, {}, [feature], { sprite: makeSpriteObject() });
  assert.equal(callsOf(ctx, "drawImage").length, 0);
});
