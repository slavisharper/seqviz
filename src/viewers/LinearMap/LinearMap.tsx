import * as React from "react";

import { InputRefFunc } from "../../SelectionHandler";
import { CHAR_WIDTH } from "../../SeqViewerContainer";
import {
  Annotation,
  CutSite,
  Fragment,
  Highlight,
  NameRange,
  Primer,
  Separator,
  SeparatorClickEvent,
  Size,
  TranslationProp,
} from "../../core/elements";
import CentralIndexContext from "../../state/centralIndexContext";
import { Selection as SelectionState } from "../../state/selectionContext";
import { circularLabel, circularLabelLine, separatorLine, viewerCircular } from "../../style";
import { stackElements } from "../../utils/elementsToRows";
import { isEqual } from "../../utils/isEqual";
import { setHoveredLabelUnderline } from "../Circular/WrappedGroupLabel";
import { Find } from "./Find";
import { Index } from "./Index";
import { Labels, LinearLabelDatum } from "./Labels";
import { Selection } from "./Selection";
import { AnnotationTrack } from "./components/AnnotationTrack";
import { OrfTrack } from "./components/OrfTrack";
import { PrimerTrack } from "./components/PrimerTrack";
import {
  ANNOTATION_HEIGHT_RATIO,
  ENZYME_LABEL_MIN_WIDTH,
  ENZYME_LABEL_ROW_SPACING,
  ENZYME_MAX_LABEL_ROWS,
  LABEL_GAP,
  LINE_HEIGHT,
  MIN_MAP_WIDTH,
  ORF_FEATURE_GAP,
  ORF_HEIGHT_RATIO,
  ORF_INDEX_GAP,
  PADDING_BOTTOM,
  PADDING_TOP,
  PADDING_X,
  PRIMER_HEIGHT_RATIO,
  ROW_GAP,
  SELECTION_HEIGHT_RATIO,
  TRACK_GAP,
} from "./constants";
import {
  RawLabel,
  buildOrfIdentifier,
  createLabelItemWithSelection,
  getFeatureIdsForSelection,
  getMergedHoverState,
  getOrfId,
  getSelectionTypeForLabel,
  isDefined,
  isFeatureHovered,
  stripOrfMeta,
} from "./helpers";
import { LinearOrf } from "./types";
import { LinearMapScale, clamp, normalizeBase, rangeLength, rangeMidpoint } from "./utils";

export interface LinearMapProps {
  annotations: Annotation[];
  fragments: Fragment[];
  cutSites: CutSite[];
  handleMouseEvent: React.MouseEventHandler<SVGSVGElement>;
  highlights: Highlight[];
  inputRef: InputRefFunc;
  name: string;
  orfs: TranslationProp[];
  primers: Primer[];
  rotateOnScroll?: boolean;
  search: NameRange[];
  selection?: SelectionState;
  seq: string;
  separators: Separator[];
  showIndex: boolean;
  size: Size;
  zoom: number;
  onSeparatorClick?: (event: SeparatorClickEvent) => void;
}

interface LinearMapSeparatorsProps {
  bottom: number;
  onSeparatorClick?: (event: SeparatorClickEvent) => void;
  scale: LinearMapScale;
  separators: Separator[];
  top: number;
}

type LinearMapSeparatorDatum = {
  color: string;
  id: string;
  order: number;
  separator: Separator;
  x: number;
  selectionStart: number;
  selectionEnd: number;
};

const LinearMapSeparators = ({ bottom, onSeparatorClick, scale, separators, top }: LinearMapSeparatorsProps) => {
  if (!separators?.length || scale.seqLength <= 0) {
    return null;
  }

  const resolveIndex = (index: number): number => {
    if (index === scale.seqLength) {
      return scale.seqLength;
    }
    return normalizeBase(index, scale.seqLength);
  };

  const toX = (index: number): number => {
    const resolved = resolveIndex(index);
    if (resolved === scale.seqLength) {
      return scale.offsetX + scale.width;
    }
    return scale.offsetX + resolved * scale.pxPerBase;
  };

  const fallbackColor = "#2B6CB0";
  const data: LinearMapSeparatorDatum[] = [];

  const clampSelectionIndex = (index: number): number => {
    if (!Number.isFinite(index)) {
      return 0;
    }
    const floored = Math.floor(index);
    if (floored < 0) {
      return 0;
    }
    const maxBound = Math.max(scale.seqLength, 0);
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

  separators.forEach(separator => {
    if (typeof separator.index !== "number") {
      return;
    }
    const x = toX(separator.index);
    if (typeof x !== "number" || Number.isNaN(x)) {
      return;
    }
    const selectionRange = toSelectionRange(separator.index);
    data.push({
      color: separator.color || fallbackColor,
      id: separator.id,
      order: separator.order,
      separator,
      x,
      selectionStart: selectionRange.start,
      selectionEnd: selectionRange.end,
    });
  });

  if (!data.length) {
    return null;
  }

  const topStartY = top;
  const bottomEndY = bottom;

  const fireClick = (datum: LinearMapSeparatorDatum) => {
    onSeparatorClick?.({
      order: datum.order,
      separator: datum.separator,
    });
  };

  const handleKeyDown = (datum: LinearMapSeparatorDatum, event: React.KeyboardEvent<SVGLineElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    fireClick(datum);
  };

  return (
    <g className="la-vz-linear-map-separators">
      {data.map(datum => (
        <line
          key={datum.id}
          className="la-vz-separator-line"
          role="button"
          tabIndex={0}
          x1={datum.x}
          x2={datum.x}
          y1={topStartY}
          y2={bottomEndY}
          style={{ ...separatorLine, stroke: datum.color }}
          data-selection-type="SEPARATOR"
          data-selection-start={datum.selectionStart}
          data-selection-end={datum.selectionEnd}
          data-selection-name={datum.separator.name || datum.id}
          data-selection-viewer="LINEAR"
          data-selection-ref={datum.id}
          data-scroll-linear-on-select="true"
          onPointerDown={() => fireClick(datum)}
          onKeyDown={event => handleKeyDown(datum, event)}
        />
      ))}
    </g>
  );
};

interface LinearMapState {
  hoveredFeatures: Record<string, boolean>;
}

export default class LinearMap extends React.PureComponent<LinearMapProps> {
  static contextType = CentralIndexContext;
  declare context: React.ContextType<typeof CentralIndexContext>;

  state: LinearMapState = { hoveredFeatures: {} };

  private labelLookup = new Map<string, LinearLabelDatum>();
  private selectedFeatureIds = new Set<string>();
  private previousSelectionIds = new Set<string>();

  private FEATURE_CALLOUT_TEXT_GAP = LINE_HEIGHT * 1.1;

  shouldComponentUpdate(nextProps: LinearMapProps, nextState: LinearMapState) {
    return !isEqual(nextProps, this.props) || !isEqual(nextState, this.state);
  }

  componentDidMount() {
    if (!this.areSetsEqual(this.previousSelectionIds, this.selectedFeatureIds)) {
      this.syncSelectionUnderlines(this.previousSelectionIds, this.selectedFeatureIds);
      this.previousSelectionIds = new Set(this.selectedFeatureIds);
    }
  }

  componentDidUpdate() {
    if (!this.areSetsEqual(this.previousSelectionIds, this.selectedFeatureIds)) {
      this.syncSelectionUnderlines(this.previousSelectionIds, this.selectedFeatureIds);
      this.previousSelectionIds = new Set(this.selectedFeatureIds);
    }
  }

  handleScrollEvent = (e: React.WheelEvent<SVGSVGElement>) => {
    const { rotateOnScroll } = this.props;
    if (!rotateOnScroll) return;

    // Stop the wheel event from bubbling into other viewers but let the map's own scroll bar handle it.
    e.stopPropagation();
  };

  render() {
    const {
      annotations = [],
      fragments = [],
      cutSites = [],
      handleMouseEvent,
      highlights = [],
      inputRef,
      name,
      orfs = [],
      primers = [],
      search = [],
      seq,
      separators = [],
      showIndex,
      size,
      zoom,
      onSeparatorClick,
    } = this.props;

    const seqLength = Math.max(seq.length, 1);
    const normalizedOrfs: LinearOrf[] = (orfs || []).map((orf, idx) => ({
      ...orf,
      __colorIndex: idx,
      __id: this.buildOrfIdentifier(orf, seqLength, idx),
    }));
    const orfRanges: NameRange[] = normalizedOrfs.map(orf => ({
      direction: orf.direction === -1 ? -1 : orf.direction === 1 ? 1 : 0,
      end: orf.end,
      id: orf.__id,
      name: orf.name || "",
      start: orf.start,
    }));
    const orfById = new Map<string, LinearOrf>();
    normalizedOrfs.forEach(orf => {
      orfById.set(orf.__id, orf);
    });
    const orfRows: LinearOrf[][] = stackElements(orfRanges, seqLength).map(row =>
      row.map(range => orfById.get(range.id)).filter((value): value is LinearOrf => isDefined(value)),
    );
    const fragmentRows = stackElements(fragments, seqLength);
    const annotationRows = stackElements(annotations, seqLength);
    const combinedAnnotationRows = fragmentRows.concat(annotationRows);
    const primerForwardRows = stackElements(
      primers.filter(primer => primer.direction === 1),
      seqLength,
    );
    const primerReverseRows = stackElements(
      primers.filter(primer => primer.direction === -1),
      seqLength,
    );

    const annotationRowIndex = new Map<string, number>();
    combinedAnnotationRows.forEach((row, rowIndex) => {
      row.forEach(annotation => {
        annotationRowIndex.set(annotation.id, rowIndex);
      });
    });

    const primerForwardRowIndex = new Map<string, number>();
    primerForwardRows.forEach((row, rowIndex) => {
      row.forEach(primer => {
        primerForwardRowIndex.set(primer.id, rowIndex);
      });
    });

    const primerReverseRowIndex = new Map<string, number>();
    primerReverseRows.forEach((row, rowIndex) => {
      row.forEach(primer => {
        primerReverseRowIndex.set(primer.id, rowIndex);
      });
    });

    const baseWidth = size.width || 0;
    const mapWidthBase = Math.max(baseWidth - 2 * PADDING_X, MIN_MAP_WIDTH);
    const zoomNorm = Math.max(0, Math.min(zoom || 0, 100)) / 100;
    const zoomFactor = 1 + zoomNorm * 7; // up to 8x width
    const mapWidth = mapWidthBase * zoomFactor;
    const pxPerBase = mapWidth / seqLength;
    const scale: LinearMapScale = {
      offsetX: PADDING_X,
      pxPerBase,
      seqLength,
      width: mapWidth,
    };

    const selectionHeight = LINE_HEIGHT * SELECTION_HEIGHT_RATIO;
    const findHeight = selectionHeight * 0.55;
    const annotationRowHeight = LINE_HEIGHT + ROW_GAP;
    const primerRowHeight = LINE_HEIGHT + ROW_GAP;
    const orfRowHeight = LINE_HEIGHT + ROW_GAP;
    const primerFeatureHeight = LINE_HEIGHT * PRIMER_HEIGHT_RATIO;
    const orfFeatureHeight = LINE_HEIGHT * ORF_HEIGHT_RATIO;
    const annotationFeatureHeight = LINE_HEIGHT * ANNOTATION_HEIGHT_RATIO;

    const allAnnotations = fragments.concat(annotations);
    const { enzymeLabels, inlineAnnotationIds, inlinePrimerIds } = this.computeLabelLayout(
      allAnnotations,
      primers,
      cutSites,
      scale,
    );
    const enzymeLabelRowMax = enzymeLabels.reduce((acc, label) => Math.max(acc, label.row), -1);
    const enzymeLabelsHeight = enzymeLabelRowMax >= 0 ? enzymeLabelRowMax * ENZYME_LABEL_ROW_SPACING + LINE_HEIGHT : 0;
    const enzymeLabelsStartY = PADDING_TOP;

    let currentY = PADDING_TOP;
    if (enzymeLabelsHeight) {
      currentY += enzymeLabelsHeight + LABEL_GAP;
    }

    const indexY = showIndex ? currentY : 0;
    const mapBottom = showIndex ? indexY + LINE_HEIGHT / 2 : currentY;
    const orfAreaHeight = orfRows.length ? orfRows.length * orfRowHeight - ROW_GAP : 0;
    if (showIndex) {
      currentY += LINE_HEIGHT;
    }

    const postIndexGap = orfAreaHeight ? ORF_INDEX_GAP : TRACK_GAP;
    currentY += postIndexGap;

    const orfStartY = currentY;
    if (orfAreaHeight) {
      currentY += orfAreaHeight + ORF_FEATURE_GAP;
    }

    const annotationStartY = currentY;
    const annotationAreaHeight = combinedAnnotationRows.length
      ? combinedAnnotationRows.length * annotationRowHeight - ROW_GAP
      : 0;
    if (annotationAreaHeight) {
      currentY += annotationAreaHeight + TRACK_GAP;
    }

    const primerForwardY = currentY;
    const primerForwardHeight = primerForwardRows.length ? primerForwardRows.length * primerRowHeight - ROW_GAP : 0;
    if (primerForwardHeight) {
      currentY += primerForwardHeight + ROW_GAP;
    }

    const primerReverseY = currentY;
    const primerReverseHeight = primerReverseRows.length ? primerReverseRows.length * primerRowHeight - ROW_GAP : 0;
    if (primerReverseHeight) {
      currentY += primerReverseHeight + TRACK_GAP;
    }

    const featureAreaBottomCandidates = [mapBottom];
    if (orfAreaHeight) featureAreaBottomCandidates.push(orfStartY + orfAreaHeight);
    if (annotationAreaHeight) featureAreaBottomCandidates.push(annotationStartY + annotationAreaHeight);
    if (primerForwardHeight) featureAreaBottomCandidates.push(primerForwardY + primerForwardHeight);
    if (primerReverseHeight) featureAreaBottomCandidates.push(primerReverseY + primerReverseHeight);
    const featureAreaBottom = Math.max(...featureAreaBottomCandidates);

    const selectionHighlightTop = mapBottom + 1;
    const selectionHighlightBottom = Math.max(featureAreaBottom, selectionHighlightTop + selectionHeight);
    const selectionHighlightHeight = selectionHighlightBottom - selectionHighlightTop;
    const segmentLineTop = mapBottom;
    const segmentLineBottom = Math.max(featureAreaBottom, mapBottom);

    const labelSourceContext = {
      annotationRowHeight,
      annotationRowIndex,
      annotationStartY,
      baselineY: mapBottom,
      primerForwardRowHeight: primerRowHeight,
      primerForwardRowIndex,
      primerForwardY,
      primerReverseRowHeight: primerRowHeight,
      primerReverseRowIndex,
      primerReverseY,
    };

    const enzymeLabelsWithSource = enzymeLabels.map(label => ({
      ...label,
      sourceY: this.getLabelSourceY(label, labelSourceContext),
    }));

    const featureLabelLookup = new Map<string, LinearLabelDatum>();
    enzymeLabelsWithSource.forEach(label => {
      label.labels.forEach(item => {
        featureLabelLookup.set(item.id, label);
      });
    });
    this.labelLookup = featureLabelLookup;

    const selectedFeatureIds = this.getFeatureIdsForSelection(this.props.selection);
    const selectedFeatureSet = new Set(selectedFeatureIds);
    this.selectedFeatureIds = selectedFeatureSet;
    const mergedHoveredFeatures = this.getMergedHoverState(selectedFeatureSet);
    const selectedFeaturesMap = selectedFeatureIds.reduce<Record<string, boolean>>((acc, id) => {
      if (id) acc[id] = true;
      return acc;
    }, {});

    currentY = featureAreaBottom;

    const hiddenFeatureMetaById = new Map<string, { name: string; x: number; y: number }>();
    const calloutYGap = this.FEATURE_CALLOUT_TEXT_GAP;

    const addHiddenFeatureMeta = (
      id: string,
      name: string | undefined,
      midpoint: number,
      rowTopY: number,
    ) => {
      if (!id || !name) return;
      const x = clamp(scale.offsetX + midpoint * scale.pxPerBase, scale.offsetX, scale.offsetX + scale.width);
      const y = rowTopY - calloutYGap;
      hiddenFeatureMetaById.set(id, { name, x, y });
    };

    combinedAnnotationRows.forEach((row, rowIndex) => {
      const rowTopY = annotationStartY + rowIndex * annotationRowHeight;
      row.forEach(annotation => {
        if (inlineAnnotationIds.has(annotation.id)) return;
        const midpoint = rangeMidpoint(annotation.start, annotation.end, scale.seqLength);
        addHiddenFeatureMeta(annotation.id, annotation.name, midpoint, rowTopY);
      });
    });

    primerForwardRows.forEach((row, rowIndex) => {
      const rowTopY = primerForwardY + rowIndex * primerRowHeight;
      row.forEach(primer => {
        if (inlinePrimerIds.has(primer.id)) return;
        const midpoint = rangeMidpoint(primer.start, primer.end, scale.seqLength);
        addHiddenFeatureMeta(primer.id, primer.name, midpoint, rowTopY);
      });
    });

    primerReverseRows.forEach((row, rowIndex) => {
      const rowTopY = primerReverseY + rowIndex * primerRowHeight;
      row.forEach(primer => {
        if (inlinePrimerIds.has(primer.id)) return;
        const midpoint = rangeMidpoint(primer.start, primer.end, scale.seqLength);
        addHiddenFeatureMeta(primer.id, primer.name, midpoint, rowTopY);
      });
    });

    orfRows.forEach((row, rowIndex) => {
      const rowTopY = orfStartY + rowIndex * orfRowHeight;
      row.forEach(orf => {
        const orfName = this.stripOrfMeta(orf).name;
        if (!orfName) return;
        const midpoint = rangeMidpoint(orf.start, orf.end, scale.seqLength);
        addHiddenFeatureMeta(this.getOrfId(orf), orfName, midpoint, rowTopY);
      });
    });

    const activeCallouts = Array.from(hiddenFeatureMetaById.entries())
      .filter(([id]) => !!mergedHoveredFeatures[id])
      .map(([id, meta]) => ({ id, ...meta }))
      .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));

    const totalHeight = Math.max(size.height || 0, Math.max(currentY, mapBottom) + PADDING_BOTTOM);
    const totalWidth = Math.max(baseWidth || 0, mapWidth + 2 * PADDING_X);

    const mapSlug = name ? name.replace(/[^a-zA-Z0-9_-]+/g, "-") : "map";
    const mapId = `la-vz-${mapSlug}-viewer-linear-map`;

    return (
      <svg
        ref={inputRef(mapId, {
          end: seqLength,
          linearOffset: scale.offsetX,
          linearWidth: scale.width,
          ref: mapId,
          scrollLinearOnSelect: true,
          start: 0,
          type: "SEQ",
          viewer: "LINEAR",
        })}
        className="la-vz-viewer-linear-map"
        data-testid="la-vz-viewer-linear-map"
        height={totalHeight}
        id={mapId}
        overflow="hidden"
        style={viewerCircular}
        width={totalWidth}
        onMouseDown={handleMouseEvent}
        onMouseMove={handleMouseEvent}
        onMouseUp={handleMouseEvent}
        onWheel={this.handleScrollEvent}
      >
        <Selection height={selectionHighlightHeight} scale={scale} showEdges={false} y={selectionHighlightTop} />
        <OrfTrack
          featureHeight={orfFeatureHeight}
          getFeatureId={this.getOrfId}
          inputRef={inputRef}
          isFeatureHovered={this.isFeatureHovered}
          onFeatureHover={this.handleFeatureHover}
          rowSpacing={orfRowHeight}
          rows={orfRows}
          scale={scale}
          startY={orfStartY}
          stripOrfMeta={this.stripOrfMeta}
        />
        <AnnotationTrack
          featureHeight={annotationFeatureHeight}
          inlineAnnotationIds={inlineAnnotationIds}
          inputRef={inputRef}
          isFeatureHovered={this.isFeatureHovered}
          onFeatureHover={this.handleFeatureHover}
          rowSpacing={annotationRowHeight}
          rows={combinedAnnotationRows}
          scale={scale}
          startY={annotationStartY}
        />
        <PrimerTrack
          featureHeight={primerFeatureHeight}
          inlinePrimerIds={inlinePrimerIds}
          inputRef={inputRef}
          isFeatureHovered={this.isFeatureHovered}
          onFeatureHover={this.handleFeatureHover}
          rowSpacing={primerRowHeight}
          rows={primerForwardRows}
          scale={scale}
          startY={primerForwardY}
        />
        <PrimerTrack
          featureHeight={primerFeatureHeight}
          inlinePrimerIds={inlinePrimerIds}
          inputRef={inputRef}
          isFeatureHovered={this.isFeatureHovered}
          onFeatureHover={this.handleFeatureHover}
          rowSpacing={primerRowHeight}
          rows={primerReverseRows}
          scale={scale}
          startY={primerReverseY}
        />
        <LinearMapSeparators
          bottom={segmentLineBottom}
          onSeparatorClick={onSeparatorClick}
          scale={scale}
          separators={separators}
          top={segmentLineTop}
        />
        <Find
          height={findHeight}
          highlights={highlights}
          inputRef={inputRef}
          scale={scale}
          search={search}
          y={mapBottom - findHeight / 2}
        />
        <Selection height={selectionHighlightHeight} scale={scale} showFill={false} y={selectionHighlightTop} />
        {showIndex ? (
          <Index lineHeight={LINE_HEIGHT} scale={scale} seqLength={seqLength} showIndex={showIndex} y={indexY} />
        ) : (
          <line
            className="la-vz-linear-map-baseline"
            style={circularLabelLine}
            x1={scale.offsetX}
            x2={scale.offsetX + scale.width}
            y1={mapBottom}
            y2={mapBottom}
          />
        )}
        {!!enzymeLabelsWithSource.length && (
          <Labels
            connectorY={mapBottom}
            hoveredFeatures={mergedHoveredFeatures}
            labels={enzymeLabelsWithSource}
            lineHeight={LINE_HEIGHT}
            scale={scale}
            selectedFeatures={selectedFeaturesMap}
            startY={enzymeLabelsStartY}
            onHoverFeatures={this.handleLabelHoverFeatures}
          />
        )}
        {!!activeCallouts.length && (
          <g className="la-vz-linear-map-feature-callouts" style={{ pointerEvents: "none" }}>
            {activeCallouts.map(callout => {
              const textWidth = Math.max((callout.name.length + 1) * CHAR_WIDTH, CHAR_WIDTH * 3);
              const horizontalPadding = CHAR_WIDTH * 0.9;
              const verticalPadding = LINE_HEIGHT * 0.4;
              const rectWidth = textWidth + horizontalPadding * 2;
              const rectHeight = LINE_HEIGHT + verticalPadding * 2;
              const maxRectX = scale.offsetX + scale.width - rectWidth;
              const rectX = clamp(callout.x - rectWidth / 2, scale.offsetX, maxRectX);
              const rectY = Math.max(0, callout.y - rectHeight / 2);
              const textX = rectX + rectWidth / 2;

              return (
                <g key={`feature-callout-${callout.id}`} style={{ pointerEvents: "none" }}>
                  <rect fill="white" height={rectHeight} stroke="black" strokeWidth={1} width={rectWidth} x={rectX} y={rectY} />
                  <text
                    className="la-vz-linear-map-feature-callout-label"
                    dominantBaseline="middle"
                    style={circularLabel}
                    textAnchor="middle"
                    x={textX}
                    y={callout.y}
                  >
                    {callout.name}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </svg>
    );
  }

  private setFeatureHoverState = (featureIds: string[], hover: boolean) => {
    if (!featureIds.length) return;

    this.setState((prevState: LinearMapState) => {
      const hoveredFeatures = { ...prevState.hoveredFeatures };
      let changed = false;

      featureIds.forEach(id => {
        if (!id) return;
        if (hover) {
          if (!hoveredFeatures[id]) {
            hoveredFeatures[id] = true;
            changed = true;
          }
        } else if (hoveredFeatures[id]) {
          delete hoveredFeatures[id];
          changed = true;
        }
      });

      return changed ? { hoveredFeatures } : null;
    });
  };

  private handleLabelHoverFeatures = (featureIds: string[], hover: boolean) => {
    this.setFeatureHoverState(featureIds, hover);
  };

  private handleFeatureHover = (featureId: string, underline: boolean) => {
    const label = this.labelLookup.get(featureId);
    const featureIds = label ? label.labels.map(item => item.id) : [featureId];

    this.setFeatureHoverState(featureIds, underline);

    if (label) {
      this.updateLabelUnderlineForLabel(label, underline);
    }
  };

  private getLabelSourceY(
    label: LinearLabelDatum,
    context: {
      annotationRowHeight: number;
      annotationRowIndex: Map<string, number>;
      annotationStartY: number;
      baselineY: number;
      primerForwardRowHeight: number;
      primerForwardRowIndex: Map<string, number>;
      primerForwardY: number;
      primerReverseRowHeight: number;
      primerReverseRowIndex: Map<string, number>;
      primerReverseY: number;
    },
  ): number | null {
    const primary = label.labels[0];
    if (!primary) return null;

    if (label.groupType === "annotation") {
      const rowIndex = context.annotationRowIndex.get(primary.id);
      if (typeof rowIndex === "undefined") return context.annotationStartY;
      const rowY = context.annotationStartY + rowIndex * context.annotationRowHeight;
      return rowY + LINE_HEIGHT * ANNOTATION_HEIGHT_RATIO;
    }

    if (label.groupType === "primer") {
      const direction = primary.direction || 1;
      if (direction === 1) {
        const rowIndex = context.primerForwardRowIndex.get(primary.id);
        if (typeof rowIndex === "undefined") return context.primerForwardY;
        const rowY = context.primerForwardY + rowIndex * context.primerForwardRowHeight;
        return rowY + LINE_HEIGHT * PRIMER_HEIGHT_RATIO;
      }
      const rowIndex = context.primerReverseRowIndex.get(primary.id);
      if (typeof rowIndex === "undefined") return context.primerReverseY;
      const rowY = context.primerReverseY + rowIndex * context.primerReverseRowHeight;
      return rowY + LINE_HEIGHT * PRIMER_HEIGHT_RATIO;
    }

    if (label.groupType === "enzyme") {
      return context.baselineY;
    }

    return null;
  }

  private getOrfId = getOrfId;

  private stripOrfMeta = stripOrfMeta;

  private buildOrfIdentifier = buildOrfIdentifier;

  private isFeatureHovered = (id: string): boolean =>
    isFeatureHovered(id, this.state.hoveredFeatures, this.selectedFeatureIds);

  private getMergedHoverState = (selectedFeatures: Set<string>): Record<string, boolean> =>
    getMergedHoverState(selectedFeatures, this.state.hoveredFeatures);

  private getFeatureIdsForSelection = (selection?: SelectionState): string[] =>
    getFeatureIdsForSelection(selection, this.labelLookup);

  private updateLabelUnderlineForLabel(label: LinearLabelDatum, underline: boolean, force = false) {
    let nextUnderline = underline;
    if (!force && !underline) {
      const hasSelected = label.labels.some(item => this.selectedFeatureIds.has(item.id));
      if (hasSelected) {
        nextUnderline = true;
      }
    }
    setHoveredLabelUnderline(label.groupId, nextUnderline);
  }

  private updateLabelUnderlineForFeatureId(featureId: string, underline: boolean, force = false) {
    if (!featureId) return;
    const label = this.labelLookup.get(featureId);
    if (!label) return;
    this.updateLabelUnderlineForLabel(label, underline, force);
  }

  private syncSelectionUnderlines(prevSelection: Set<string>, nextSelection: Set<string>) {
    prevSelection.forEach(id => {
      if (!nextSelection.has(id) && !this.state.hoveredFeatures[id]) {
        this.updateLabelUnderlineForFeatureId(id, false, true);
      }
    });
    nextSelection.forEach(id => {
      if (!prevSelection.has(id)) {
        this.updateLabelUnderlineForFeatureId(id, true, true);
      }
    });
  }

  private areSetsEqual(a: Set<string>, b: Set<string>) {
    if (a.size !== b.size) return false;
    let equal = true;
    a.forEach(value => {
      if (!b.has(value)) {
        equal = false;
      }
    });
    return equal;
  }

  private computeLabelLayout(annotations: Annotation[], primers: Primer[], cutSites: CutSite[], scale: LinearMapScale) {
    const inlineAnnotationIds = new Set<string>();
    const inlinePrimerIds = new Set<string>();
    const enzymeLabels: RawLabel[] = [];
    const seenEnzymeLabelKeys = new Set<string>();

    annotations.forEach(annotation => {
      if (!annotation.name) return;
      const lengthPx = rangeLength(annotation.start, annotation.end, scale.seqLength) * scale.pxPerBase;
      const textWidth = (annotation.name.length + 2) * CHAR_WIDTH;
      if (lengthPx >= textWidth) {
        inlineAnnotationIds.add(annotation.id);
      }
    });

    primers.forEach(primer => {
      if (!primer.name) return;
      const lengthPx = rangeLength(primer.start, primer.end, scale.seqLength) * scale.pxPerBase;
      const textWidth = (primer.name.length + 2) * CHAR_WIDTH;
      if (lengthPx >= textWidth) {
        inlinePrimerIds.add(primer.id);
      }
    });

    cutSites.forEach(site => {
      const name = site.name || site.enzyme?.name;
      if (!name) return;

      const rawCut = site.direction === -1 ? site.rcut : site.fcut;
      const normalizedCut = normalizeBase(rawCut, scale.seqLength) + 1;
      const direction = site.direction === 1 || site.direction === -1 ? site.direction : undefined;
      const labelKey = `${name}|${site.start}|${site.end}|${site.fcut}|${site.rcut}`;
      if (seenEnzymeLabelKeys.has(labelKey)) {
        return;
      }
      seenEnzymeLabelKeys.add(labelKey);

      enzymeLabels.push({
        cutPosition: normalizedCut,
        direction,
        end: site.end,
        id: site.id,
        items: [
          createLabelItemWithSelection(
            {
              direction,
              end: site.end,
              fcut: site.fcut,
              id: site.id,
              name,
              rcut: site.rcut,
              start: site.start,
              type: "enzyme",
            },
            "ENZYME",
            { scrollLinearOnSelect: true },
          ),
        ],
        name,
        start: site.start,
        type: "enzyme",
      });
    });

    const arrangedEnzymes = this.layoutEnzymeLabels(enzymeLabels, scale);

    return {
      enzymeLabels: arrangedEnzymes,
      inlineAnnotationIds,
      inlinePrimerIds,
    };
  }

  /**
   * Multi-row cascade layout for enzyme labels.
   *
   * Algorithm (left-to-right by cut position):
   *  1. Place the first enzyme on row 0.
   *  2. For each subsequent enzyme, check against the *last individually-placed*
   *     label ("lastVisible"):
   *     a) No overlap → place on row 0, reset.
   *     b) Overlaps the label text but NOT the connector line (anchorX) →
   *        cascade one row down (up to ENZYME_MAX_LABEL_ROWS - 1).
   *     c) Overlaps the connector line OR all rows exhausted → add to a "+N"
   *        overflow group positioned after lastVisible on row lastVisible.row + 1.
   *  3. When a non-overlapping enzyme is found, finalize any open group and
   *     return to row 0.
   *
   * Because connectors from the baseline only reach up to the label's own row,
   * a row-N connector never crosses through row-(N-1) label text. The anchorX
   * check prevents placing a label where a higher-row connector would cross it.
   */
  private layoutEnzymeLabels(rawLabels: RawLabel[], scale: LinearMapScale): LinearLabelDatum[] {
    if (!rawLabels.length) return [];

    // --- Step 1: Position each enzyme at its cut site ---
    const positioned: LinearLabelDatum[] = rawLabels
      .filter(label => label.name && label.name.trim().length)
      .map(label => {
        const cutBase = typeof label.cutPosition === "number" ? label.cutPosition - 1 : label.start;
        const cutBp = normalizeBase(cutBase, scale.seqLength);
        const anchorX = clamp(scale.offsetX + cutBp * scale.pxPerBase, scale.offsetX, scale.offsetX + scale.width);
        const labelItems =
          label.items && label.items.length
            ? label.items
            : [
                createLabelItemWithSelection(
                  {
                    direction: label.direction,
                    end: label.end,
                    id: label.id,
                    name: label.name,
                    start: label.start,
                    type: label.type,
                  },
                  getSelectionTypeForLabel(label.type),
                  { scrollLinearOnSelect: label.type === "enzyme" },
                ),
              ];
        const uniqueNames = Array.from(
          new Set(
            labelItems.map(item => item.name).filter((value): value is string => !!value && value.trim().length > 0),
          ),
        );
        const baseName = uniqueNames.length ? uniqueNames.join("+") : label.name;
        const displayName =
          label.type === "enzyme" && typeof label.cutPosition === "number"
            ? `${baseName}(${label.cutPosition})`
            : baseName;
        const textWidth = Math.max((displayName.length + 2) * CHAR_WIDTH, ENZYME_LABEL_MIN_WIDTH);
        const maxLeft = scale.offsetX + scale.width - textWidth;
        let left = anchorX - textWidth / 2;
        left = clamp(left, scale.offsetX, maxLeft);
        const right = left + textWidth;

        return {
          anchorX,
          displayName,
          groupId: label.id,
          groupType: label.type as "annotation" | "primer" | "enzyme",
          grouped: false,
          labels: labelItems.map(item => ({ ...item })),
          left,
          right,
          row: 0,
          textAnchor: "middle" as const,
          textWidth,
          textX: left + textWidth / 2,
        };
      })
      .sort((a, b) => a.anchorX - b.anchorX);

    if (!positioned.length) return [];

    // --- Step 2: Cascade placement ---
    const result: LinearLabelDatum[] = [];
    let lastVisible: LinearLabelDatum | null = null;
    let openGroup: {
      anchorX: number;
      labels: LinearLabelDatum[];
      row: number;
      left: number;
    } | null = null;
    let groupCounter = 0;

    const overlapsLabel = (enzyme: LinearLabelDatum, ref: LinearLabelDatum): boolean =>
      enzyme.left < ref.right + LABEL_GAP;

    const overlapsConnectorLine = (enzyme: LinearLabelDatum, ref: LinearLabelDatum): boolean =>
      enzyme.left < ref.anchorX;

    const finalizeGroup = () => {
      if (!openGroup || !openGroup.labels.length) {
        openGroup = null;
        return;
      }

      // If only 1 enzyme in the group, render it directly instead of a "+1" label.
      if (openGroup.labels.length === 1) {
        const solo = openGroup.labels[0];
        result.push({ ...solo, row: openGroup.row });
        openGroup = null;
        return;
      }

      const count = openGroup.labels.reduce((n, l) => n + l.labels.length, 0);
      const displayName = `+${count}`;
      const textWidth = Math.max((displayName.length + 2) * CHAR_WIDTH, ENZYME_LABEL_MIN_WIDTH);
      const maxLeft = scale.offsetX + scale.width - textWidth;
      let left = openGroup.left;
      left = clamp(left, scale.offsetX, maxLeft);
      const right = left + textWidth;
      result.push({
        anchorX: openGroup.anchorX,
        displayName,
        groupId: `enzyme-cascade-group-${groupCounter++}`,
        groupType: "enzyme",
        grouped: true,
        labels: openGroup.labels.flatMap(l => l.labels.map(item => ({ ...item }))),
        left,
        right,
        row: openGroup.row,
        textAnchor: "middle",
        textWidth,
        textX: left + textWidth / 2,
      });
      openGroup = null;
    };

    for (let i = 0; i < positioned.length; i++) {
      const enzyme = positioned[i];

      // First enzyme or no overlap with lastVisible → place on row 0, reset.
      if (!lastVisible || !overlapsLabel(enzyme, lastVisible)) {
        finalizeGroup();
        const placed = { ...enzyme, row: 0 };
        result.push(placed);
        lastVisible = placed;
        continue;
      }

      // At this point lastVisible is guaranteed non-null.
      const ref = lastVisible;

      // Overlaps lastVisible's label text.
      // Check if it also overlaps the connector line.
      if (overlapsConnectorLine(enzyme, ref)) {
        // Too close — add to overflow group, placed to the right of last visible's line, between rows.
        const groupRow = ref.row + 0.5;
        if (!openGroup) {
          openGroup = {
            anchorX: ref.anchorX,
            labels: [],
            row: groupRow,
            // Place to the right of the previous visible enzyme's connector line.
            left: ref.anchorX - 8,
          };
        }
        openGroup.labels.push(enzyme);
        continue;
      }

      // Overlaps label text but NOT connector line → cascade down one row.
      const targetRow = ref.row + 1;
      if (targetRow < ENZYME_MAX_LABEL_ROWS) {
        finalizeGroup();
        const placed = { ...enzyme, row: targetRow };
        result.push(placed);
        lastVisible = placed;
      } else {
        // All individual rows exhausted — add to group, placed to the right of last visible's line, between rows.
        const groupRow = ref.row + 0.5;
        if (!openGroup) {
          openGroup = {
            anchorX: ref.anchorX,
            labels: [],
            row: groupRow,
            // Place to the right of the previous visible enzyme's connector line.
            left: ref.anchorX - 8,
          };
        }
        openGroup.labels.push(enzyme);
      }
    }

    // Finalize any trailing group.
    finalizeGroup();

    return result;
  }
}
