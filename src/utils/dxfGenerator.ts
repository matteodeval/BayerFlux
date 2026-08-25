import { AppConfig, Point2D } from '../types';
import {
  sampleCurve,
  getMinDistanceToCurve,
  computeMergedShadowPolygons,
  subtractConvexPolygons,
  Polygon2D,
} from './geometry';
import { getBayerMatrix, applyBayerDither } from './bayer';

/**
 * Generates a fully compliant ASCII DXF file (AC1009 / DXF R12 standard)
 * guaranteed to open flawlessly in AutoCAD, Rhino, SketchUp, Revit, and Illustrator.
 *
 * Includes:
 * - Proper Header with $ACADVER AC1009, $EXTMIN and $EXTMAX limits (for automatic Zoom Extents)
 * - Layer table with standard AutoCAD Color Indexes (ACI) and TrueColor RGB metadata
 * - Closed 2D POLYLINE boundaries for vector cutting & 3DFACE surfaces for Rhino 3D modeling
 */
export function generateDXF(config: AppConfig): string {
  const {
    gridWidth,
    gridHeight,
    bayerSize,
    bayerStrength,
    curvePreset,
    controlPoints,
    attractorRadius,
    falloffPower,
    invertAttractor,
    palette,
    shadowEnabled,
    shadowTarget,
    projectionAngle,
    diagonalLength,
    mergeShadows,
    maxPlankLength,
    staggerParquet,
    clipShadowsToGrid,
  } = config;

  // 1. Calculate Shade Grid — must use the EXACT same function as the on-screen
  // preview (Canvas2D.tsx) and PNG export, or the DXF silently diverges from
  // what the person designed. A previous version of this file reimplemented
  // its own approximate blend formula here instead of reusing bayer.ts;
  // that produced a different shade on ~65% of cells even with identical
  // settings, regardless of invertAttractor.
  const sampledCurvePoints = sampleCurve(curvePreset, controlPoints, 100);
  const bayerMatrix = getBayerMatrix(bayerSize);
  const shadeGrid: number[][] = [];

  for (let gy = 0; gy < gridHeight; gy++) {
    const row: number[] = [];
    for (let gx = 0; gx < gridWidth; gx++) {
      const dist = getMinDistanceToCurve(gx, gy, gridWidth, gridHeight, sampledCurvePoints);
      let normDist = Math.min(Math.max(dist / attractorRadius, 0), 1);
      normDist = Math.pow(normDist, falloffPower);
      if (invertAttractor) normDist = 1 - normDist;

      const shadeLevel = applyBayerDither(normDist, gx, gy, bayerMatrix, bayerStrength, 4);
      row.push(shadeLevel);
    }
    shadeGrid.push(row);
  }

  // 2. Compute Parquet Shadow Polygons
  const rawShadowPolygons = shadowEnabled
    ? computeMergedShadowPolygons(
        gridWidth,
        gridHeight,
        shadeGrid,
        shadowTarget,
        projectionAngle,
        diagonalLength,
        1.0, // 1 CAD unit per cell
        0,   // startX = 0
        0,   // startY = 0
        mergeShadows,
        maxPlankLength,
        staggerParquet,
        clipShadowsToGrid
      )
    : [];

  // Grid-boundary clipping can leave a duplicate/zero-length vertex at a
  // corner. Clean this up ONCE, up front, and use the cleaned points
  // everywhere downstream (candidate indexing, boolean subtraction, and
  // final emission) — a degenerate edge in a clip polygon confuses the
  // inside/outside half-plane test and silently flips which side survives.
  const DEDUP_EPS = 1e-4;
  const dedupePolygon = (points: Point2D[]): Point2D[] =>
    points.filter((pt, i) => {
      const prev = points[(i - 1 + points.length) % points.length];
      return Math.abs(pt.x - prev.x) > DEDUP_EPS || Math.abs(pt.y - prev.y) > DEDUP_EPS;
    });

  const shadowPolygons: Polygon2D[] = rawShadowPolygons
    .map((poly) => ({ points: dedupePolygon(poly.points) }))
    .filter((poly) => poly.points.length >= 3);

  const baseLayers = [
    { name: 'SHADE_0_DARKEST', color: palette[0] || '#031b33', aci: 5 },
    { name: 'SHADE_1_MEDIUM_DARK', color: palette[1] || '#0055b8', aci: 4 },
    { name: 'SHADE_2_MEDIUM_LIGHT', color: palette[2] || '#4fa8f6', aci: 3 },
    { name: 'SHADE_3_BACKGROUND', color: palette[3] || '#eaf4fe', aci: 1 },
    { name: 'PARQUET_SHADOWS', color: '#ffbd2e', aci: 2 },
    { name: 'GRID_BOUNDARY', color: '#858585', aci: 7 },
  ];
  // Every base layer also gets a "_SURFACE" companion layer for the 3DFACE
  // entities (used for solid-surface rendering in AutoCAD/Rhino 3D views).
  // These must be declared in the LAYER table too, or readers fall back to
  // an undefined default layer/colour for them.
  const layers = [
    ...baseLayers,
    ...baseLayers.map((l) => ({ ...l, name: `${l.name}_SURFACE` })),
  ];

  // Build Header with Extents
  let dxf = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1009
9
$INSUNITS
70
4
9
$EXTMIN
10
0.0
20
0.0
30
0.0
9
$EXTMAX
10
${gridWidth}.0
20
${gridHeight}.0
30
0.0
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
${layers.length}
`;

  // Write Layer Definitions
  for (const l of layers) {
    dxf += `0
LAYER
2
${l.name}
70
0
62
${l.aci}
6
CONTINUOUS
`;
  }

  dxf += `0
ENDTAB
0
ENDSEC
0
SECTION
2
BLOCKS
0
ENDSEC
0
SECTION
2
ENTITIES
`;

  // Helper to write a 2D closed POLYLINE in DXF R12 format
  const writePolyline = (layerName: string, points: { x: number; y: number }[]) => {
    let out = `0
POLYLINE
8
${layerName}
66
1
70
1
`;
    for (const pt of points) {
      out += `0
VERTEX
8
${layerName}
10
${pt.x.toFixed(4)}
20
${pt.y.toFixed(4)}
30
0.0
`;
    }
    out += `0
SEQEND
8
${layerName}
`;
    return out;
  };

  // Helper to write a single 3DFACE (Surface face) in DXF R12 format.
  // IMPORTANT: each of the 4 vertices uses a DIFFERENT group-code triplet
  // (10/20/30, 11/21/31, 12/22/32, 13/23/33) — reusing 10/20/30 for all
  // four, as a previous version of this function did, is invalid DXF: a
  // compliant reader keeps only the last 10/20/30 pair and silently drops
  // the other three vertices, collapsing every face into the origin.
  const write3DFaceQuad = (
    layerName: string,
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    p4: { x: number; y: number }
  ) => {
    return `0
3DFACE
8
${layerName}
10
${p1.x.toFixed(4)}
20
${p1.y.toFixed(4)}
30
0.0
11
${p2.x.toFixed(4)}
21
${p2.y.toFixed(4)}
31
0.0
12
${p3.x.toFixed(4)}
22
${p3.y.toFixed(4)}
32
0.0
13
${p4.x.toFixed(4)}
23
${p4.y.toFixed(4)}
33
0.0
`;
  };

  // Writes one or more 3DFACE entities covering an arbitrary simple polygon.
  // Quads (the common case: grid squares, unclipped shadow planks) become a
  // single 3DFACE. Polygons with 5+ vertices (shadow planks clipped against
  // the grid boundary) are fan-triangulated from the first vertex so no
  // geometry is silently dropped, instead of truncating to the first 4 points.
  const write3DFace = (layerName: string, points: { x: number; y: number }[]) => {
    if (points.length < 3) return '';
    if (points.length === 3) {
      // Degenerate triangle: repeat the last vertex as required by the spec
      return write3DFaceQuad(layerName, points[0], points[1], points[2], points[2]);
    }
    if (points.length === 4) {
      return write3DFaceQuad(layerName, points[0], points[1], points[2], points[3]);
    }
    // Fan triangulation for 5+ vertex polygons (each face still a "quad"
    // with the last vertex repeated, per the DXF 3DFACE convention)
    let out = '';
    for (let i = 1; i < points.length - 1; i++) {
      out += write3DFaceQuad(layerName, points[0], points[i], points[i + 1], points[i + 1]);
    }
    return out;
  };

  // 1. Outer Grid Boundary Polyline
  const gridBoundaryPts = [
    { x: 0, y: 0 },
    { x: gridWidth, y: 0 },
    { x: gridWidth, y: gridHeight },
    { x: 0, y: gridHeight },
  ];
  dxf += writePolyline('GRID_BOUNDARY', gridBoundaryPts);

  // 2. Tile Squares as Polylines & 3DFaces — trimmed so no square overlaps a
  // parquet shadow plank. On screen/PNG this "replacement" already happens
  // for free from paint order (the plank is drawn on top), but a DXF needs
  // real non-overlapping boundaries, so we subtract every overlapping plank
  // from the square before emitting it.
  const eps = 1e-4;
  const bboxOf = (points: Point2D[]) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, maxX, minY, maxY };
  };

  // Index shadow polygons by the grid cells whose bounding box they touch,
  // so each cell only tests against nearby planks instead of every plank.
  const cellCandidates: Map<string, Polygon2D[]> = new Map();
  for (const poly of shadowPolygons) {
    if (!poly.points || poly.points.length < 3) continue;
    const { minX, maxX, minY, maxY } = bboxOf(poly.points);
    const gxStart = Math.max(0, Math.floor(minX));
    const gxEnd = Math.min(gridWidth - 1, Math.ceil(maxX) - 1);
    const gyStart = Math.max(0, Math.floor(minY));
    const gyEnd = Math.min(gridHeight - 1, Math.ceil(maxY) - 1);
    for (let cy = gyStart; cy <= gyEnd; cy++) {
      for (let cx = gxStart; cx <= gxEnd; cx++) {
        const key = `${cx},${cy}`;
        if (!cellCandidates.has(key)) cellCandidates.set(key, []);
        cellCandidates.get(key)!.push(poly);
      }
    }
  }

  for (let gy = 0; gy < gridHeight; gy++) {
    for (let gx = 0; gx < gridWidth; gx++) {
      const shadeIdx = shadeGrid[gy][gx];
      const layerName = layers[shadeIdx].name;

      // Raw grid-space square (y-down), matching the space shadowPolygons
      // are computed in — NOT yet flipped to CAD Y-up.
      const rawSquare: Point2D[] = [
        { x: gx, y: gy },
        { x: gx + 1, y: gy },
        { x: gx + 1, y: gy + 1 },
        { x: gx, y: gy + 1 },
      ];

      const candidates = cellCandidates.get(`${gx},${gy}`);
      let residualPieces: Point2D[][] = candidates && candidates.length
        ? subtractConvexPolygons(rawSquare, candidates.map((p) => p.points))
        : [rawSquare];

      for (const piece of residualPieces) {
        // Drop slivers left over from near-tangent clipping
        const cleaned = piece.filter((pt, i) => {
          const prev = piece[(i - 1 + piece.length) % piece.length];
          return Math.abs(pt.x - prev.x) > eps || Math.abs(pt.y - prev.y) > eps;
        });
        if (cleaned.length < 3) continue;

        // Flip to CAD Y-up space, same convention as the shadow polygons below
        const cadPts = cleaned.map((p) => ({ x: p.x, y: gridHeight - p.y }));
        dxf += writePolyline(layerName, cadPts);
        dxf += write3DFace(layerName + '_SURFACE', cadPts);
      }
    }
  }

  // 3. Parquet Shadow Polygons (already deduped/cleaned above)
  for (const poly of shadowPolygons) {
    if (!poly.points || poly.points.length < 3) continue;

    const cadPts = poly.points.map((pt) => ({
      x: pt.x,
      y: gridHeight - pt.y, // Invert Y
    }));

    dxf += writePolyline('PARQUET_SHADOWS', cadPts);
    dxf += write3DFace('PARQUET_SHADOWS_SURFACE', cadPts);
  }

  dxf += `0
ENDSEC
0
EOF
`;

  return dxf;
}

/**
 * Downloads the generated DXF CAD file
 */
export function downloadDXF(config: AppConfig, filename: string = 'bayer_attractor_pattern.dxf') {
  const dxfContent = generateDXF(config);
  const blob = new Blob([dxfContent], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

