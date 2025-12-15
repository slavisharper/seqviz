import * as React from "react";

import { indexLine, indexTick, indexTickLabel } from "../style";
import { LinearMapScale } from "./utils";

interface LinearIndexProps {
  lineHeight: number;
  scale: LinearMapScale;
  seqLength: number;
  showIndex: boolean;
  y: number;
}

export const Index: React.FC<LinearIndexProps> = ({ lineHeight, scale, seqLength, showIndex, y }) => {
  if (!showIndex || seqLength <= 0) return null;

  const baselineY = y + lineHeight / 2;
  const tickHeight = Math.min(8, lineHeight);
  const increment = computeIncrement(seqLength);
  const ticks = buildTicks(seqLength, increment);

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

const computeIncrement = (seqLength: number) => {
  if (seqLength <= 50) return 5;
  if (seqLength <= 200) return 10;
  if (seqLength <= 500) return 25;
  const tickCount = 6;
  const approx = Math.max(10, Math.floor(seqLength / tickCount));
  const magnitude = 10 ** Math.floor(Math.log10(approx));
  const significant = approx / magnitude;

  if (significant <= 2) return 2 * magnitude;
  if (significant <= 5) return 5 * magnitude;
  return 10 * magnitude;
};

const buildTicks = (seqLength: number, increment: number) => {
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
  return Array.from(new Set(ticks)).sort((a, b) => a - b);
};
