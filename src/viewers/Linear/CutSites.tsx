import * as React from "react";

import { InputRefFunc } from "../../SelectionHandler";
import { CHAR_WIDTH } from "../../SeqViewerContainer";
import { CutSite, Size } from "../../core/elements";
import { circularLabelLine, cutSite, selection, svgText } from "../../style";
import { LABEL_FONT_WEIGHT_DEFAULT, LABEL_FONT_WEIGHT_HOVER, enzymeHoverColor } from "../../style/labelTheme";
import HoveredEnzymeContext, { matchesHoveredEnzyme } from "../../state/hoveredEnzymeContext";
import { FindXAndWidthType } from "./SeqBlock";

const CUT_LINE_ACTIVE_COLOR = "rgb(255, 46, 99)";
const CUT_LINE_ACTIVE_WIDTH = 1.5;
const CUT_LINE_X_OFFSET = 1.5;
const LABEL_GROUP_RIGHT_ZONE_BP = 12;

const getSelectionAttributes = (cutSite: CutSite, domId: string): Record<string, number | string> => ({
  "data-selection-direction": cutSite.direction,
  "data-selection-end": cutSite.end,
  "data-selection-fcut": cutSite.fcut,
  "data-selection-name": cutSite.name,
  "data-selection-rcut": cutSite.rcut,
  "data-selection-ref": domId,
  "data-selection-start": cutSite.start,
  "data-selection-type": "ENZYME",
  "data-selection-viewer": "LINEAR",
});

/**
 * Renders enzyme cut sites on the linear viewer. This includes a few things:
 * - the cut site itself (some lines for the cut site on top and bottom sequences)
 * - an outline of the total recognition site (can span SeqBlocks)
 * - a label above the cut-site
 */
export const CutSites = (props: {
  cutSites: CutSite[];
  findXAndWidth: FindXAndWidthType;
  firstBase: number;
  inputRef: InputRefFunc;
  lastBase: number;
  lineHeight: number;
  size: Size;
  yDiff: number;
  zoom: { linear: number };
}) => {
  const {
    cutSites,
    findXAndWidth,
    firstBase,
    inputRef,
    lastBase,
    lineHeight,
    size,
    yDiff,
    zoom: { linear: zoom },
  } = props;
  const { hoveredEnzyme, highlightedEnzymes, setHoveredEnzyme } = React.useContext(HoveredEnzymeContext);
  const [hoveredGroupId, setHoveredGroupId] = React.useState<string | null>(null);

  const handleHoverChange = (cutSite: CutSite, hover: boolean) => {
    if (!cutSite?.name) return;
    if (hover) {
      setHoveredEnzyme({ id: cutSite.id, name: cutSite.name });
    } else if (matchesHoveredEnzyme(hoveredEnzyme, cutSite, highlightedEnzymes)) {
      setHoveredEnzyme(null);
    }
  };

  // Calc x/width of highlight region, top/bottom cut lines, etc
  const enhancedCutSites = enhanceCutSites(
    // TODO: remove this exclusion of cut-sites that cross the zero index after even more
    // zero-index accounting. This file is already hairy enough, so not in a rush to add zero-index
    // accounting here, yet.
    cutSites,
    firstBase,
    lastBase,
    findXAndWidth,
  );
  // Set cut-site label positions
  const labelledCutSites = withLabels(enhancedCutSites, size);
  const labelEntries = React.useMemo(() => buildCutSiteLabelEntries(labelledCutSites, size), [labelledCutSites, size]);
  const hoveredGroup = labelEntries.find(entry => entry.grouped && entry.groupId === hoveredGroupId);
  const orderedCutSites = labelledCutSites
    .map((item, index) => ({
      index,
      isHighlighted: matchesHoveredEnzyme(hoveredEnzyme, item.c, highlightedEnzymes),
      item,
    }))
    .sort((a, b) => {
      if (a.isHighlighted === b.isHighlighted) {
        return a.index - b.index;
      }
      return a.isHighlighted ? 1 : -1;
    });
  if (!enhancedCutSites.length) return null;

  const lineYDiff = yDiff + lineHeight;
  return (
    <g className="la-vz-cut-sites">
      {orderedCutSites.map(({ isHighlighted, item: c }) => {
        const domId = `${c.c.id}-${c.c.start}-${c.c.end}`;
        const topLineX = c.top.x + CUT_LINE_X_OFFSET;
        const bottomLineX = c.bottom.x + CUT_LINE_X_OFFSET;
        const connectorStartX = c.connector.x + CUT_LINE_X_OFFSET;
        const highlightStyle = selection;
        const cutLineStyle = isHighlighted
          ? { ...cutSite, stroke: CUT_LINE_ACTIVE_COLOR, strokeWidth: CUT_LINE_ACTIVE_WIDTH }
          : cutSite;
        return (
          <g
            key={`cut-site-${domId}-${firstBase}`}
            onMouseEnter={() => handleHoverChange(c.c, true)}
            onMouseLeave={() => handleHoverChange(c.c, false)}
          >
            {/* outline showing the recognition site */}
            {zoom > 10 && c.highlight.render && isHighlighted && (
              <path
                ref={inputRef(domId, {
                  clockwise: true,
                  direction: c.c.direction,
                  end: c.c.end,
                  fcut: c.c.fcut,
                  name: c.c.name,
                  id: domId,
                  rcut: c.c.rcut,
                  start: c.c.start,
                  type: "ENZYME",
                  viewer: "LINEAR",
                })} // for highlighting
                className={`la-vz-cut-site-highlight ${c.c.id}`}
                d={`M ${c.highlight.x} ${lineYDiff}
                    L ${c.highlight.x + c.highlight.width} ${lineYDiff}
                    L ${c.highlight.x + c.highlight.width} ${lineYDiff + 2 * lineHeight}
                    L ${c.highlight.x} ${lineYDiff + 2 * lineHeight} Z`}
                style={highlightStyle}
              />
            )}

            {/* lines showing the cut site */}
            {c.top.render && (
              <path
                className={`la-vz-cut-site ${c.c.id}`}
                d={`M ${topLineX} ${lineYDiff} L ${topLineX} ${lineYDiff + lineHeight}`}
                style={cutLineStyle}
              />
            )}
            {c.connector.render && zoom > 10 && (
              <path
                className={`la-vz-cut-site ${c.c.id}`}
                d={`M ${connectorStartX} ${lineYDiff + lineHeight}
                    L ${connectorStartX + c.connector.width} ${lineYDiff + lineHeight}`}
                style={cutLineStyle}
              />
            )}
            {c.bottom.render && zoom > 10 && (
              <path
                className={`la-vz-cut-site ${c.c.id}`}
                d={`M ${bottomLineX} ${lineYDiff + lineHeight} L ${bottomLineX} ${lineYDiff + 2 * lineHeight}`}
                style={cutLineStyle}
              />
            )}
          </g>
        );
      })}
      <g className="la-vz-cut-site-labels" onMouseLeave={() => setHoveredGroupId(null)}>
        {labelEntries.map(entry => {
          const firstMember = entry.members[0];
          const firstCutSite = firstMember.c;
          const domId = `${firstCutSite.id}-${firstCutSite.start}-${firstCutSite.end}`;
          const isGroupHighlighted = entry.members.some(member =>
            matchesHoveredEnzyme(hoveredEnzyme, member.c, highlightedEnzymes),
          );
          const labelStyle = {
            ...svgText,
            cursor: "pointer",
            fontSize: 12,
            fill: isGroupHighlighted ? enzymeHoverColor : svgText.fill,
            fontWeight: isGroupHighlighted ? LABEL_FONT_WEIGHT_HOVER : LABEL_FONT_WEIGHT_DEFAULT,
            textDecoration: hoveredGroupId === entry.groupId ? "underline" : "none",
          } as React.CSSProperties;

          return (
            <text
              key={entry.groupId}
              className={`la-vz-cut-site-text ${firstCutSite.id}-label`}
              dominantBaseline="hanging"
              id={entry.groupId}
              {...(!entry.grouped ? getSelectionAttributes(firstCutSite, domId) : {})}
              style={labelStyle}
              textAnchor="middle"
              x={entry.x}
              y={yDiff}
              onMouseEnter={() => {
                if (entry.grouped) {
                  setHoveredGroupId(entry.groupId);
                } else {
                  handleHoverChange(firstCutSite, true);
                }
              }}
              onMouseLeave={() => {
                if (!entry.grouped) {
                  handleHoverChange(firstCutSite, false);
                }
              }}
            >
              {entry.text}
            </text>
          );
        })}
        {hoveredGroup && (
          <CutSiteGroupOverlay
            group={hoveredGroup}
            lineHeight={lineHeight}
            size={size}
            yDiff={yDiff}
            onHoverChange={handleHoverChange}
          />
        )}
      </g>
    </g>
  );
};

type CutSiteLabelEntry = {
  grouped: boolean;
  groupId: string;
  members: CutSiteLabelled[];
  text: string;
  x: number;
};

const CutSiteGroupOverlay = (props: {
  group: CutSiteLabelEntry;
  lineHeight: number;
  onHoverChange: (cutSite: CutSite, hover: boolean) => void;
  size: Size;
  yDiff: number;
}) => {
  const { group, lineHeight, onHoverChange, size, yDiff } = props;
  const { hoveredEnzyme, highlightedEnzymes } = React.useContext(HoveredEnzymeContext);
  const [scrollY, setScrollY] = React.useState(0);
  const paddingX = CHAR_WIDTH * 0.6;
  const paddingY = lineHeight * 0.15;
  const labelFontSize = 12;
  const longestLabel = group.members.reduce((max, member) => Math.max(max, member.c.name.length), 0);
  const triggerLabelWidth = Math.max(group.text.length * CHAR_WIDTH, 4 * CHAR_WIDTH);
  const rectWidth = Math.max(longestLabel * CHAR_WIDTH, triggerLabelWidth) + paddingX * 2;
  const fullRectHeight = group.members.length * lineHeight + paddingY * 2;

  const overlayBottomLimit = yDiff + lineHeight - 2;
  // allow the popover to extend above the visible SVG bounds so it can be taller
  // while still ending before the sequence/cut location row
  const overlayTopLimit = -Math.max(size.height, fullRectHeight);
  const maxOverlayHeight = Math.max(lineHeight, overlayBottomLimit - overlayTopLimit);
  const rectHeight = Math.min(fullRectHeight, maxOverlayHeight);
  const visibleContentHeight = Math.max(lineHeight, rectHeight - paddingY * 2);
  const fullContentHeight = group.members.length * lineHeight;
  const maxScrollY = Math.max(0, fullContentHeight - visibleContentHeight);

  const rectX = Math.max(CHAR_WIDTH, Math.min(group.x - rectWidth / 2, size.width - rectWidth - CHAR_WIDTH));
  const rectY = Math.max(overlayTopLimit, overlayBottomLimit - rectHeight);
  const textX = rectX + paddingX;
  const textY = rectY + paddingY + lineHeight / 2;
  const connectorStartY = yDiff + lineHeight * 0.75;
  const connectorEndX = rectX + rectWidth / 2;
  const connectorEndY = rectY + rectHeight;
  const clipId = React.useMemo(() => `cut-site-group-clip-${group.groupId.replace(/[^a-zA-Z0-9_-]/g, "_")}`, [group.groupId]);
  const displayedMembers = React.useMemo(() => [...group.members].reverse(), [group.members]);

  React.useEffect(() => {
    setScrollY(0);
  }, [group.groupId]);

  const handleWheel = (event: React.WheelEvent<SVGGElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (maxScrollY <= 0) {
      return;
    }
    const delta = event.deltaY > 0 ? lineHeight : -lineHeight;
    setScrollY(prev => Math.max(0, Math.min(maxScrollY, prev + delta)));
  };

  const hasScroll = maxScrollY > 0;
  const scrollbarTrackWidth = 5;
  const scrollbarX = rectX + rectWidth - scrollbarTrackWidth - 2;
  const contentWidth = rectWidth - paddingX * 2 - (hasScroll ? scrollbarTrackWidth + 4 : 0);
  const thumbHeight = hasScroll ? Math.max(lineHeight, (visibleContentHeight / fullContentHeight) * visibleContentHeight) : 0;
  const thumbY = hasScroll
    ? rectY + paddingY + (scrollY / maxScrollY) * (visibleContentHeight - thumbHeight)
    : rectY + paddingY;

  return (
    <g className="la-vz-cut-site-group-overlay" onWheel={handleWheel}>
      <path d={`M${group.x} ${connectorStartY} L${connectorEndX} ${connectorEndY}`} style={circularLabelLine} />
      <rect fill="white" height={rectHeight} stroke="none" width={rectWidth} x={rectX} y={rectY} />
      <defs>
        <clipPath id={clipId}>
          <rect height={visibleContentHeight} width={contentWidth} x={textX} y={rectY + paddingY} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {displayedMembers.map((member, index) => {
          const domId = `${member.c.id}-${member.c.start}-${member.c.end}`;
          const rowTopY = rectY + paddingY + index * lineHeight - scrollY;
          const rowTextY = textY + index * lineHeight - scrollY;
          const isHighlighted = matchesHoveredEnzyme(hoveredEnzyme, member.c, highlightedEnzymes);
          const itemStyle = {
            ...svgText,
            cursor: "pointer",
            fontSize: labelFontSize,
            fill: isHighlighted ? enzymeHoverColor : svgText.fill,
            fontWeight: isHighlighted ? LABEL_FONT_WEIGHT_HOVER : LABEL_FONT_WEIGHT_DEFAULT,
          } as React.CSSProperties;
          const selectionAttrs = getSelectionAttributes(member.c, domId);
          return (
            <g
              key={`${group.groupId}-${domId}-${index}`}
              onMouseEnter={() => onHoverChange(member.c, true)}
              onMouseLeave={() => onHoverChange(member.c, false)}
            >
              <rect
                {...selectionAttrs}
                fill="transparent"
                height={lineHeight}
                style={{ cursor: "pointer" }}
                width={contentWidth}
                x={textX}
                y={rowTopY}
              />
              <text
                dominantBaseline="middle"
                id={domId}
                {...selectionAttrs}
                style={itemStyle}
                textAnchor="start"
                x={textX}
                y={rowTextY}
              >
                {member.c.name}
              </text>
            </g>
          );
        })}
      </g>
      {hasScroll && (
        <>
          <rect
            fill="rgba(0, 0, 0, 0.08)"
            height={visibleContentHeight}
            rx={2}
            ry={2}
            width={scrollbarTrackWidth}
            x={scrollbarX}
            y={rectY + paddingY}
          />
          <rect
            fill="rgba(0, 0, 0, 0.45)"
            height={thumbHeight}
            rx={2}
            ry={2}
            width={scrollbarTrackWidth}
            x={scrollbarX}
            y={thumbY}
          />
        </>
      )}
      <rect fill="none" height={rectHeight} stroke="black" strokeWidth={1.5} width={rectWidth} x={rectX} y={rectY} />
    </g>
  );
};

type CutSiteEnhanced = {
  bottom: {
    render: boolean;
    x: number;
  };
  c: CutSite;
  connector: {
    render: boolean;
    width: number;
    x: number;
  };
  highlight: {
    render: boolean;
    width: number;
    x: number;
  };
  top: {
    render: boolean;
    x: number;
  };
};

/**
 * This takes cut-sites and does some piecemeal calculations to add meta about:
 * - top (x position of the top line and whether to render)
 * - connector (x position and width of the connector and whether to render)
 * - bottom (x position of the bottom line and whether to render)
 * - highlight (x/width/color of the highlight block)
 */
const enhanceCutSites = (
  cutSites: CutSite[],
  firstBase: number,
  lastBase: number,
  findXAndWidth: FindXAndWidthType,
): CutSiteEnhanced[] =>
  cutSites.map((c: CutSite) => {
    // Prevent double rendering of cut-site lines across SeqBlocks. Without the shenanigans below,
    // if a cut site lands on the last or first base of a SeqBlock, it will also render at the end of a SeqBlock
    // and the start of the next. Below, we only show a cut if 1. it's wholly within this SeqBlock or
    // 2. the other cut is also within this block. If both the top and bottom cuts are on the last/first bases,
    // we render the cut in the first block (ie at the very end of the first block)
    let showTopLine = c.fcut > firstBase && c.fcut < lastBase;
    if (c.fcut === firstBase && c.rcut > firstBase && c.rcut <= lastBase) {
      showTopLine = true;
    } else if (c.fcut === lastBase && c.rcut >= firstBase && c.rcut <= lastBase) {
      showTopLine = true;
    }

    let showBottomLine = c.rcut > firstBase && c.rcut < lastBase;
    if (c.rcut === firstBase && c.fcut > firstBase && c.fcut <= lastBase) {
      showBottomLine = true;
    } else if (c.rcut === lastBase && c.fcut >= firstBase && c.fcut <= lastBase) {
      showBottomLine = true;
    }

    // Special case for cut sites that cross the zero index
    let enhancedCutSite = c;
    if (c.end < c.start) {
      // If this is the part of the cut site that is on the last block
      if (c.start > firstBase && c.start < lastBase) {
        // Use the last base of the block to close the cut site
        enhancedCutSite = { ...c, end: lastBase };
        //If cuts are on the other block, use the last base as cut instead
        if (c.fcut < c.start) {
          enhancedCutSite = { ...enhancedCutSite, fcut: lastBase };
        }
        if (c.rcut < c.start) {
          enhancedCutSite = { ...enhancedCutSite, rcut: lastBase };
        }
      } else {
        // This is the part of the cut site that is on the first block, use the first base as the start of the cut site
        enhancedCutSite = { ...c, start: firstBase };
        // If cuts are on the other block, use the first base as cut instead
        if (c.fcut > c.end) {
          enhancedCutSite = { ...enhancedCutSite, fcut: firstBase };
        }
        if (c.rcut > c.end) {
          enhancedCutSite = { ...enhancedCutSite, rcut: firstBase };
        }
      }
    }

    const { x: topX } = findXAndWidth(enhancedCutSite.fcut, enhancedCutSite.fcut);
    const { x: bottomX } = findXAndWidth(enhancedCutSite.rcut, enhancedCutSite.rcut);

    const recognitionInBlock = recognitionOverlapsSeqBlock(c.start, c.end, firstBase, lastBase);

    return {
      bottom: {
        render: showBottomLine,
        x: bottomX,
      },
      c,
      connector: calcConnector(
        enhancedCutSite,
        topX,
        bottomX,
        firstBase,
        lastBase,
        showTopLine,
        showBottomLine,
        findXAndWidth,
      ),
      highlight: {
        ...calcHighlight(enhancedCutSite, firstBase, lastBase, findXAndWidth),
        render: recognitionInBlock,
      },
      top: {
        render: showTopLine,
        x: topX,
      },
    };
  });

const recognitionOverlapsSeqBlock = (start: number, end: number, firstBase: number, lastBase: number) => {
  if (start === end) {
    return true;
  }
  if (start < end) {
    return start < lastBase && end > firstBase;
  }
  return start < lastBase || end > firstBase;
};

/**
 * calcHighlight returns the x and width of the enzyme recognition site's highlight block.
 */
const calcHighlight = (
  c: CutSite,
  firstBase: number,
  lastBase: number,
  findXAndWidth: FindXAndWidthType,
): { width: number; x: number } => {
  if (isWithinSeqBlock(c.start, c.end, firstBase, lastBase)) {
    if (c.start > c.end) {
      return findXAndWidth(
        c.end < firstBase ? lastBase : Math.min(lastBase, c.end),
        c.start > lastBase ? firstBase : Math.max(firstBase, c.start),
      );
    }
    return findXAndWidth(
      c.start < firstBase ? lastBase : Math.min(lastBase, c.start),
      c.end > lastBase ? firstBase : Math.max(firstBase, c.end),
    );
  }
  return findXAndWidth(c.start, c.end);
};

/**
 * isWithinSeqBlock returns whether the cut site is entirely within this SeqBlock
 */
const isWithinSeqBlock = (start: number, end: number, firstBase: number, lastBase: number) => {
  if ((start < firstBase && end < firstBase) || (start > lastBase && end > lastBase)) {
    return true;
  }
  if (end >= start) {
    return end < lastBase && start > firstBase;
  }
  return start < lastBase && end > firstBase;
};

// This gets the x and width of the connector line that connects the forward and reverse cut sites
const calcConnector = (
  c: CutSite,
  topX: number,
  bottomX: number,
  firstBase: number,
  lastBase: number,
  showTopLine: boolean,
  showBottomLine: boolean,
  findXAndWidth: FindXAndWidthType,
): { render: boolean; width: number; x: number } => {
  if (showTopLine && showBottomLine) {
    return {
      render: true,
      width: Math.abs(bottomX - topX),
      x: Math.min(topX, bottomX),
    };
  }
  if (showTopLine) {
    if (c.start + topX > c.end + bottomX) {
      return {
        render: true,
        ...findXAndWidth(firstBase, c.fcut),
      };
    }
    if (c.fcut > c.rcut) {
      return {
        render: true,
        ...findXAndWidth(firstBase, c.fcut),
      };
    }
    return {
      render: true,
      ...findXAndWidth(c.fcut, lastBase),
    };
  }
  if (showBottomLine) {
    if (c.start + topX > c.end + bottomX) {
      return {
        render: true,
        ...findXAndWidth(c.rcut, lastBase),
      };
    }
    if (c.fcut > c.rcut) {
      return {
        render: true,
        ...findXAndWidth(c.rcut, lastBase),
      };
    }
    return {
      render: true,
      ...findXAndWidth(firstBase, c.rcut),
    };
  }
  return { render: false, width: 0, x: 0 };
};

type CutSiteLabelled = CutSiteEnhanced & {
  label: {
    render: boolean;
    text: string;
    x: number;
  };
};

/**
 * This tries to position the cut-site labels so they don't overlap.
 *
 * I'm doing something simple here where I shift the labels left/right. I don't try to
 * move the labels vertically or draw a line from the labels to the cut-sites (like on
 * the circular viewer).
 *
 * Steps:
 *   - move off the left/right side of the screen if the label is too close to the edge
 *   - if the label is too close to another label, move it left/right
 *   - if it's now all the way off the screen, don't render it
 *
 * context: https://github.com/Lattice-Automation/seqviz/issues/104
 */
const withLabels = (cutSites: CutSiteEnhanced[], size: Size): CutSiteLabelled[] => {
  const labelXForCutSite = (c: CutSiteEnhanced) => {
    if (c.top.render) return c.top.x + CUT_LINE_X_OFFSET;
    if (c.bottom.render) return c.bottom.x + CUT_LINE_X_OFFSET;
    return c.top.x + CUT_LINE_X_OFFSET;
  };

  const unlabelled = cutSites
    .filter(c => !c.top.render && !c.bottom.render)
    .map(c => ({ ...c, label: { render: false, text: c.c.name, x: labelXForCutSite(c) } }));
  const labelled = cutSites
    .filter(c => c.top.render || c.bottom.render)
    .sort((a, b) => labelXForCutSite(a) - labelXForCutSite(b))
    .map(c => ({ ...c, label: { render: c.top.render || c.bottom.render, text: c.c.name, x: labelXForCutSite(c) } }));

  labelled.forEach(c => {
    const halfWidth = (c.label.text.length * CHAR_WIDTH) / 2;
    if (c.label.x - halfWidth < 0) {
      c.label.x = halfWidth;
    } else if (c.label.x + halfWidth > size.width) {
      c.label.x = size.width - halfWidth;
    }
  });

  return unlabelled.concat(labelled);
};

const buildCutSiteLabelEntries = (labelledCutSites: CutSiteLabelled[], size: Size): CutSiteLabelEntry[] => {
  const candidates = labelledCutSites.filter(c => c.label.render).sort((a, b) => a.label.x - b.label.x);
  if (!candidates.length) {
    return [];
  }

  const keyOf = (c: CutSiteLabelled) => `${c.c.id}|${c.c.start}|${c.c.end}|${c.c.fcut}|${c.c.rcut}`;
  const dedupeMembers = (members: CutSiteLabelled[]) => {
    const seen = new Set<string>();
    return members.filter(member => {
      const key = keyOf(member);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const consumed = new Set<string>();
  const groups: CutSiteLabelled[][] = [];

  const byCutLocation = new Map<string, CutSiteLabelled[]>();
  candidates.forEach(c => {
    const key = `${c.c.fcut}|${c.c.rcut}`;
    const existing = byCutLocation.get(key) || [];
    existing.push(c);
    byCutLocation.set(key, existing);
  });
  byCutLocation.forEach(group => {
    if (group.length > 1) {
      groups.push(group);
      group.forEach(member => consumed.add(keyOf(member)));
    }
  });

  const remainingAfterCut = candidates.filter(c => !consumed.has(keyOf(c)));
  const byRecognitionLocation = new Map<string, CutSiteLabelled[]>();
  remainingAfterCut.forEach(c => {
    const key = `${c.c.start}|${c.c.end}`;
    const existing = byRecognitionLocation.get(key) || [];
    existing.push(c);
    byRecognitionLocation.set(key, existing);
  });

  byRecognitionLocation.forEach(group => {
    if (group.length < 2) return;
    const sorted = [...group].sort((a, b) => a.label.x - b.label.x);
    const rightMost = sorted.reduce(
      (max, item) => Math.max(max, item.label.x + (item.label.text.length * CHAR_WIDTH) / 2),
      Number.NEGATIVE_INFINITY,
    );
    const maxCutX = sorted.reduce((max, item) => Math.max(max, item.label.x), Number.NEGATIVE_INFINITY);
    const nextCutX = remainingAfterCut
      .filter(item => !sorted.includes(item) && item.label.x > maxCutX)
      .reduce((min, item) => Math.min(min, item.label.x), Number.POSITIVE_INFINITY);
    const noRoomOnRight =
      rightMost >= size.width - CHAR_WIDTH * 3 ||
      (Number.isFinite(nextCutX) && nextCutX - maxCutX < CHAR_WIDTH * 2);
    if (noRoomOnRight) {
      groups.push(sorted);
      sorted.forEach(member => consumed.add(keyOf(member)));
    }
  });

  const remainingAfterRecognition = candidates.filter(c => !consumed.has(keyOf(c)));
  const endZoneThreshold = size.width - CHAR_WIDTH * LABEL_GROUP_RIGHT_ZONE_BP;
  const endZoneMembers = remainingAfterRecognition.filter(c => c.label.x >= endZoneThreshold);
  if (endZoneMembers.length >= 2) {
    groups.push(endZoneMembers);
    endZoneMembers.forEach(member => consumed.add(keyOf(member)));
  }

  const singles = candidates.filter(c => !consumed.has(keyOf(c))).map(c => [c]);

  const rawEntries: CutSiteLabelEntry[] = [...groups, ...singles].map((members, index) => {
    const uniqueMembers = dedupeMembers(members);
    const first = uniqueMembers[0];
    const grouped = uniqueMembers.length > 1;
    const text = grouped ? `${first.c.name},+${uniqueMembers.length - 1}` : first.label.text;
    const x = uniqueMembers.reduce((sum, member) => sum + member.label.x, 0) / uniqueMembers.length;
    return {
      grouped,
      groupId: `${keyOf(first)}-group-${index}`,
      members: uniqueMembers,
      text,
      x,
    };
  });

  const sortedEntries = rawEntries.sort((a, b) => a.x - b.x);
  const placedEntries: CutSiteLabelEntry[] = [];
  let overflowMembers: CutSiteLabelled[] = [];

  for (let i = 0; i < sortedEntries.length; i += 1) {
    const entry = sortedEntries[i];
    const entryHalf = (entry.text.length * CHAR_WIDTH) / 2;
    let x = Math.max(entryHalf, Math.min(entry.x, size.width - entryHalf));
    const previous = placedEntries[placedEntries.length - 1];
    if (previous) {
      const previousHalf = (previous.text.length * CHAR_WIDTH) / 2;
      const minX = previous.x + previousHalf + entryHalf + CHAR_WIDTH;
      if (x < minX) {
        x = minX;
      }
    }

    if (x + entryHalf > size.width) {
      overflowMembers = sortedEntries.slice(i).reduce((acc, overflowEntry) => acc.concat(overflowEntry.members), [] as CutSiteLabelled[]);
      break;
    }

    placedEntries.push({ ...entry, x });
  }

  if (overflowMembers.length) {
    overflowMembers = dedupeMembers(overflowMembers);
    const first = overflowMembers[0];
    const grouped = overflowMembers.length > 1;
    const text = grouped ? `${first.c.name},+${overflowMembers.length - 1}` : first.label.text;
    const half = (text.length * CHAR_WIDTH) / 2;
    placedEntries.push({
      grouped,
      groupId: `${keyOf(first)}-overflow-group`,
      members: overflowMembers,
      text,
      x: Math.max(half, size.width - half),
    });
  }

  return placedEntries;
};
