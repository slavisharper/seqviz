import * as React from "react";

import { InputRefFunc } from "../../SelectionHandler";
import { CHAR_WIDTH } from "../../SeqViewerContainer";
import { Annotation, CutSite, Highlight, NameRange, Primer, Range, Size, TranslationProp } from "../../core/elements";
import CentralIndexContext from "../../state/centralIndexContext";
import { Selection as SelectionState } from "../../state/selectionContext";
import { circularLabelLine, viewerCircular } from "../../style";
import { stackElements } from "../../utils/elementsToRows";
import { isEqual } from "../../utils/isEqual";
import { setHoveredLabelUnderline } from "../Circular/WrappedGroupLabel";
import { Find } from "./Find";
import { Index } from "./Index";
import { Labels, LinearLabelDatum, LinearLabelItem } from "./Labels";
import { Selection } from "./Selection";
import { AnnotationTrack } from "./components/AnnotationTrack";
import { OrfTrack } from "./components/OrfTrack";
import { PrimerTrack } from "./components/PrimerTrack";
import {
  ANNOTATION_HEIGHT_RATIO,
  ENZYME_GROUP_THRESHOLD_PX,
  ENZYME_LABEL_MIN_WIDTH,
  ENZYME_MAX_VISIBLE_PER_GROUP,
  ENZYME_UNIFIED_LINE_THRESHOLD_PX,
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
  cutSites: CutSite[];
  handleMouseEvent: React.MouseEventHandler<SVGSVGElement>;
  highlights: Highlight[];
  inputRef: InputRefFunc;
  name: string;
  orfs: TranslationProp[];
  primers: Primer[];
  rotateOnScroll?: boolean;
  search: Range[];
  selection?: SelectionState;
  seq: string;
  showIndex: boolean;
  size: Size;
  zoom: number;
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
    const { rotateOnScroll } = this.props;
    if (!rotateOnScroll) return;

    // Stop the wheel event from bubbling into other viewers but let the map's own scroll bar handle it.
    e.stopPropagation();
  };

  render() {
    const {
      annotations = [],
      cutSites = [],
      handleMouseEvent,
      highlights = [],
      inputRef,
      name,
      orfs = [],
      primers = [],
      search = [],
      seq,
      showIndex,
      size,
      zoom,
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
    const annotationRows = stackElements(annotations, seqLength);
    const primerForwardRows = stackElements(
      primers.filter(primer => primer.direction === 1),
      seqLength,
    );
    const primerReverseRows = stackElements(
      primers.filter(primer => primer.direction === -1),
      seqLength,
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
    const orfFeatureHeight = LINE_HEIGHT * ORF_HEIGHT_RATIO;
    const annotationFeatureHeight = LINE_HEIGHT * ANNOTATION_HEIGHT_RATIO;
    const primerFeatureHeight = LINE_HEIGHT * PRIMER_HEIGHT_RATIO;

    const { enzymeLabels, featureLabels, inlineAnnotationIds, inlinePrimerIds } = this.computeLabelLayout(
      annotations,
      primers,
      cutSites,
      scale,
    );
    const enzymeLabelRowMax = enzymeLabels.reduce((acc, label) => Math.max(acc, label.row), -1);
    const enzymeLabelsHeight = enzymeLabelRowMax >= 0 ? (enzymeLabelRowMax + 1) * LINE_HEIGHT : 0;
    const featureLabelRowMax = featureLabels.reduce((acc, label) => Math.max(acc, label.row), -1);
    const featureLabelsHeight = featureLabelRowMax >= 0 ? (featureLabelRowMax + 1) * LINE_HEIGHT : 0;
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
    if (orfAreaHeight) featureAreaBottomCandidates.push(orfStartY + orfAreaHeight);
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
          hasLabel={id => this.labelLookup.has(id)}
          inlineAnnotationIds={inlineAnnotationIds}
          inputRef={inputRef}
          isFeatureHovered={this.isFeatureHovered}
          onFeatureHover={this.handleFeatureHover}
          rowSpacing={annotationRowHeight}
          rows={annotationRows}
          scale={scale}
          startY={annotationStartY}
        />
        <PrimerTrack
          featureHeight={primerFeatureHeight}
          hasLabel={id => this.labelLookup.has(id)}
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
          hasLabel={id => this.labelLookup.has(id)}
          inlinePrimerIds={inlinePrimerIds}
          inputRef={inputRef}
          isFeatureHovered={this.isFeatureHovered}
          onFeatureHover={this.handleFeatureHover}
          rowSpacing={primerRowHeight}
          rows={primerReverseRows}
          scale={scale}
          startY={primerReverseY}
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
        {!!featureLabelsWithSource.length && (
          <Labels
            connectorY={mapBottom}
            hoveredFeatures={mergedHoveredFeatures}
            labels={featureLabelsWithSource}
            lineHeight={LINE_HEIGHT}
            scale={scale}
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
            createLabelItemWithSelection(
              {
                direction: annotation.direction === 1 || annotation.direction === -1 ? annotation.direction : undefined,
                end: annotation.end,
                id: annotation.id,
                name: annotation.name,
                start: annotation.start,
                type: "annotation",
              },
              "ANNOTATION",
            ),
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
            createLabelItemWithSelection(
              {
                direction: primer.direction,
                end: primer.end,
                id: primer.id,
                name: primer.name,
                start: primer.start,
                type: "primer",
              },
              "PRIMER",
            ),
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
          createLabelItemWithSelection(
            {
              direction,
              end: site.end,
              id: site.id,
              name,
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

    const arrangedFeatures = this.layoutLabels(featureLabels, scale);
    const arrangedEnzymes = this.layoutEnzymeLabels(enzymeLabels, scale);

    return {
      enzymeLabels: arrangedEnzymes,
      featureLabels: arrangedFeatures,
      inlineAnnotationIds,
      inlinePrimerIds,
    };
  }

  private buildGroupedDisplayName(labels: LinearLabelItem[], fallback: string) {
    const firstName = labels[0]?.name?.trim() || fallback || "";
    const rest = Math.max(0, labels.length - 1);
    return rest > 0 ? `${firstName},+${rest}` : firstName;
  }

  private groupLinearLabels(positioned: LinearLabelDatum[], scale: LinearMapScale): LinearLabelDatum[] {
    if (!positioned.length) return [];

    const sorted = [...positioned].sort((a, b) => a.left - b.left);
    const grouped: LinearLabelDatum[] = [];

    const groupKey = (label: LinearLabelDatum) => {
      const primary = label.labels[0];
      if (label.groupType === "primer") {
        const dir = primary?.direction === -1 ? "rev" : primary?.direction === 1 ? "fwd" : "any";
        return `${label.groupType}-${dir}`;
      }
      return label.groupType;
    };

    sorted.forEach(label => {
      const last = grouped[grouped.length - 1];
      const overlapAllowed = last && groupKey(last) === groupKey(label) && label.left <= last.right + LABEL_GAP;
      if (!overlapAllowed || !last) {
        grouped.push(label);
        return;
      }

      const mergedLabels = [...last.labels, ...label.labels];
      const displayName = this.buildGroupedDisplayName(mergedLabels, last.displayName);
      const anchorX = clamp(
        (last.anchorX * last.labels.length + label.anchorX * label.labels.length) / mergedLabels.length,
        scale.offsetX,
        scale.offsetX + scale.width,
      );
      const minWidth = label.groupType === "enzyme" ? ENZYME_LABEL_MIN_WIDTH : CHAR_WIDTH * 3;
      const textWidth = Math.max((displayName.length + 2) * CHAR_WIDTH, minWidth);
      const maxLeft = scale.offsetX + scale.width - textWidth;
      const left = clamp(anchorX - textWidth / 2, scale.offsetX, maxLeft);
      const right = left + textWidth;

      grouped[grouped.length - 1] = {
        ...last,
        anchorX,
        displayName,
        grouped: true,
        labels: mergedLabels,
        left,
        right,
        textWidth,
        textX: left + textWidth / 2,
      };
    });

    return grouped;
  }

  private assignLabelRows(labels: LinearLabelDatum[]): LinearLabelDatum[] {
    if (!labels.length) return [];
    const rows: LinearLabelDatum[][] = [];
    const sorted = [...labels].sort((a, b) => a.left - b.left);

    sorted.forEach(label => {
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

    const grouped = this.groupLinearLabels(positioned, scale);
    return this.assignLabelRows(grouped);
  }

  private layoutEnzymeLabels(rawLabels: RawLabel[], scale: LinearMapScale): LinearLabelDatum[] {
    if (!rawLabels.length) return [];

    const positioned = rawLabels
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
      })
      .sort((a, b) => a.anchorX - b.anchorX);

    const groups: { originX: number; labels: LinearLabelDatum[] }[] = [];
    positioned.forEach(label => {
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || label.anchorX - lastGroup.originX > ENZYME_GROUP_THRESHOLD_PX) {
        groups.push({ originX: label.anchorX, labels: [label] });
        return;
      }
      lastGroup.labels.push(label);
    });

    const alignLabelToGroup = (label: LinearLabelDatum, anchorX: number): LinearLabelDatum => {
      const textWidth = Math.max(label.textWidth, ENZYME_LABEL_MIN_WIDTH);
      const maxLeft = scale.offsetX + scale.width - textWidth;
      let left = anchorX - textWidth / 2;
      left = clamp(left, scale.offsetX, maxLeft);
      const right = left + textWidth;
      return {
        ...label,
        anchorX,
        left,
        right,
        textWidth,
        textX: left + textWidth / 2,
      };
    };

    const flattened: LinearLabelDatum[] = [];

    groups.forEach((group, groupIndex) => {
      const sortedGroupLabels = [...group.labels].sort((a, b) => a.anchorX - b.anchorX);
      const visible = sortedGroupLabels.slice(0, ENZYME_MAX_VISIBLE_PER_GROUP);
      const hidden = sortedGroupLabels.slice(ENZYME_MAX_VISIBLE_PER_GROUP);

      if (hidden.length) {
        const displayName = `+${hidden.length}`;
        const textWidth = Math.max((displayName.length + 2) * CHAR_WIDTH, ENZYME_LABEL_MIN_WIDTH);
        const maxLeft = scale.offsetX + scale.width - textWidth;
        let left = group.originX - textWidth / 2;
        left = clamp(left, scale.offsetX, maxLeft);
        const right = left + textWidth;
        flattened.push({
          anchorX: group.originX,
          displayName,
          groupId: `enzyme-group-${groupIndex}-more`,
          groupType: "enzyme",
          grouped: true,
          labels: hidden.flatMap(label => label.labels.map(item => ({ ...item }))),
          left,
          right,
          row: 0,
          textAnchor: "middle",
          textWidth,
          textX: left + textWidth / 2,
        });
      }

      let clusterAnchor = visible.length ? visible[0].anchorX : group.originX;
      visible.forEach((label, index) => {
        if (index === 0) {
          flattened.push(alignLabelToGroup(label, clusterAnchor));
          return;
        }
        const sharedAnchor = Math.abs(label.anchorX - clusterAnchor) <= ENZYME_UNIFIED_LINE_THRESHOLD_PX;
        const anchorX = sharedAnchor ? clusterAnchor : label.anchorX;
        clusterAnchor = anchorX;
        flattened.push(alignLabelToGroup(label, anchorX));
      });
    });

    const sorted = [...flattened].sort((a, b) => a.anchorX - b.anchorX);
    return this.assignLabelRows(sorted);
  }
}
