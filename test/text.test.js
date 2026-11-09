import { test } from "vitest";
import assert from "node:assert/strict";

import { initTextLabeler } from "../src/text.js";
import { makeStyleLayer, makePointFeature } from "./helpers/style-fixtures.js";
import { createMockContext, callsOf } from "./helpers/mock-context.js";

function makeLabeler(layout = {}, paint = {}) {
  const ctx = createMockContext();
  const layer = makeStyleLayer({ layout, paint });
  const labeler = initTextLabeler(
    14, layer.layout, layer.paint, "16px sans-serif", ctx
  );
  return { labeler, ctx };
}

function close(actual, expected) {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `expected ${actual} to be close to ${expected}`
  );
}

test("should_set_canvas_text_state_when_initialized", () => {
  const { labeler, ctx } = makeLabeler({}, { "text-color": "#123456" });
  labeler.setState(ctx);
  assert.equal(ctx.font, "16px sans-serif");
  assert.equal(ctx.textBaseline, "bottom");
  assert.equal(ctx.textAlign, "left");
  assert.equal(ctx.fillStyle, "#123456");
});

test("should_configure_halo_when_halo_width_is_positive", () => {
  const { labeler, ctx } = makeLabeler({}, {
    "text-halo-width": 1.5,
    "text-halo-color": "#ffffff",
  });
  labeler.setState(ctx);
  assert.equal(ctx.lineWidth, 3);
  assert.equal(ctx.lineJoin, "round");
  assert.equal(ctx.strokeStyle, "#ffffff");
});

test("should_return_no_label_when_the_feature_has_no_text", () => {
  const { labeler } = makeLabeler();
  assert.equal(labeler.measure(makePointFeature("", 0, 0)), undefined);
});

test("should_return_no_label_when_the_text_is_only_whitespace", () => {
  const { labeler } = makeLabeler();
  assert.equal(labeler.measure(makePointFeature("   ", 0, 0)), undefined);
});

test("should_measure_a_single_line_when_the_label_fits", () => {
  const { labeler } = makeLabeler();
  const label = labeler.measure(makePointFeature("ABCD", 0, 0));
  assert.deepEqual(label.lines, ["ABCD"]);
  assert.equal(label.width, 32);
  close(label.height, 19.2);
});

test("should_wrap_long_labels_when_text_max_width_is_set", () => {
  const { labeler } = makeLabeler({ "text-max-width": 5 });
  const label = labeler.measure(makePointFeature("AAAA BBBB CCCC", 0, 0));
  assert.deepEqual(label.lines, ["AAAA BBBB", "CCCC"]);
  assert.deepEqual(label.widths, [72, 32]);
  assert.equal(label.width, 72);
  close(label.height, 38.4);
});

test("should_widen_a_label_when_letter_spacing_is_set", () => {
  const { labeler } = makeLabeler({ "text-letter-spacing": 0.25 });
  const label = labeler.measure(makePointFeature("ABCD", 0, 0));
  assert.equal(label.width, 44);
});

test("should_account_for_letter_spacing_when_wrapping", () => {
  const { labeler } = makeLabeler({
    "text-max-width": 5,
    "text-letter-spacing": 0.25,
  });
  const label = labeler.measure(makePointFeature("AAAA BBBB CCCC", 0, 0));
  assert.deepEqual(label.lines, ["AAAA", "BBBB", "CCCC"]);
  assert.equal(label.width, 44);
});

test("should_center_the_label_box_on_the_anchor_when_anchor_is_center", () => {
  const { labeler } = makeLabeler({ "text-padding": 2 });
  const label = labeler.measure(makePointFeature("ABCD", 0, 0));
  const placed = labeler.place(label, { x: 100, y: 50, angle: 0 }, false);
  assert.deepEqual(placed.center, [100, 50]);
  close(placed.bbox[0][0], 82);
  close(placed.bbox[1][0], 118);
  close(placed.bbox[0][1], 38.4);
  close(placed.bbox[1][1], 61.6);
});

test("should_shift_the_label_box_when_anchor_is_top_left", () => {
  const { labeler } = makeLabeler({ "text-anchor": "top-left" });
  const label = labeler.measure(makePointFeature("ABCD", 0, 0));
  const placed = labeler.place(label, { x: 100, y: 50, angle: 0 }, false);
  assert.equal(placed.center[0], 116);
  close(placed.center[1], 59.6);
});

test("should_rotate_the_canvas_when_text_rotate_is_set", () => {
  const { labeler, ctx } = makeLabeler({ "text-rotate": 90 });
  const label = labeler.measure(makePointFeature("ABCD", 0, 0));
  const placed = labeler.place(label, { x: 10, y: 20, angle: 0 }, false);
  labeler.draw(ctx, placed);
  assert.deepEqual(callsOf(ctx, "translate"), [[10, 20]]);
  close(callsOf(ctx, "rotate")[0][0], Math.PI / 2);
  assert.deepEqual(callsOf(ctx, "fillText"), [["ABCD", -16, 9.6]]);
  assert.equal(callsOf(ctx, "save").length, 1);
  assert.equal(callsOf(ctx, "restore").length, 1);
});

test("should_draw_each_line_with_halo_when_the_label_wraps", () => {
  const { labeler, ctx } = makeLabeler(
    { "text-max-width": 5 },
    { "text-halo-width": 1 }
  );
  const label = labeler.measure(makePointFeature("AAAA BBBB CCCC", 0, 0));
  labeler.draw(ctx, labeler.place(label, { x: 0, y: 0, angle: 0 }, false));
  assert.deepEqual(
    callsOf(ctx, "strokeText").map(args => args[0]),
    ["AAAA BBBB", "CCCC"]
  );
  assert.deepEqual(
    callsOf(ctx, "fillText").map(args => args[0]),
    ["AAAA BBBB", "CCCC"]
  );
});

test("should_draw_glyphs_separately_when_letter_spacing_is_set", () => {
  const { labeler, ctx } = makeLabeler({ "text-letter-spacing": 0.25 });
  const label = labeler.measure(makePointFeature("ABCD", 0, 0));
  labeler.draw(ctx, labeler.place(label, { x: 0, y: 0, angle: 0 }, false));
  assert.deepEqual(
    callsOf(ctx, "fillText").map(args => args[0]),
    ["A", "B", "C", "D"]
  );
});

test("should_right_align_short_lines_when_justify_is_right", () => {
  const { labeler, ctx } = makeLabeler({
    "text-max-width": 5,
    "text-justify": "right",
  });
  const label = labeler.measure(makePointFeature("AAAA BBBB CCCC", 0, 0));
  labeler.draw(ctx, labeler.place(label, { x: 0, y: 0, angle: 0 }, false));
  const positions = callsOf(ctx, "fillText").map(args => args[1]);
  assert.equal(positions[0], -36);
  assert.equal(positions[1], 4);
});

test("should_follow_the_line_direction_when_alignment_is_auto", () => {
  const { labeler } = makeLabeler();
  const label = labeler.measure(makePointFeature("ABCD", 0, 0));
  const placed = labeler.place(label, { x: 0, y: 0, angle: 0.4 }, true);
  close(placed.angle, 0.4);
});

test("should_flip_a_backward_line_label_when_keep_upright_is_true", () => {
  const { labeler } = makeLabeler();
  const label = labeler.measure(makePointFeature("ABCD", 0, 0));
  const placed = labeler.place(label, { x: 0, y: 0, angle: Math.PI }, true);
  close(placed.angle, 0);
});

test("should_ignore_line_direction_when_alignment_is_viewport", () => {
  const { labeler } = makeLabeler({
    "text-rotation-alignment": "viewport",
    "text-rotate": 30,
  });
  const label = labeler.measure(makePointFeature("ABCD", 0, 0));
  const placed = labeler.place(label, { x: 0, y: 0, angle: 1 }, true);
  close(placed.angle, Math.PI / 6);
});
