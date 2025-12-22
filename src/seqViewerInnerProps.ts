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

      // Smooth font anchors: zoom 1 -> 10px, zoom 50 -> 16px (1rem), zoom 100 -> 24px (1.5rem).
      const clampedZoom = Math.max(0, Math.min(zoomLinear, 100));
      const effectiveZoom = Math.max(1, clampedZoom); // keep math stable below 1
      let seqFontSize = 16;
      if (effectiveZoom <= 50) {
        const t = (effectiveZoom - 1) / 49; // 0 at zoom 1, 1 at zoom 50
        seqFontSize = 10 + t * (16 - 10);
      } else {
        const t = (effectiveZoom - 50) / 50; // 0 at zoom 50, 1 at zoom 100
        seqFontSize = 16 + t * (24 - 16);
      }

      const baseBpsPerBlock = Math.max(1, ((size.width || 0) / seqFontSize) * 1.4);
      // More zoom => fewer bases per block; keep range tame so mid-scale is readable.
      const normalizedZoom = (clampedZoom <= 0 ? 0 : (clampedZoom - 1) / 99); // 0..1 using min visible zoom as baseline
      const densityScale = 1.8 - 0.8 * normalizedZoom; // 1.8 near min, ~1.4 mid, 1.0 max

      let bpsPerBlock = Math.round(baseBpsPerBlock * densityScale);

      // Keep amino-acid view aligned: treat aa width as 1/3 of bp width.
      if (seqType === "aa") {
        bpsPerBlock = Math.max(1, Math.round(bpsPerBlock / 3));
      }

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
      sizeHeight: number
    ): Omit<CircularProps, "handleMouseEvent" | "inputRef" | "onUnmount"> => {
      const size: Size = { height: sizeHeight, width: sizeWidth };
      const center = {
        x: size.width / 2,
        y: size.height / 2,
      };

      const limitingDim = Math.min(size.height, size.width);
      const radius = limitingDim * 0.34;

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
      sizeHeight: number
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
    })
  );
