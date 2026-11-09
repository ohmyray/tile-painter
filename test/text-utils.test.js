import { test } from "vitest";
import assert from "node:assert/strict";

import {
  getTextShift,
  wrapText,
  measureLine,
  drawLine,
  justifyOffset,
} from "../src/text-utils.js";
import { createMockContext, callsOf } from "./helpers/mock-context.js";

const measure = text => text.length * 8;

test("should_return_no_lines_when_text_is_empty", () => {
  assert.deepEqual(wrapText("", 48, measure), []);
  assert.deepEqual(wrapText(undefined, 48, measure), []);
});

test("should_keep_a_short_label_on_one_line_when_it_fits", () => {
  assert.deepEqual(wrapText("Main Street", 1000, measure), ["Main Street"]);
});

test("should_wrap_at_word_boundaries_when_text_exceeds_max_width", () => {
  assert.deepEqual(
    wrapText("Main Street West", 48, measure),
    ["Main", "Street", "West"]
  );
});

test("should_collapse_repeated_whitespace_when_wrapping", () => {
  assert.deepEqual(wrapText("  Hello   world  ", 1000, measure), ["Hello world"]);
});

test("should_preserve_explicit_line_breaks_when_wrapping", () => {
  assert.deepEqual(
    wrapText("First line here\nSecond", 48, measure),
    ["First", "line", "here", "Second"]
  );
});

test("should_split_unbreakable_words_by_character_when_too_wide", () => {
  assert.deepEqual(
    wrapText("ABCDEFGHIJ", 24, measure),
    ["ABC", "DEF", "GHI", "J"]
  );
});

test("should_skip_width_wrapping_when_max_width_is_not_positive", () => {
  assert.deepEqual(
    wrapText("A very long label", 0, measure),
    ["A very long label"]
  );
  assert.deepEqual(wrapText("A\nB", -1, measure), ["A", "B"]);
});

test("should_add_letter_spacing_once_per_gap_when_measuring", () => {
  const ctx = createMockContext();
  assert.equal(measureLine("ABC", ctx, 4), 32);
  assert.equal(measureLine("ABC", ctx, 0), 24);
  assert.equal(measureLine("", ctx, 4), 0);
});

test("should_draw_each_glyph_with_letter_spacing_when_nonzero", () => {
  const ctx = createMockContext();
  drawLine(ctx, "ABC", 10, 20, 4, "fillText");
  assert.deepEqual(callsOf(ctx, "fillText"), [
    ["A", 10, 20], ["B", 22, 20], ["C", 34, 20],
  ]);
});

test("should_draw_one_string_when_letter_spacing_is_zero", () => {
  const ctx = createMockContext();
  drawLine(ctx, "ABC", 10, 20, 0, "fillText");
  assert.deepEqual(callsOf(ctx, "fillText"), [["ABC", 10, 20]]);
});

test("should_support_stroke_drawing_when_halo_is_enabled", () => {
  const ctx = createMockContext();
  drawLine(ctx, "AB", 0, 0, 2, "strokeText");
  assert.deepEqual(callsOf(ctx, "strokeText"), [["A", 0, 0], ["B", 10, 0]]);
});

test("should_align_lines_by_justify_when_lines_have_different_widths", () => {
  assert.equal(justifyOffset(40, 100, "left"), 0);
  assert.equal(justifyOffset(40, 100, "center"), 30);
  assert.equal(justifyOffset(40, 100, "right"), 60);
  assert.equal(justifyOffset(40, 100, "auto"), 30);
});

test("should_shift_text_box_by_anchor_when_using_canvas_baseline", () => {
  assert.deepEqual(getTextShift("center"), [-0.5, 0.5]);
  assert.deepEqual(getTextShift("top-left"), [0, 1]);
  assert.deepEqual(getTextShift("bottom-right"), [-1, 0]);
});

test("should_shift_text_box_for_every_anchor_value", () => {
  const shifts = {
    "top-left": [0, 1],
    "top-right": [-1, 1],
    "top": [-0.5, 1],
    "bottom-left": [0, 0],
    "bottom-right": [-1, 0],
    "bottom": [-0.5, 0],
    "left": [0, 0.5],
    "right": [-1, 0.5],
    "center": [-0.5, 0.5],
    "unknown": [-0.5, 0.5],
  };
  Object.entries(shifts).forEach(([anchor, shift]) => {
    assert.deepEqual(getTextShift(anchor), shift);
  });
});

test("should_keep_blank_lines_when_the_label_has_consecutive_breaks", () => {
  assert.deepEqual(wrapText("A\n\nB", 100, measure), ["A", "", "B"]);
});
