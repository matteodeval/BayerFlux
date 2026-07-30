import { Point2D, ProjectionAngle, CurvePreset } from '../types';

/**
 * Evaluate a Cubic Bézier curve at parameter t in [0, 1]
 */
export function getCubicBezierPoint(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  t: number
): Point2D {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

/**
 * Generate discrete points along a curve based on preset
 */
export function sampleCurve(
  preset: CurvePreset,
  controlPoints: Point2D[],
  numSamples: number = 100
): Point2D[] {
  const points: Point2D[] = [];

  if (preset === 'bezier' && controlPoints.length >= 4) {
    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      points.push(getCubicBezierPoint(controlPoints[0], controlPoints[1], controlPoints[2], controlPoints[3], t));
    }
  } else if (preset === 'sine') {
    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const x = t;
      const y = 0.5 + 0.35 * Math.sin(t * Math.PI * 2.5);
      points.push({ x, y });
    }
  } else if (preset === 'circle') {
    for (let i = 0; i <= numSamples; i++) {
      const angle = (i / numSamples) * Math.PI * 2;
      const x = 0.5 + 0.35 * Math.cos(angle);
      const y = 0.5 + 0.35 * Math.sin(angle);
      points.push({ x, y });
    }
  } else if (preset === 'diagonal') {
    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      points.push({ x: t, y: 1 - t });
    }
  } else if (preset === 'dual_point') {
    // Two distinct point attractors
    return [
      { x: controlPoints[0]?.x ?? 0.25, y: controlPoints[0]?.y ?? 0.3 },
      { x: controlPoints[3]?.x ?? 0.75, y: controlPoints[3]?.y ?? 0.7 },
    ];
  }

  return points;
}

/**
 * Shortest distance from a point P to a line segment AB
 */
export function distanceToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;

  if (l2 === 0) {
    const px = p.x - a.x;
    const py = p.y - a.y;
    return Math.sqrt(px * px + py * py);
  }

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  const ex = p.x - projX;
  const ey = p.y - projY;

  return Math.sqrt(ex * ex + ey * ey);
}

/**
 * Calculate distance from a grid cell center (in grid units 0..gridW, 0..gridH)
 * to the nearest point on the attractor curve.
 */
export function getMinDistanceToCurve(
  gridX: number,
  gridY: number,
  gridWidth: number,
  gridHeight: number,
  sampledCurvePoints: Point2D[]
): number {
  // Normalize grid cell center to 0..1 coordinates
  const nx = (gridX + 0.5) / gridWidth;
  const ny = (gridY + 0.5) / gridHeight;
  const p: Point2D = { x: nx, y: ny };

  let minSqDist = Infinity;

  if (sampledCurvePoints.length === 1) {
    const dx = p.x - sampledCurvePoints[0].x;
    const dy = p.y - sampledCurvePoints[0].y;
    return Math.sqrt(dx * dx + dy * dy) * Math.max(gridWidth, gridHeight);
  }

  for (let i = 0; i < sampledCurvePoints.length - 1; i++) {
    const a = sampledCurvePoints[i];
    const b = sampledCurvePoints[i + 1];
    const distNorm = distanceToSegment(p, a, b);
    if (distNorm < minSqDist) {
      minSqDist = distNorm;
    }
  }

  // Convert normalized distance back to grid units
  return minSqDist * Math.max(gridWidth, gridHeight);
}

/**
 * Get the displacement vector (shiftX, shiftY) for 45° parallelogram projection.
 * diagonalLength is in number of square diagonals (e.g. 3.0)
 * cellSize is pixel size of one square.
 */
export function getProjectionOffset(
  diagonalLength: number,
  cellSize: number,
  angle: ProjectionAngle
): { shiftX: number; shiftY: number } {
  // Distance in 1 diagonal of square cell = cellSize * sqrt(2)
  // For 45 deg, dx = dy = diagonalLength * cellSize
  const d = diagonalLength * cellSize;

  switch (angle) {
    case 'left_up':
      return { shiftX: -d, shiftY: -d };
    case 'left_down':
      return { shiftX: -d, shiftY: d };
    case 'right_up':
      return { shiftX: d, shiftY: -d };
    case 'right_down':
      return { shiftX: d, shiftY: d };
  }
}

/**
 * Calculate 4 vertices of a 45-degree parallelogram projected from the bottom edge of cell (gx, gy)
 */
export function getParallelogramVertices(
  gx: number,
  gy: number,
  cellSize: number,
  shiftX: number,
  shiftY: number
): [Point2D, Point2D, Point2D, Point2D] {
  const x = gx * cellSize;
  const y = gy * cellSize;

  // Bottom edge of square
  const p1: Point2D = { x: x, y: y + cellSize }; // Bottom-Left
  const p2: Point2D = { x: x + cellSize, y: y + cellSize }; // Bottom-Right

  // Projected points
  const p3: Point2D = { x: p2.x + shiftX, y: p2.y + shiftY }; // Projected Bottom-Right
  const p4: Point2D = { x: p1.x + shiftX, y: p1.y + shiftY }; // Projected Bottom-Left

  return [p1, p2, p3, p4];
}
