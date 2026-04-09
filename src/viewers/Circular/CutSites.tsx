import * as React from "react";

import { InputRefFunc } from "../../SelectionHandler";
import { Coor, CutSite } from "../../core/elements";
import HoveredEnzymeContext, { matchesHoveredEnzyme } from "../../state/hoveredEnzymeContext";
import { cutSiteHighlight, cutSite as cutSiteStyle } from "../../style";
import { enzymeHoverColor } from "../../style/labelTheme";
import { GenArcFunc, RENDER_SEQ_LENGTH_CUTOFF } from "./Circular";

interface CutSitesProps {
  center: Coor;
  cutSites: CutSite[];
  findCoor: (index: number, radius: number, rotate?: boolean) => Coor;
  genArc: GenArcFunc;
  getRotation: (index: number) => string;
  inputRef: InputRefFunc;
  lineHeight: number;
  radius: number;
  rotateCoor: (coor: Coor, degrees: number) => Coor;
  selectionRows: number;
  seqLength: number;
}

export const CutSites = (props: CutSitesProps) => {
  const { cutSites } = props;
  if (!cutSites.length) return null;

  const calculateLinePath = (index: number, startRadius: number, endRadius: number): string => {
    const { findCoor } = props;
    const lineStart = findCoor(index, startRadius);
    const lineEnd = findCoor(index, endRadius);
    return `M ${lineEnd.x} ${lineEnd.y} L ${lineStart.x} ${lineStart.y}`;
  };

  return (
    <g className="la-vz-circular-cutsites">
      {cutSites.map((c, idx) => (
        <SingleCutSite
          key={`circular-cut-site-${c.id}-${c.start}-${c.end}-${idx}`}
          {...props}
          calculateLinePath={calculateLinePath}
          cutSite={c}
          occurrenceIndex={idx}
        />
      ))}
    </g>
  );
};

const SingleCutSite = (props: {
  calculateLinePath: (index: number, startRadius: number, endRadius: number) => string;
  cutSite: CutSite;
  genArc: GenArcFunc;
  getRotation: (index: number) => string;
  inputRef: InputRefFunc;
  lineHeight: number;
  occurrenceIndex: number;
  radius: number;
  seqLength: number;
}) => {
  const { calculateLinePath, cutSite, genArc, getRotation, inputRef, lineHeight, occurrenceIndex, radius, seqLength } =
    props;
  const { id, start } = cutSite;
  let { end, fcut, rcut } = cutSite;
  const domId = `${id}-${cutSite.start}-${cutSite.end}-${occurrenceIndex}`;
  const { hoveredEnzyme, highlightedEnzymes, setHoveredEnzyme } = React.useContext(HoveredEnzymeContext);
  const isHighlighted = matchesHoveredEnzyme(hoveredEnzyme, cutSite, highlightedEnzymes);
  const handleHover = (hover: boolean) => {
    if (!cutSite?.name) return;
    if (hover) {
      setHoveredEnzyme({ id: cutSite.id, name: cutSite.name });
    } else if (matchesHoveredEnzyme(hoveredEnzyme, cutSite, highlightedEnzymes)) {
      setHoveredEnzyme(null);
    }
  };

  // If any of the end or cut values are greater than the start, it's corssing the zero index
  if (start > end || start > fcut || start > rcut) {
    // So add the length of the sequence to all values that are crossing the zero index
    if (start > end) {
      end += seqLength;
    }
    if (start > fcut) {
      fcut += seqLength;
    }
    if (start > rcut) {
      rcut += seqLength;
    }
  }

  // length for highlighted recog area
  const cutSiteLength = Math.abs(end - start);

  // const calc the size of the recog area radii
  const botR = radius;
  let midR = radius + 0.5 * lineHeight; // mid radius
  let topR = radius + lineHeight; // outer radius
  if (seqLength < RENDER_SEQ_LENGTH_CUTOFF) {
    midR += lineHeight + 1.5;
    topR += 2 * lineHeight + 1.5;
  }

  const baseHighlightStyle = cutSite.enzyme.color
    ? { ...cutSiteHighlight, fill: cutSite.enzyme.color }
    : cutSiteHighlight;
  const highlightStyle = isHighlighted
    ? {
        ...baseHighlightStyle,
        fill: "rgba(76, 29, 149, 0.15)",
        fillOpacity: 0.8,
        stroke: enzymeHoverColor,
        strokeWidth: 1.5,
      }
    : baseHighlightStyle;
  const lineStyle = isHighlighted ? { ...cutSiteStyle, stroke: enzymeHoverColor, strokeWidth: 1.5 } : cutSiteStyle;

  return (
    <g
      key={`la-vz-circular-cutsite-${domId}`}
      id={`la-vz-circular-cutsite-${domId}`}
      transform={getRotation(start)}
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
    >
      {/* an arc that surrounds the cut site */}
      <path
        ref={inputRef(domId, {
          direction: cutSite.direction,
          end: end,
          name: cutSite.name,
          ref: domId,
          fcut: cutSite.fcut,
          rcut: cutSite.rcut,
          start: start,
          type: "ENZYME",
          viewer: "CIRCULAR",
        })}
        data-selection-end={end}
        data-selection-direction={cutSite.direction}
        data-selection-fcut={cutSite.fcut}
        data-selection-rcut={cutSite.rcut}
        data-selection-start={start}
        data-selection-type="ENZYME"
        data-selection-viewer="CIRCULAR"
        className="la-vz-cut-site"
        cursor="pointer"
        d={genArc({
          innerRadius: botR,
          largeArc: cutSiteLength > seqLength / 2,
          length: cutSiteLength,
          outerRadius: topR,
          sweepFWD: true,
        })}
        style={highlightStyle}
      />

      {/* a line showing the start of the cut-site */}
      <path className="la-vz-cut-site" d={calculateLinePath(fcut - start, topR, midR)} style={lineStyle} />

      {/* a connector line for the cut-site */}
      <path
        className="la-vz-cut-site"
        d={genArc({
          innerRadius: midR,
          largeArc: Math.abs(fcut - rcut) > seqLength / 2,
          length: Math.abs(fcut - rcut),
          offset: Math.min(fcut, rcut) - start,
          outerRadius: midR,
          sweepFWD: true,
        })}
        style={lineStyle}
      />

      {/* a line showing the end of the cut-site */}
      <path className="la-vz-cut-site" d={calculateLinePath(rcut - start, midR, botR)} style={lineStyle} />
    </g>
  );
};
