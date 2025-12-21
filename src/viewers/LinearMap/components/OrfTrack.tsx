import * as React from "react";

import { InputRefFunc } from "../../../SelectionHandler";
import { COLOR_BORDER_MAP, colorByIndex, darkerColor } from "../../../core/colors";
import { TranslationProp } from "../../../core/elements";
import { annotation as annotationStyle } from "../../../style";
import { createSegments } from "../utils";
import { LinearMapScale } from "../utils";
import { LinearOrf } from "../types";

type HoverHandler = (featureId: string, hover: boolean) => void;
type HoverCheck = (featureId: string) => boolean;
type StripOrf = (orf: LinearOrf) => TranslationProp;
type IdGetter = (orf: LinearOrf) => string;

type OrfTrackProps = {
  rows: LinearOrf[][];
  scale: LinearMapScale;
  startY: number;
  featureHeight: number;
  rowSpacing: number;
  inputRef: InputRefFunc;
  onFeatureHover: HoverHandler;
  isFeatureHovered: HoverCheck;
  stripOrfMeta: StripOrf;
  getFeatureId: IdGetter;
};

export const OrfTrack: React.FC<OrfTrackProps> = ({
  rows,
  scale,
  startY,
  featureHeight,
  rowSpacing,
  inputRef,
  onFeatureHover,
  isFeatureHovered,
  stripOrfMeta,
  getFeatureId,
}) => {
  if (!rows.length) return null;

  return (
    <g className="la-vz-linear-map-orfs">
      {rows.map((row, rowIndex) => {
        const rowY = startY + rowIndex * rowSpacing;
        return (
          <g key={`orf-row-${rowIndex}`} transform={`translate(0, ${rowY})`}>
            {row.map(orf => (
              <OrfFeature
                key={`orf-${getFeatureId(orf)}`}
                feature={orf}
                height={featureHeight}
                inputRef={inputRef}
                isFeatureHovered={isFeatureHovered}
                onFeatureHover={onFeatureHover}
                scale={scale}
                stripOrfMeta={stripOrfMeta}
                getFeatureId={getFeatureId}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
};

type OrfFeatureProps = {
  feature: LinearOrf;
  scale: LinearMapScale;
  height: number;
  inputRef: InputRefFunc;
  onFeatureHover: HoverHandler;
  isFeatureHovered: HoverCheck;
  stripOrfMeta: StripOrf;
  getFeatureId: IdGetter;
};

const OrfFeature: React.FC<OrfFeatureProps> = ({
  feature,
  scale,
  height,
  inputRef,
  onFeatureHover,
  isFeatureHovered,
  stripOrfMeta,
  getFeatureId,
}) => {
  const segments = createSegments(feature.start, feature.end, scale.seqLength);
  if (!segments.length) return null;

  const featureId = getFeatureId(feature);
  const color = feature.color || colorByIndex(feature.__colorIndex);
  const strokeColor = COLOR_BORDER_MAP[color] || darkerColor(color);
  const isHovered = isFeatureHovered(featureId);
  const baseStyle = {
    ...annotationStyle,
    cursor: "pointer",
    fill: color,
    fillOpacity: isHovered ? 0.95 : 0.75,
    stroke: strokeColor,
  } as React.CSSProperties;
  const direction: -1 | 0 | 1 = feature.direction === -1 ? -1 : feature.direction === 1 ? 1 : 0;
  const strippedOrf = stripOrfMeta(feature);

  return (
    <g className="la-vz-linear-map-orf">
      {segments.map((segment, index) => {
        const width = (segment.end - segment.start) * scale.pxPerBase;
        if (width <= 0) return null;
        const x = scale.offsetX + segment.start * scale.pxPerBase;
        const hasArrow = direction !== 0;
        const arrowWidth = hasArrow ? Math.min(Math.max(height * 0.9, 6), width) : 0;
        const bodyWidth = hasArrow ? Math.max(width - arrowWidth, 0) : width;
        const isForward = direction !== -1;
        const bodyX = isForward ? x : x + arrowWidth;
        const rectStart = bodyX;
        const rectEnd = bodyX + bodyWidth;
        const polygonPoints = isForward
          ? `${rectStart},0 ${rectEnd},0 ${x + width},${height / 2} ${rectEnd},${height} ${rectStart},${height}`
          : `${x + width},0 ${x + width},${height} ${rectStart},${height} ${x},${height / 2} ${rectStart},0`;
        const refCallback =
          index === 0
            ? inputRef(featureId, {
                direction,
                end: strippedOrf.end,
                name: strippedOrf.name,
                parent: { ...strippedOrf, type: "TRANSLATION" },
                scrollLinearOnSelect: true,
                start: strippedOrf.start,
                type: "TRANSLATION",
                viewer: "LINEAR",
              })
            : undefined;
        const handleEnter = () => onFeatureHover(featureId, true);
        const handleLeave = () => onFeatureHover(featureId, false);

        if (!hasArrow) {
          return (
            <rect
              key={`${featureId}-segment-${segment.start}-${segment.end}`}
              ref={refCallback}
              className={`${featureId} la-vz-orf`}
              height={height}
              id={featureId}
              style={baseStyle}
              width={bodyWidth}
              x={bodyX}
              y={0}
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            />
          );
        }

        return (
          <polygon
            key={`${featureId}-segment-${segment.start}-${segment.end}`}
            ref={refCallback}
            className={`${featureId} la-vz-orf-arrow`}
            id={featureId}
            points={polygonPoints}
            style={baseStyle}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          />
        );
      })}
    </g>
  );
};
