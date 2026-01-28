import * as React from "react";

import { CHAR_WIDTH } from "../../SeqViewerContainer";
import { circularLabelLine, svgText } from "../../style";
import { LABEL_FONT_WEIGHT_DEFAULT, LABEL_FONT_WEIGHT_HOVER, enzymeHoverColor } from "../../style/labelTheme";
import { setHoveredLabelUnderline } from "../Circular/WrappedGroupLabel";
import { LinearLabelDatum, LinearLabelItem } from "./Labels";
import { LinearMapScale, clamp } from "./utils";
import HoveredEnzymeContext, { matchesHoveredEnzyme } from "../../state/hoveredEnzymeContext";

interface LinearGroupLabelOverlayProps {
  group: LinearLabelDatum & { textY: number };
  getSelectionAttributes: (label: LinearLabelItem) => Record<string, string | number>;
  hoveredFeatures?: Record<string, boolean>;
  lineHeight: number;
  onGroupLeave?: (featureIds: string[]) => void;
  onHoverFeature?: (featureId: string, hover: boolean) => void;
  onRequestClose?: () => void;
  scale: LinearMapScale;
}

export const LinearGroupLabelOverlay: React.FC<LinearGroupLabelOverlayProps> = ({
  group,
  getSelectionAttributes,
  hoveredFeatures,
  lineHeight,
  onGroupLeave,
  onHoverFeature,
  onRequestClose,
  scale,
}) => {
  const { hoveredEnzyme, highlightedEnzymes, setHoveredEnzyme } = React.useContext(HoveredEnzymeContext);
  const paddingX = CHAR_WIDTH;
  const paddingY = lineHeight * 0.25;
  const longestLabelChars = group.labels.reduce((max, label) => Math.max(max, label.name.length), 0);
  const contentWidth = Math.max(longestLabelChars * CHAR_WIDTH, 4 * CHAR_WIDTH);
  const rectWidth = contentWidth + paddingX * 2;
  const rectHeight = group.labels.length * lineHeight + paddingY * 2;

  const minX = scale.offsetX + CHAR_WIDTH;
  const maxX = scale.offsetX + scale.width - rectWidth - CHAR_WIDTH;
  const preferredLeft = group.textX - rectWidth / 2;
  const rectX = clamp(preferredLeft, minX, maxX);
  const rectY = Math.max(CHAR_WIDTH, group.textY - rectHeight - lineHeight * 0.5);

  const connectorStartX = group.textX;
  const connectorStartY = group.textY - lineHeight * 0.2;
  const connectorEndX = rectX + rectWidth / 2;
  const connectorEndY = rectY + rectHeight;

  const textStartX = rectX + paddingX;
  const textStartY = rectY + paddingY + lineHeight / 2;

  const handleMouseLeave = () => {
    group.labels.forEach(label => setHoveredLabelUnderline(label.id, false));
    setHoveredLabelUnderline(group.groupId, false);
    if (group.labels.some(label => matchesHoveredEnzyme(hoveredEnzyme, label, highlightedEnzymes))) {
      setHoveredEnzyme(null);
    }
    onGroupLeave?.(group.labels.map(label => label.id));
  };

  const handleHoverChange = (label: LinearLabelItem, hover: boolean) => {
    if (hover) {
      setHoveredEnzyme({ id: label.id, name: label.name });
    } else if (matchesHoveredEnzyme(hoveredEnzyme, label, highlightedEnzymes)) {
      setHoveredEnzyme(null);
    }
  };

  return (
    <g
      className="la-vz-linear-map-label-overlay"
      onMouseLeave={handleMouseLeave}
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        const pointerType = (e.nativeEvent as any)?.pointerType || "mouse";
        if (pointerType === "touch") {
          onRequestClose?.();
        }
      }}
    >
      <path
        className="la-vz-label-line"
        d={`M${connectorStartX} ${connectorStartY} L${connectorEndX} ${connectorEndY}`}
        style={circularLabelLine}
      />
      <rect fill="white" height={rectHeight} stroke="none" width={rectWidth} x={rectX} y={rectY} />
      <text style={{ ...svgText, cursor: "pointer" }} textAnchor="start">
        {group.labels.map((label, index) => (
          <tspan
            key={`${group.groupId}-${label.id}-${index}`}
            dominantBaseline="middle"
            id={label.id}
            {...getSelectionAttributes(label)}
            style={{
              cursor: "pointer",
              textDecoration: hoveredFeatures?.[label.id] ? "underline" : "none",
              fill: matchesHoveredEnzyme(hoveredEnzyme, label, highlightedEnzymes) ? enzymeHoverColor : undefined,
              fontWeight: matchesHoveredEnzyme(hoveredEnzyme, label, highlightedEnzymes)
                ? LABEL_FONT_WEIGHT_HOVER
                : LABEL_FONT_WEIGHT_DEFAULT,
            }}
            x={textStartX}
            y={textStartY + index * lineHeight}
            onMouseLeave={() => {
              setHoveredLabelUnderline(label.id, false);
              onHoverFeature?.(label.id, false);
              handleHoverChange(label, false);
            }}
            onMouseOver={() => {
              setHoveredLabelUnderline(label.id, true);
              onHoverFeature?.(label.id, true);
              handleHoverChange(label, true);
            }}
          >
            {label.name}
          </tspan>
        ))}
      </text>
      <rect fill="none" height={rectHeight} stroke="black" strokeWidth={1.5} width={rectWidth} x={rectX} y={rectY} />
    </g>
  );
};
