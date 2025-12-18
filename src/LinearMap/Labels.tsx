import * as React from "react";

import { setHoveredLabelUnderline } from "../Circular/WrappedGroupLabel";
import { Selection as SelectionRange } from "../selectionContext";
import { circularLabel, circularLabelLine, circularLabelLineHover } from "../style";

const ANNOTATION_HEIGHT_RATIO = 0.8;
const PRIMER_HEIGHT_RATIO = 0.7;

export interface LinearLabelItem {
  direction?: 1 | -1;
  id: string;
  name: string;
  selectionEnd?: number;
  selectionName?: string;
  selectionRef?: string;
  selectionStart?: number;
  selectionScrollLinearOnSelect?: boolean;
  selectionType?: SelectionRange["type"];
  selectionViewer?: "LINEAR" | "CIRCULAR";
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
  startY: number;
}

export class Labels extends React.PureComponent<LinearLabelsProps> {
  private currentLabel: LinearLabelDatum | null = null;
  private currentHoveredFeatureIds: string[] = [];

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

    return attrs;
  };

  handleLabelEnter = (label: LinearLabelDatum) => {
    if (this.currentLabel && this.currentLabel.groupId !== label.groupId) {
      this.toggleUnderline(this.currentLabel, false);
      if (this.currentHoveredFeatureIds.length) {
        this.props.onHoverFeatures?.(this.currentHoveredFeatureIds, false);
      }
    }
    this.currentLabel = label;
    this.currentHoveredFeatureIds = label.labels.map(item => item.id);
    if (this.currentHoveredFeatureIds.length) {
      this.props.onHoverFeatures?.(this.currentHoveredFeatureIds, true);
    }
    this.toggleUnderline(label, true);
  };

  handleMouseLeave = () => {
    if (this.currentLabel) {
      this.toggleUnderline(this.currentLabel, false);
    }
    if (this.currentHoveredFeatureIds.length) {
      this.props.onHoverFeatures?.(this.currentHoveredFeatureIds, false);
    }
    this.currentLabel = null;
    this.currentHoveredFeatureIds = [];
  };

  toggleUnderline = (label: LinearLabelDatum, underline: boolean) => {
    const { selectedFeatures } = this.props;
    const shouldKeep = !underline && label.labels.some(item => selectedFeatures?.[item.id]);
    const nextUnderline = underline || shouldKeep;
    setHoveredLabelUnderline(label.groupId, nextUnderline);
    label.labels.forEach(item => {
      if (item.id !== label.groupId) {
        setHoveredLabelUnderline(item.id, nextUnderline);
      }
    });
  };

  render() {
    const { connectorY, hoveredFeatures, labels, lineHeight, selectedFeatures, startY } = this.props;
    if (!labels.length) return null;

    return (
      <g className="la-vz-linear-map-labels" onMouseLeave={this.handleMouseLeave}>
        {labels.map(label => {
          const textY = startY + label.row * lineHeight;
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
          const labelStyle: React.CSSProperties = {
            ...circularLabel,
            cursor: "pointer",
            textDecoration: labelHovered ? "underline" : "none",
          };
          const connectorStyle = labelHovered ? circularLabelLineHover : circularLabelLine;
          const stemStyle = connectorStyle;
          const selectionAttrs = this.getSelectionAttributes(label.labels[0]);

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
                onMouseEnter={() => this.handleLabelEnter(label)}
              >
                {label.displayName}
              </text>
            </g>
          );
        })}
      </g>
    );
  }
}
