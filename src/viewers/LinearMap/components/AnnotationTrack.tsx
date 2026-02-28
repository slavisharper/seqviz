import * as React from "react";

import { InputRefFunc } from "../../../SelectionHandler";
import { COLOR_BORDER_MAP, contrastText, darkerColor } from "../../../core/colors";
import { Annotation } from "../../../core/elements";
import { annotationLabel, annotation as annotationStyle } from "../../../style";
import { createSegments, rangeMidpoint } from "../utils";
import { LinearMapScale } from "../utils";

type HoverHandler = (featureId: string, hover: boolean) => void;
type HoverCheck = (featureId: string) => boolean;

type AnnotationTrackProps = {
  rows: Annotation[][];
  scale: LinearMapScale;
  startY: number;
  featureHeight: number;
  rowSpacing: number;
  inlineAnnotationIds: Set<string>;
  inputRef: InputRefFunc;
  onFeatureHover: HoverHandler;
  isFeatureHovered: HoverCheck;
};

export const AnnotationTrack: React.FC<AnnotationTrackProps> = ({
  rows,
  scale,
  startY,
  featureHeight,
  rowSpacing,
  inlineAnnotationIds,
  inputRef,
  onFeatureHover,
  isFeatureHovered,
}) => {
  if (!rows.length) return null;

  return (
    <g className="la-vz-linear-map-annotations">
      {rows.map((row, rowIndex) => {
        const rowY = startY + rowIndex * rowSpacing;
        return (
          <g key={`annotation-row-${rowIndex}`} transform={`translate(0, ${rowY})`}>
            {row.map(annotation => (
              <AnnotationFeature
                key={`annotation-${annotation.id}`}
                feature={annotation}
                featureHeight={featureHeight}
                inlineAnnotationIds={inlineAnnotationIds}
                inputRef={inputRef}
                isFeatureHovered={isFeatureHovered}
                onFeatureHover={onFeatureHover}
                scale={scale}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
};

type AnnotationFeatureProps = {
  feature: Annotation;
  scale: LinearMapScale;
  featureHeight: number;
  inlineAnnotationIds: Set<string>;
  inputRef: InputRefFunc;
  onFeatureHover: HoverHandler;
  isFeatureHovered: HoverCheck;
};

const AnnotationFeature: React.FC<AnnotationFeatureProps> = ({
  feature,
  scale,
  featureHeight,
  inlineAnnotationIds,
  inputRef,
  onFeatureHover,
  isFeatureHovered,
}) => {
  const segments = createSegments(feature.start, feature.end, scale.seqLength);
  const midpoint = rangeMidpoint(feature.start, feature.end, scale.seqLength);
  const textX = scale.offsetX + midpoint * scale.pxPerBase;
  const strokeColor = feature.color ? COLOR_BORDER_MAP[feature.color] || darkerColor(feature.color) : "gray";
  const inline = inlineAnnotationIds.has(feature.id);
  const interactive = !!feature.name;
  const hovered = isFeatureHovered(feature.id);
  const baseStyle = {
    ...annotationStyle,
    cursor: interactive ? "pointer" : annotationStyle.cursor,
    fill: feature.color,
    stroke: strokeColor,
  } as React.CSSProperties;
  const hoverStyle = hovered ? { ...baseStyle, fillOpacity: 1 } : baseStyle;
  const contrastFill = contrastText(feature.color);
  const textHoverStyle =
    inline && feature.name
      ? {
          ...annotationLabel,
          fill: contrastFill,
          textDecoration: hovered ? "underline" : "none",
        }
      : { ...annotationLabel, fill: contrastFill };

  return (
    <g className="la-vz-linear-map-annotation">
      {segments.map((segment, index) => {
        const width = (segment.end - segment.start) * scale.pxPerBase;
        if (width <= 0) return null;
        const x = scale.offsetX + segment.start * scale.pxPerBase;
        const direction = feature.direction === -1 ? -1 : feature.direction === 1 ? 1 : 0;
        const hasArrow = direction !== 0;
        const arrowWidth = hasArrow ? Math.min(featureHeight, width / 2) : 0;
        const bodyWidth = hasArrow ? Math.max(width - arrowWidth, 0) : width;
        const bodyX = direction === -1 ? x + arrowWidth : x;
        const rectStart = bodyX;
        const rectEnd = bodyX + bodyWidth;
        const polygonPoints =
          direction === -1
            ? `${x + width},0 ${x + width},${featureHeight} ${rectStart},${featureHeight} ${x},${featureHeight / 2} ${rectStart},0`
            : `${rectStart},0 ${rectEnd},0 ${x + width},${featureHeight / 2} ${rectEnd},${featureHeight} ${rectStart},${featureHeight}`;
        const refCallback =
          index === 0
            ? inputRef(feature.id, {
                direction: feature.direction,
                end: feature.end,
                name: feature.name,
                ref: feature.id,
                scrollLinearOnSelect: true,
                start: feature.start,
                type: "ANNOTATION",
                viewer: "LINEAR",
              })
            : undefined;
        const enter = interactive ? () => onFeatureHover(feature.id, true) : undefined;
        const leave = interactive ? () => onFeatureHover(feature.id, false) : undefined;

        if (!hasArrow) {
          return (
            <rect
              key={`annotation-${feature.id}-segment-${segment.start}-${segment.end}`}
              ref={refCallback}
              className={`${feature.id} la-vz-annotation`}
              height={featureHeight}
              id={feature.id}
              style={hoverStyle}
              width={bodyWidth}
              x={bodyX}
              y={0}
              onMouseEnter={enter}
              onMouseLeave={leave}
            />
          );
        }

        return (
          <polygon
            key={`annotation-${feature.id}-segment-${segment.start}-${segment.end}`}
            ref={refCallback}
            className={`${feature.id} la-vz-annotation-arrow`}
            id={feature.id}
            points={polygonPoints}
            style={hoverStyle}
            onMouseEnter={enter}
            onMouseLeave={leave}
          />
        );
      })}
      {inline && feature.name && (
        <text
          className="la-vz-annotation-label"
          dominantBaseline="middle"
          style={textHoverStyle}
          textAnchor="middle"
          x={textX}
          y={featureHeight / 2}
          onMouseEnter={() => onFeatureHover(feature.id, true)}
          onMouseLeave={() => onFeatureHover(feature.id, false)}
        >
          {feature.name}
        </text>
      )}
    </g>
  );
};
