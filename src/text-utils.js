export function getTextShift(anchor) {
  // We use the Canvas 2D settings
  //  textBaseline = "bottom", textAlign = "left"
  // and shift the text box based on the specified "text-anchor"
  // Returned values will be scaled by the text box dimensions
  switch (anchor) {
    case "top-left":
      return [ 0.0, 1.0];
    case "top-right":
      return [-1.0, 1.0];
    case "top":
      return [-0.5, 1.0];
    case "bottom-left":
      return [ 0.0, 0.0];
    case "bottom-right":
      return [-1.0, 0.0];
    case "bottom":
      return [-0.5, 0.0];
    case "left":
      return [ 0.0, 0.5];
    case "right":
      return [-1.0, 0.5];
    case "center":
    default:
      return [-0.5, 0.5];
  }
}

export function measureLine(text, ctx, letterSpacing) {
  const glyphs = Array.from(text || "");
  if (glyphs.length === 0) return 0;
  if (!letterSpacing) return ctx.measureText(text).width;

  const glyphWidth = glyphs.reduce((sum, char) => {
    return sum + ctx.measureText(char).width;
  }, 0);
  return glyphWidth + (glyphs.length - 1) * letterSpacing;
}

export function drawLine(ctx, text, x, y, letterSpacing, method) {
  if (!letterSpacing) {
    ctx[method](text, x, y);
    return;
  }

  let cursor = x;
  Array.from(text).forEach(char => {
    ctx[method](char, cursor, y);
    cursor += ctx.measureText(char).width + letterSpacing;
  });
}

export function wrapText(text, maxWidth, measure) {
  if (!text) return [];

  const lines = [];
  String(text).split(/\r?\n/).forEach(paragraph => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      return;
    }
    if (maxWidth <= 0) {
      lines.push(words.join(" "));
      return;
    }

    let current = "";
    words.forEach(word => {
      const candidate = current ? current + " " + word : word;
      if (measure(candidate) <= maxWidth) {
        current = candidate;
        return;
      }
      if (current) {
        lines.push(current);
        current = "";
      }
      if (measure(word) <= maxWidth) {
        current = word;
        return;
      }
      // A single word wider than the limit must be split by character
      let chunk = "";
      Array.from(word).forEach(char => {
        const next = chunk + char;
        if (chunk && measure(next) > maxWidth) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk = next;
        }
      });
      current = chunk;
    });
    if (current) lines.push(current);
  });

  return lines;
}

export function justifyOffset(lineWidth, boxWidth, justify) {
  const gap = Math.max(0, boxWidth - lineWidth);
  if (justify === "left") return 0;
  if (justify === "right") return gap;
  return gap / 2;
}
