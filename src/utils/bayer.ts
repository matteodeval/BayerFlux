import { BayerSize } from '../types';

/**
 * Generate normalized Bayer Matrix [0, 1) for size 2, 4, 8, 16
 */
export function getBayerMatrix(size: BayerSize): number[][] {
  if (size === 2) {
    return [
      [0 / 4, 2 / 4],
      [3 / 4, 1 / 4],
    ];
  }

  const prevSize = (size / 2) as BayerSize;
  const prev = getBayerMatrix(prevSize);
  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));

  for (let r = 0; r < prevSize; r++) {
    for (let c = 0; c < prevSize; c++) {
      const val = prev[r][c] * (prevSize * prevSize);
      matrix[r][c] = (4 * val) / (size * size);
      matrix[r][c + prevSize] = (4 * val + 2) / (size * size);
      matrix[r + prevSize][c] = (4 * val + 3) / (size * size);
      matrix[r + prevSize][c + prevSize] = (4 * val + 1) / (size * size);
    }
  }

  return matrix;
}

/**
 * Apply 4-shade Bayer Dithering
 * @param intensity Value from 0.0 (dark/close to attractor) to 1.0 (light/far from attractor)
 * @param gx Grid column index
 * @param gy Grid row index
 * @param bayerMatrix Precalculated Bayer matrix
 * @param strength Bayer influence factor (0 = hard quantization, 1 = full dithering)
 * @param numLevels Number of shades (4 shades = 0, 1, 2, 3)
 * @returns Color level index 0..3 (0 = Darkest Blue, 3 = Lightest Blue/Background)
 */
export function applyBayerDither(
  intensity: number,
  gx: number,
  gy: number,
  bayerMatrix: number[][],
  strength: number = 0.8,
  numLevels: number = 4
): number {
  const size = bayerMatrix.length;
  const bayerVal = bayerMatrix[gy % size][gx % size];
  
  // Center threshold around 0 (-0.5 to +0.5) scaled by strength
  const ditherOffset = (bayerVal - 0.5) * strength * (1 / (numLevels - 1));
  const modifiedIntensity = Math.min(Math.max(intensity + ditherOffset, 0), 1);

  // Map to discrete shade index 0, 1, 2, 3
  const level = Math.floor(modifiedIntensity * (numLevels - 0.001));
  return Math.min(Math.max(level, 0), numLevels - 1);
}
