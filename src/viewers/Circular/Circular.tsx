import * as React from "react";

import { InputRefFunc } from "../../SelectionHandler";
import { CHAR_WIDTH } from "../../SeqViewerContainer";
import {
  Annotation,
  Coor,
  CutSite,
  Highlight,
  Primer,
  Range,
  Separator,
  SeparatorClickEvent,
  Size,
  TranslationProp,
} from "../../core/elements";
import CentralIndexContext from "../../state/centralIndexContext";
import SelectionContext from "../../state/selectionContext";
import type { Selection as SelectionRange } from "../../state/selectionContext";
import { circularLabel, separatorLine, viewerCircularTouchRotate } from "../../style";
import { stackElements } from "../../utils/elementsToRows";
import { isEqual } from "../../utils/isEqual";
import { Annotations } from "./Annotations";
import { Find } from "./Find";
import { Index } from "./Index";
import { Labels } from "./Labels";
import { Orfs, getOrfRingDimensions } from "./Orfs";
import { Primers } from "./Primers";
import { Selection } from "./Selection";

/** Sequence length cutoff below which the circular viewer's sequence won't be rendered. */
export const RENDER_SEQ_LENGTH_CUTOFF = 250;

export interface ILabel {
  end: number;
  id?: string;
  name: string;
  selectionDirection?: number;
  selectionEnd?: number;
  selectionFcut?: number;
  selectionName?: string;
  selectionScrollLinearOnSelect?: boolean;
  selectionStart?: number;
  selectionType?: SelectionRange["type"];
  selectionRcut?: number;
  selectionViewer?: "LINEAR" | "CIRCULAR";
  start: number;
  type: "enzyme" | "annotation";
}

/** GenArcFunc is a method that makes an arc on the viewer for a Circular child. */
export type GenArcFunc = (args: {
  arrowFWD?: boolean;
  arrowREV?: boolean;
  innerRadius: number;
  largeArc: boolean;
  length: number;
  offset?: number;
  outerRadius: number;
  // see svg.arc large-arc-flag
  sweepFWD?: boolean;
}) => string;

export interface CircularProps {
  annotations: Annotation[];
  fragments: Annotation[];
  center: { x: number; y: number };
  compSeq: string;
  cutSites: CutSite[];
  handleMouseEvent: React.MouseEventHandler<SVGSVGElement>;
  highlights: Highlight[];
  inputRef: InputRefFunc;
  name: string;
  onSeparatorClick?: (event: SeparatorClickEvent) => void;
  orfs: TranslationProp[];
  primers: Primer[];
  onUnmount: (id: string) => void;
  radius: number;
  rotateOnScroll: boolean;
  search: Range[];
  separators?: Separator[];
  seq: string;
  zoom: number;
  showComplement: boolean;
  showIndex: boolean;
  size: Size;
  yDiff: number;
}

interface CircularState {
  annotationsInRows: Annotation[][];
  hoveredFeatures: Record<string, boolean>;
  inlinedLabels: string[];
  lineHeight: number;
  outerLabels: ILabel[];
  primerRows: Primer[][];
  seqLength: number;
}

/** Circular is a circular viewer that contains a bunch of arcs. */
export default class Circular extends React.Component<CircularProps, CircularState> {
  static contextType = CentralIndexContext;
  static context: React.ContextType<typeof CentralIndexContext>;
  declare context: React.ContextType<typeof CentralIndexContext>;

  private svgRef = React.createRef<SVGSVGElement>();
  private contentGroupRef = React.createRef<SVGGElement>();
  private touchRotateSession: { pointerId: number; lastAngle: number } | null = null;
  private touchRotateRemainder = 0;

  constructor(props: CircularProps) {
    super(props);

    this.state = {
      annotationsInRows: [],
      hoveredFeatures: {},
      inlinedLabels: [],
      lineHeight: 0,
      outerLabels: [],
      primerRows: [],
      seqLength: 0,
    };
  }

  static getDerivedStateFromProps = (nextProps: CircularProps, prevState: CircularState): CircularState => {
    const lineHeight = 14;
    const fragmentRows = stackElements(nextProps.fragments || [], nextProps.seq.length);
    const annotationRows = stackElements(nextProps.annotations, nextProps.seq.length);
    const annotationsInRows = fragmentRows.concat(annotationRows);
    const primerRows = stackElements(nextProps.primers || [], nextProps.seq.length);

    /**
     * find the element labels that need to be rendered outside the plasmid. This is done for
     * annotation names/etc for element titles that don't fit within the width of the element
     * they represent. For example, an annotation might be named "Transcription Factor XYZ"
     * but be only 20bps long on a plasmid that's 20k bps. Obviously that name doesn't fit.
     * But, a gene that's 15k on the same plasmid shouldn't have it's label outside the plasmid
     * when it can easily fit on top of the annotation itself
     */
    const seqLength = nextProps.seq.length;
    const cutSiteLabels = nextProps.cutSites;
    const { radius, orfs } = nextProps;
    const orfDimensions = orfs.length ? getOrfRingDimensions(lineHeight) : null;
    const orfOffset = orfDimensions ? orfDimensions.ringOffset + orfDimensions.ringThickness : 0;
    let innerRadius = radius - 3 * lineHeight - orfOffset;
    const inlinedLabels: string[] = [];
    const outerLabels: ILabel[] = [];
    annotationsInRows.forEach((r: Annotation[]) => {
      const circumf = innerRadius * Math.PI;
      r.forEach(ann => {
        // how large is the name of the annotation horizontally (with two char padding)
        const annNameLengthPixels = (ann.name.length + 2) * CHAR_WIDTH;
        // how large would part be if it were wrapped around the plasmid
        let annLengthBases = ann.end - ann.start;
        if (ann.start >= ann.end) annLengthBases += seqLength; // crosses zero-index
        const annLengthPixels = 2 * circumf * (annLengthBases / seqLength);
        if (annNameLengthPixels < annLengthPixels) {
          inlinedLabels.push(ann.id);
        } else {
          // hidden feature labels are shown as compact callouts on hover/selection
        }
      });
      innerRadius -= lineHeight;
    });

    const seenCutLabelKeys = new Set<string>();
    cutSiteLabels.forEach(c => {
      const key = `${c.name}|${c.start}|${c.end}|${c.fcut}|${c.rcut}`;
      if (seenCutLabelKeys.has(key)) return;
      seenCutLabelKeys.add(key);
      outerLabels.push({
        ...c.enzyme,
        ...c,
        selectionEnd: c.end,
        selectionName: c.name,
        selectionScrollLinearOnSelect: true,
        selectionDirection: c.direction,
        selectionFcut: c.fcut,
        selectionStart: c.start,
        selectionType: "ENZYME",
        selectionViewer: "CIRCULAR",
        selectionRcut: c.rcut,
        start: c.fcut,
        type: "enzyme",
      });
    });

    // sort all the labels so they're in ascending order
    outerLabels.sort((a, b) => Math.min(a.start, a.end) - Math.min(b.start, b.end));

    return {
      annotationsInRows: annotationsInRows,
      hoveredFeatures: prevState.hoveredFeatures,
      inlinedLabels: inlinedLabels,
      lineHeight: lineHeight,
      outerLabels: outerLabels,
      primerRows,
      seqLength: nextProps.seq.length,
    };
  };

  /**
   * Deep equality comparison
   */
  shouldComponentUpdate = (nextProps: CircularProps, nextState: CircularState) =>
    !isEqual(nextProps, this.props) || !isEqual(nextState, this.state);

  private setFeatureHoverState = (featureId: string, hover: boolean) => {
    if (!featureId) return;
    this.setState(prevState => {
      const hoveredFeatures = { ...prevState.hoveredFeatures };
      const isHovered = !!hoveredFeatures[featureId];
      if (hover && !isHovered) {
        hoveredFeatures[featureId] = true;
        return { hoveredFeatures };
      }
      if (!hover && isHovered) {
        delete hoveredFeatures[featureId];
        return { hoveredFeatures };
      }
      return null;
    });
  };

  /**
   * Return the SVG rotation transformation needed to put a child element in the
   * correct location around the plasmid. This func makes use of the centralIndex field in parent state
   * to rotate the plasmid viewer.
   */
  getRotation = (index: number): string => {
    const { center } = this.props;
    const { seqLength } = this.state;
    const centralIndex = this.context.circular;

    // how many degrees should it be rotated?
    const adjustedIndex = index - centralIndex;
    const startPerc = adjustedIndex / seqLength;
    const degrees = startPerc * 360;

    return `rotate(${degrees || 0}, ${center.x}, ${center.y})`;
  };

  /**
   * Given an index along the plasmid and its radius, find the coordinate
   * will be used in many of the child components
   *
   * In general, this is for lines and labels
   */
  findCoor = (index: number, radius: number, rotate?: boolean): Coor => {
    const { center } = this.props;
    const { seqLength } = this.state;
    const rotatedIndex = rotate ? index - this.context.circular : index;
    const lengthPerc = rotatedIndex / seqLength;
    const lengthPercCentered = lengthPerc - 0.25;
    const radians = lengthPercCentered * Math.PI * 2;
    const xAdjust = Math.cos(radians) * radius;
    const yAdjust = Math.sin(radians) * radius;

    return {
      x: center.x + xAdjust,
      y: center.y + yAdjust,
    };
  };

  /**
   * Given a coordinate, and the degrees to rotate it, find the new coordinate
   * (assuming that the rotation is around the center)
   *
   * in general this is for text and arcs
   */
  rotateCoor = (coor: Coor, degrees: number): Coor => {
    const { center } = this.props;

    // find coordinate's current angle
    const angle = degrees * (Math.PI / 180); // degrees to radians
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // find the new coordinate
    const xDiff = coor.x - center.x;
    const yDiff = coor.y - center.y;
    const cosX = cos * xDiff;
    const cosY = cos * yDiff;
    const sinX = sin * xDiff;
    const sinY = sin * yDiff;
    const xAdjust = cosX - sinY;
    const yAdjust = sinX + cosY;

    return {
      x: center.x + xAdjust,
      y: center.y + yAdjust,
    };
  };

  /**
   * Given an inner and outer radius, and the length of the element, return the
   * path for an arc that circles the plasmid. The optional paramters sweepFWD and sweepREV
   * are needed for selection arcs (where the direction of the arc isn't known beforehand)
   * and arrowFWD and arrowREV are needed for annotations, where there may be directionality
   */
  genArc: GenArcFunc = (args: {
    arrowFWD?: boolean;
    arrowREV?: boolean;
    innerRadius: number;
    largeArc: boolean;
    length: number;
    offset?: number;
    outerRadius: number;
    // see svg.arc large-arc-flag
    sweepFWD?: boolean;
  }): string => {
    const { arrowFWD, arrowREV, innerRadius, largeArc, length, outerRadius, sweepFWD } = args;
    const { radius } = this.props;
    const { lineHeight, seqLength } = this.state;
    const offset = args.offset === undefined ? 0 : args.offset;
    // build up the six default coordinates
    let leftBottom = this.findCoor(offset, innerRadius);
    let leftTop = this.findCoor(offset, outerRadius);
    let rightBottom = this.findCoor(length + offset, innerRadius);
    let rightTop = this.findCoor(length + offset, outerRadius);
    let leftArrow = "";
    let rightArrow = "";

    // create arrows by making a midpoint along edge and shifting corners inwards
    if (arrowREV || arrowFWD) {
      // one quarter of lineHeight in px is the shift inward for arrows
      const inwardShift = lineHeight / 4;
      // given the arc length (inwardShift) and the radius (from SeqViewer),
      // we can find the degrees to rotate the corners
      const centralAngle = inwardShift / radius;
      // Math.min here is to make sure the arrow it's larger than the element
      const centralAnglePerc = Math.min(centralAngle / 2, length / seqLength);
      const centralAngleDeg = centralAnglePerc * 360;

      if (arrowREV) {
        leftBottom = this.rotateCoor(leftBottom, centralAngleDeg);
        leftTop = this.rotateCoor(leftTop, centralAngleDeg);
        const lArrowC = this.findCoor(0, (innerRadius + outerRadius) / 2);
        leftArrow = `L ${lArrowC.x} ${lArrowC.y}`;
      } else {
        rightBottom = this.rotateCoor(rightBottom, -centralAngleDeg);
        rightTop = this.rotateCoor(rightTop, -centralAngleDeg);
        const rArrowC = this.findCoor(length, (innerRadius + outerRadius) / 2);
        rightArrow = `L ${rArrowC.x} ${rArrowC.y}`;
      }
    }

    const lArc = largeArc ? 1 : 0;
    const sFlagF = sweepFWD ? 1 : 0;
    const sFlagR = sweepFWD ? 0 : 1;

    return `M ${rightBottom.x} ${rightBottom.y}
      A ${innerRadius} ${innerRadius}, 0, ${lArc}, ${sFlagR}, ${leftBottom.x} ${leftBottom.y}
      L ${leftBottom.x} ${leftBottom.y}
      ${leftArrow}
      L ${leftTop.x} ${leftTop.y}
      A ${outerRadius} ${outerRadius}, 0, ${lArc}, ${sFlagF}, ${rightTop.x} ${rightTop.y}
      ${rightArrow}
      Z`;
  };

  /**
   * handle a scroll event and, if it's a CIRCULAR viewer, update the
   * current central index
   */
  handleScrollEvent = (e: React.WheelEvent<SVGElement>) => {
    const { rotateOnScroll, seq } = this.props;
    if (!rotateOnScroll) return;

    // a "large scroll" (1000) should rotate through 20% of the plasmid
    let delta = seq.length * (e.deltaY / 5000);
    delta = Math.floor(delta);

    // must scroll by *some* amount (only matters for very small plasmids)
    if (delta === 0) {
      if (e.deltaY > 0) delta = 1;
      else delta = -1;
    }

    let newCentralIndex = this.context.circular + delta;
    newCentralIndex = (newCentralIndex + seq.length) % seq.length;

    this.context.setCentralIndex("CIRCULAR", newCentralIndex);
  };

  private isTouchPointer = (e: React.PointerEvent<SVGSVGElement>) =>
    e.pointerType === "touch" || e.pointerType === "pen";

  private isSelectionTarget = (target: EventTarget | null) => {
    if (!target) return false;
    const el = target as Element;
    return !!el.closest?.("[data-selection-type]");
  };

  private getPointerAngle = (clientX: number, clientY: number) => {
    const svg = this.svgRef.current;
    const group = this.contentGroupRef.current;
    if (!svg || !group) return null;
    const ctm = group.getScreenCTM();
    if (!ctm) return null;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const local = point.matrixTransform(ctm.inverse());
    const { center } = this.props;
    return Math.atan2(local.y - center.y, local.x - center.x);
  };

  private cancelTouchRotation = () => {
    if (this.touchRotateSession && this.svgRef.current) {
      try {
        this.svgRef.current.releasePointerCapture?.(this.touchRotateSession.pointerId);
      } catch {
        // ignore release errors
      }
    }
    this.touchRotateSession = null;
    this.touchRotateRemainder = 0;
  };

  private handleTouchRotatePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!this.props.rotateOnScroll) return;
    if (!this.isTouchPointer(e)) return;
    if (!e.isPrimary || this.touchRotateSession) {
      this.cancelTouchRotation();
      return;
    }
    if (this.isSelectionTarget(e.target)) return;
    const angle = this.getPointerAngle(e.clientX, e.clientY);
    if (angle === null) return;
    this.touchRotateSession = { pointerId: e.pointerId, lastAngle: angle };
    this.touchRotateRemainder = 0;
    this.svgRef.current?.setPointerCapture?.(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  };

  private handleTouchRotatePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!this.touchRotateSession || e.pointerId !== this.touchRotateSession.pointerId) return;
    const angle = this.getPointerAngle(e.clientX, e.clientY);
    if (angle === null) return;
    const { seqLength } = this.state;
    if (!seqLength) {
      this.touchRotateSession.lastAngle = angle;
      return;
    }
    const angleDelta = this.touchRotateSession.lastAngle - angle;
    const fractionalBases = (angleDelta / (Math.PI * 2)) * seqLength + this.touchRotateRemainder;
    const deltaBases = fractionalBases >= 0 ? Math.floor(fractionalBases) : Math.ceil(fractionalBases);
    this.touchRotateRemainder = fractionalBases - deltaBases;
    this.touchRotateSession.lastAngle = angle;
    if (!deltaBases) return;
    const current = this.context.circular;
    let next = current + deltaBases;
    next = ((next % seqLength) + seqLength) % seqLength;
    this.context.setCentralIndex("CIRCULAR", next);
    e.preventDefault();
    e.stopPropagation();
  };

  private handleTouchRotatePointerEnd = (e: React.PointerEvent<SVGSVGElement>) => {
    if (this.touchRotateSession && e.pointerId === this.touchRotateSession.pointerId) {
      this.cancelTouchRotation();
    }
  };

  render() {
    const {
      center,
      compSeq,
      handleMouseEvent,
      inputRef,
      name,
      onSeparatorClick,
      orfs,
      separators = [],
      radius,
      search,
      seq,
      showComplement,
      showIndex,
      size,
      zoom,
      yDiff,
    } = this.props;
    const { annotationsInRows, inlinedLabels, lineHeight, outerLabels, primerRows, seqLength } = this.state;

    const { findCoor, genArc, getRotation, rotateCoor } = this;

    // props contains props used in many/all children
    const props = {
      center,
      findCoor,
      genArc,
      getRotation,
      inputRef,
      lineHeight,
      radius,
      rotateCoor,
      seqLength,
    };

    const hiddenFeatureCallouts = new Map<string, { name: string; x: number; y: number }>();
    const calloutOffset = lineHeight * 1.8;
    const rowGap = 3;

    const addFeatureCallout = (
      featureId: string,
      featureName: string | undefined,
      centerIndex: number,
      outerRadius: number,
    ) => {
      if (!featureId || !featureName || seqLength <= 0) return;
      const normalizedCenter = ((centerIndex % seqLength) + seqLength) % seqLength;
      const coor = findCoor(normalizedCenter, outerRadius + calloutOffset, true);
      hiddenFeatureCallouts.set(featureId, { name: featureName, x: coor.x, y: coor.y });
    };

    let annOuterRadius = radius - (lineHeight * 2 + 3);
    annotationsInRows.forEach((row, rowIndex) => {
      if (rowIndex > 0) {
        annOuterRadius -= lineHeight + rowGap;
      }
      row.forEach(annotation => {
        if (inlinedLabels.includes(annotation.id) || !annotation.name) {
          return;
        }
        const annLength =
          annotation.end >= annotation.start
            ? annotation.end - annotation.start
            : seqLength - annotation.start + annotation.end;
        const centerIndex = annotation.start + annLength / 2;
        addFeatureCallout(annotation.id, annotation.name, centerIndex, annOuterRadius);
      });
    });

    const primerThickness = Math.max(6, Math.round(lineHeight * 0.7));
    let primerOuterRadius = radius - lineHeight * 2 - 3 - lineHeight * annotationsInRows.length - 4;
    primerRows.forEach((row, rowIndex) => {
      if (rowIndex > 0) {
        primerOuterRadius -= primerThickness + rowGap;
      }
      row.forEach(primer => {
        if (!primer.name) {
          return;
        }
        const primerLength =
          primer.end >= primer.start ? primer.end - primer.start : seqLength - primer.start + primer.end;
        const centerIndex = primer.start + primerLength / 2;
        addFeatureCallout(primer.id, primer.name, centerIndex, primerOuterRadius);
      });
    });

    if (orfs.length) {
      const orfDimensions = getOrfRingDimensions(lineHeight);
      const orfOuterRadius = Math.max(radius - orfDimensions.ringOffset, orfDimensions.ringThickness);
      orfs.forEach((orf, idx) => {
        if (!orf.name) {
          return;
        }
        const normalizedStart = ((orf.start % seqLength) + seqLength) % seqLength;
        let adjustedEnd = orf.end;
        if (adjustedEnd < normalizedStart) {
          adjustedEnd += seqLength;
        }
        const length = Math.abs(adjustedEnd - normalizedStart);
        const centerIndex = normalizedStart + length / 2;
        const id = `orf-${idx}-${normalizedStart}-${adjustedEnd}`;
        addFeatureCallout(id, orf.name, centerIndex, orfOuterRadius);
      });
    }

    // calculate the selection row height based on number of annotation + primer rows
    const totalRows = 4 + annotationsInRows.length + primerRows.length;
    const plasmidId = `la-vz-${name}-viewer-circular`;
    if (!size.height) return null;

    const selectionRef = inputRef(plasmidId, { type: "SEQ", viewer: "CIRCULAR" }) || undefined;
    const setSvgRefs = (node: SVGSVGElement | null) => {
      this.svgRef.current = node;
      if (selectionRef) selectionRef(node);
    };

    return (
      <svg
        ref={setSvgRefs}
        className="la-vz-viewer-circular"
        data-testid="la-vz-viewer-circular"
        height={size.height}
        id={plasmidId}
        overflow="visible"
        style={viewerCircularTouchRotate}
        width={size.width >= 0 ? size.width : 0}
        onMouseDown={handleMouseEvent}
        onMouseMove={handleMouseEvent}
        onMouseUp={handleMouseEvent}
        onPointerDown={this.handleTouchRotatePointerDown}
        onPointerMove={this.handleTouchRotatePointerMove}
        onPointerUp={this.handleTouchRotatePointerEnd}
        onPointerCancel={this.handleTouchRotatePointerEnd}
        onPointerLeave={this.handleTouchRotatePointerEnd}
        onWheel={this.handleScrollEvent}
      >
        <g ref={this.contentGroupRef} className="la-vz-circular-root">
          <Selection {...props} seq={seq} totalRows={totalRows} />
          <SeparatorRadials
            findCoor={findCoor}
            getRotation={getRotation}
            lineHeight={lineHeight}
            onSeparatorClick={onSeparatorClick}
            radius={radius}
            separators={separators}
            seq={seq}
            seqLength={seqLength}
            totalRows={totalRows}
          />
          <Index
            {...props}
            compSeq={compSeq}
            name={name}
            seq={seq}
            showComplement={showComplement}
            showIndex={showIndex}
            size={size}
            totalRows={totalRows}
            yDiff={yDiff}
          />
          <Orfs {...props} orfs={orfs} />
          <Find
            genArc={props.genArc}
            getRotation={props.getRotation}
            highlights={this.props.highlights}
            inputRef={props.inputRef}
            lineHeight={props.lineHeight}
            radius={props.radius}
            search={search}
            seqLength={props.seqLength}
          />
          <Annotations
            {...props}
            annotations={annotationsInRows}
            inlinedAnnotations={inlinedLabels}
            rowsToSkip={0}
            onFeatureHover={this.setFeatureHoverState}
          />
          <Primers
            {...props}
            primers={primerRows}
            rowsToSkip={annotationsInRows.length}
            onFeatureHover={this.setFeatureHoverState}
          />
          <Orfs {...props} orfs={orfs} onFeatureHover={this.setFeatureHoverState} />
          <Labels {...props} labels={outerLabels} size={size} yDiff={yDiff} zoom={zoom} />
          <SelectionContext.Consumer>
            {selection => {
              const selectedId =
                selection &&
                (selection.type === "ANNOTATION" || selection.type === "PRIMER" || selection.type === "TRANSLATION")
                  ? selection.ref || selection.id || ""
                  : "";
              const activeCallouts = Array.from(hiddenFeatureCallouts.entries())
                .filter(([id]) => !!this.state.hoveredFeatures[id] || (!!selectedId && selectedId === id))
                .map(([id, value]) => ({ id, ...value }));

              if (!activeCallouts.length) {
                return null;
              }

              return (
                <g className="la-vz-circular-feature-callouts" style={{ pointerEvents: "none" }}>
                  {activeCallouts.map(callout => {
                    const horizontalPadding = CHAR_WIDTH * 0.9;
                    const verticalPadding = lineHeight * 0.4;
                    const textWidth = Math.max((callout.name.length + 1) * CHAR_WIDTH, CHAR_WIDTH * 3);
                    const rectWidth = textWidth + horizontalPadding * 2;
                    const rectHeight = lineHeight + verticalPadding * 2;
                    const rectX = callout.x - rectWidth / 2;
                    const rectY = callout.y - rectHeight / 2;
                    const textX = rectX + rectWidth / 2;

                    return (
                      <g key={`circular-feature-callout-${callout.id}`} style={{ pointerEvents: "none" }}>
                        <rect
                          fill="white"
                          height={rectHeight}
                          rx={4}
                          ry={4}
                          stroke="#e5e7eb"
                          strokeWidth={1}
                          style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.1))" }}
                          width={rectWidth}
                          x={rectX}
                          y={rectY}
                        />
                        <text
                          className="la-vz-circular-feature-callout-label"
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
              );
            }}
          </SelectionContext.Consumer>
        </g>
      </svg>
    );
  }
}

interface SeparatorRadialsProps {
  findCoor: Circular["findCoor"];
  getRotation: Circular["getRotation"];
  lineHeight: number;
  onSeparatorClick?: (event: SeparatorClickEvent) => void;
  radius: number;
  separators: Separator[];
  seq: string;
  seqLength: number;
  totalRows: number;
}

type CircularSeparatorEdge = {
  color: string;
  id: string;
  order: number;
  rotationOffset: number;
  separator: Separator;
  selectionStart: number;
  selectionEnd: number;
};

const SeparatorRadials = ({
  findCoor,
  getRotation,
  lineHeight,
  onSeparatorClick,
  radius,
  separators,
  seq,
  seqLength,
  totalRows,
}: SeparatorRadialsProps) => {
  if (!separators?.length || seqLength <= 0) {
    return null;
  }

  let topR = radius + lineHeight;
  if (seq.length <= RENDER_SEQ_LENGTH_CUTOFF) {
    topR += 2 * lineHeight + 3;
  }
  const innerAdjust = lineHeight * (totalRows - 1);
  const bottomR = Math.max(0, radius - innerAdjust);

  const baseBottom = findCoor(0, bottomR);
  const baseTop = findCoor(0, topR);
  const edgePath = `M ${baseBottom.x} ${baseBottom.y} L ${baseTop.x} ${baseTop.y}`;

  const normalizeIndex = (index: number): number => {
    if (index === seqLength) {
      return seqLength;
    }
    const modded = index % seqLength;
    return (((modded + seqLength) % seqLength) + seqLength) % seqLength;
  };

  const fallbackColor = "#2B6CB0";
  const edges: CircularSeparatorEdge[] = [];

  const clampSelectionIndex = (index: number): number => {
    if (!Number.isFinite(index)) {
      return 0;
    }
    const floored = Math.floor(index);
    if (floored < 0) {
      return 0;
    }
    const maxBound = Math.max(seqLength, 0);
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
    const primaryIndex = normalizeIndex(separator.index);
    const rotationOffset = (primaryIndex + 0.5 + seqLength) % seqLength;
    const selectionRange = toSelectionRange(separator.index);
    edges.push({
      color: separator.color || fallbackColor,
      id: separator.id,
      order: separator.order,
      rotationOffset,
      separator,
      selectionStart: selectionRange.start,
      selectionEnd: selectionRange.end,
    });
  });

  if (!edges.length) {
    return null;
  }

  const fireSelection = (edge: CircularSeparatorEdge) => {
    onSeparatorClick?.({ order: edge.order, separator: edge.separator });
  };

  const handleKeyDown = (edge: CircularSeparatorEdge, event: React.KeyboardEvent<SVGPathElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    fireSelection(edge);
  };

  return (
    <g className="la-vz-separators-circular">
      {edges.map(edge => (
        <path
          key={edge.id}
          className="la-vz-separator-edge"
          d={edgePath}
          style={{ ...separatorLine, stroke: edge.color }}
          transform={getRotation(edge.rotationOffset)}
          role="button"
          tabIndex={0}
          data-selection-type="SEPARATOR"
          data-selection-start={edge.selectionStart}
          data-selection-end={edge.selectionEnd}
          data-selection-name={edge.separator.name || edge.id}
          data-selection-viewer="CIRCULAR"
          data-selection-ref={edge.id}
          data-scroll-linear-on-select="true"
          onPointerDown={() => fireSelection(edge)}
          onKeyDown={event => handleKeyDown(edge, event)}
        />
      ))}
    </g>
  );
};

/**
 * Create an SVG arc around a single element in the Circular Viewer.
 */
export const Arc = (props: {
  className: string;
  color?: string;
  direction: -1 | 1;
  end: number;
  genArc: GenArcFunc;
  getRotation: (index: number) => string;
  inputRef: InputRefFunc;
  lineHeight: number;
  radius: number;
  seqLength: number;
  start: number;
  style: React.CSSProperties;
}) => {
  const { className, color, direction, genArc, getRotation, inputRef, lineHeight, radius, seqLength, start, style } =
    props;

  let { end } = props;
  // crosses the zero index
  if (end < start) {
    end += seqLength;
  }

  const resultLength = Math.abs(end - start);
  const findPath = genArc({
    innerRadius: radius - lineHeight / 2,
    largeArc: resultLength > seqLength / 2,
    length: resultLength,
    outerRadius: radius + lineHeight / 2,
    sweepFWD: true,
  });

  const id = `circular-${start}-${end}-${direction}`;

  return (
    <path
      key={id}
      ref={inputRef(id, {
        end: end,
        ref: id,
        start: start,
        type: "FIND",
        viewer: "CIRCULAR",
      })}
      data-selection-end={end}
      data-selection-start={start}
      data-selection-type="FIND"
      data-selection-viewer="CIRCULAR"
      className={className}
      cursor="pointer"
      d={findPath}
      fill={color}
      id={id}
      shapeRendering="auto"
      stroke="rgba(0, 0, 0, 0.5)"
      strokeWidth={1}
      style={style}
      transform={getRotation(start)}
    />
  );
};
