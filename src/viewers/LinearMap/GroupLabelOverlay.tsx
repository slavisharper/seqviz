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
  // Build display text for each label: "Name(cutIndex)" for enzymes with cut info.
  const labelDisplayTexts = group.labels.map(label => {
    if (label.type === "enzyme" && typeof label.selectionFcut === "number") {
      return `${label.name}(${label.selectionFcut + 1})`;
    }
    return label.name;
  });
  const longestLabelChars = labelDisplayTexts.reduce((max, text) => Math.max(max, text.length), 0);
  const contentWidth = Math.max(longestLabelChars * CHAR_WIDTH, 4 * CHAR_WIDTH);
  const rectWidth = contentWidth + paddingX * 2;
  const MAX_VISIBLE_ITEMS = 10;
  const visibleCount = Math.min(group.labels.length, MAX_VISIBLE_ITEMS);
  const rectHeight = visibleCount * lineHeight + paddingY * 2;

  const minX = scale.offsetX + CHAR_WIDTH;
  const maxX = scale.offsetX + scale.width - rectWidth - CHAR_WIDTH;
  const preferredLeft = group.textX - rectWidth / 2;
  const rectX = clamp(preferredLeft, minX, maxX);
  const rectY = group.textY - paddingY - lineHeight / 2;

  const connectorStartX = group.textX;
  const connectorStartY = group.textY;
  const connectorEndX = rectX + rectWidth / 2;
  const connectorEndY = rectY;

  const handleMouseLeave = () => {
    group.labels.forEach(label => setHoveredLabelUnderline(label.id, false));
    setHoveredLabelUnderline(group.groupId, false);
    if (
      group.labels.some(
        label => label.type === "enzyme" && matchesHoveredEnzyme(hoveredEnzyme, label, highlightedEnzymes),
      )
    ) {
      setHoveredEnzyme(null);
    }
    onGroupLeave?.(group.labels.map(label => label.id));
  };

  const handleHoverChange = (label: LinearLabelItem, hover: boolean) => {
    if (label.type !== "enzyme") return;
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
      <foreignObject x={rectX} y={rectY} width={rectWidth} height={rectHeight}>
        <div
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore xmlns is required for foreignObject HTML content
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            width: rectWidth,
            height: rectHeight,
            overflowY: group.labels.length > MAX_VISIBLE_ITEMS ? "auto" : "hidden",
            overflowX: "hidden",
            boxSizing: "border-box",
            padding: `${paddingY}px ${paddingX}px`,
          }}
        >
          {group.labels.map((label, index) => {
            const isHighlighted = label.type === "enzyme" && matchesHoveredEnzyme(hoveredEnzyme, label, highlightedEnzymes);
            const isHovered = !!hoveredFeatures?.[label.id];
            return (
              <div
                key={`${group.groupId}-${label.id}-${index}`}
                id={label.id}
                {...getSelectionAttributes(label)}
                style={{
                  height: lineHeight,
                  lineHeight: `${lineHeight}px`,
                  fontSize: svgText.fontSize || 12,
                  fontFamily: svgText.fontFamily || "inherit",
                  cursor: "pointer",
                  textDecoration: isHovered ? "underline" : "none",
                  color: isHighlighted ? enzymeHoverColor : (svgText.fill as string) || "black",
                  fontWeight: isHighlighted
                    ? LABEL_FONT_WEIGHT_HOVER
                    : isHovered
                      ? LABEL_FONT_WEIGHT_HOVER
                      : LABEL_FONT_WEIGHT_DEFAULT,
                  whiteSpace: "nowrap",
                }}
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
                {labelDisplayTexts[index]}
              </div>
            );
          })}
        </div>
      </foreignObject>
      <rect fill="none" height={rectHeight} stroke="black" strokeWidth={1.5} width={rectWidth} x={rectX} y={rectY} />
    </g>
  );
};
