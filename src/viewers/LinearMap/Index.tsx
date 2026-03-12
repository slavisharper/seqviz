import * as React from "react";

import { indexLine, indexTick, indexTickLabel } from "../../style";
import { LinearMapScale } from "./utils";

interface LinearIndexProps {
  lineHeight: number;
  scale: LinearMapScale;
  seqLength: number;
  showIndex: boolean;
  viewportWidth: number;
  y: number;
}

export const Index: React.FC<LinearIndexProps> = ({ lineHeight, scale, seqLength, showIndex, viewportWidth, y }) => {
  if (!showIndex || seqLength <= 0) return null;

  const baselineY = y + lineHeight / 2;
  const tickHeight = Math.min(8, lineHeight);
  const increment = computeIncrement({ pxPerBase: scale.pxPerBase, seqLength, viewportWidth });
  const ticks = buildTicks(seqLength, increment, scale.pxPerBase);

  return (
    <g className="la-vz-linear-map-index">
      <line
        className="la-vz-index-line"
        style={indexLine}
        x1={scale.offsetX}
        x2={scale.offsetX + scale.width}
        y1={baselineY}
        y2={baselineY}
      />
      {ticks.map(pos => {
        const x = scale.offsetX + pos * scale.pxPerBase;
        return (
          <React.Fragment key={`index-tick-${pos}`}>
            <line
              className="la-vz-index-tick"
              style={indexTick}
              x1={x}
              x2={x}
              y1={baselineY}
              y2={baselineY + tickHeight}
            />
            <text
              className="la-vz-index-tick-label"
              style={indexTickLabel}
              textAnchor="middle"
              x={x}
              y={baselineY + tickHeight + 10}
            >
              {pos}
            </text>
          </React.Fragment>
        );
      })}
    </g>
  );
};

const TARGET_VISIBLE_TICKS = 4.5;

const computeIncrement = ({
  pxPerBase,
  seqLength,
  viewportWidth,
}: {
  pxPerBase: number;
  seqLength: number;
  viewportWidth: number;
}) => {
  if (!Number.isFinite(pxPerBase) || pxPerBase <= 0 || seqLength <= 0) {
    return 1;
  }

  const safeViewportWidth = Math.max(1, viewportWidth);
  const visibleBases = safeViewportWidth / pxPerBase;
  const approxIncrement = Math.max(1, visibleBases / TARGET_VISIBLE_TICKS);
  return roundToNiceIncrement(approxIncrement);
};

const roundToNiceIncrement = (value: number) => {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, value)));
  const normalized = value / magnitude;

  if (normalized < 1.5) return Math.max(1, Math.round(1 * magnitude));
  if (normalized < 3) return Math.max(1, Math.round(2 * magnitude));
  if (normalized < 7) return Math.max(1, Math.round(5 * magnitude));
  return Math.max(1, Math.round(10 * magnitude));
};

// Minimum pixel gap between tick labels to avoid overlap.
const MIN_LABEL_GAP_PX = 40;

const buildTicks = (seqLength: number, increment: number, pxPerBase: number) => {
  const ticks: number[] = [];
  let pos = 0;
  while (pos <= seqLength) {
    ticks.push(Math.round(pos));
    pos += increment;
  }
  if (ticks[ticks.length - 1] !== seqLength) {
    ticks.push(seqLength);
  }
  if (ticks[0] !== 0) {
    ticks.unshift(0);
  }
  const unique = Array.from(new Set(ticks)).sort((a, b) => a - b);

  // If the penultimate tick is too close to the seqLength endpoint, remove it
  // to prevent the two labels from overlapping.
  if (pxPerBase > 0 && unique.length >= 3) {
    const last = unique[unique.length - 1];
    const penultimate = unique[unique.length - 2];
    if ((last - penultimate) * pxPerBase < MIN_LABEL_GAP_PX) {
      unique.splice(unique.length - 2, 1);
    }
  }

  return unique;
};
