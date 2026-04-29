import { Range } from "../../core/elements";

export interface RangeSegment {
  end: number;
  start: number;
}

export interface LinearMapScale {
  offsetX: number;
  pxPerBase: number;
  seqLength: number;
  width: number;
}

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const normalizeBase = (bp: number, seqLength: number) => {
  if (seqLength <= 0) return 0;
  const mod = bp % seqLength;
  return mod < 0 ? mod + seqLength : mod;
};

export const createSegments = (start: number, end: number, seqLength: number): RangeSegment[] => {
  const length = Math.max(seqLength, 1);
  const normStart = normalizeBase(start, length);
  const normEnd = normalizeBase(end, length);

  if (normStart === normEnd) {
    return [{ end: length, start: 0 }];
  }

  if (normStart < normEnd) {
    return [{ end: normEnd, start: normStart }];
  }

  const first = { end: length, start: normStart };
  const second = { end: normEnd, start: 0 };
  return [first, second].filter(segment => segment.start !== segment.end);
};

export const rangeLength = (start: number, end: number, seqLength: number) => {
  const length = Math.max(seqLength, 1);
  const diff = normalizeBase(end - start, length);
  return diff === 0 ? length : diff;
};

export const rangeMidpoint = (start: number, end: number, seqLength: number) => {
  const length = Math.max(seqLength, 1);
  const segLength = rangeLength(start, end, length);
  return normalizeBase(start + segLength / 2, length);
};

export const bpToX = (scale: LinearMapScale, bp: number) => {
  return scale.offsetX + normalizeBase(bp, scale.seqLength) * scale.pxPerBase;
};

export const segmentWidth = (scale: LinearMapScale, segment: RangeSegment) => {
  return (segment.end - segment.start) * scale.pxPerBase;
};

export const mapRangeToSegments = (range: Range, seqLength: number) => {
  return createSegments(range.start, range.end, seqLength);
};

/**
 * Compute the LinearMap zoom factor using exponential interpolation.
 *
 * - z=0   → 1x  (no zoom)
 * - z=100 → max(8, seqLength/100)x  (≈100 bp visible for long sequences)
 *
 * @param zoom      Public zoom percent in [0, 100].
 * @param seqLength Total sequence length in base pairs.
 * @returns         Multiplicative zoom factor ≥ 1.
 */
export const computeLinearMapZoomFactor = (zoom: number, seqLength: number): number => {
  const zNorm = clamp(zoom, 0, 100) / 100;
  const maxFactorNeeded = Math.max(1, seqLength / 100);
  const maxFactor = Math.max(8, maxFactorNeeded);
  return Math.exp(Math.log(maxFactor) * zNorm);
};

/**
 * Compute the approximate number of visible base pairs given a zoom factor.
 *
 * @param zoomFactor  The multiplicative zoom factor (from computeLinearMapZoomFactor).
 * @param seqLength   Total sequence length in base pairs.
 * @param viewWidth   Pixel width of the visible viewport.
 * @param mapWidthBase Unzoomed pixel width of the map area.
 * @returns           Approximate number of visible base pairs.
 */
export const computeVisibleBp = (
  zoomFactor: number,
  seqLength: number,
  viewWidth: number,
  mapWidthBase: number,
): number => {
  if (zoomFactor <= 0 || mapWidthBase <= 0) return seqLength;
  const pxPerBase = (mapWidthBase * zoomFactor) / Math.max(seqLength, 1);
  if (pxPerBase <= 0) return seqLength;
  return Math.round(viewWidth / pxPerBase);
};
