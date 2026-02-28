import * as React from "react";

import { CHAR_WIDTH } from "../../SeqViewerContainer";
import { circularLabel, svgText } from "../../style";
import { LABEL_FONT_WEIGHT_DEFAULT, LABEL_FONT_WEIGHT_HOVER, enzymeHoverColor } from "../../style/labelTheme";
import { ILabel } from "./Circular";
import { GroupedLabelsWithCoors } from "./Labels";
import HoveredEnzymeContext, { matchesHoveredEnzyme } from "../../state/hoveredEnzymeContext";

interface WrappedGroupLabelProps {
  getSelectionAttributes: (label: ILabel) => Record<string, string | number>;
  group: GroupedLabelsWithCoors;
  lineHeight: number;
  setHoveredGroup: (hoveredGroup: string) => void;
  onRequestClose?: () => void;
  size: {
    height: number;
    width: number;
  };
}

/**
 * Groups several other labels together so they're all viewable at once
 *
 * given the currently active annotation block, with multiple annotations and enzymes,
 * render each in a single "block", which is a g element with a rect "containing" the
 * names. This is slightly tricky because we can't put the text elements inside
 * the rect as though it were a div and have them fill it. instead, we must calculate
 * the height and width of the resulting annotaiton block
 */
export const WrappedGroupLabel = (props: WrappedGroupLabelProps) => {
  const {
    getSelectionAttributes,
    group,
    lineHeight,
    setHoveredGroup,
    onRequestClose,
    size: { height, width },
  } = props;
  const { hoveredEnzyme, highlightedEnzymes, setHoveredEnzyme } = React.useContext(HoveredEnzymeContext);
  const [hoveredLabelId, setHoveredLabelId] = React.useState<string | null>(null);
  const groupHasHighlightedEnzyme = group.labels.some(label => matchesHoveredEnzyme(hoveredEnzyme, label, highlightedEnzymes));

  const handleLabelHover = (label: ILabel, hover: boolean) => {
    if (!label?.id) return;
    if (label.type !== "enzyme") return;
    if (hover) {
      setHoveredEnzyme({ id: label.id, name: label.name });
    } else if (matchesHoveredEnzyme(hoveredEnzyme, label, highlightedEnzymes)) {
      setHoveredEnzyme(null);
    }
  };

  // utility function for calculating the width of the last row before this one
  // the +1 after name.length is for a comma
  const calcRowWidth = (row: ILabel[]) => row.reduce((acc, label) => acc + (label.name.length + 1) * CHAR_WIDTH, 0);

  // group the labels into rows with a preference with widths less than 200px
  const lastRow = (acc: ILabel[][]) => acc[acc.length - 1];
  const labelRows = group.labels.reduce((acc: ILabel[][], l: ILabel) => {
    const nameWidth = l.name.length * CHAR_WIDTH;
    if (nameWidth > width) {
      // handle an edge case where the annotation name is MASSIVE and
      // greater than the width of the sequence viewer
      // split the name into separate rows so it's at max 75% of the
      // seq viewer's width, but each still referencing the original label
      const maxCharPerRow = Math.floor((width * 0.75) / CHAR_WIDTH);
      const splitRegex = new RegExp(`.{1,${maxCharPerRow}}`, "g");
      const splitLabelNameRows = l.name.match(splitRegex) || [];
      if (splitLabelNameRows.length) {
        splitLabelNameRows.forEach((splitLabel: string) => {
          acc.push([{ ...l, name: splitLabel.trim() }]);
        });
        return acc;
      }
    }
    if (lastRow(acc)) {
      // this isn't the first element, check width of last label row
      const lastRowWidth = calcRowWidth(lastRow(acc));
      if (lastRowWidth + nameWidth <= 200) {
        // there's space in the last row for this label as well
        acc[acc.length - 1].push(l);
        return acc;
      }
    }
    acc.push([l]); // need to make a new row for this label
    return acc;
  }, []);

  // find the grouping's height and width (max row width)
  const MAX_VISIBLE_ROWS = 15;
  const totalRows = labelRows.length;
  const visibleRows = Math.min(totalRows, MAX_VISIBLE_ROWS);
  const groupHeight = visibleRows * lineHeight;
  const needsScroll = totalRows > MAX_VISIBLE_ROWS;
  const groupWidth = labelRows.reduce(
    (max, row, i) => Math.max(max, calcRowWidth(row) - (i === labelRows.length - 1 ? CHAR_WIDTH : 0)), // no comma on last row, correct
    0,
  );
  // add one CHAR_WIDTH padding to all sides of label box
  const [rectHeight, rectWidth] = [groupHeight, groupWidth].map(x => x + 2 * CHAR_WIDTH);

  // generate the line between the name and plasmid surface
  const forkCoor = group.forkCoor || group.textCoor;
  const linePath = group.forkCoor
    ? `M${group.textCoor.x} ${group.textCoor.y} L${forkCoor.x} ${forkCoor.y}`
    : `M${group.lineCoor.x} ${group.lineCoor.y} L${forkCoor.x} ${forkCoor.y}`;

  // find the upper left coordinate for the group. if this is on the right
  // side of the plasmid, this is upper left. if it's on the left side of
  // the plasmid, it should be upper right
  let { x, y } = group.textCoor;
  x = group.textAnchor === "end" ? x - (group.labels[0].name.length + 3) * CHAR_WIDTH : x; // the +3) is for ",+#"
  y -= CHAR_WIDTH;
  x = Math.max(x, 2 * CHAR_WIDTH); // prevent overflow of left or right side
  x = Math.min(x, width - 2 * CHAR_WIDTH - groupWidth);
  y = Math.max(y, 2 * CHAR_WIDTH); // prevent overflow of top and bottom
  y = Math.min(y, height - 2 * CHAR_WIDTH - groupHeight);

  // add padding to the box by adding/subbing a CHAR_WIDTH from edges
  const groupCoor = { x, y };
  const rectCoor = { x: x - CHAR_WIDTH, y: y - CHAR_WIDTH - 2 };

  const key = `${group.labels[0].id}_overlay`;

  return (
    <g
      key={key}
      onMouseLeave={() => {
        setHoveredGroup("");
        setHoveredLabelId(null);
        if (groupHasHighlightedEnzyme) {
          setHoveredEnzyme(null);
        }
      }}
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        const pointerType = (e.nativeEvent as any)?.pointerType || "mouse";
        if (pointerType === "touch") {
          onRequestClose?.();
        }
      }}
    >
      <path className="la-vz-label-line" d={linePath} />
      <rect fill="white" height={rectHeight} rx={4} ry={4} stroke="none" width={rectWidth} {...rectCoor} />
      {needsScroll ? (
        <foreignObject x={rectCoor.x} y={rectCoor.y} width={rectWidth} height={rectHeight}>
          <div
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore xmlns is required for foreignObject HTML content
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              width: rectWidth,
              height: rectHeight,
              overflowY: "auto",
              overflowX: "hidden",
              boxSizing: "border-box",
              padding: `${CHAR_WIDTH}px`,
            }}
          >
            {labelRows.map((r, i) => (
              <div key={`${key}_${i}`} style={{ height: lineHeight, lineHeight: `${lineHeight}px`, whiteSpace: "nowrap" }}>
                {r.map((l, i2) => {
                  const hoverKey = l.id ?? `${group.name}-${i}-${i2}`;
                  const isLocallyHovered = hoveredLabelId === hoverKey;
                  const isHighlighted = matchesHoveredEnzyme(hoveredEnzyme, l, highlightedEnzymes);
                  return (
                    <React.Fragment key={l.id}>
                      <span
                        className="la-vz-circular-label"
                        id={l.id}
                        {...getSelectionAttributes(l)}
                        style={{
                          fontSize: circularLabel.fontSize || svgText.fontSize || 12,
                          fontFamily: (circularLabel.fontFamily as string) || (svgText.fontFamily as string) || "inherit",
                          cursor: "pointer",
                          color: isHighlighted ? enzymeHoverColor : (circularLabel.fill as string) || "black",
                          fontWeight: isHighlighted || isLocallyHovered ? LABEL_FONT_WEIGHT_HOVER : LABEL_FONT_WEIGHT_DEFAULT,
                          textDecoration: isLocallyHovered ? "underline" : "none",
                        }}
                        onMouseLeave={() => {
                          setHoveredLabelId(prev => (prev === hoverKey ? null : prev));
                          setHoveredLabelUnderline(l.id || "", false);
                          handleLabelHover(l, false);
                        }}
                        onMouseOver={() => {
                          setHoveredLabelId(hoverKey);
                          setHoveredLabelUnderline(l.id || "", true);
                          handleLabelHover(l, true);
                        }}
                      >
                        {l.name}
                      </span>
                      {i2 < r.length - 1 || i !== labelRows.length - 1 ? "," : ""}
                    </React.Fragment>
                  );
                })}
              </div>
            ))}
          </div>
        </foreignObject>
      ) : (
        <text {...groupCoor} style={svgText}>
          {labelRows.map((r, i) => (
            <tspan key={`${key}_${i}`} dominantBaseline="middle" x={groupCoor.x} y={groupCoor.y + (i + 0.5) * lineHeight}>
              {r.map((l, i2) => {
                const hoverKey = l.id ?? `${group.name}-${i}-${i2}`;
                const isLocallyHovered = hoveredLabelId === hoverKey;
                const isHighlighted = matchesHoveredEnzyme(hoveredEnzyme, l, highlightedEnzymes);
                const labelStyle = {
                  ...circularLabel,
                  fill: isHighlighted ? enzymeHoverColor : circularLabel.fill,
                  fontWeight:
                    isHighlighted || isLocallyHovered ? LABEL_FONT_WEIGHT_HOVER : LABEL_FONT_WEIGHT_DEFAULT,
                  textDecoration: isLocallyHovered ? "underline" : "none",
                } as React.CSSProperties;
                return (
                  <React.Fragment key={l.id}>
                    <tspan
                      className="la-vz-circular-label"
                      dominantBaseline="middle"
                      id={l.id}
                      {...getSelectionAttributes(l)}
                      style={labelStyle}
                      tabIndex={-1}
                      y={groupCoor.y + (i + 0.5) * lineHeight}
                      onMouseLeave={() => {
                        setHoveredLabelId(prev => (prev === hoverKey ? null : prev));
                        setHoveredLabelUnderline(l.id || "", false);
                        handleLabelHover(l, false);
                      }}
                      onMouseOver={() => {
                        setHoveredLabelId(hoverKey);
                        setHoveredLabelUnderline(l.id || "", true);
                        handleLabelHover(l, true);
                      }}
                    >
                      {l.name}
                    </tspan>
                    {i2 < r.length - 1 || i !== labelRows.length - 1 ? "," : ""}
                  </React.Fragment>
                );
              })}
            </tspan>
          ))}
        </text>
      )}
      <rect fill="none" height={rectHeight} rx={4} ry={4} stroke="#e5e7eb" strokeWidth={1} style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.1))" }} width={rectWidth} {...rectCoor} />
    </g>
  );
};

export const setHoveredLabelUnderline = (id: string, underline: boolean) => {
  if (typeof document === "undefined") return;

  const element = document.getElementById(id);
  if (!element) return;
  element.style.textDecoration = underline ? "underline" : "none";

  const dataset = element.dataset as Record<string, string | undefined>;
  const isEnzyme = dataset.selectionType === "ENZYME";
  const viewer = dataset.selectionViewer;
  const cacheValue = (key: string, value: string) => {
    if (dataset[key] === undefined) {
      dataset[key] = value;
    }
  };
  const restoreValue = (key: string, prop: "fill" | "fontWeight", fallback: string) => {
    const cached = dataset[key];
    if (cached !== undefined) {
      element.style[prop] = cached;
      delete dataset[key];
      return;
    }
    element.style[prop] = fallback;
  };

  if (isEnzyme) {
    if (underline) {
      cacheValue("hoverPrevWeight", element.style.fontWeight || "");
      element.style.fontWeight = `${LABEL_FONT_WEIGHT_HOVER}`;
    } else {
      restoreValue("hoverPrevWeight", "fontWeight", `${LABEL_FONT_WEIGHT_DEFAULT}`);
    }
    return;
  }

  if (viewer === "CIRCULAR") {
    if (underline) {
      cacheValue("hoverPrevFill", element.style.fill || "");
      cacheValue("hoverPrevWeight", element.style.fontWeight || "");
      element.style.fill = "black";
      element.style.fontWeight = "500";
    } else {
      const defaultFill = typeof circularLabel.fill === "string" ? circularLabel.fill : "";
      restoreValue("hoverPrevFill", "fill", defaultFill);
      restoreValue("hoverPrevWeight", "fontWeight", `${LABEL_FONT_WEIGHT_DEFAULT}`);
    }
  }
};
