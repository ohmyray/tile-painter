import { test } from "vitest";
import assert from "node:assert/strict";

import { initIconLabeler } from "../src/icons.js";
import { makeStyleLayer, makePointFeature, makeSpriteObject } from "./helpers/style-fixtures.js";
import { createMockContext, callsOf } from "./helpers/mock-context.js";

function makeIconLabeler(layout = {}, sprite = makeSpriteObject()) {
  const ctx = createMockContext();
  const layer = makeStyleLayer({ layout });
  const labeler = initIconLabeler(14, layer.layout, layer.paint, sprite);
  return { labeler, ctx, sprite };
}

const iconFeature = () => makePointFeature("", 0, 0, { spriteID: "marker" });

test("should_return_no_icon_when_the_feature_has_no_sprite_id", () => {
  const { labeler } = makeIconLabeler();
  assert.equal(labeler.measure(makePointFeature("", 0, 0)), undefined);
});

test("should_return_no_icon_when_no_sprite_atlas_is_supplied", () => {
  const { labeler } = makeIconLabeler({}, null);
  assert.equal(labeler.measure(iconFeature()), undefined);
});

test("should_return_no_icon_when_the_sprite_id_is_unknown", () => {
  const { labeler } = makeIconLabeler();
  assert.equal(
    labeler.measure(makePointFeature("", 0, 0, { spriteID: "missing" })),
    undefined
  );
});

test("should_scale_sprite_dimensions_when_icon_size_is_set", () => {
  const { labeler } = makeIconLabeler({ "icon-size": 2 });
  const icon = labeler.measure(iconFeature());
  assert.deepEqual(icon.crop, [4, 8, 20, 10]);
  assert.equal(icon.width, 40);
  assert.equal(icon.height, 20);
});

test("should_rotate_the_bounding_box_when_icon_rotate_is_set", () => {
  const { labeler } = makeIconLabeler({
    "icon-size": 2,
    "icon-rotate": 90,
    "icon-padding": 2,
  });
  const icon = labeler.measure(iconFeature());
  const placed = labeler.place(icon, { x: 100, y: 50, angle: 0 }, false);
  assert.ok(Math.abs(placed.angle - Math.PI / 2) < 1e-9);
  assert.ok(Math.abs(placed.bbox[0][0] - 88) < 1e-9);
  assert.ok(Math.abs(placed.bbox[1][0] - 112) < 1e-9);
  assert.ok(Math.abs(placed.bbox[0][1] - 28) < 1e-9);
  assert.ok(Math.abs(placed.bbox[1][1] - 72) < 1e-9);
});

test("should_follow_the_line_when_alignment_is_map", () => {
  const { labeler } = makeIconLabeler({ "icon-rotation-alignment": "map" });
  const icon = labeler.measure(iconFeature());
  const placed = labeler.place(icon, { x: 0, y: 0, angle: 0.4 }, true);
  assert.ok(Math.abs(placed.angle - 0.4) < 1e-9);
});

test("should_ignore_the_line_when_alignment_is_viewport", () => {
  const { labeler } = makeIconLabeler({
    "icon-rotation-alignment": "viewport",
    "icon-rotate": 30,
  });
  const icon = labeler.measure(iconFeature());
  const placed = labeler.place(icon, { x: 0, y: 0, angle: 0.4 }, true);
  assert.ok(Math.abs(placed.angle - Math.PI / 6) < 1e-9);
});

test("should_flip_a_backward_line_icon_when_keep_upright_is_true", () => {
  const { labeler } = makeIconLabeler({ "icon-keep-upright": true });
  const icon = labeler.measure(iconFeature());
  const placed = labeler.place(icon, { x: 0, y: 0, angle: Math.PI }, true);
  assert.ok(Math.abs(placed.angle) < 1e-9);
});

test("should_draw_a_rotated_sprite_when_rendered", () => {
  const { labeler, ctx, sprite } = makeIconLabeler({
    "icon-size": 2,
    "icon-rotate": 90,
  });
  const icon = labeler.measure(iconFeature());
  labeler.draw(ctx, labeler.place(icon, { x: 10, y: 20, angle: 0 }, false));
  assert.deepEqual(callsOf(ctx, "translate"), [[10, 20]]);
  assert.ok(Math.abs(callsOf(ctx, "rotate")[0][0] - Math.PI / 2) < 1e-9);
  assert.deepEqual(callsOf(ctx, "drawImage"), [
    [sprite.image, 4, 8, 20, 10, -20, -10, 40, 20],
  ]);
  assert.equal(callsOf(ctx, "save").length, 1);
  assert.equal(callsOf(ctx, "restore").length, 1);
});
