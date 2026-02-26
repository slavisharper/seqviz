import * as React from "react";

import { InputRefFunc } from "../../SelectionHandler";
import {
  Annotation,
  CutSite,
  Highlight,
  NameRange,
  Primer,
  Separator,
  SeparatorClickEvent,
  SeqType,
  SingleStrandAnnotation,
  Size,
} from "../../core/elements";
import { createTranslations } from "../../core/sequence";
import { createCutSiteRows, createMultiRows, createSingleRows, stackElements } from "../../utils/elementsToRows";
import { isEqual } from "../../utils/isEqual";
import { SeqBlock } from "../Linear/SeqBlock";
import HorizontalInfiniteScroll from "./HorizontalInfiniteScroll";

export interface LinearHorizontalProps {
  annotations: Annotation[];
  fragments: Annotation[];
  bpColors?: { [key: number | string]: string };
  bpsPerBlock: number;
  charWidth: number;
  compSeq: string;
  cutSites: CutSite[];
  elementHeight: number;
  handleMouseEvent: React.MouseEventHandler;
  highlights: Highlight[];
  inputRef: InputRefFunc;
  lineHeight: number;
  onUnmount: (id: string) => void;
  primers: Primer[];
  search: NameRange[];
  singleStrandAnnotations: SingleStrandAnnotation[];
  seq: string;
  seqFontSize: number;
  seqType: SeqType;
  showComplement: boolean;
  showIndex: boolean;
  size: Size;
  separators: Separator[];
  translations: NameRange[];
  zoom: { linear: number };
  onSeparatorClick?: (event: SeparatorClickEvent) => void;
}

/** A single-row linear sequence viewer with horizontal virtualization. */
export default class LinearHorizontal extends React.Component<LinearHorizontalProps> {
  shouldComponentUpdate = (nextProps: LinearHorizontalProps) => !isEqual(nextProps, this.props);

  render() {
    const {
      annotations,
      fragments = [],
      bpsPerBlock,
      compSeq,
      cutSites,
      elementHeight,
      highlights,
      lineHeight,
      onUnmount,
      primers,
      search,
      singleStrandAnnotations,
      seq,
      seqType,
      showComplement,
      showIndex,
      size,
      separators = [],
      translations,
      zoom,
      onSeparatorClick,
    } = this.props;

    const zoomed = zoom.linear > 10;
    const seqLength = seq.length;
    let arrSize = Math.round(Math.ceil(seqLength / bpsPerBlock));
    if (arrSize === Number.POSITIVE_INFINITY) arrSize = 1;

    const cutSiteRows = cutSites.length ? createCutSiteRows(cutSites, bpsPerBlock, arrSize) : new Array(arrSize).fill([]);

    function vetAnnotations<T extends NameRange>(anns: T[]): T[] {
      anns.forEach(ann => {
        if (ann.end === 0 && ann.start > ann.end) ann.end = seqLength;
        if (ann.start === seqLength && ann.end < ann.start) ann.start = 0;
      });
      return anns;
    }

    const primerFwdRows = createMultiRows(
      stackElements(vetAnnotations(primers.filter(p => p.direction === 1)), seq.length),
      bpsPerBlock,
      arrSize,
    );
    const primerRevRows = createMultiRows(
      stackElements(vetAnnotations(primers.filter(p => p.direction === -1)), seq.length),
      bpsPerBlock,
      arrSize,
    );

    const annotationRows = createMultiRows(stackElements(vetAnnotations(annotations), seq.length), bpsPerBlock, arrSize);

    const fragmentRows = createMultiRows(stackElements(vetAnnotations(fragments), seq.length), bpsPerBlock, arrSize);

    const searchRows: NameRange[][] =
      search && search.length ? createSingleRows(search, bpsPerBlock, arrSize) : new Array(arrSize).fill([]);

    const highlightRows = createSingleRows(highlights, bpsPerBlock, arrSize);

    const singleStrandAnnotationRows = createSingleRows(singleStrandAnnotations, bpsPerBlock, arrSize);

    const translationRows = translations.length
      ? createMultiRows(stackElements(createTranslations(translations, seq, seqType), seq.length), bpsPerBlock, arrSize)
      : new Array(arrSize).fill([]);

    // Calculate global max heights for each element type to ensure consistent Y positions across all blocks
    let maxPrimerFwdRows = 0;
    let maxPrimerRevRows = 0;
    let maxAnnotationRows = 0;
    let maxFragmentRows = 0;
    let maxTranslationRows = 0;
    let hasCutSites = false;

    for (let i = 0; i < arrSize; i += 1) {
      maxPrimerFwdRows = Math.max(maxPrimerFwdRows, primerFwdRows[i].length);
      maxPrimerRevRows = Math.max(maxPrimerRevRows, primerRevRows[i].length);
      maxAnnotationRows = Math.max(maxAnnotationRows, annotationRows[i].length);
      maxFragmentRows = Math.max(maxFragmentRows, fragmentRows[i].length);
      maxTranslationRows = Math.max(maxTranslationRows, translationRows[i].length);
      if (cutSiteRows[i].length > 0) hasCutSites = true;
    }

    // Compute global heights using the maxes
    const globalMaxHeights = {
      primerFwdHeight: maxPrimerFwdRows ? elementHeight * maxPrimerFwdRows : 0,
      cutSiteHeight: zoomed && hasCutSites ? lineHeight : 0,
      primerRevHeight: maxPrimerRevRows ? elementHeight * maxPrimerRevRows : 0,
      translationHeight: maxTranslationRows ? elementHeight * maxTranslationRows * 2 : 0, // *2 for handle
      fragmentsHeight: maxFragmentRows ? elementHeight * maxFragmentRows : 0,
      annHeight: maxAnnotationRows ? elementHeight * maxAnnotationRows : 0,
    };

    // Calculate consistent block height using global maxes
    let blockHeight = lineHeight * 1.1;
    if (seqType != "aa") blockHeight += lineHeight; // sequence row
    if (zoomed) blockHeight += showComplement ? lineHeight : 0; // complement row
    blockHeight += globalMaxHeights.primerFwdHeight;
    blockHeight += globalMaxHeights.cutSiteHeight;
    blockHeight += globalMaxHeights.primerRevHeight;
    blockHeight += globalMaxHeights.translationHeight;
    blockHeight += globalMaxHeights.fragmentsHeight;
    blockHeight += globalMaxHeights.annHeight;
    if (showIndex) blockHeight += lineHeight; // index row

    const elementGap =
      maxPrimerRevRows + maxPrimerFwdRows + maxAnnotationRows + maxTranslationRows ? 3 : 0;
    blockHeight += elementGap;

    // Determine a consistent viewer height
    const ids = new Array(arrSize);
    const seqs = new Array(arrSize);
    const compSeqs = new Array(arrSize);

    for (let i = 0; i < arrSize; i += 1) {
      const firstBase = i * bpsPerBlock;
      const lastBase = firstBase + bpsPerBlock;

      seqs[i] = seq.substring(firstBase, lastBase);
      compSeqs[i] = compSeq.substring(firstBase, lastBase);
      ids[i] = seqs[i] + String(i);
    }

    const seqBlocks: React.JSX.Element[] = [];
    for (let i = 0; i < arrSize; i += 1) {
      const firstBase = i * bpsPerBlock;
      seqBlocks.push(
        <SeqBlock
          key={ids[i]}
          annotationRows={annotationRows[i]}
          fragmentRows={fragmentRows[i]}
          blockHeight={blockHeight}
          globalMaxHeights={globalMaxHeights}
          bpColors={this.props.bpColors}
          bpsPerBlock={bpsPerBlock}
          charWidth={this.props.charWidth}
          compSeq={compSeqs[i]}
          cutSiteRows={cutSiteRows[i]}
          elementHeight={elementHeight}
          firstBase={firstBase}
          fullSeq={seq}
          handleMouseEvent={this.props.handleMouseEvent}
          highlights={highlightRows[i]}
          id={ids[i]}
          inputRef={this.props.inputRef}
          lineHeight={lineHeight}
          primerFwdRows={primerFwdRows[i]}
          primerRevRows={primerRevRows[i]}
          searchRows={searchRows[i]}
          singleStrandAnnotations={singleStrandAnnotationRows[i]}
          seq={seqs[i]}
          seqFontSize={this.props.seqFontSize}
          seqType={seqType}
          showComplement={showComplement}
          showIndex={showIndex}
          size={size}
          separators={separators}
          translationRows={translationRows[i]}
          y={0}
          zoom={zoom}
          zoomed={zoomed}
          onUnmount={onUnmount}
          onSeparatorClick={onSeparatorClick}
        />,
      );
    }

    const blockWidth = size.width || 0;
    const totalWidth = blockWidth * arrSize;

    return (
      seqBlocks.length && (
        <div style={{ height: blockHeight, width: "100%" }}>
          <HorizontalInfiniteScroll blockWidth={blockWidth} seqBlocks={seqBlocks} size={size} totalWidth={totalWidth} />
        </div>
      )
    );
  }
}
