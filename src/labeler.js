import { initTextLabeler } from "./text.js";
import { initIconLabeler } from "./icons.js";
import {
  getLineAnchors, getPointAnchors, intersects,
} from "./symbol-geometry.js";

export function initLabeler(layout, paint, sprite, tileSize) {
  return function(ctx, zoom, data, boundingBoxes, scale = 1) {
    if (!data || !data.compressed) return;

    const boxes = boundingBoxes || [];
    const placement = layout["symbol-placement"](zoom);
    const alongLine = placement === "line" || placement === "line-center";
    const font = (data.properties && data.properties.font) ||
      "16px sans-serif";

    const textLabeler = initTextLabeler(zoom, layout, paint, font, ctx);
    const iconLabeler = initIconLabeler(zoom, layout, paint, sprite);

    const tileScale = tileSize * scale;
    const tileBox = [[0, 0], [tileScale, tileScale]];

    if (scale != 1) {
      ctx.scale(1 / scale, 1 / scale);
    }
    textLabeler.setState(ctx);

    data.compressed.forEach(drawFeatureLabels);

    if (scale != 1) ctx.scale(scale, scale);

    function drawFeatureLabels(feature) {
      const text = textLabeler.measure(feature);
      const icon = iconLabeler.measure(feature);
      if (!text && !icon) return;

      const labelWidth = Math.max(
        text ? text.width : 0,
        icon ? icon.width : 0
      );
      const anchors = alongLine
        ? getLineAnchors(feature.geometry, {
          spacing: layout["symbol-spacing"](zoom),
          maxAngle: layout["text-max-angle"](zoom),
          labelWidth,
          placement,
          scale,
        })
        : getPointAnchors(feature.geometry, scale);

      anchors.forEach(anchor => {
        const placedText = text
          ? textLabeler.place(text, anchor, alongLine)
          : undefined;
        const placedIcon = icon
          ? iconLabeler.place(icon, anchor, alongLine)
          : undefined;

        if (collides(placedText) || collides(placedIcon)) return;

        if (placedIcon) boxes.push(placedIcon.bbox);
        if (placedText) boxes.push(placedText.bbox);

        if (placedIcon && intersects(tileBox, placedIcon.bbox)) {
          iconLabeler.draw(ctx, placedIcon);
        }
        if (placedText && intersects(tileBox, placedText.bbox)) {
          textLabeler.draw(ctx, placedText);
        }
      });
    }

    function collides(placed) {
      return placed && boxes.some(box => intersects(box, placed.bbox));
    }
  };
}
