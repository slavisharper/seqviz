import * as React from "react";

import { InputRefFunc } from "../../SelectionHandler";
import { colorByIndex } from "../../core/colors";
import { TranslationProp } from "../../core/elements";
import { GenArcFunc } from "./Circular";

interface OrfsProps {
  genArc: GenArcFunc;
  getRotation: (index: number) => string;
  inputRef: InputRefFunc;
  lineHeight: number;
  orfs: TranslationProp[];
  radius: number;
  seqLength: number;
}

const MIN_RING_OFFSET = 20;
const MIN_RING_THICKNESS = 5;

export const getOrfRingDimensions = (lineHeight: number) => {
  const ringOffset = Math.max(Math.round(lineHeight * 1.4), MIN_RING_OFFSET);
  const ringThickness = Math.max(Math.round(lineHeight * 0.5), MIN_RING_THICKNESS);
  return { ringOffset, ringThickness };
};

/** Render ORF arcs between the index ring and the annotation stack. */
export const Orfs = ({ genArc, getRotation, inputRef, lineHeight, orfs, radius, seqLength }: OrfsProps) => {
  if (!orfs.length || radius <= 0 || seqLength <= 0) {
    return null;
  }

  const { ringOffset, ringThickness } = getOrfRingDimensions(lineHeight);
  const outerRadius = Math.max(radius - ringOffset, ringThickness);
  const innerRadius = Math.max(outerRadius - ringThickness, 1);

  if (innerRadius >= outerRadius) {
    return null;
  }

  return (
    <g className="la-vz-circular-orfs">
      {orfs.map((orf, idx) => {
        const normalizedStart = ((orf.start % seqLength) + seqLength) % seqLength;
        let adjustedEnd = orf.end;
        if (adjustedEnd < normalizedStart) {
          adjustedEnd += seqLength;
        }

        let length = Math.abs(adjustedEnd - normalizedStart);
        if (length === 0) {
          length = seqLength - 0.1;
        }

        const path = genArc({
          arrowFWD: orf.direction !== -1,
          arrowREV: orf.direction === -1,
          innerRadius,
          largeArc: length > seqLength / 2,
          length,
          outerRadius,
          sweepFWD: true,
        });
        const color = orf.color || colorByIndex(idx);
        const id = `orf-${idx}-${normalizedStart}-${adjustedEnd}`;

        return (
          <path
            key={id}
            id={id}
            ref={inputRef(id, {
              direction: orf.direction,
              end: orf.end,
              name: orf.name,
              parent: { ...orf, type: "TRANSLATION" },
              start: orf.start,
              type: "TRANSLATION",
              viewer: "CIRCULAR",
            })}
            data-selection-end={orf.end}
            data-selection-start={orf.start}
            data-selection-type="TRANSLATION"
            data-selection-viewer="CIRCULAR"
            className="la-vz-circular-orf"
            cursor="pointer"
            d={path}
            fill={color}
            opacity={0.7}
            stroke="rgba(0, 0, 0, 0.25)"
            strokeWidth={0.75}
            transform={getRotation(normalizedStart)}
          />
        );
      })}
    </g>
  );
};
