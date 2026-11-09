import {
  getTextShift, wrapText, measureLine, drawLine, justifyOffset,
} from "./text-utils.js";
import { getSymbolAngle, rotatedBBox } from "./symbol-geometry.js";

export function initTextLabeler(zoom, layout, paint, font, ctx) {
  const fontSize = layout["text-size"](zoom);
  const lineHeight = layout["text-line-height"](zoom) * fontSize;
  const padding = layout["text-padding"](zoom);
  const offset = layout["text-offset"](zoom);
  const shift = getTextShift(layout["text-anchor"](zoom));
  const haloWidth = paint["text-halo-width"](zoom);
  const haloColor = paint["text-halo-color"](zoom);
  const textColor = paint["text-color"](zoom);
  const maxWidth = layout["text-max-width"](zoom) * fontSize;
  const letterSpacing = layout["text-letter-spacing"](zoom) * fontSize;
  const justify = layout["text-justify"](zoom);
  const rotation = {
    rotate: layout["text-rotate"](zoom),
    alignment: layout["text-rotation-alignment"](zoom),
    keepUpright: layout["text-keep-upright"](zoom),
  };

  const measureText = text => measureLine(text, ctx, letterSpacing);

  return { setState, measure, place, draw };

  function setState(context) {
    context.font = font;
    context.textBaseline = "bottom";
    context.textAlign = "left";

    if (haloWidth > 0) {
      context.lineWidth = haloWidth * 2;
      context.lineJoin = "round";
      context.strokeStyle = haloColor;
    }
    context.fillStyle = textColor;
  }

  function measure(feature) {
    const text = feature.properties.labelText;
    if (!text) return;

    const lines = wrapText(text, maxWidth, measureText);
    if (lines.every(line => line === "")) return;

    const widths = lines.map(measureText);
    const width = Math.max(...widths);
    const height = lines.length * lineHeight;
    return { lines, widths, width, height };
  }

  function place(label, anchor, alongLine) {
    const x = anchor.x + shift[0] * label.width + offset[0] * fontSize;
    const y = anchor.y + shift[1] * label.height + offset[1] * lineHeight;
    const center = [x + label.width / 2, y - label.height / 2];
    const angle = getSymbolAngle({
      ...rotation,
      lineAngle: anchor.angle,
      alongLine,
    });

    return {
      ...label,
      center,
      angle,
      bbox: rotatedBBox(center, label.width, label.height, angle, padding),
    };
  }

  function draw(context, placed) {
    const { lines, widths, width, height, center, angle } = placed;
    context.save();
    context.translate(center[0], center[1]);
    context.rotate(angle);

    lines.forEach((line, i) => {
      const x = -width / 2 + justifyOffset(widths[i], width, justify);
      const y = height / 2 - (lines.length - 1 - i) * lineHeight;
      if (haloWidth > 0) {
        drawLine(context, line, x, y, letterSpacing, "strokeText");
      }
      drawLine(context, line, x, y, letterSpacing, "fillText");
    });

    context.restore();
  }
}
