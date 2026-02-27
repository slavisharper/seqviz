import * as React from "react";

import { InputRefFunc } from "../../SelectionHandler";
import { COLOR_BORDER_MAP, darkerColor } from "../../core/colors";
import { Primer } from "../../core/elements";
import CentralIndexContext from "../../state/centralIndexContext";
import { annotation } from "../../style";
import { GenArcFunc } from "./Circular";

interface PrimersProps {
  primers: Primer[][];
  genArc: GenArcFunc;
  getRotation: (index: number) => string;
  inputRef: InputRefFunc;
  lineHeight: number;
  onFeatureHover?: (featureId: string, hover: boolean) => void;
  radius: number;
  seqLength: number;
  /** How many annotation rows to skip inward so primers render inside features */
  rowsToSkip: number;
}

export const Primers = React.memo((props: PrimersProps) => {
  const { primers, lineHeight, radius, rowsToSkip } = props;
  const primerThickness = Math.max(6, Math.round(lineHeight * 0.7));

  // position primers inside annotations by offsetting based on rowsToSkip
  const rowShiftHeight = lineHeight * rowsToSkip;
  let currBRadius = radius - lineHeight * 2 - 3 - rowShiftHeight - 4; // slight gap beneath annotations
  let currTRadius = currBRadius - primerThickness;

  return (
    <CentralIndexContext.Consumer>
      {() => (
        <g className="la-vz-circular-primers">
          {primers.reduce((acc: React.ReactNode[], primerRow: Primer[], i) => {
            if (i) {
              currBRadius -= primerThickness + 3;
              currTRadius -= primerThickness + 3;
            }

            if (currTRadius < 0) return acc;

            return acc.concat(
              primerRow.map(primer => (
                <PrimerArc
                  key={`la-vz-${primer.id}-primer-circular-row-${i}`}
                  primer={primer}
                  genArc={props.genArc}
                  getRotation={props.getRotation}
                  inputRef={props.inputRef}
                  onFeatureHover={props.onFeatureHover}
                  seqLength={props.seqLength}
                  innerRadius={currTRadius}
                  outerRadius={currBRadius}
                />
              )),
            );
          }, [])}
        </g>
      )}
    </CentralIndexContext.Consumer>
  );
});

Primers.displayName = "Primers";

interface PrimerArcProps {
  primer: Primer;
  genArc: GenArcFunc;
  getRotation: (index: number) => string;
  inputRef: InputRefFunc;
  onFeatureHover?: (featureId: string, hover: boolean) => void;
  seqLength: number;
  innerRadius: number;
  outerRadius: number;
}

const PrimerArc = ({
  primer,
  genArc,
  getRotation,
  inputRef,
  onFeatureHover,
  seqLength,
  innerRadius,
  outerRadius,
}: PrimerArcProps) => {
  let primerLength = primer.end >= primer.start ? primer.end - primer.start : seqLength - primer.start + primer.end;
  primerLength = primerLength === 0 ? seqLength - 0.1 : primerLength;

  const rotation = getRotation(primer.start);
  const arcPath = genArc({
    arrowFWD: primer.direction === 1,
    arrowREV: primer.direction === -1,
    innerRadius,
    largeArc: primerLength > seqLength / 2,
    length: primerLength,
    outerRadius,
    sweepFWD: true,
  });

  const primerId = `la-vz-${primer.id}-primer-circular`;
  const color = primer.color || "#2c7be5";
  const border = COLOR_BORDER_MAP[color] || darkerColor(color);
  const neonStroke = primer.isPhosphorylated ? "#39ff14" : undefined;
  const strokeWidth = primer.isPhosphorylated ? 2 : (annotation.strokeWidth as number | undefined);

  return (
    <g id={primerId} transform={rotation}>
      <path
        id={primer.id}
        ref={inputRef(primer.id, {
          direction: primer.direction,
          end: primer.end,
          name: primer.name,
          ref: primer.id,
          start: primer.start,
          type: "PRIMER",
          viewer: "CIRCULAR",
        })}
        data-selection-end={primer.end}
        data-selection-name={primer.name}
        data-selection-ref={primer.id}
        data-selection-start={primer.start}
        data-selection-type="PRIMER"
        data-selection-viewer="CIRCULAR"
        className={`la-vz-primer ${primer.id}`}
        cursor="pointer"
        d={arcPath}
        fill={color}
        stroke={neonStroke || border}
        style={{ ...annotation, strokeWidth }}
        onMouseEnter={() => onFeatureHover?.(primer.id, true)}
        onMouseLeave={() => onFeatureHover?.(primer.id, false)}
      />
    </g>
  );
};
