import * as React from "react";

import { setHoveredLabelUnderline } from "../Circular/WrappedGroupLabel";
import { InputRefFunc } from "../SelectionHandler";
import { CHAR_WIDTH } from "../SeqViewerContainer";
import CentralIndexContext from "../centralIndexContext";
import { COLOR_BORDER_MAP, darkerColor } from "../colors";
import { Annotation, CutSite, Highlight, Primer, Range, Size } from "../elements";
import { stackElements } from "../elementsToRows";
import { isEqual } from "../isEqual";
import { annotation as annotationStyle, annotationLabel, viewerCircular, circularLabelLine } from "../style";
import { Selection as SelectionState } from "../selectionContext";
import { Find } from "./Find";
import { Index } from "./Index";
import { Labels, LinearLabelDatum } from "./Labels";
import { Selection } from "./Selection";
import { LinearMapScale, clamp, createSegments, normalizeBase, rangeLength, rangeMidpoint } from "./utils";

const LINE_HEIGHT = 14;
const TRACK_GAP = 12;
const ROW_GAP = 4;
const PADDING_X = 40;
const PADDING_Y = 30;
const LABEL_GAP = 14;
const MIN_MAP_WIDTH = 160;
const ANNOTATION_HEIGHT_RATIO = 0.8;
const PRIMER_HEIGHT_RATIO = 0.7;
const SELECTION_HEIGHT_RATIO = 0.85;

type RawLabelItem = {
  direction?: 1 | -1;
  id: string;
  name: string;
  type: "annotation" | "primer" | "enzyme";
};

interface RawLabel {
  cutPosition?: number;
  direction?: 1 | -1;
  end: number;
  id: string;
  items?: RawLabelItem[];
  name: string;
  start: number;
  type: "annotation" | "primer" | "enzyme";
}

export interface LinearMapProps {
  annotations: Annotation[];
  cutSites: CutSite[];
  handleMouseEvent: (e: any) => void;
  highlights: Highlight[];
  inputRef: InputRefFunc;
  name: string;
  primers: Primer[];
  rotateOnScroll?: boolean;
  search: Range[];
  selection?: SelectionState;
  seq: string;
  showIndex: boolean;
  size: Size;
}

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
    const { rotateOnScroll, seq } = this.props;
    if (!rotateOnScroll || !seq.length) return;

    const current = this.context?.linear || 0;
    let delta = seq.length * (e.deltaY / 5000);
    delta = Math.round(delta);
    if (delta === 0) {
      delta = e.deltaY > 0 ? 1 : -1;
    }

    const seqLength = seq.length;
    const next = (current + delta + seqLength) % seqLength;
    this.context?.setCentralIndex?.("LINEAR", next);
  };

  render() {
    const {
      annotations = [],
      cutSites = [],
      handleMouseEvent,
      highlights = [],
      inputRef,
      name,
      primers = [],
      search = [],
      seq,
      showIndex,
      size,
    } = this.props;

    const seqLength = Math.max(seq.length, 1);
    const annotationRows = stackElements(annotations, seqLength);
    const primerForwardRows = stackElements(
      primers.filter(primer => primer.direction === 1),
      seqLength
    );
    const primerReverseRows = stackElements(
      primers.filter(primer => primer.direction === -1),
      seqLength
    );

    const annotationRowIndex = new Map<string, number>();
    annotationRows.forEach((row, rowIndex) => {
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
    const mapWidth = Math.max(baseWidth - 2 * PADDING_X, MIN_MAP_WIDTH);
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

    const { enzymeLabels, featureLabels, inlineAnnotationIds, inlinePrimerIds } = this.computeLabelLayout(
      annotations,
      primers,
      cutSites,
      scale
    );
    const enzymeLabelRowMax = enzymeLabels.reduce((acc, label) => Math.max(acc, label.row), -1);
    const enzymeLabelsHeight = enzymeLabelRowMax >= 0 ? (enzymeLabelRowMax + 1) * LINE_HEIGHT : 0;
    const featureLabelRowMax = featureLabels.reduce((acc, label) => Math.max(acc, label.row), -1);
    const featureLabelsHeight = featureLabelRowMax >= 0 ? (featureLabelRowMax + 1) * LINE_HEIGHT : 0;
    const enzymeLabelsStartY = PADDING_Y;

    let currentY = PADDING_Y;
    if (enzymeLabelsHeight) {
      currentY += enzymeLabelsHeight + LABEL_GAP;
    }

    const indexY = showIndex ? currentY : 0;
    const mapBottom = showIndex ? indexY + LINE_HEIGHT / 2 : currentY;
    if (showIndex) {
      currentY += LINE_HEIGHT + TRACK_GAP;
    } else {
      currentY += TRACK_GAP;
    }

    const annotationStartY = currentY;
    const annotationAreaHeight = annotationRows.length ? annotationRows.length * annotationRowHeight - ROW_GAP : 0;
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
    if (annotationAreaHeight) featureAreaBottomCandidates.push(annotationStartY + annotationAreaHeight);
    if (primerForwardHeight) featureAreaBottomCandidates.push(primerForwardY + primerForwardHeight);
    if (primerReverseHeight) featureAreaBottomCandidates.push(primerReverseY + primerReverseHeight);
    const featureAreaBottom = Math.max(...featureAreaBottomCandidates);

    const selectionHighlightTop = mapBottom + 1;
    const selectionHighlightBottom = Math.max(featureAreaBottom, selectionHighlightTop + selectionHeight);
    const selectionHighlightHeight = selectionHighlightBottom - selectionHighlightTop;

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

    const featureLabelsWithSource = featureLabels.map(label => ({
      ...label,
      sourceY: this.getLabelSourceY(label, labelSourceContext),
    }));

    const labelsWithSource = [...enzymeLabelsWithSource, ...featureLabelsWithSource];

    const featureLabelLookup = new Map<string, LinearLabelDatum>();
    labelsWithSource.forEach(label => {
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

    const featureLabelsStartY = featureAreaBottom + (featureLabelsHeight ? LABEL_GAP : 0);
    if (featureLabelsHeight) {
      currentY = featureLabelsStartY + featureLabelsHeight;
    } else {
      currentY = featureAreaBottom;
    }

    const totalHeight = Math.max(size.height || 0, Math.max(currentY, mapBottom) + PADDING_Y);
    const totalWidth = baseWidth > 0 ? baseWidth : mapWidth + 2 * PADDING_X;

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
        overflow="visible"
        style={viewerCircular}
        width={totalWidth}
        onMouseDown={handleMouseEvent}
        onMouseMove={handleMouseEvent}
        onMouseUp={handleMouseEvent}
        onWheel={this.handleScrollEvent}
      >
        <Selection height={selectionHighlightHeight} scale={scale} showEdges={false} y={selectionHighlightTop} />
        {this.renderAnnotationRows(annotationRows, scale, annotationStartY, inlineAnnotationIds)}
        {this.renderPrimerRows(primerForwardRows, scale, primerForwardY, inlinePrimerIds)}
        {this.renderPrimerRows(primerReverseRows, scale, primerReverseY, inlinePrimerIds)}
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
            selectedFeatures={selectedFeaturesMap}
            startY={enzymeLabelsStartY}
            onHoverFeatures={this.handleLabelHoverFeatures}
          />
        )}
        {!!featureLabelsWithSource.length && (
          <Labels
            connectorY={mapBottom}
            hoveredFeatures={mergedHoveredFeatures}
            labels={featureLabelsWithSource}
            lineHeight={LINE_HEIGHT}
            selectedFeatures={selectedFeaturesMap}
            startY={featureLabelsStartY}
            onHoverFeatures={this.handleLabelHoverFeatures}
          />
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
    }
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

  private renderAnnotationRows(
    rows: Annotation[][],
    scale: LinearMapScale,
    startY: number,
    inlineAnnotationIds: Set<string>
  ) {
    if (!rows.length) return null;
    const height = LINE_HEIGHT * ANNOTATION_HEIGHT_RATIO;

    return (
      <g className="la-vz-linear-map-annotations">
        {rows.map((row, rowIndex) => {
          const rowY = startY + rowIndex * (LINE_HEIGHT + ROW_GAP);
          return (
            <g key={`annotation-row-${rowIndex}`} transform={`translate(0, ${rowY})`}>
              {row.map(annotation => this.renderAnnotation(annotation, scale, height, inlineAnnotationIds))}
            </g>
          );
        })}
      </g>
    );
  }

  private renderAnnotation(
    annotation: Annotation,
    scale: LinearMapScale,
    height: number,
    inlineAnnotationIds: Set<string>
  ) {
    const segments = createSegments(annotation.start, annotation.end, scale.seqLength);
    const midpoint = rangeMidpoint(annotation.start, annotation.end, scale.seqLength);
    const textX = scale.offsetX + midpoint * scale.pxPerBase;
    const strokeColor = annotation.color
      ? COLOR_BORDER_MAP[annotation.color] || darkerColor(annotation.color)
      : "gray";
    const hasLabel = this.labelLookup.has(annotation.id);
    const inline = inlineAnnotationIds.has(annotation.id);
    const isInteractive = hasLabel || inline;
    const isHovered = this.isFeatureHovered(annotation.id);
    const baseStyle = {
      ...annotationStyle,
      cursor: isInteractive ? "pointer" : annotationStyle.cursor,
      fill: annotation.color,
      stroke: strokeColor,
    } as React.CSSProperties;
    const hoverStyle = isHovered ? { ...baseStyle, fillOpacity: 1 } : baseStyle;
    const textHoverStyle = inline && annotation.name
      ? {
          ...annotationLabel,
          textDecoration: isHovered ? "underline" : "none",
        }
      : annotationLabel;

    return (
      <g key={`annotation-${annotation.id}`} className="la-vz-linear-map-annotation">
        {segments.map((segment, index) => {
          const width = (segment.end - segment.start) * scale.pxPerBase;
          if (width <= 0) return null;
          const x = scale.offsetX + segment.start * scale.pxPerBase;
          return (
            <rect
              key={`annotation-${annotation.id}-segment-${segment.start}-${segment.end}`}
              ref={
                index === 0
                  ? this.props.inputRef(annotation.id, {
                      direction: annotation.direction,
                      end: annotation.end,
                      name: annotation.name,
                      ref: annotation.id,
                      scrollLinearOnSelect: true,
                      start: annotation.start,
                      type: "ANNOTATION",
                      viewer: "LINEAR",
                    })
                  : undefined
              }
              className={`${annotation.id} la-vz-annotation`}
              height={height}
              id={annotation.id}
              style={hoverStyle}
              width={width}
              x={x}
              y={0}
              onMouseEnter={isInteractive ? () => this.handleFeatureHover(annotation.id, true) : undefined}
              onMouseLeave={isInteractive ? () => this.handleFeatureHover(annotation.id, false) : undefined}
            />
          );
        })}
        {inline && annotation.name && (
          <text
            className="la-vz-annotation-label"
            dominantBaseline="middle"
            style={textHoverStyle}
            textAnchor="middle"
            x={textX}
            y={height / 2}
            onMouseEnter={() => this.handleFeatureHover(annotation.id, true)}
            onMouseLeave={() => this.handleFeatureHover(annotation.id, false)}
          >
            {annotation.name}
          </text>
        )}
      </g>
    );
  }

  private renderPrimerRows(
    rows: Primer[][],
    scale: LinearMapScale,
    startY: number,
    inlinePrimerIds: Set<string>
  ) {
    if (!rows.length) return null;
    const height = LINE_HEIGHT * PRIMER_HEIGHT_RATIO;

    return (
      <g className="la-vz-linear-map-primers">
        {rows.map((row, rowIndex) => {
          const rowY = startY + rowIndex * (LINE_HEIGHT + ROW_GAP);
          return (
            <g key={`primer-row-${rowIndex}`} transform={`translate(0, ${rowY})`}>
              {row.map(primer => this.renderPrimer(primer, scale, height, inlinePrimerIds))}
            </g>
          );
        })}
      </g>
    );
  }

  private renderPrimer(primer: Primer, scale: LinearMapScale, height: number, inlinePrimerIds: Set<string>) {
    const segments = createSegments(primer.start, primer.end, scale.seqLength);
    const midpoint = rangeMidpoint(primer.start, primer.end, scale.seqLength);
    const textX = scale.offsetX + midpoint * scale.pxPerBase;
    const strokeColor = primer.color
      ? COLOR_BORDER_MAP[primer.color] || darkerColor(primer.color)
      : "#555";
    const hasLabel = this.labelLookup.has(primer.id);
    const inline = inlinePrimerIds.has(primer.id);
    const isInteractive = hasLabel || inline;
    const isHovered = this.isFeatureHovered(primer.id);
    const baseStyle = {
      ...annotationStyle,
      cursor: isInteractive ? "pointer" : annotationStyle.cursor,
      fill: primer.color,
      stroke: strokeColor,
    } as React.CSSProperties;
    const hoverStyle = isHovered ? { ...baseStyle, fillOpacity: 1 } : baseStyle;
    const arrowBaseStyle = {
      ...annotationStyle,
      cursor: isInteractive ? "pointer" : annotationStyle.cursor,
      fill: primer.color,
      stroke: strokeColor,
    } as React.CSSProperties;
    const arrowStyle = isHovered ? { ...arrowBaseStyle, fillOpacity: 1 } : arrowBaseStyle;
    const textHoverStyle = inline && primer.name
      ? {
          ...annotationLabel,
          textDecoration: isHovered ? "underline" : "none",
        }
      : annotationLabel;

    return (
      <g key={`primer-${primer.id}`} className="la-vz-linear-map-primer">
        {segments.map((segment, index) => {
          const width = (segment.end - segment.start) * scale.pxPerBase;
          if (width <= 0) return null;
          const x = scale.offsetX + segment.start * scale.pxPerBase;
          const arrowWidth = Math.min(width / 2, 10);
          const bodyWidth = Math.max(width - arrowWidth, 0);
          const isForward = primer.direction === 1;
          const bodyX = isForward ? x : x + arrowWidth;
          const arrowPoints = isForward
            ? `${x + bodyWidth},0 ${x + width},${height / 2} ${x + bodyWidth},${height}`
            : `${x + arrowWidth},0 ${x},${height / 2} ${x + arrowWidth},${height}`;

          return (
            <g key={`primer-${primer.id}-segment-${segment.start}-${segment.end}`}>
              {bodyWidth > 0 && (
                <rect
                  ref={
                    index === 0
                      ? this.props.inputRef(primer.id, {
                          direction: primer.direction,
                          end: primer.end,
                          name: primer.name,
                          ref: primer.id,
                          scrollLinearOnSelect: true,
                          start: primer.start,
                          type: "PRIMER",
                          viewer: "LINEAR",
                        })
                      : undefined
                  }
                  className={`${primer.id} la-vz-primer`}
                  height={height}
                  id={primer.id}
                  style={hoverStyle}
                  width={bodyWidth}
                  x={bodyX}
                  y={0}
                  onMouseEnter={isInteractive ? () => this.handleFeatureHover(primer.id, true) : undefined}
                  onMouseLeave={isInteractive ? () => this.handleFeatureHover(primer.id, false) : undefined}
                />
              )}
              <polygon
                className={`${primer.id} la-vz-primer-arrow`}
                id={primer.id}
                points={arrowPoints}
                style={arrowStyle}
                onMouseEnter={isInteractive ? () => this.handleFeatureHover(primer.id, true) : undefined}
                onMouseLeave={isInteractive ? () => this.handleFeatureHover(primer.id, false) : undefined}
              />
            </g>
          );
        })}
        {inline && primer.name && (
          <text
            className="la-vz-primer-label"
            dominantBaseline="middle"
            style={textHoverStyle}
            textAnchor="middle"
            x={textX}
            y={height / 2}
            onMouseEnter={() => this.handleFeatureHover(primer.id, true)}
            onMouseLeave={() => this.handleFeatureHover(primer.id, false)}
          >
            {primer.name}
          </text>
        )}
      </g>
    );
  }

  private isFeatureHovered = (id: string): boolean => {
    if (!id) return false;
    return !!this.state.hoveredFeatures[id] || this.selectedFeatureIds.has(id);
  };

  private getMergedHoverState(selectedFeatures: Set<string>): Record<string, boolean> {
    const merged: Record<string, boolean> = { ...this.state.hoveredFeatures };
    selectedFeatures.forEach(id => {
      if (id) {
        merged[id] = true;
      }
    });
    return merged;
  }

  private getFeatureIdsForSelection(selection?: SelectionState): string[] {
    if (!selection) return [];
    const { id, ref, type } = selection;
    const targetId = ref || id || "";
    if (!targetId) return [];
    const allowedTypes = new Set(["ANNOTATION", "PRIMER", "ENZYME"]);
    if (!type || !allowedTypes.has(type)) {
      return [];
    }
    const label = this.labelLookup.get(targetId);
    if (label) {
      return label.labels.map(item => item.id).filter(Boolean);
    }
    return [targetId];
  }

  private updateLabelUnderlineForLabel(label: LinearLabelDatum, underline: boolean, force = false) {
    let nextUnderline = underline;
    if (!force && !underline) {
      const hasSelected = label.labels.some(item => this.selectedFeatureIds.has(item.id));
      if (hasSelected) {
        nextUnderline = true;
      }
    }
    setHoveredLabelUnderline(label.groupId, nextUnderline);
    label.labels.forEach(item => {
      if (item.id !== label.groupId) {
        setHoveredLabelUnderline(item.id, nextUnderline);
      }
    });
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

  private computeLabelLayout(
    annotations: Annotation[],
    primers: Primer[],
    cutSites: CutSite[],
    scale: LinearMapScale
  ) {
    const inlineAnnotationIds = new Set<string>();
    const inlinePrimerIds = new Set<string>();
    const featureLabels: RawLabel[] = [];
    const enzymeLabels: RawLabel[] = [];
    const seenEnzymeLabelKeys = new Set<string>();

    annotations.forEach(annotation => {
      if (!annotation.name) return;
      const lengthPx = rangeLength(annotation.start, annotation.end, scale.seqLength) * scale.pxPerBase;
      const textWidth = (annotation.name.length + 2) * CHAR_WIDTH;
      if (lengthPx >= textWidth) {
        inlineAnnotationIds.add(annotation.id);
      } else {
        featureLabels.push({
          end: annotation.end,
          id: annotation.id,
          items: [
            {
              direction: annotation.direction === 1 || annotation.direction === -1 ? annotation.direction : undefined,
              id: annotation.id,
              name: annotation.name,
              type: "annotation",
            },
          ],
          name: annotation.name,
          start: annotation.start,
          type: "annotation",
        });
      }
    });

    primers.forEach(primer => {
      if (!primer.name) return;
      const lengthPx = rangeLength(primer.start, primer.end, scale.seqLength) * scale.pxPerBase;
      const textWidth = (primer.name.length + 2) * CHAR_WIDTH;
      if (lengthPx >= textWidth) {
        inlinePrimerIds.add(primer.id);
      } else {
        featureLabels.push({
          direction: primer.direction,
          end: primer.end,
          id: primer.id,
          items: [
            {
              direction: primer.direction,
              id: primer.id,
              name: primer.name,
              type: "primer",
            },
          ],
          name: primer.name,
          start: primer.start,
          type: "primer",
        });
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
          {
            direction,
            id: site.id,
            name,
            type: "enzyme",
          },
        ],
        name,
        start: site.start,
        type: "enzyme",
      });
    });

    const arrangedFeatures = this.layoutLabels(featureLabels, scale);
    const arrangedEnzymes = this.layoutLabels(enzymeLabels, scale);

    return {
      enzymeLabels: arrangedEnzymes,
      featureLabels: arrangedFeatures,
      inlineAnnotationIds,
      inlinePrimerIds,
    };
  }

  private layoutLabels(rawLabels: RawLabel[], scale: LinearMapScale): LinearLabelDatum[] {
    if (!rawLabels.length) return [];

    const sorted = rawLabels
      .filter(label => label.name && label.name.trim().length)
      .sort((a, b) => {
        const aMid = rangeMidpoint(a.start, a.end, scale.seqLength);
        const bMid = rangeMidpoint(b.start, b.end, scale.seqLength);
        return aMid - bMid;
      });

    const positioned: LinearLabelDatum[] = sorted.map(label => {
      const midpoint = rangeMidpoint(label.start, label.end, scale.seqLength);
      const anchorX = clamp(scale.offsetX + midpoint * scale.pxPerBase, scale.offsetX, scale.offsetX + scale.width);
      const labelItems = (label.items && label.items.length
        ? label.items
        : [
            {
              direction: label.direction,
              id: label.id,
              name: label.name,
              type: label.type,
            },
          ]);
      const uniqueNames = Array.from(
        new Set(
          labelItems
            .map(item => item.name)
            .filter((value): value is string => !!value && value.trim().length > 0)
        )
      );
      const baseName = uniqueNames.length ? uniqueNames.join("+") : label.name;
      const displayName =
        label.type === "enzyme" && typeof label.cutPosition === "number"
          ? `${baseName} (${label.cutPosition})`
          : baseName;
      const textWidth = Math.max((displayName.length + 2) * CHAR_WIDTH, CHAR_WIDTH * 3);
      const maxLeft = scale.offsetX + scale.width - textWidth;
      let left = anchorX - textWidth / 2;
      left = clamp(left, scale.offsetX, maxLeft);
      const right = left + textWidth;

      return {
        anchorX,
        displayName,
        groupId: label.id,
        groupType: label.type,
        grouped: false,
        labels: labelItems.map(item => ({ ...item })),
        left,
        right,
        row: 0,
        textAnchor: "middle" as const,
        textWidth,
        textX: left + textWidth / 2,
      };
    });

    const rows: LinearLabelDatum[][] = [];
    positioned.forEach(label => {
      let rowIndex = 0;
      while (rows[rowIndex] && rows[rowIndex][rows[rowIndex].length - 1].right + LABEL_GAP > label.left) {
        rowIndex += 1;
      }
      label.row = rowIndex;
      if (!rows[rowIndex]) {
        rows[rowIndex] = [];
      }
      rows[rowIndex].push(label);
    });

    return rows.flat();
  }
}
