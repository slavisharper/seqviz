import * as React from "react";

import { InputRefFunc } from "../../SelectionHandler";
import { Highlight, Range } from "../../core/elements";
import { highlight as highlightStyle, search as searchStyle } from "../../style";
import { LinearMapScale, mapRangeToSegments } from "./utils";

interface LinearFindProps {
  height: number;
  highlights: Highlight[];
  inputRef: InputRefFunc;
  scale: LinearMapScale;
  search: Range[];
  y: number;
}

export const Find: React.FC<LinearFindProps> = ({ height, highlights, inputRef, scale, search, y }) => {
  const seqLength = scale.seqLength;
  if (seqLength <= 0) return null;

  const borderColor = "#000";
  const searchRectStyle = {
    ...searchStyle,
    stroke: borderColor,
    strokeWidth: 1,
  } as React.CSSProperties;

  return (
    <g className="la-vz-linear-map-find">
      {search.map(range => {
        const id = `la-vz-linear-find-${range.start}-${range.end}-${range.direction ?? 0}`;
        const segments = mapRangeToSegments(range, seqLength);
        return segments.map((segment, index) => {
          const width = (segment.end - segment.start) * scale.pxPerBase;
          if (width <= 0) return null;
          return (
            <rect
              key={`${id}-${segment.start}-${segment.end}-${index}`}
              ref={
                index === 0
                  ? inputRef(id, {
                      ...range,
                      ref: id,
                      scrollLinearOnSelect: true,
                      type: "FIND",
                      viewer: "LINEAR",
                    })
                  : undefined
              }
              className="la-vz-search"
              height={height}
              id={id}
              style={searchRectStyle}
              width={width}
              x={scale.offsetX + segment.start * scale.pxPerBase}
              y={y}
            />
          );
        });
      })}
      {highlights.map(range => {
        const id = `la-vz-linear-highlight-${range.start}-${range.end}`;
        const segments = mapRangeToSegments(range, seqLength);
        return segments.map((segment, index) => {
          const width = (segment.end - segment.start) * scale.pxPerBase;
          if (width <= 0) return null;
          const style = range.color
            ? { ...highlightStyle, fill: range.color, stroke: borderColor, strokeWidth: 1 }
            : { ...highlightStyle, stroke: borderColor, strokeWidth: 1 };
          return (
            <rect
              key={`${id}-${segment.start}-${segment.end}-${index}`}
              ref={
                index === 0
                  ? inputRef(range.id || id, {
                      ...range,
                      ref: range.id || id,
                      scrollLinearOnSelect: true,
                      type: "HIGHLIGHT",
                      viewer: "LINEAR",
                    })
                  : undefined
              }
              className="la-vz-search"
              height={height}
              id={range.id || id}
              style={style}
              width={width}
              x={scale.offsetX + segment.start * scale.pxPerBase}
              y={y}
            />
          );
        });
      })}
    </g>
  );
};
