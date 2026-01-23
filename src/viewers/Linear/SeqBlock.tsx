import * as React from "react";

import { InputRefFunc } from "../../SelectionHandler";
import {
  Annotation,
  CutSite,
  Highlight,
  NameRange,
  Primer,
  Range,
  Separator,
  SeparatorClickEvent,
  SeqType,
  SingleStrandAnnotation,
  Size,
  Translation,
} from "../../core/elements";
import { separatorConnectorLine, separatorLine, seqBlock, svgText } from "../../style";
import AnnotationRows from "./Annotations";
import { CutSites } from "./CutSites";
import Find from "./Find";
import { Highlights } from "./Highlights";
import IndexRow from "./Index";
import PrimeRows from "./Primers";
import Selection from "./Selection";
import { SingleStrandHighlights } from "./SingleStrandHighlights";
import { TranslationRows } from "./Translations";

export type FindXAndWidthType = (
  n1?: number | null,
  n2?: number | null,
) => {
  width: number;
  x: number;
};

type TextProps = {
  fontSize?: number;
  lengthAdjust: string;
  textAnchor: "start";
  textLength: number;
  textRendering: string;
};

export type FindXAndWidthElementType = (
  i: number,
  element: NameRange,
  elements: NameRange[],
) => { overflowLeft: boolean; overflowRight: boolean; width: number; x: number };

interface SeqBlockProps {
  annotationRows: Annotation[][];
  fragmentRows: Annotation[][];
  blockHeight: number;
  bpColors?: { [key: number | string]: string };
  bpsPerBlock: number;
  charWidth: number;
  compSeq: string;
  cutSiteRows: CutSite[];
  elementHeight: number;
  firstBase: number;
  fullSeq: string;
  handleMouseEvent: React.MouseEventHandler<SVGSVGElement>;
  highlights: Highlight[];
  id: string;
  inputRef: InputRefFunc;
  key: string;
  lineHeight: number;
  onUnmount: (a: string) => void;
  primerFwdRows: Primer[][];
  primerRevRows: Primer[][];
  searchRows: Range[];
  singleStrandAnnotations: SingleStrandAnnotation[];
  seq: string;
  seqFontSize: number;
  seqType: SeqType;
  showComplement: boolean;
  showIndex: boolean;
  size: Size;
  separators: Separator[];
  translationRows: Translation[][];
  y: number;
  zoom: { linear: number };
  zoomed: boolean;
  onSeparatorClick?: (event: SeparatorClickEvent) => void;
}

/**
 * SeqBlock
 *
 * Comprised of:
 * 	   IndexRow (the x axis basepair index)
 * 	   AnnotationRows (annotations)
 * 	   Selection (cursor selection range)
 * 	   Find (regions that match the users current find search)
 *     CutSites (cut sites)
 *     Translations
 *
 * a single block of linear sequence. Essentially a row that holds
 * the sequence, and flair around it including the
 * complementary sequence, sequence index, and anotations *
 */
export class SeqBlock extends React.PureComponent<SeqBlockProps> {
  static defaultProps = {};

  componentWillUnmount = () => {
    const { id, onUnmount } = this.props;
    onUnmount(id);
  };

  /**
   * For elements in arrays, check whether it wraps around the zero index.
   */
  findXAndWidthElement = (i: number, element: NameRange, elements: NameRange[]) => {
    const { bpsPerBlock, firstBase, fullSeq, seq } = this.props;
    const lastBase = firstBase + seq.length;
    const { end, start } = element;

    let { width, x } = this.findXAndWidth(start, end);

    // does the element overflow to the left or the right of this seqBlock?
    let overflowLeft = start < firstBase;
    let overflowRight = end > lastBase || (start === end && fullSeq.length > bpsPerBlock); // start === end means covers whole plasmid

    // if the element starts and ends in a SeqBlock, by circling all the way around,
    // it will be rendered twice (once from the firstBase to start and another from end to lastBase)
    // eg: https://user-images.githubusercontent.com/13923102/35816281-54571e70-0a68-11e8-92eb-ab56884337ac.png
    const split = elements.reduce((acc, el) => (el.id === element.id ? acc + 1 : acc), 0) > 1; // is this element in two pieces?
    if (split) {
      if (elements.findIndex(el => el.id === element.id) === i) {
        // we're in the first half of the split element
        ({ width, x } = this.findXAndWidth(firstBase, end));
        overflowLeft = true;
        overflowRight = false;
      } else {
        // we're in the second half of the split element
        ({ width, x } = this.findXAndWidth(start, lastBase));
        overflowLeft = false;
        overflowRight = true;
      }
    } else if (start > end) {
      // the element crosses over the zero index and this needs to be accounted for
      // this is very similar to the Block rendering logic in ../Selection/Selection.jsx
      ({ width, x } = this.findXAndWidth(
        start > lastBase ? firstBase : Math.max(firstBase, start),
        end < firstBase ? lastBase : Math.min(lastBase, end),
      ));

      // if this is the first part of element that crosses the zero index
      if (start > firstBase) {
        overflowLeft = true;
        overflowRight = end > lastBase;
      }

      // if this is the second part of an element, check if it overflows
      if (end < firstBase) {
        overflowLeft = start < firstBase;
        overflowRight = true;
      }
    } else if (start === end) {
      // the element circles the entire plasmid and we aren't currently in a SeqBlock
      // where the element starts or ends
      ({ width, x } = this.findXAndWidth(start, end + fullSeq.length));
    }

    return { overflowLeft, overflowRight, width, x };
  };

  /**
   * A helper used in child components to position elements on rows. Given first and last base, how far from the left
   * and how wide should it be?
   *
   * If an element and elements are provided, it also factors in whether the element circles around the 0-index.
   */
  findXAndWidth = (firstIndex = 0, lastIndex = 0) => {
    const {
      bpsPerBlock,
      charWidth,
      firstBase,
      fullSeq: { length: seqLength },
      size,
    } = this.props;

    firstIndex |= 0;
    lastIndex |= 0;

    const lastBase = Math.min(firstBase + bpsPerBlock, seqLength);
    const multiBlock = seqLength >= bpsPerBlock;

    let x = 0;
    if (firstIndex >= firstBase) {
      x = (firstIndex - firstBase) * charWidth;
      x = Math.max(x, 0) || 0;
    }

    // find the width for the current element
    let width = size.width;
    if (firstIndex === lastIndex) {
      // it starts on the last bp
      width = 0;
    } else if (firstIndex >= firstBase || lastIndex < lastBase) {
      // it starts or ends in this SeqBlock
      const start = Math.max(firstIndex, firstBase);
      const end = Math.min(lastIndex, lastBase);

      width = size.width * ((end - start) / bpsPerBlock);
      width = Math.abs(width) || 0;
    } else if (firstBase + bpsPerBlock > seqLength && multiBlock) {
      // it's an element in the last SeqBlock, that doesn't span the whole width
      width = size.width * ((seqLength % bpsPerBlock) / bpsPerBlock);
    }

    return { width, x };
  };

  /**
   * Given a bp, return either the bp as was or a text span if it should have a color.
   *
   * We're looking up each bp in the props.bpColors map to see if it should be shaded and, if so,
   * wrapping it in a textSpan with that color as a fill
   */
  seqTextSpan = (bp: string, i: number) => {
    const { bpColors, charWidth, firstBase, id } = this.props;

    let color: string | undefined;
    if (bpColors) {
      color =
        bpColors[bp] ||
        bpColors[bp.toUpperCase()] ||
        bpColors[bp.toLowerCase()] ||
        bpColors[i + firstBase] ||
        undefined;
    }

    return (
      // the +0.2 here and above is to offset the characters they're not right on the left edge. When they are,
      // other elements look like they're shifted too far to the right.
      <tspan key={i + bp + id} fill={color || undefined} x={charWidth * i + charWidth * 0.2}>
        {bp}
      </tspan>
    );
  };

  render() {
    const {
      annotationRows,
      fragmentRows,
      blockHeight,
      bpsPerBlock,
      charWidth,
      compSeq,
      cutSiteRows,
      elementHeight,
      firstBase,
      fullSeq,
      handleMouseEvent,
      highlights,
      id,
      inputRef,
      lineHeight,
      onUnmount,
      primerFwdRows: primerFwdRows,
      primerRevRows: primerRevRows,
      searchRows,
      singleStrandAnnotations,
      seq,
      seqFontSize,
      seqType,
      showComplement,
      showIndex,
      size,
      separators,
      translationRows,
      zoom,
      zoomed,
      onSeparatorClick,
    } = this.props;

    if (!size.width || !size.height) return null;

    const textProps: TextProps = {
      fontSize: seqFontSize,
      lengthAdjust: "spacing",
      textAnchor: "start",
      textLength: size.width >= 0 ? size.width : 1,
      textRendering: "optimizeLegibility",
    };

    const lastBase = firstBase + seq.length;
    // use the rendered character width to represent the clickable width of this block
    const selectionWidth = seq.length < bpsPerBlock ? charWidth * seq.length : size.width;

    // height and yDiff of forward primers
    const primerFwdYDiff = 0;
    const primerFwdHeight = primerFwdRows.length ? elementHeight * primerFwdRows.length : 0;

    // height and yDiff of cut sites
    const cutSiteYDiff = primerFwdYDiff + primerFwdHeight; // spacing for cutSite names
    const cutSiteHeight = zoomed && cutSiteRows.length ? lineHeight : 0;

    // height and yDiff of the sequence strand
    const indexYDiff = cutSiteYDiff + cutSiteHeight;
    const indexHeight = seqType === "aa" ? 0 : lineHeight; // if aa, no seq row is shown

    // height and yDiff of the complement strand
    const compYDiff = indexYDiff + indexHeight;
    const compHeight = zoomed && showComplement ? lineHeight : 0;
    const hasComplementRow = zoomed && showComplement && !!compSeq && seqType !== "aa";

    // height and yDiff of reverse primers
    const primerRevYDiff = compYDiff + compHeight;
    const primerRevHeight = primerRevRows.length ? elementHeight * primerRevRows.length : 0;

    // height and yDiff of translations
    // elementHeight * 2 is to account for the translation handle. If no name, don't show the handle
    const translationYDiff = primerRevYDiff + primerRevHeight;
    let translationHeight = 0;
    for (let i = 0; i < translationRows.length; i++) {
      const multiplier = translationRows[i][0]["name"] ? 2 : 1;
      translationHeight += elementHeight * multiplier;
    }

    // height and yDiff of fragments (rendered before standard annotations)
    const fragmentsYDiff = translationYDiff + translationHeight;
    const fragmentsHeight = elementHeight * fragmentRows.length;

    // height and yDiff of annotations
    const annYDiff = fragmentsYDiff + fragmentsHeight;
    const annHeight = elementHeight * annotationRows.length;

    // height and ydiff of the index row
    const elementGap =
      primerRevRows.length + primerRevRows.length + annotationRows.length + translationRows.length ? 3 : 0;

    const indexRowYDiff = annYDiff + annHeight + elementGap;

    // calc the height necessary for the sequence selection
    // it starts 5 above the top of the SeqBlock
    const selectHeight =
      primerFwdHeight +
      cutSiteHeight +
      indexHeight +
      compHeight +
      translationHeight +
      fragmentsHeight +
      annHeight +
      primerRevHeight +
      elementGap +
      5;
    let selectEdgeHeight = selectHeight + 9; // +9 is the height of a tick + index row

    // needed because otherwise the selection height is very small
    if (!zoomed && selectHeight <= elementHeight) {
      selectEdgeHeight = elementHeight;
    }

    return (
      <svg
        ref={inputRef(id, {
          end: lastBase,
          linearOffset: 0,
          linearWidth: selectionWidth,
          ref: id,
          start: firstBase,
          type: "SEQ",
          viewer: "LINEAR",
        })}
        className="la-vz-seqblock"
        cursor="text"
        data-testid="la-vz-seqblock"
        data-selection-linear-offset={0}
        data-selection-linear-width={selectionWidth}
        data-selection-end={lastBase}
        data-selection-ref={id}
        data-selection-start={firstBase}
        data-selection-type="SEQ"
        data-selection-viewer="LINEAR"
        display="block"
        height={blockHeight}
        id={id}
        overflow="visible"
        style={seqBlock}
        width={size.width >= 0 ? size.width : 0}
        onMouseDown={handleMouseEvent}
        onMouseMove={handleMouseEvent}
        onMouseUp={handleMouseEvent}
      >
        {showIndex && (
          <IndexRow
            charWidth={charWidth}
            findXAndWidth={this.findXAndWidth}
            firstBase={firstBase}
            lastBase={lastBase}
            seq={seq}
            seqType={seqType}
            showIndex={showIndex}
            size={size}
            yDiff={indexRowYDiff}
            zoom={zoom}
          />
        )}
        <Selection.Block
          findXAndWidth={this.findXAndWidth}
          firstBase={firstBase}
          fullSeq={fullSeq}
          lastBase={lastBase}
          selectHeight={selectHeight}
          onUnmount={onUnmount}
        />
        {primerFwdRows.length && (
          <PrimeRows
            bpsPerBlock={bpsPerBlock}
            direction={1}
            elementHeight={elementHeight}
            findXAndWidth={this.findXAndWidthElement}
            firstBase={firstBase}
            fullSeq={fullSeq}
            inputRef={inputRef}
            lastBase={lastBase}
            primerRows={primerFwdRows}
            seqBlockRef={this}
            width={size.width}
            yDiff={primerFwdYDiff}
          />
        )}
        <Highlights
          compYDiff={compYDiff - 3}
          findXAndWidth={this.findXAndWidthElement}
          firstBase={firstBase}
          highlights={highlights}
          indexYDiff={indexYDiff - 3}
          inputRef={inputRef}
          hasComplementRow={hasComplementRow}
          lastBase={lastBase}
          lineHeight={lineHeight}
          listenerOnly={false}
          seqBlockRef={this}
        />
        <Selection.Edges
          findXAndWidth={this.findXAndWidth}
          firstBase={firstBase}
          fullSeq={fullSeq}
          lastBase={lastBase}
          selectEdgeHeight={selectEdgeHeight}
        />
        <Find
          compYDiff={compYDiff - 3}
          filteredRows={showComplement ? searchRows : searchRows.filter(r => r.direction === 1)}
          findXAndWidth={this.findXAndWidth}
          firstBase={firstBase}
          indexYDiff={indexYDiff - 3}
          inputRef={inputRef}
          lastBase={lastBase}
          lineHeight={lineHeight}
          listenerOnly={false}
          zoomed={zoomed}
        />
        <SingleStrandHighlights
          compYDiff={compYDiff - 3}
          findXAndWidth={this.findXAndWidthElement}
          firstBase={firstBase}
          hasComplementRow={hasComplementRow}
          indexYDiff={indexYDiff - 3}
          inputRef={inputRef}
          lastBase={lastBase}
          lineHeight={lineHeight}
          listenerOnly={false}
          seqBlockRef={this}
          singleStrandAnnotations={singleStrandAnnotations}
        />
        {primerRevRows.length && (
          <PrimeRows
            bpsPerBlock={bpsPerBlock}
            direction={-1}
            elementHeight={elementHeight}
            findXAndWidth={this.findXAndWidthElement}
            firstBase={firstBase}
            fullSeq={fullSeq}
            inputRef={inputRef}
            lastBase={lastBase}
            primerRows={primerRevRows}
            seqBlockRef={this}
            width={size.width}
            yDiff={primerRevYDiff}
          />
        )}
        {translationRows.length && (
          <TranslationRows
            bpsPerBlock={bpsPerBlock}
            charWidth={charWidth}
            elementHeight={elementHeight}
            findXAndWidth={this.findXAndWidth}
            findXAndWidthElement={this.findXAndWidthElement}
            firstBase={firstBase}
            fullSeq={fullSeq}
            inputRef={inputRef}
            lastBase={lastBase}
            seqType={seqType}
            translationRows={translationRows}
            yDiff={translationYDiff}
            onUnmount={onUnmount}
          />
        )}
        {fragmentRows.length && (
          <AnnotationRows
            annotationRows={fragmentRows}
            bpsPerBlock={bpsPerBlock}
            elementHeight={elementHeight}
            findXAndWidth={this.findXAndWidthElement}
            firstBase={firstBase}
            fullSeq={fullSeq}
            inputRef={inputRef}
            lastBase={lastBase}
            seqBlockRef={this}
            width={size.width}
            yDiff={fragmentsYDiff}
          />
        )}
        {annotationRows.length && (
          <AnnotationRows
            annotationRows={annotationRows}
            bpsPerBlock={bpsPerBlock}
            elementHeight={elementHeight}
            findXAndWidth={this.findXAndWidthElement}
            firstBase={firstBase}
            fullSeq={fullSeq}
            inputRef={inputRef}
            lastBase={lastBase}
            seqBlockRef={this}
            width={size.width}
            yDiff={annYDiff}
          />
        )}

        {zoomed && seqType !== "aa" ? (
          <text
            {...textProps}
            className="la-vz-seq"
            data-testid="la-vz-seq"
            id={id}
            style={svgText}
            transform={`translate(0, ${indexYDiff + lineHeight / 2})`}
          >
            {seq.split("").map(this.seqTextSpan)}
          </text>
        ) : null}
        {compSeq && zoomed && showComplement && seqType !== "aa" ? (
          <text
            {...textProps}
            className="la-vz-comp-seq"
            data-testid="la-vz-comp-seq"
            id={id}
            style={svgText}
            transform={`translate(0, ${compYDiff + lineHeight / 2})`}
          >
            {compSeq.split("").map(this.seqTextSpan)}
          </text>
        ) : null}
        {zoomed && (
          <CutSites
            cutSites={cutSiteRows}
            findXAndWidth={this.findXAndWidth}
            firstBase={firstBase}
            inputRef={inputRef}
            lastBase={lastBase}
            lineHeight={lineHeight}
            size={size}
            yDiff={cutSiteYDiff - 3}
            zoom={zoom}
          />
        )}
        <SeparatorMarkers
          compYDiff={compYDiff}
          findXAndWidth={this.findXAndWidth}
          firstBase={firstBase}
          fullSeqLength={fullSeq.length}
          hasComplementRow={hasComplementRow}
          indexYDiff={indexYDiff}
          lastBase={lastBase}
          lineHeight={lineHeight}
          separators={separators}
          onSeparatorClick={onSeparatorClick}
        />
        <Find
          compYDiff={compYDiff - 3}
          filteredRows={showComplement ? searchRows : searchRows.filter(r => r.direction === 1)}
          findXAndWidth={this.findXAndWidth}
          firstBase={firstBase}
          indexYDiff={indexYDiff - 3}
          inputRef={inputRef}
          lastBase={lastBase}
          lineHeight={lineHeight}
          listenerOnly={true}
          zoomed={zoomed}
        />
        <SingleStrandHighlights
          compYDiff={compYDiff - 3}
          findXAndWidth={this.findXAndWidthElement}
          firstBase={firstBase}
          hasComplementRow={hasComplementRow}
          indexYDiff={indexYDiff - 3}
          inputRef={inputRef}
          lastBase={lastBase}
          lineHeight={lineHeight}
          listenerOnly={true}
          seqBlockRef={this}
          singleStrandAnnotations={singleStrandAnnotations}
        />
        <Highlights
          compYDiff={compYDiff - 3}
          findXAndWidth={this.findXAndWidthElement}
          firstBase={firstBase}
          highlights={highlights}
          indexYDiff={indexYDiff - 3}
          inputRef={inputRef}
          lastBase={lastBase}
          lineHeight={lineHeight}
          listenerOnly={true}
          seqBlockRef={this}
        />
      </svg>
    );
  }
}

interface SeparatorMarkersProps {
  compYDiff: number;
  findXAndWidth: FindXAndWidthType;
  firstBase: number;
  fullSeqLength: number;
  hasComplementRow: boolean;
  indexYDiff: number;
  lastBase: number;
  lineHeight: number;
  separators: Separator[];
  onSeparatorClick?: (event: SeparatorClickEvent) => void;
}

type SeparatorDatum = {
  color: string;
  id: string;
  order: number;
  separator: Separator;
  xTop: number;
  xBottom?: number;
  selectionStart: number;
  selectionEnd: number;
};

const SeparatorMarkers = ({
  compYDiff,
  findXAndWidth,
  firstBase,
  fullSeqLength,
  hasComplementRow,
  indexYDiff,
  lastBase,
  lineHeight,
  separators,
  onSeparatorClick,
}: SeparatorMarkersProps) => {
  if (!separators?.length || fullSeqLength <= 0) {
    return null;
  }

  const blockContains = (index?: number): boolean => {
    if (typeof index !== "number") {
      return false;
    }
    if (index === fullSeqLength) {
      return lastBase === fullSeqLength;
    }
    return index >= firstBase && index < lastBase;
  };

  const fallbackColor = "#2B6CB0";
  const data: SeparatorDatum[] = [];

  const toNumericStrokeWidth = (value: React.CSSProperties["strokeWidth"]): number => {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const interactiveStrokeWidth = Math.max(toNumericStrokeWidth(separatorLine.strokeWidth) || 0, 2);
  const connectorStrokeWidth = Math.max(toNumericStrokeWidth(separatorConnectorLine.strokeWidth) || 0, 2);

  const clampSelectionIndex = (index: number): number => {
    if (!Number.isFinite(index)) {
      return 0;
    }
    const floored = Math.floor(index);
    if (floored < 0) {
      return 0;
    }
    const maxBound = Math.max(fullSeqLength, 0);
    if (floored > maxBound) {
      return maxBound;
    }
    return floored;
  };

  const toSelectionRange = (index: number): { end: number; start: number } => {
    const normalized = clampSelectionIndex(index);
    return {
      start: normalized,
      end: normalized,
    };
  };

  const separatorXOffset = 2;

  separators.forEach(separator => {
    if (!blockContains(separator.index)) {
      return;
    }
    const { x: topX } = findXAndWidth(separator.index, separator.index);
    if (typeof topX !== "number" || Number.isNaN(topX)) {
      return;
    }
    let xBottom: number | undefined;
    if (typeof separator.complementIndex === "number" && blockContains(separator.complementIndex)) {
      const { x: bottomX } = findXAndWidth(separator.complementIndex, separator.complementIndex);
      if (typeof bottomX === "number" && !Number.isNaN(bottomX)) {
        xBottom = bottomX + separatorXOffset;
      }
    }
    const selectionRange = toSelectionRange(separator.index ?? 0);
    data.push({
      color: separator.color || fallbackColor,
      id: separator.id,
      order: separator.order,
      separator,
      xTop: topX + separatorXOffset,
      xBottom,
      selectionStart: selectionRange.start,
      selectionEnd: selectionRange.end,
    });
  });

  if (!data.length) {
    return null;
  }

  const strandHeight = Math.max(lineHeight, 12);
  const strandPadding = 4;
  const topStartY = indexYDiff - strandPadding;
  const topFullEndY = indexYDiff + strandHeight + strandPadding;
  const bottomStartY = compYDiff - strandPadding;
  const bottomFullEndY = compYDiff + strandHeight + strandPadding;
  const connectorY = topFullEndY + (bottomStartY - topFullEndY) / 2;
  const separatorYOffset = -5;
  const adjustedTopStartY = topStartY + separatorYOffset;
  const adjustedTopFullEndY = topFullEndY + separatorYOffset;
  const adjustedConnectorY = connectorY + separatorYOffset;
  const adjustedBottomFullEndY = bottomFullEndY + separatorYOffset;

  const fireClick = (datum: SeparatorDatum) => {
    onSeparatorClick?.({
      order: datum.order,
      separator: datum.separator,
    });
  };

  const handlePointerDown = (datum: SeparatorDatum, event: React.PointerEvent<SVGLineElement>) => {
    if (event.pointerType && event.pointerType !== "mouse") {
      event.preventDefault();
    }
    fireClick(datum);
  };

  const handleKeyDown = (datum: SeparatorDatum, event: React.KeyboardEvent<SVGLineElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    fireClick(datum);
  };

  return (
    <g className="la-vz-separators">
      {data.map(datum => {
        const hasComplement = hasComplementRow && typeof datum.xBottom === "number";
        const isBlunt = hasComplement && Math.abs(datum.xBottom! - datum.xTop) <= 0.5;
        const hasConnector = hasComplement && !isBlunt;
        return (
          <React.Fragment key={datum.id}>
            <line
              className="la-vz-separator-line"
              role="button"
              tabIndex={0}
              x1={datum.xTop}
              x2={datum.xTop}
              y1={adjustedTopStartY}
              y2={isBlunt ? adjustedBottomFullEndY : hasConnector ? adjustedConnectorY : adjustedTopFullEndY}
              style={{ ...separatorLine, stroke: datum.color, strokeWidth: interactiveStrokeWidth }}
              data-selection-type="SEPARATOR"
              data-selection-start={datum.selectionStart}
              data-selection-end={datum.selectionEnd}
              data-selection-name={datum.separator.name || datum.id}
              data-selection-viewer="LINEAR"
              data-selection-ref={datum.id}
              onPointerDown={event => handlePointerDown(datum, event)}
              onKeyDown={event => handleKeyDown(datum, event)}
            />
            {hasConnector ? (
              <>
                <line
                  className="la-vz-separator-line"
                  role="button"
                  tabIndex={0}
                  x1={datum.xBottom!}
                  x2={datum.xBottom!}
                  y1={adjustedConnectorY}
                  y2={adjustedBottomFullEndY}
                  style={{ ...separatorLine, stroke: datum.color, strokeWidth: interactiveStrokeWidth }}
                  data-selection-type="SEPARATOR"
                  data-selection-start={datum.selectionStart}
                  data-selection-end={datum.selectionEnd}
                  data-selection-name={datum.separator.name || datum.id}
                  data-selection-viewer="LINEAR"
                  data-selection-ref={datum.id}
                  onPointerDown={event => handlePointerDown(datum, event)}
                  onKeyDown={event => handleKeyDown(datum, event)}
                />
                <line
                  className="la-vz-separator-connector"
                  role="button"
                  tabIndex={0}
                  x1={datum.xTop}
                  x2={datum.xBottom!}
                  y1={adjustedConnectorY}
                  y2={adjustedConnectorY}
                  style={{ ...separatorConnectorLine, stroke: datum.color, strokeWidth: connectorStrokeWidth }}
                  data-selection-type="SEPARATOR"
                  data-selection-start={datum.selectionStart}
                  data-selection-end={datum.selectionEnd}
                  data-selection-name={datum.separator.name || datum.id}
                  data-selection-viewer="LINEAR"
                  data-selection-ref={datum.id}
                  onPointerDown={event => handlePointerDown(datum, event)}
                  onKeyDown={event => handleKeyDown(datum, event)}
                />
              </>
            ) : null}
          </React.Fragment>
        );
      })}
    </g>
  );
};
