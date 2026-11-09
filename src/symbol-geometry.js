const DEG_TO_RAD = Math.PI / 180;
const TWO_PI = 2 * Math.PI;

export function getLineStrings(geometry) {
  if (!geometry || !geometry.coordinates) return [];

  const { type, coordinates } = geometry;
  let lines;
  switch (type) {
    case "LineString":
      lines = [coordinates];
      break;
    case "MultiLineString":
    case "Polygon":
      lines = coordinates;
      break;
    case "MultiPolygon":
      lines = coordinates.flat();
      break;
    default:
      return [];
  }

  return lines.filter(line => Array.isArray(line) && line.length > 1);
}

export function getPointAnchors(geometry, scale = 1) {
  if (!geometry || !geometry.coordinates) return [];

  const { type, coordinates } = geometry;
  let points;
  if (type === "Point") {
    points = [coordinates];
  } else if (type === "MultiPoint") {
    points = coordinates;
  } else {
    return [];
  }

  return points
    .filter(point => Array.isArray(point) && point.length > 1)
    .map(([x, y]) => ({ x: x * scale, y: y * scale, angle: 0 }));
}

export function getLineAnchors(geometry, options = {}) {
  const {
    spacing = 250,
    maxAngle = 45,
    labelWidth = 0,
    placement = "line",
    scale = 1,
  } = options;
  const maxTurn = maxAngle * DEG_TO_RAD;
  const interval = Math.max(spacing, labelWidth);
  const halfWidth = labelWidth / 2;
  const anchors = [];

  getLineStrings(geometry).forEach(line => {
    const segments = getSegments(line, scale);
    const total = segments.reduce((sum, seg) => sum + seg.length, 0);
    if (total <= 0 || total < labelWidth) return;

    const distances = (placement === "line-center")
      ? [total / 2]
      : getDistances(total, interval);

    distances.forEach(distance => {
      const angle = getWindowAngle(segments, distance, halfWidth, maxTurn);
      if (angle === undefined) return;
      const [x, y] = pointAt(segments, distance);
      anchors.push({ x, y, angle });
    });
  });

  return anchors;
}

export function getSymbolAngle({
  lineAngle = 0,
  rotate = 0,
  alignment = "viewport",
  keepUpright = false,
  alongLine = false,
} = {}) {
  let angle = rotate * DEG_TO_RAD;
  if (alongLine && alignment !== "viewport") angle += lineAngle;
  if (alongLine && keepUpright) {
    const upright = normalizeAngle(angle);
    if (upright > Math.PI / 2 || upright < -Math.PI / 2) angle += Math.PI;
  }
  return normalizeAngle(angle);
}

export function rotatedBBox([cx, cy], width, height, angle, padding = 0) {
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const halfWidth = (cos * width + sin * height) / 2 + padding;
  const halfHeight = (sin * width + cos * height) / 2 + padding;
  return [
    [cx - halfWidth, cy - halfHeight],
    [cx + halfWidth, cy + halfHeight],
  ];
}

export function intersects(box1, box2) {
  // box[0] = [xmin, ymin]; box[1] = [xmax, ymax]
  if (box1[0][0] > box2[1][0]) return false;
  if (box2[0][0] > box1[1][0]) return false;
  if (box1[0][1] > box2[1][1]) return false;
  if (box2[0][1] > box1[1][1]) return false;

  return true;
}

function getSegments(line, scale) {
  const segments = [];
  for (let i = 1; i < line.length; i++) {
    const x1 = line[i - 1][0] * scale;
    const y1 = line[i - 1][1] * scale;
    const x2 = line[i][0] * scale;
    const y2 = line[i][1] * scale;
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length <= 0) continue;
    segments.push({
      x1, y1, x2, y2, length,
      angle: Math.atan2(y2 - y1, x2 - x1),
      start: 0,
    });
  }

  let offset = 0;
  segments.forEach(seg => {
    seg.start = offset;
    offset += seg.length;
  });
  return segments;
}

function getDistances(total, interval) {
  const step = interval > 0 ? interval : total;
  const distances = [];
  for (let distance = step / 2; distance < total; distance += step) {
    distances.push(distance);
  }
  return distances;
}

function getWindowAngle(segments, distance, halfWidth, maxTurn) {
  const start = Math.max(0, distance - halfWidth);
  const end = distance + halfWidth;
  let sumX = 0;
  let sumY = 0;
  let weight = 0;
  let previousAngle = null;

  for (const seg of segments) {
    const from = Math.max(start, seg.start);
    const to = Math.min(end, seg.start + seg.length);
    if (to <= from) continue;
    if (previousAngle !== null &&
        Math.abs(normalizeAngle(seg.angle - previousAngle)) > maxTurn) {
      return undefined;
    }
    const overlap = to - from;
    sumX += Math.cos(seg.angle) * overlap;
    sumY += Math.sin(seg.angle) * overlap;
    weight += overlap;
    previousAngle = seg.angle;
  }

  if (weight > 0) return Math.atan2(sumY, sumX);
  const segment = segmentAt(segments, distance);
  return segment ? segment.angle : undefined;
}

function segmentAt(segments, distance) {
  return segments.find(seg => distance <= seg.start + seg.length) ||
    segments[segments.length - 1];
}

function pointAt(segments, distance) {
  const segment = segmentAt(segments, distance);
  if (!segment) return [0, 0];
  const fraction = (distance - segment.start) / segment.length;
  return [
    segment.x1 + fraction * (segment.x2 - segment.x1),
    segment.y1 + fraction * (segment.y2 - segment.y1),
  ];
}

function normalizeAngle(angle) {
  let result = angle % TWO_PI;
  if (result > Math.PI) result -= TWO_PI;
  if (result < -Math.PI) result += TWO_PI;
  return result;
}
