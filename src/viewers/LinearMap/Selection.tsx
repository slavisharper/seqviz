import * as React from "react";

import SelectionContext from "../../state/selectionContext";
import { selection, selectionEdge } from "../../style";
import { LinearMapScale, createSegments, normalizeBase } from "./utils";

interface LinearSelectionProps {
  height: number;
  scale: LinearMapScale;
  showEdges?: boolean;
  showFill?: boolean;
  y: number;
}

const FULL_COVERAGE_EPSILON = 0.0001;

export class Selection extends React.PureComponent<LinearSelectionProps> {
  static contextType = SelectionContext;
  declare context: React.ContextType<typeof SelectionContext>;

  render() {
    const { height, scale, showEdges = true, showFill = true, y } = this.props;
    const { clockwise, end, ref, start } = this.context;

    if (typeof start !== "number" || typeof end !== "number") {
      return null;
    }

    const seqLength = scale.seqLength;
    if (seqLength <= 0) {
      return null;
    }

    const segments = resolveSegments({ clockwise, end, ref, start }, seqLength);
    const coversAll =
      segments.length === 1 && segments[0].start === 0 && segments[0].end >= seqLength - FULL_COVERAGE_EPSILON;

    const edges = new Set<number>();
    segments.forEach(segment => {
      edges.add(segment.start);
      edges.add(segment.end);
    });

    if (!segments.length && ref !== "ALL") {
      edges.add(normalizeBase(start, seqLength));
    }

    if (!showFill && !showEdges) {
      return null;
    }

    return (
      <g className="la-vz-linear-map-selection">
        {showFill &&
          segments.map((segment, index) => {
            const width = (segment.end - segment.start) * scale.pxPerBase;
            if (width <= 0) return null;
            return (
              <rect
                key={`selection-${segment.start}-${segment.end}-${index}`}
                className="la-vz-selection"
                height={height}
                style={selection}
                width={width}
                x={positionToX(scale, segment.start)}
                y={y}
              />
            );
          })}
        {showEdges &&
          !coversAll &&
          Array.from(edges).map(edge => (
            <rect
              key={`selection-edge-${edge}`}
              className="la-vz-selection-edge"
              height={height}
              shapeRendering="crispEdges"
              strokeWidth={0}
              style={selectionEdge}
              width={1}
              x={positionToX(scale, edge)}
              y={y}
            />
          ))}
      </g>
    );
  }
}

const positionToX = (scale: LinearMapScale, value: number) => {
  const clamped = Math.max(0, Math.min(value, scale.seqLength));
  return scale.offsetX + clamped * scale.pxPerBase;
};

const resolveSegments = (
  selection: { clockwise: boolean | null | undefined; end: number; ref?: string | null; start: number },
  seqLength: number,
) => {
  const { clockwise, end, ref, start } = selection;
  if (ref === "ALL") {
    return createSegments(0, 0, seqLength);
  }

  if (start === end) {
    return [];
  }

  if (clockwise === false) {
    if (start > end) {
      return createSegments(end, start, seqLength);
    }
    return [
      { end: start, start: 0 },
      { end: seqLength, start: end },
    ].filter(segment => segment.start !== segment.end);
  }

  return createSegments(start, end, seqLength);
};
