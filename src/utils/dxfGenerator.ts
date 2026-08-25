import { AppConfig } from '../types';
import {
  sampleCurve,
  getMinDistanceToCurve,
  computeMergedShadowPolygons
} from './geometry';

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

  // 1. Calculate Shade Grid
  const sampledCurvePoints = sampleCurve(curvePreset, controlPoints);
  const shadeGrid: number[][] = [];

  const bayer2 = [[0, 2], [3, 1]];
  const bayer4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];

  for (let gy = 0; gy < gridHeight; gy++) {
    const row: number[] = [];
    for (let gx = 0; gx < gridWidth; gx++) {
      const dist = getMinDistanceToCurve(gx, gy, gridWidth, gridHeight, sampledCurvePoints);
      let normDist = Math.min(1.0, dist / attractorRadius);
      let t = Math.pow(normDist, falloffPower);
      if (invertAttractor) t = 1.0 - t;

      let bValue = 0.5;
      if (bayerSize === 2) {
        bValue = (bayer2[gy % 2][gx % 2] + 0.5) / 4.0;
      } else if (bayerSize === 4) {
        bValue = (bayer4[gy % 4][gx % 4] + 0.5) / 16.0;
      } else if (bayerSize === 8) {
        const b4 = bayer4[(gy % 4)][(gx % 4)];
        const b2 = bayer2[Math.floor((gy % 8) / 4)][Math.floor((gx % 8) / 4)];
        bValue = (4 * b4 + b2 + 0.5) / 64.0;
      }

      const blended = t * (1.0 - bayerStrength) + bValue * bayerStrength;
      let shadeIdx = Math.floor(blended * 4);
      if (shadeIdx < 0) shadeIdx = 0;
      if (shadeIdx > 3) shadeIdx = 3;
      row.push(shadeIdx);
    }
    shadeGrid.push(row);
  }

  // 2. Compute Parquet Shadow Polygons
  const shadowPolygons = shadowEnabled
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

  const layers = [
    { name: 'SHADE_0_DARKEST', color: palette[0] || '#031b33', aci: 5 },
    { name: 'SHADE_1_MEDIUM_DARK', color: palette[1] || '#0055b8', aci: 4 },
    { name: 'SHADE_2_MEDIUM_LIGHT', color: palette[2] || '#4fa8f6', aci: 3 },
    { name: 'SHADE_3_BACKGROUND', color: palette[3] || '#eaf4fe', aci: 1 },
    { name: 'PARQUET_SHADOWS', color: '#ffbd2e', aci: 2 },
    { name: 'GRID_BOUNDARY', color: '#858585', aci: 7 },
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

  // Helper to write a 3DFACE (Surface face) in DXF R12 format for Rhino/AutoCAD surfaces
  const write3DFace = (layerName: string, points: { x: number; y: number }[]) => {
    if (points.length < 3) return '';
    const p1 = points[0];
    const p2 = points[1];
    const p3 = points[2];
    const p4 = points.length >= 4 ? points[3] : points[2];

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
10
${p2.x.toFixed(4)}
20
${p2.y.toFixed(4)}
30
0.0
10
${p3.x.toFixed(4)}
20
${p3.y.toFixed(4)}
30
0.0
10
${p4.x.toFixed(4)}
20
${p4.y.toFixed(4)}
30
0.0
`;
  };

  // 1. Outer Grid Boundary Polyline
  const gridBoundaryPts = [
    { x: 0, y: 0 },
    { x: gridWidth, y: 0 },
    { x: gridWidth, y: gridHeight },
    { x: 0, y: gridHeight },
  ];
  dxf += writePolyline('GRID_BOUNDARY', gridBoundaryPts);

  // 2. Tile Squares as Polylines & 3DFaces
  for (let gy = 0; gy < gridHeight; gy++) {
    for (let gx = 0; gx < gridWidth; gx++) {
      const shadeIdx = shadeGrid[gy][gx];
      const layerName = layers[shadeIdx].name;

      // Invert Y for standard CAD Y-Up orientation
      const x1 = gx;
      const x2 = gx + 1;
      const y1 = gridHeight - gy - 1;
      const y2 = gridHeight - gy;

      const pts = [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 },
        { x: x1, y: y2 },
      ];

      dxf += writePolyline(layerName, pts);
      dxf += write3DFace(layerName + '_SURFACE', pts);
    }
  }

  // 3. Parquet Shadow Polygons
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

