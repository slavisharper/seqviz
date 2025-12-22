import {
  Annotation,
  CutSite,
  Highlight,
  NameRange,
  Primer,
  SeqType,
  SingleStrandAnnotation,
  Size,
  TranslationProp,
} from "./core/elements";
import { CircularProps } from "./viewers/Circular/Circular";
import { LinearProps } from "./viewers/Linear/Linear";
import { LinearMapProps } from "./viewers/LinearMap/LinearMap";
import { Selection } from "./state/selectionContext";

export const memoizeOne = <Args extends unknown[], Result>(
  fn: (...args: Args) => Result
): ((...args: Args) => Result) => {
  let lastArgs: Args | null = null;
  let lastResult: Result;
  let called = false;

  return (...args: Args): Result => {
    if (called && lastArgs && args.length === lastArgs.length) {
      let matched = true;

      for (let i = 0; i < args.length; i += 1) {
        if (args[i] !== lastArgs[i]) {
          matched = false;
          break;
        }
      }

      if (matched) {
        return lastResult;
      }
    }

    lastResult = fn(...args);
    lastArgs = args;
    called = true;
    return lastResult;
  };
};

export const createLinearPropsBuilder = () =>
  memoizeOne(
    (
      annotations: Annotation[],
      bpColors: { [key: number | string]: string } | undefined,
      compSeq: string,
      cutSites: CutSite[],
      highlights: Highlight[],
      singleStrandAnnotations: SingleStrandAnnotation[],
      primers: Primer[],
      search: NameRange[],
      seq: string,
      seqType: SeqType,
      showComplement: boolean,
      showIndex: boolean,
      sizeWidth: number,
      sizeHeight: number,
      translations: NameRange[],
      zoomLinear: number
    ): Omit<LinearProps, "handleMouseEvent" | "inputRef" | "onUnmount"> => {
      const seqLength = seq.length;
      const size: Size = { height: sizeHeight, width: sizeWidth };

      const seqFontSize = Math.min(Math.round(zoomLinear * 0.1 + 9.5), 18);

      let bpsPerBlock = Math.round(((size.width || 0) / seqFontSize) * 1.4) || 1;
      if (seqType === "aa") {
        bpsPerBlock = Math.round(bpsPerBlock / 3);
      }

      if (zoomLinear <= 5) {
        bpsPerBlock *= 3;
      } else if (zoomLinear <= 10) {
        bpsPerBlock *= 2;
      } else if (zoomLinear > 70) {
        bpsPerBlock = Math.round(bpsPerBlock * (70 / zoomLinear));
      }
      bpsPerBlock = Math.max(1, bpsPerBlock);

      if (size.width && bpsPerBlock < seqLength) {
        size.width -= 28;
      }

      const widthForCalc = typeof size.width === "number" ? size.width : NaN;
      const charWidth = widthForCalc / bpsPerBlock;
      const lineHeight = 1.4 * seqFontSize;
      const elementHeight = 16;

      return {
        annotations,
        bpColors,
        bpsPerBlock,
        charWidth,
        compSeq,
        cutSites,
        elementHeight,
        highlights,
        lineHeight,
        primers,
        singleStrandAnnotations,
        search,
        seq,
        seqFontSize,
        seqType,
        showComplement,
        showIndex,
        size,
        translations,
        zoom: { linear: zoomLinear },
      };
    }
  );

export const createCircularPropsBuilder = () =>
  memoizeOne(
    (
      annotations: Annotation[],
      compSeq: string,
      cutSites: CutSite[],
      highlights: Highlight[],
      orfs: TranslationProp[],
      primers: Primer[],
      name: string,
      rotateOnScroll: boolean,
      search: NameRange[],
      seq: string,
      showComplement: boolean,
      showIndex: boolean,
      sizeWidth: number,
      sizeHeight: number,
      zoomCircular: number
    ): Omit<CircularProps, "handleMouseEvent" | "inputRef" | "onUnmount"> => {
      const size: Size = { height: sizeHeight, width: sizeWidth };
      const zoomNorm = Math.max(0, Math.min(zoomCircular || 0, 100)) / 100;

      // Smoothly blend from centered, clamped default to overflow-friendly zoomed layout.
      const limitingDim = Math.min(size.height, size.width);
      const baseCenter = { x: size.width / 2, y: size.height / 2 };
      const baseRadiusScale = 0.34;
      const baseRadiusCandidate = limitingDim * baseRadiusScale;
      const baseRadiusLimitX = Math.max(12, Math.min(baseCenter.x, size.width - baseCenter.x) - 6);
      const baseRadiusLimitY = Math.max(12, Math.min(baseCenter.y, size.height - baseCenter.y) - 6);
      const baseRadiusMax = Math.max(12, Math.min(baseRadiusLimitX, baseRadiusLimitY));
      const baseRadius = Math.max(1, Math.min(baseRadiusCandidate, baseRadiusMax));

      const targetRadiusScale = 0.45 + 0.55 * zoomNorm; // overflow-friendly
      const targetRadius = Math.max(1, limitingDim * targetRadiusScale);
      const targetTop = size.height * 0.5; // keep top near visible center
      const extraDown = zoomNorm > 0.55 ? size.height * 0.1 * ((zoomNorm - 0.55) / 0.45) : 0;
      const targetCenter = {
        x: size.width / 2,
        // Keep top fixed; move center down with radius growth and add aggressive downward bias after mid-zoom.
        y: targetTop + targetRadius + extraDown,
      };

      // Smoothstep easing gives zero slope at both ends to avoid visual jumps.
      const ease = zoomNorm * zoomNorm * (3 - 2 * zoomNorm);

      const center = {
        x: baseCenter.x * (1 - ease) + targetCenter.x * ease,
        y: baseCenter.y * (1 - ease) + targetCenter.y * ease,
      };
      const radius = baseRadius * (1 - ease) + targetRadius * ease;

      return {
        annotations,
        center,
        compSeq,
        cutSites,
        highlights,
        orfs,
        primers,
        name,
        radius: radius === 0 ? 1 : radius,
        rotateOnScroll,
        search,
        seq,
        showComplement,
        showIndex,
        size,
        zoom: zoomCircular || 0,
        yDiff: 0,
      };
    }
  );

export const createLinearMapPropsBuilder = () =>
  memoizeOne(
    (
      annotations: Annotation[],
      cutSites: CutSite[],
      highlights: Highlight[],
      name: string,
      orfs: TranslationProp[],
      primers: Primer[],
      rotateOnScroll: boolean,
      search: NameRange[],
      selection: Selection,
      seq: string,
      showIndex: boolean,
      sizeWidth: number,
      sizeHeight: number,
      zoomLinearMap: number
    ): Omit<LinearMapProps, "handleMouseEvent" | "inputRef"> => ({
      annotations,
      cutSites,
      highlights,
      name,
      orfs,
      primers,
      rotateOnScroll,
      search,
      selection,
      seq,
      showIndex,
      size: { height: sizeHeight, width: sizeWidth },
      zoom: zoomLinearMap,
    })
  );
