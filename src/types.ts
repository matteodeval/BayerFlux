export type BayerSize = 2 | 4 | 8 | 16;

export interface Point2D {
  x: number; // 0 to 1 normalized coordinates across grid width
  y: number; // 0 to 1 normalized coordinates across grid height
}

export type CurvePreset = 'bezier' | 'sine' | 'circle' | 'diagonal' | 'dual_point';

export type ProjectionAngle = 'left_up' | 'left_down' | 'right_up' | 'right_down';

export interface AppConfig {
  // Grid
  gridWidth: number; // 1 to 100
  gridHeight: number; // 1 to 100
  cellSizePx: number; // calculated or adjusted zoom
  showGridLines: boolean;
  gridLineColor: string;

  // Attractor Curve
  curvePreset: CurvePreset;
  controlPoints: Point2D[]; // 4 control points for Bézier curve
  attractorRadius: number; // Falloff distance in grid units
  falloffPower: number; // Curve exponent (0.5 to 3.0)
  invertAttractor: boolean;

  // Bayer Dithering
  bayerSize: BayerSize;
  bayerStrength: number; // 0.0 to 1.0 influence
  palette: string[]; // Array of 4 hex color strings [Darkest, MediumDark, MediumLight, Lightest/Background]
  presetPaletteName: string;

  // 45° Parallelogram Shadow Projection
  shadowEnabled: boolean;
  diagonalLength: number; // Length in terms of square diagonals (e.g. 1 to 10 integer steps)
  projectionAngle: ProjectionAngle;
  mergeShadows: boolean; // Combine adjacent 45° shadows into unified parquet planks
  maxPlankLength: number; // Max length in grid units for parquet planks (e.g. 2, 3, 4, 5, 6)
  staggerParquet: boolean; // Offset joints across adjacent diagonal corridors (parquet pattern)
  clipShadowsToGrid: boolean; // Clip long projected shadows to the grid boundary
  shadowTarget: 'lightest_only' | 'all_weighted' | 'darkest_only';
  shadowColorOverride: string | null; // null uses the lightest background color (#eaf4fe)

  // Interactive UI
  selectedControlPoint: number | null;
}

export const DEFAULT_BLUE_PALETTES: { name: string; colors: [string, string, string, string] }[] = [
  {
    name: 'Classic Cyan Sky',
    colors: ['#031b33', '#0055b8', '#4fa8f6', '#eaf4fe'],
  },
  {
    name: 'Grasshopper Blueprint',
    colors: ['#0a192f', '#1e3a8a', '#3b82f6', '#eff6ff'],
  },
  {
    name: 'Deep Cobalt',
    colors: ['#0f172a', '#1d4ed8', '#60a5fa', '#f0f9ff'],
  },
  {
    name: 'Ultramarine Modern',
    colors: ['#111827', '#2563eb', '#93c5fd', '#f8fafc'],
  },
  {
    name: 'Electric Indigo',
    colors: ['#1e1b4b', '#4338ca', '#818cf8', '#eef2ff'],
  }
];

export const DEFAULT_CONFIG: AppConfig = {
  gridWidth: 40,
  gridHeight: 40,
  cellSizePx: 16,
  showGridLines: true,
  gridLineColor: 'rgba(0,0,0,0.08)',

  curvePreset: 'bezier',
  controlPoints: [
    { x: 0.1, y: 0.8 },
    { x: 0.3, y: 0.2 },
    { x: 0.7, y: 0.9 },
    { x: 0.9, y: 0.1 },
  ],
  attractorRadius: 18,
  falloffPower: 1.2,
  invertAttractor: false,

  bayerSize: 4,
  bayerStrength: 0.8,
  palette: DEFAULT_BLUE_PALETTES[0].colors,
  presetPaletteName: DEFAULT_BLUE_PALETTES[0].name,

  shadowEnabled: true,
  diagonalLength: 3, // integer step = 3 diagonals as requested
  projectionAngle: 'left_up',
  mergeShadows: true,
  maxPlankLength: 4, // 4 grid units max plank length
  staggerParquet: true, // staggered parquet joints
  clipShadowsToGrid: true, // clip at grid boundaries
  shadowTarget: 'lightest_only',
  shadowColorOverride: null,

  selectedControlPoint: null,
};
