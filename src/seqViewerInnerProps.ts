import { Annotation, CutSite, Highlight, NameRange, Primer, SeqType, Size, TranslationProp } from "./core/elements";
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
