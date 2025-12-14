import { Range } from "../elements";

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
