import { test } from "vitest";
import assert from "node:assert/strict";

import {
  getLineStrings,
  getLineAnchors,
  getPointAnchors,
  getSymbolAngle,
  rotatedBBox,
  intersects,
} from "../src/symbol-geometry.js";

const straightLine = [[0, 0], [500, 0]];
const baseOptions = {
  spacing: 200,
  maxAngle: 45,
  labelWidth: 100,
  placement: "line",
  scale: 1,
};

test("should_return_no_lines_when_geometry_is_a_point", () => {
  assert.deepEqual(
    getLineStrings({ type: "Point", coordinates: [1, 2] }),
    []
  );
  assert.deepEqual(
    getLineStrings({ type: "MultiPoint", coordinates: [[1, 2], [3, 4]] }),
    []
  );
});

test("should_return_one_line_when_geometry_is_a_line_string", () => {
  assert.deepEqual(
    getLineStrings({ type: "LineString", coordinates: straightLine }),
    [straightLine]
  );
});

test("should_return_all_lines_when_geometry_is_multi_line_string", () => {
  const lines = [straightLine, [[0, 5], [10, 5]]];
  assert.deepEqual(
    getLineStrings({ type: "MultiLineString", coordinates: lines }),
    lines
  );
});

test("should_return_all_rings_when_geometry_is_a_polygon", () => {
  const rings = [straightLine, [[0, 5], [10, 5]]];
  assert.deepEqual(
    getLineStrings({ type: "Polygon", coordinates: rings }),
    rings
  );
  assert.deepEqual(
    getLineStrings({ type: "MultiPolygon", coordinates: [rings] }),
    rings
  );
});

test("should_ignore_degenerate_lines_when_extracting_geometry", () => {
  assert.deepEqual(
    getLineStrings({ type: "LineString", coordinates: [[1, 1]] }),
    []
  );
});

test("should_place_labels_at_spacing_intervals_when_placement_is_line", () => {
  const anchors = getLineAnchors(
    { type: "LineString", coordinates: straightLine },
    baseOptions
  );
  assert.equal(anchors.length, 2);
  assert.deepEqual(anchors.map(a => a.x), [100, 300]);
  assert.ok(anchors.every(a => a.y === 0));
  assert.ok(anchors.every(a => Math.abs(a.angle) < 1e-9));
});

test("should_place_one_label_at_the_midpoint_when_placement_is_line_center", () => {
  const anchors = getLineAnchors(
    { type: "LineString", coordinates: straightLine },
    { ...baseOptions, placement: "line-center" }
  );
  assert.equal(anchors.length, 1);
  assert.equal(anchors[0].x, 250);
  assert.equal(anchors[0].y, 0);
});

test("should_rotate_the_anchor_to_the_line_direction_when_line_is_vertical", () => {
  const anchors = getLineAnchors(
    { type: "LineString", coordinates: [[0, 0], [0, 500]] },
    baseOptions
  );
  assert.ok(anchors.every(a => Math.abs(a.angle - Math.PI / 2) < 1e-9));
});

test("should_skip_labels_when_the_line_is_shorter_than_the_label", () => {
  const anchors = getLineAnchors(
    { type: "LineString", coordinates: [[0, 0], [40, 0]] },
    baseOptions
  );
  assert.deepEqual(anchors, []);
});

test("should_skip_a_label_when_it_would_span_a_bend_sharper_than_max_angle", () => {
  const bentLine = [[0, 0], [100, 0], [100, 100]];
  const anchors = getLineAnchors(
    { type: "LineString", coordinates: bentLine },
    { spacing: 200, maxAngle: 30, labelWidth: 180, placement: "line", scale: 1 }
  );
  assert.deepEqual(anchors, []);
});

test("should_keep_labels_on_gentle_bends_when_the_turn_is_below_max_angle", () => {
  const bentLine = [[0, 0], [100, 0], [200, 10]];
  const anchors = getLineAnchors(
    { type: "LineString", coordinates: bentLine },
    { ...baseOptions, labelWidth: 80 }
  );
  assert.ok(anchors.length > 0);
  assert.ok(anchors.every(a => Math.abs(a.angle) < 0.2));
});

test("should_scale_coordinates_when_scale_is_not_one", () => {
  const geometry = { type: "LineString", coordinates: straightLine };
  const center = getLineAnchors(geometry, {
    ...baseOptions, placement: "line-center", scale: 2,
  });
  assert.equal(center[0].x, 500);
  const repeated = getLineAnchors(geometry, { ...baseOptions, scale: 2 });
  assert.ok(repeated.length > getLineAnchors(geometry, baseOptions).length);
});

test("should_return_one_anchor_for_a_point_when_placement_is_point", () => {
  assert.deepEqual(
    getPointAnchors({ type: "Point", coordinates: [10, 20] }),
    [{ x: 10, y: 20, angle: 0 }]
  );
});

test("should_return_one_anchor_per_point_when_geometry_is_multi_point", () => {
  assert.deepEqual(
    getPointAnchors({ type: "MultiPoint", coordinates: [[1, 2], [3, 4]] }, 2),
    [
      { x: 2, y: 4, angle: 0 },
      { x: 6, y: 8, angle: 0 },
    ]
  );
});

test("should_return_no_point_anchors_when_geometry_is_a_line", () => {
  assert.deepEqual(
    getPointAnchors({ type: "LineString", coordinates: straightLine }),
    []
  );
});

test("should_apply_rotate_in_degrees_when_symbol_is_a_point", () => {
  const angle = getSymbolAngle({ rotate: 30, alongLine: false });
  assert.ok(Math.abs(angle - Math.PI / 6) < 1e-9);
});

test("should_add_line_direction_when_alignment_is_map", () => {
  const angle = getSymbolAngle({
    lineAngle: 0.5,
    rotate: 0,
    alignment: "map",
    alongLine: true,
  });
  assert.ok(Math.abs(angle - 0.5) < 1e-9);
});

test("should_ignore_line_direction_when_alignment_is_viewport", () => {
  const angle = getSymbolAngle({
    lineAngle: 0.5,
    rotate: 30,
    alignment: "viewport",
    alongLine: true,
  });
  assert.ok(Math.abs(angle - Math.PI / 6) < 1e-9);
});

test("should_flip_a_backward_line_label_when_keep_upright_is_true", () => {
  const angle = getSymbolAngle({
    lineAngle: Math.PI,
    rotate: 0,
    alignment: "auto",
    keepUpright: true,
    alongLine: true,
  });
  assert.ok(Math.abs(angle) < 1e-9);
});

test("should_not_flip_a_backward_line_label_when_keep_upright_is_false", () => {
  const angle = getSymbolAngle({
    lineAngle: Math.PI - 0.1,
    rotate: 0,
    alignment: "auto",
    keepUpright: false,
    alongLine: true,
  });
  assert.ok(Math.abs(angle - (Math.PI - 0.1)) < 1e-9);
});

function assertBoxClose(actual, expected) {
  actual.forEach((point, i) => point.forEach((value, j) => {
    assert.ok(Math.abs(value - expected[i][j]) < 1e-9);
  }));
}

test("should_expand_the_bounding_box_when_the_label_is_rotated", () => {
  assertBoxClose(rotatedBBox([10, 20], 20, 10, 0, 2), [
    [-2, 13], [22, 27],
  ]);
  assertBoxClose(rotatedBBox([10, 20], 20, 10, Math.PI / 2, 2), [
    [3, 8], [17, 32],
  ]);
});

test("should_detect_overlapping_boxes_when_checking_collisions", () => {
  const box = [[0, 0], [10, 10]];
  assert.equal(intersects(box, [[5, 5], [15, 15]]), true);
  assert.equal(intersects(box, [[11, 11], [20, 20]]), false);
});

test("should_use_the_anchor_segment_angle_when_the_label_width_is_zero", () => {
  const anchors = getLineAnchors(
    { type: "LineString", coordinates: straightLine },
    { ...baseOptions, labelWidth: 0 }
  );
  assert.ok(anchors.length > 0);
  assert.ok(anchors.every(anchor => Math.abs(anchor.angle) < 1e-9));
});

test("should_normalize_rotations_beyond_a_half_turn", () => {
  const positive = getSymbolAngle({ rotate: 200 });
  assert.ok(Math.abs(positive + 160 * Math.PI / 180) < 1e-9);
  const negative = getSymbolAngle({ rotate: -400 });
  assert.ok(Math.abs(negative + 40 * Math.PI / 180) < 1e-9);
});
