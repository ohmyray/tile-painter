import { getSymbolAngle, rotatedBBox } from "./symbol-geometry.js";

export function initIconLabeler(zoom, layout, paint, sprite) {
  const padding = layout["icon-padding"](zoom);
  const size = layout["icon-size"](zoom);
  const rotation = {
    rotate: layout["icon-rotate"](zoom),
    alignment: layout["icon-rotation-alignment"](zoom),
    keepUpright: layout["icon-keep-upright"](zoom),
  };

  return { measure, place, draw };

  function measure(feature) {
    const spriteID = feature.properties.spriteID;
    if (!spriteID || !sprite || !sprite.meta) return;

    const meta = sprite.meta[spriteID];
    if (!meta) return;

    return {
      crop: [meta.x, meta.y, meta.width, meta.height],
      width: meta.width * size,
      height: meta.height * size,
    };
  }

  function place(icon, anchor, alongLine) {
    const angle = getSymbolAngle({
      ...rotation,
      lineAngle: anchor.angle,
      alongLine,
    });
    const center = [anchor.x, anchor.y];

    return {
      ...icon,
      center,
      angle,
      bbox: rotatedBBox(center, icon.width, icon.height, angle, padding),
    };
  }

  function draw(ctx, placed) {
    const { crop, width, height, center, angle } = placed;
    ctx.save();
    ctx.translate(center[0], center[1]);
    ctx.rotate(angle);
    ctx.drawImage(
      sprite.image, ...crop, -width / 2, -height / 2, width, height
    );
    ctx.restore();
  }
}
