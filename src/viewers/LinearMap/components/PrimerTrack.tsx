import * as React from "react";

import { InputRefFunc } from "../../../SelectionHandler";
import { COLOR_BORDER_MAP, darkerColor } from "../../../core/colors";
import { Primer } from "../../../core/elements";
import { annotationLabel, annotation as annotationStyle } from "../../../style";
import { createSegments, rangeMidpoint } from "../utils";
import { LinearMapScale } from "../utils";

type HoverHandler = (featureId: string, hover: boolean) => void;
type HoverCheck = (featureId: string) => boolean;

type PrimerTrackProps = {
  rows: Primer[][];
  scale: LinearMapScale;
  startY: number;
  featureHeight: number;
  rowSpacing: number;
  inlinePrimerIds: Set<string>;
  inputRef: InputRefFunc;
  onFeatureHover: HoverHandler;
  isFeatureHovered: HoverCheck;
};

export const PrimerTrack: React.FC<PrimerTrackProps> = ({
  rows,
  scale,
  startY,
  featureHeight,
  rowSpacing,
  inlinePrimerIds,
  inputRef,
  onFeatureHover,
  isFeatureHovered,
}) => {
  if (!rows.length) return null;

  return (
    <g className="la-vz-linear-map-primers">
      {rows.map((row, rowIndex) => {
        const rowY = startY + rowIndex * rowSpacing;
        return (
          <g key={`primer-row-${rowIndex}`} transform={`translate(0, ${rowY})`}>
            {row.map(primer => (
              <PrimerFeature
                key={`primer-${primer.id}`}
                feature={primer}
                featureHeight={featureHeight}
                inlinePrimerIds={inlinePrimerIds}
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

type PrimerFeatureProps = {
  feature: Primer;
  scale: LinearMapScale;
  featureHeight: number;
  inlinePrimerIds: Set<string>;
  inputRef: InputRefFunc;
  onFeatureHover: HoverHandler;
  isFeatureHovered: HoverCheck;
};

const PrimerFeature: React.FC<PrimerFeatureProps> = ({
  feature,
  scale,
  featureHeight,
  inlinePrimerIds,
  inputRef,
  onFeatureHover,
  isFeatureHovered,
}) => {
  const segments = createSegments(feature.start, feature.end, scale.seqLength);
  const midpoint = rangeMidpoint(feature.start, feature.end, scale.seqLength);
  const textX = scale.offsetX + midpoint * scale.pxPerBase;
  const strokeColor = feature.color ? COLOR_BORDER_MAP[feature.color] || darkerColor(feature.color) : "#555";
  const neonStroke = feature.isPhosphorylated ? "#39ff14" : undefined;
  const strokeWidth = feature.isPhosphorylated ? 2 : (annotationStyle.strokeWidth as number | undefined);
  const inline = inlinePrimerIds.has(feature.id);
  const interactive = !!feature.name;
  const hovered = isFeatureHovered(feature.id);
  const baseStyle = {
    ...annotationStyle,
    cursor: interactive ? "pointer" : annotationStyle.cursor,
    fill: feature.color,
    stroke: neonStroke || strokeColor,
    strokeWidth,
  } as React.CSSProperties;
  const hoverStyle = hovered ? { ...baseStyle, fillOpacity: 1 } : baseStyle;
  const arrowBaseStyle = {
    ...annotationStyle,
    cursor: interactive ? "pointer" : annotationStyle.cursor,
    fill: feature.color,
    stroke: neonStroke || strokeColor,
    strokeWidth,
  } as React.CSSProperties;
  const arrowStyle = hovered ? { ...arrowBaseStyle, fillOpacity: 1 } : arrowBaseStyle;
  const textHoverStyle =
    inline && feature.name
      ? {
          ...annotationLabel,
          textDecoration: hovered ? "underline" : "none",
        }
      : annotationLabel;

  return (
    <g className="la-vz-linear-map-primer">
      {segments.map((segment, index) => {
        const width = (segment.end - segment.start) * scale.pxPerBase;
        if (width <= 0) return null;
        const x = scale.offsetX + segment.start * scale.pxPerBase;
        const arrowWidth = Math.min(width / 2, 10);
        const bodyWidth = Math.max(width - arrowWidth, 0);
        const isForward = feature.direction === 1;
        const bodyX = isForward ? x : x + arrowWidth;
        const rectStart = bodyX;
        const rectEnd = bodyX + bodyWidth;
        const polygonPoints = isForward
          ? `${rectStart},0 ${rectEnd},0 ${x + width},${featureHeight / 2} ${rectEnd},${featureHeight} ${rectStart},${featureHeight}`
          : `${x + width},0 ${x + width},${featureHeight} ${rectStart},${featureHeight} ${x},${featureHeight / 2} ${rectStart},0`;
        const refCallback =
          index === 0
            ? inputRef(feature.id, {
                direction: feature.direction,
                end: feature.end,
                name: feature.name,
                ref: feature.id,
                scrollLinearOnSelect: true,
                start: feature.start,
                type: "PRIMER",
                viewer: "LINEAR",
              })
            : undefined;
        const enter = interactive ? () => onFeatureHover(feature.id, true) : undefined;
        const leave = interactive ? () => onFeatureHover(feature.id, false) : undefined;

        if (arrowWidth === 0) {
          return (
            <rect
              key={`primer-${feature.id}-segment-${segment.start}-${segment.end}`}
              ref={refCallback}
              className={`${feature.id} la-vz-primer`}
              height={featureHeight}
              id={feature.id}
              style={hoverStyle}
              width={width}
              x={x}
              y={0}
              onMouseEnter={enter}
              onMouseLeave={leave}
            />
          );
        }

        return (
          <polygon
            key={`primer-${feature.id}-segment-${segment.start}-${segment.end}`}
            ref={refCallback}
            className={`${feature.id} la-vz-primer`}
            id={feature.id}
            points={polygonPoints}
            style={arrowStyle}
            onMouseEnter={enter}
            onMouseLeave={leave}
          />
        );
      })}
      {inline && feature.name && (
        <text
          className="la-vz-primer-label"
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
