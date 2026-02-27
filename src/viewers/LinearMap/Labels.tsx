import * as React from "react";

import { Selection as SelectionRange } from "../../state/selectionContext";
import { circularLabel, circularLabelLine, circularLabelLineHover } from "../../style";
import { LABEL_FONT_WEIGHT_DEFAULT, LABEL_FONT_WEIGHT_HOVER, enzymeHoverColor } from "../../style/labelTheme";
import { setHoveredLabelUnderline } from "../Circular/WrappedGroupLabel";
import { LinearGroupLabelOverlay } from "./GroupLabelOverlay";
import { LinearMapScale } from "./utils";
import { ENZYME_LABEL_ROW_SPACING } from "./constants";
import HoveredEnzymeContext, { matchesHoveredEnzyme } from "../../state/hoveredEnzymeContext";

const ANNOTATION_HEIGHT_RATIO = 0.8;
const PRIMER_HEIGHT_RATIO = 0.7;

export interface LinearLabelItem {
  direction?: 1 | -1;
  id: string;
  name: string;
  selectionEnd?: number;
  selectionFcut?: number;
  selectionName?: string;
  selectionRef?: string;
  selectionStart?: number;
  selectionScrollLinearOnSelect?: boolean;
  selectionType?: SelectionRange["type"];
  selectionViewer?: "LINEAR" | "CIRCULAR";
  selectionRcut?: number;
  type: "annotation" | "primer" | "enzyme";
}

export interface LinearLabelDatum {
  anchorX: number;
  displayName: string;
  groupId: string;
  groupType: "annotation" | "primer" | "enzyme";
  grouped: boolean;
  labels: LinearLabelItem[];
  left: number;
  right: number;
  row: number;
  sourceY?: number | null;
  textAnchor: "start" | "middle" | "end";
  textWidth: number;
  textX: number;
}

interface LinearLabelsProps {
  connectorY: number;
  hoveredFeatures?: Record<string, boolean>;
  labels: LinearLabelDatum[];
  lineHeight: number;
  onHoverFeatures?: (featureIds: string[], hover: boolean) => void;
  selectedFeatures?: Record<string, boolean>;
  scale: LinearMapScale;
  startY: number;
}

interface LinearLabelsState {
  overlayGroupId: string;
  overlayPinned: boolean;
}

export class Labels extends React.PureComponent<LinearLabelsProps, LinearLabelsState> {
  static contextType = HoveredEnzymeContext;
  declare context: React.ContextType<typeof HoveredEnzymeContext>;
  private currentLabel: LinearLabelDatum | null = null;
  private currentHoveredFeatureIds: string[] = [];
  private lastPointerType: string = "mouse";
  state: LinearLabelsState = { overlayGroupId: "", overlayPinned: false };

  private closeOverlay = () => {
    if (!this.state.overlayPinned || !this.state.overlayGroupId) return;
    const prevGroup = this.props.labels.find(l => l.groupId === this.state.overlayGroupId);
    if (prevGroup) {
      this.toggleUnderline(prevGroup, false);
      this.props.onHoverFeatures?.(
        prevGroup.labels.map(item => item.id),
        false,
      );
      this.updateHoveredEnzymeForDatum(prevGroup, false);
    }
    this.currentLabel = null;
    this.currentHoveredFeatureIds = [];
    this.setState({ overlayGroupId: "", overlayPinned: false });
  };

  private getSelectionAttributes = (label?: LinearLabelItem): Record<string, string | number> => {
    if (
      !label ||
      typeof label.selectionStart !== "number" ||
      typeof label.selectionEnd !== "number" ||
      !label.selectionType
    ) {
      return {};
    }

    const attrs: Record<string, string | number> = {
      "data-selection-start": label.selectionStart,
      "data-selection-end": label.selectionEnd,
      "data-selection-type": label.selectionType,
      "data-selection-name": label.selectionName || label.name,
      "data-selection-viewer": label.selectionViewer || "LINEAR",
    };

    if (label.selectionRef || label.id) {
      attrs["data-selection-ref"] = label.selectionRef || label.id;
    }

    if (label.selectionScrollLinearOnSelect) {
      attrs["data-scroll-linear-on-select"] = "true";
    }

    if (typeof label.direction === "number") {
      attrs["data-selection-direction"] = label.direction;
    }

    if (typeof label.selectionFcut === "number") {
      attrs["data-selection-fcut"] = label.selectionFcut;
    }

    if (typeof label.selectionRcut === "number") {
      attrs["data-selection-rcut"] = label.selectionRcut;
    }

    return attrs;
  };

  handleLabelEnter = (label: LinearLabelDatum) => {
    if (this.state.overlayPinned) return;

    const { overlayGroupId } = this.state;
    if (this.currentLabel && this.currentLabel.groupId !== label.groupId) {
      this.toggleUnderline(this.currentLabel, false);
      if (this.currentHoveredFeatureIds.length) {
        this.props.onHoverFeatures?.(this.currentHoveredFeatureIds, false);
      }
      this.updateHoveredEnzymeForDatum(this.currentLabel, false);
    }
    this.currentLabel = label;

    if (label.grouped) {
      this.currentHoveredFeatureIds = [];
      this.toggleUnderline(label, true);
      if (overlayGroupId !== label.groupId) {
        this.setState({ overlayGroupId: label.groupId });
      }
      return;
    }

    this.currentHoveredFeatureIds = label.labels.map(item => item.id);
    if (this.currentHoveredFeatureIds.length) {
      this.props.onHoverFeatures?.(this.currentHoveredFeatureIds, true);
    }
    this.toggleUnderline(label, true);
    this.updateHoveredEnzymeForDatum(label, true);
    if (overlayGroupId) {
      this.setState({ overlayGroupId: "" });
    }
  };

  handleLabelClick = (label: LinearLabelDatum) => {
    if (!label.grouped) return;
    this.setState(prev => {
      const prevGroup = prev.overlayGroupId
        ? this.props.labels.find(l => l.groupId === prev.overlayGroupId)
        : undefined;

      // If any group is currently pinned, close it on the next tap/click.
      if (prev.overlayPinned && prev.overlayGroupId) {
        if (prevGroup) {
          this.toggleUnderline(prevGroup, false);
          this.props.onHoverFeatures?.(
            prevGroup.labels.map(item => item.id),
            false,
          );
          this.updateHoveredEnzymeForDatum(prevGroup, false);
        }
        this.currentLabel = null;
        this.currentHoveredFeatureIds = [];
        return { overlayGroupId: "", overlayPinned: false };
      }

      // Otherwise open the tapped group and pin it.
      if (prevGroup && prevGroup.groupId !== label.groupId) {
        this.toggleUnderline(prevGroup, false);
        this.props.onHoverFeatures?.(
          prevGroup.labels.map(item => item.id),
          false,
        );
        this.updateHoveredEnzymeForDatum(prevGroup, false);
      }

      this.currentLabel = label;
      this.currentHoveredFeatureIds = [];
      this.toggleUnderline(label, true);
      return { overlayGroupId: label.groupId, overlayPinned: true };
    });
  };

  handleMouseLeave = () => {
    if (this.state.overlayPinned) return;
    if (this.currentLabel) {
      this.toggleUnderline(this.currentLabel, false);
      this.updateHoveredEnzymeForDatum(this.currentLabel, false);
    }
    if (this.currentHoveredFeatureIds.length) {
      this.props.onHoverFeatures?.(this.currentHoveredFeatureIds, false);
    }
    this.currentLabel = null;
    this.currentHoveredFeatureIds = [];
    if (this.state.overlayGroupId) {
      this.setState({ overlayGroupId: "" });
    }
  };

  private updateHoveredEnzymeForDatum = (label: LinearLabelDatum | null, hover: boolean) => {
    if (!label) return;
    const enzymeLabel = label.labels.find(item => item.type === "enzyme");
    if (!enzymeLabel) return;
    const { hoveredEnzyme, highlightedEnzymes, setHoveredEnzyme } = this.context;
    if (hover) {
      setHoveredEnzyme({ id: enzymeLabel.id, name: enzymeLabel.name });
      return;
    }
    if (matchesHoveredEnzyme(hoveredEnzyme, enzymeLabel, highlightedEnzymes)) {
      setHoveredEnzyme(null);
    }
  };

  toggleUnderline = (label: LinearLabelDatum, underline: boolean) => {
    const { selectedFeatures } = this.props;
    const shouldKeep = !underline && label.labels.some(item => selectedFeatures?.[item.id]);
    const nextUnderline = underline || shouldKeep;
    setHoveredLabelUnderline(label.groupId, nextUnderline);
  };

  render() {
    const { connectorY, hoveredFeatures, labels, lineHeight, scale, selectedFeatures, startY } = this.props;
    const { overlayGroupId } = this.state;
    const { hoveredEnzyme, highlightedEnzymes } = this.context;
    if (!labels.length) return null;

    const overlayGroup = overlayGroupId ? labels.find(l => l.groupId === overlayGroupId) : undefined;

    return (
      <g className="la-vz-linear-map-labels" onMouseLeave={this.handleMouseLeave}>
        {labels.map(label => {
          const textY = startY + label.row * ENZYME_LABEL_ROW_SPACING;
          const textId = label.groupId;
          const rawSourceY = typeof label.sourceY === "number" ? label.sourceY : null;
          const labelHeightRatio =
            label.groupType === "annotation"
              ? ANNOTATION_HEIGHT_RATIO
              : label.groupType === "primer"
                ? PRIMER_HEIGHT_RATIO
                : 0;
          const featureBottom = rawSourceY !== null ? rawSourceY + lineHeight * labelHeightRatio : connectorY;
          const verticalVisible = rawSourceY !== null && featureBottom < connectorY;
          const connectorStartY = verticalVisible ? connectorY : featureBottom;
          const isAboveBaseline = textY < connectorY;
          const connectorEndY = isAboveBaseline ? textY + lineHeight * 0.45 : textY - lineHeight * 0.45;
          const showConnector = true;
          const labelHovered = label.labels.some(item => hoveredFeatures?.[item.id] || selectedFeatures?.[item.id]);
          const labelHasHighlightedEnzyme = label.labels.some(
            item => item.type === "enzyme" && matchesHoveredEnzyme(hoveredEnzyme, item, highlightedEnzymes),
          );
          const labelStyle: React.CSSProperties = {
            ...circularLabel,
            cursor: "pointer",
            textDecoration: labelHovered ? "underline" : "none",
            fill: labelHasHighlightedEnzyme ? enzymeHoverColor : circularLabel.fill,
            fontWeight: labelHasHighlightedEnzyme
              ? LABEL_FONT_WEIGHT_HOVER
              : labelHovered
                ? LABEL_FONT_WEIGHT_HOVER
                : LABEL_FONT_WEIGHT_DEFAULT,
          };
          const connectorStyle = labelHovered ? circularLabelLineHover : circularLabelLine;
          const stemStyle = connectorStyle;
          const selectionAttrs = label.grouped ? {} : this.getSelectionAttributes(label.labels[0]);

          return (
            <g key={`linear-label-${label.groupId}`}>
              {showConnector && verticalVisible && (
                <line
                  className="la-vz-linear-map-label-stem"
                  style={stemStyle}
                  x1={label.anchorX}
                  x2={label.anchorX}
                  y1={featureBottom}
                  y2={connectorY}
                />
              )}
              {showConnector && (
                <line
                  className="la-vz-linear-map-label-line"
                  style={connectorStyle}
                  x1={label.anchorX}
                  x2={label.textX}
                  y1={connectorStartY}
                  y2={connectorEndY}
                />
              )}
              <text
                className="la-vz-linear-map-label"
                dominantBaseline="middle"
                id={textId}
                style={labelStyle}
                textAnchor={label.textAnchor}
                x={label.textX}
                y={textY}
                {...selectionAttrs}
                onPointerDown={e => {
                  // remember the last pointer type (mouse vs touch) to gate click behavior
                  // pointerType is supported on PointerEvents; default to mouse when absent
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore PointerEvent on nativeEvent when dispatched from pointer
                  this.lastPointerType = (e.nativeEvent && (e.nativeEvent as any).pointerType) || "mouse";
                }}
                onMouseEnter={() => this.handleLabelEnter(label)}
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const pointerType = (e.nativeEvent as any)?.pointerType || this.lastPointerType;
                  if (pointerType !== "touch") return; // only toggle on touch to avoid mouse flicker
                  this.handleLabelClick(label);
                }}
              >
                {label.displayName}
              </text>
            </g>
          );
        })}
        {overlayGroup && overlayGroup.grouped && overlayGroup.labels.length > 0 && (
          <LinearGroupLabelOverlay
            group={{ ...overlayGroup, textY: startY + overlayGroup.row * ENZYME_LABEL_ROW_SPACING }}
            getSelectionAttributes={this.getSelectionAttributes}
            hoveredFeatures={hoveredFeatures}
            lineHeight={lineHeight}
            scale={scale}
            onRequestClose={this.closeOverlay}
            onGroupLeave={featureIds => {
              this.closeOverlay();
              this.props.onHoverFeatures?.(featureIds, false);
            }}
            onHoverFeature={(featureId, hover) => {
              this.props.onHoverFeatures?.([featureId], hover);
            }}
          />
        )}
      </g>
    );
  }
}
