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

export interface Polygon2D {
  points: Point2D[];
}

/**
 * Clips a convex/simple polygon against an axis-aligned bounding box [minX, minY, maxX, maxY]
 * using the Sutherland-Hodgman algorithm.
 */
export function clipPolygonToBox(
  points: Point2D[],
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): Point2D[] {
  let output = points;

  const clipEdge = (
    pts: Point2D[],
    inside: (p: Point2D) => boolean,
    intersect: (p1: Point2D, p2: Point2D) => Point2D
  ): Point2D[] => {
    if (pts.length === 0) return [];
    const result: Point2D[] = [];
    let s = pts[pts.length - 1];

    for (const e of pts) {
      if (inside(e)) {
        if (inside(s)) {
          result.push(e);
        } else {
          result.push(intersect(s, e));
          result.push(e);
        }
      } else if (inside(s)) {
        result.push(intersect(s, e));
      }
      s = e;
    }
    return result;
  };

  const eps = 1e-6;

  // Left
  output = clipEdge(
    output,
    (p) => p.x >= minX - eps,
    (p1, p2) => ({
      x: minX,
      y: p1.y + ((p2.y - p1.y) * (minX - p1.x)) / (p2.x - p1.x || eps),
    })
  );
  // Right
  output = clipEdge(
    output,
    (p) => p.x <= maxX + eps,
    (p1, p2) => ({
      x: maxX,
      y: p1.y + ((p2.y - p1.y) * (maxX - p1.x)) / (p2.x - p1.x || eps),
    })
  );
  // Top
  output = clipEdge(
    output,
    (p) => p.y >= minY - eps,
    (p1, p2) => ({
      x: p1.x + ((p2.x - p1.x) * (minY - p1.y)) / (p2.y - p1.y || eps),
      y: minY,
    })
  );
  // Bottom
  output = clipEdge(
    output,
    (p) => p.y <= maxY + eps,
    (p1, p2) => ({
      x: p1.x + ((p2.x - p1.x) * (maxY - p1.y)) / (p2.y - p1.y || eps),
      y: maxY,
    })
  );

  return output;
}

/**
 * Merges adjacent/overlapping 45° shadow projections along diagonal corridors
 * into solid "parquet" long parallelograms, with optional staggered joint breaks and grid boundary clipping.
 */
export function computeMergedShadowPolygons(
  gridWidth: number,
  gridHeight: number,
  shadeGrid: number[][],
  shadowTarget: 'lightest_only' | 'all_weighted' | 'darkest_only',
  projectionAngle: ProjectionAngle,
  diagonalLength: number,
  cellSize: number,
  startX: number,
  startY: number,
  merge: boolean = true,
  maxPlankLength: number = 4,
  staggerParquet: boolean = true,
  clipShadowsToGrid: boolean = true
): Polygon2D[] {
  const minX = startX;
  const minY = startY;
  const maxX = startX + gridWidth * cellSize;
  const maxY = startY + gridHeight * cellSize;

  // Discrete integer steps for grid diagonals
  const intDiagLen = Math.max(1, Math.round(diagonalLength));

  if (!merge) {
    const polygons: Polygon2D[] = [];
    const { shiftX, shiftY } = getProjectionOffset(intDiagLen, cellSize, projectionAngle);

    for (let gy = 0; gy < gridHeight; gy++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        const shadeIdx = shadeGrid[gy][gx];
        let qualifies = false;
        if (shadowTarget === 'lightest_only' && shadeIdx === 3) qualifies = true;
        else if (shadowTarget === 'darkest_only' && shadeIdx === 0) qualifies = true;
        else if (shadowTarget === 'all_weighted') qualifies = true;

        if (qualifies) {
          const px = startX + gx * cellSize;
          const py = startY + gy * cellSize;
          let p1: Point2D, p2: Point2D;

          if (projectionAngle === 'left_up' || projectionAngle === 'right_up') {
            p1 = { x: px, y: py + cellSize };
            p2 = { x: px + cellSize, y: py + cellSize };
          } else {
            p1 = { x: px, y: py };
            p2 = { x: px + cellSize, y: py };
          }
          const p3: Point2D = { x: p2.x + shiftX, y: p2.y + shiftY };
          const p4: Point2D = { x: p1.x + shiftX, y: p1.y + shiftY };

          let rawPts: Point2D[] = [p1, p2, p3, p4];
          if (clipShadowsToGrid) {
            rawPts = clipPolygonToBox(rawPts, minX, minY, maxX, maxY);
          }
          if (rawPts.length >= 3) {
            polygons.push({ points: rawPts });
          }
        }
      }
    }
    return polygons;
  }

  // Merged Parquet Mode:
  const corridors: Map<number, { uMin: number; uMax: number }[]> = new Map();
  const isVxPositive = projectionAngle === 'right_up' || projectionAngle === 'right_down';

  for (let gy = 0; gy < gridHeight; gy++) {
    for (let gx = 0; gx < gridWidth; gx++) {
      const shadeIdx = shadeGrid[gy][gx];
      let qualifies = false;
      if (shadowTarget === 'lightest_only' && shadeIdx === 3) qualifies = true;
      else if (shadowTarget === 'darkest_only' && shadeIdx === 0) qualifies = true;
      else if (shadowTarget === 'all_weighted') qualifies = true;

      if (!qualifies) continue;

      let k: number;
      if (projectionAngle === 'left_up' || projectionAngle === 'right_down') {
        k = gx - gy;
      } else {
        k = gx + gy;
      }
      const u = gx;

      let uMin: number, uMax: number;
      if (!isVxPositive) {
        uMin = u - intDiagLen;
        uMax = u;
      } else {
        uMin = u;
        uMax = u + intDiagLen;
      }

      if (!corridors.has(k)) {
        corridors.set(k, []);
      }
      corridors.get(k)!.push({ uMin, uMax });
    }
  }

  const resultPolygons: Polygon2D[] = [];
  const s = cellSize;
  const plankLen = Math.max(1, Math.round(maxPlankLength));
  const staggerStep = Math.max(1, Math.floor(plankLen / 2));

  corridors.forEach((intervals, k) => {
    if (intervals.length === 0) return;

    intervals.sort((a, b) => a.uMin - b.uMin);

    // Step 1: Merge overlapping/contiguous shadow intervals
    const merged: { uMin: number; uMax: number }[] = [];
    let current = { ...intervals[0] };

    for (let i = 1; i < intervals.length; i++) {
      const next = intervals[i];
      if (next.uMin <= current.uMax + 0.001) {
        current.uMax = Math.max(current.uMax, next.uMax);
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    merged.push(current);

    // Step 2: Split merged intervals into parquet planks with staggered joint breaks
    const planks: { uMin: number; uMax: number }[] = [];
    const offset = staggerParquet
      ? ((k * staggerStep) % plankLen + plankLen) % plankLen
      : 0;

    for (const seg of merged) {
      if (seg.uMax - seg.uMin <= plankLen) {
        planks.push(seg);
        continue;
      }

      // Find cut points inside (seg.uMin, seg.uMax)
      // Cut formula: u_cut = offset + n * plankLen
      const firstN = Math.ceil((seg.uMin - offset + 1e-6) / plankLen);
      const cuts: number[] = [seg.uMin];

      let n = firstN;
      while (true) {
        const uCut = offset + n * plankLen;
        if (uCut >= seg.uMax - 1e-6) break;
        if (uCut > seg.uMin + 1e-6) {
          cuts.push(uCut);
        }
        n++;
      }
      cuts.push(seg.uMax);

      for (let c = 0; c < cuts.length - 1; c++) {
        if (cuts[c + 1] - cuts[c] > 1e-6) {
          planks.push({ uMin: cuts[c], uMax: cuts[c + 1] });
        }
      }
    }

    // Step 3: Convert plank intervals to 2D polygon vertices & clip to grid box
    for (const seg of planks) {
      let p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D;

      if (projectionAngle === 'left_up') {
        const gxBase = seg.uMax;
        const gyBase = seg.uMax - k;
        const px = startX + gxBase * s;
        const py = startY + (gyBase + 1) * s;

        p1 = { x: px, y: py };
        p2 = { x: px + s, y: py };

        const shift = (seg.uMin - seg.uMax) * s;
        p3 = { x: p2.x + shift, y: p2.y + shift };
        p4 = { x: p1.x + shift, y: p1.y + shift };
      } else if (projectionAngle === 'right_down') {
        const gxBase = seg.uMin;
        const gyBase = seg.uMin - k;
        const px = startX + gxBase * s;
        const py = startY + gyBase * s;

        p1 = { x: px, y: py };
        p2 = { x: px + s, y: py };

        const shift = (seg.uMax - seg.uMin) * s;
        p3 = { x: p2.x + shift, y: p2.y + shift };
        p4 = { x: p1.x + shift, y: p1.y + shift };
      } else if (projectionAngle === 'left_down') {
        const gxBase = seg.uMax;
        const gyBase = k - seg.uMax;
        const px = startX + gxBase * s;
        const py = startY + gyBase * s;

        p1 = { x: px, y: py };
        p2 = { x: px + s, y: py };

        const dist = (seg.uMax - seg.uMin) * s;
        p3 = { x: p2.x - dist, y: p2.y + dist };
        p4 = { x: p1.x - dist, y: p1.y + dist };
      } else { // right_up
        const gxBase = seg.uMin;
        const gyBase = k - seg.uMin;
        const px = startX + gxBase * s;
        const py = startY + (gyBase + 1) * s;

        p1 = { x: px, y: py };
        p2 = { x: px + s, y: py };

        const dist = (seg.uMax - seg.uMin) * s;
        p3 = { x: p2.x + dist, y: p2.y - dist };
        p4 = { x: p1.x + dist, y: p1.y - dist };
      }

      let pts: Point2D[] = [p1, p2, p3, p4];
      if (clipShadowsToGrid) {
        pts = clipPolygonToBox(pts, minX, minY, maxX, maxY);
      }

      if (pts.length >= 3) {
        resultPolygons.push({ points: pts });
      }
    }
  });

  return resultPolygons;
}
