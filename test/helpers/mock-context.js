// Minimal Canvas 2D stand-in. Node has no Canvas implementation, so rendering
// behavior is asserted through the recorded draw calls.
export function createMockContext(glyphWidth = 8) {
  const calls = [];
  const record = (method) => (...args) => {
    calls.push({ method, args });
  };

  return {
    canvas: { width: 512, height: 512 },
    font: "",
    textBaseline: "",
    textAlign: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineJoin: "",
    lineCap: "",
    globalAlpha: 1,
    calls,
    measureText(text) {
      return { width: String(text).length * glyphWidth };
    },
    save: record("save"),
    restore: record("restore"),
    translate: record("translate"),
    rotate: record("rotate"),
    scale: record("scale"),
    setTransform: record("setTransform"),
    clip: record("clip"),
    fillRect: record("fillRect"),
    fill: record("fill"),
    stroke: record("stroke"),
    fillText: record("fillText"),
    strokeText: record("strokeText"),
    drawImage: record("drawImage"),
    setLineDash: record("setLineDash"),
    createPattern: () => ({ mockPattern: true }),
  };
}

export function callsOf(context, method) {
  return context.calls
    .filter(call => call.method === method)
    .map(call => call.args);
}
