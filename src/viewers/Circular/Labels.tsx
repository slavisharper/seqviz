import * as React from "react";

import { CHAR_WIDTH } from "../../SeqViewerContainer";
import { Coor, Size } from "../../core/elements";
import HoveredEnzymeContext, { matchesHoveredEnzyme } from "../../state/hoveredEnzymeContext";
import { circularLabel, circularLabelLine } from "../../style";
import { LABEL_FONT_WEIGHT_DEFAULT, LABEL_FONT_WEIGHT_HOVER, enzymeHoverColor } from "../../style/labelTheme";
import { GenArcFunc, ILabel, RENDER_SEQ_LENGTH_CUTOFF } from "./Circular";
import { WrappedGroupLabel, setHoveredLabelUnderline } from "./WrappedGroupLabel";

interface LabelWithCoors {
  label: ILabel;
  lineCoor: Coor;
  textAnchor: "start" | "end";
  textCoor: Coor;
}

export interface GroupedLabelsWithCoors {
  forkCoor: null | Coor;
  grouped: boolean;
  labels: ILabel[];
  lineCoor: Coor;
  name: string;
  overflow: unknown;
  textAnchor: "start" | "end";
  textCoor: Coor;
}

interface LabelsProps {
  center: Coor;
  findCoor: (index: number, radius: number, rotate?: boolean) => Coor;
  genArc: GenArcFunc;
  getRotation: (index: number) => string;
  labels: ILabel[];
  lineHeight: number;
  radius: number;
  rotateCoor: (coor: Coor, degrees: number) => Coor;
  seqLength: number;
  size: Size;
  zoom: number;
  yDiff: number;
}

interface LabelsState {
  hoveredGroup: string;
  hoverPinned: boolean;
  labelGroups: GroupedLabelsWithCoors[];
}

const getSelectionAttributes = (label: ILabel): Record<string, string | number> => {
  if (typeof label.selectionStart !== "number" || typeof label.selectionEnd !== "number" || !label.selectionType) {
    return {};
  }

  const attrs: Record<string, string | number> = {
    "data-selection-start": label.selectionStart,
    "data-selection-end": label.selectionEnd,
    "data-selection-type": label.selectionType,
    "data-selection-name": label.selectionName || label.name,
    "data-selection-viewer": label.selectionViewer || "CIRCULAR",
  };

  if (label.id) {
    attrs["data-selection-ref"] = label.id;
  }

  if (label.selectionScrollLinearOnSelect) {
    attrs["data-scroll-linear-on-select"] = "true";
  }

  if (typeof label.selectionDirection === "number") {
    attrs["data-selection-direction"] = label.selectionDirection;
  }

  if (typeof label.selectionFcut === "number") {
    attrs["data-selection-fcut"] = label.selectionFcut;
  }

  if (typeof label.selectionRcut === "number") {
    attrs["data-selection-rcut"] = label.selectionRcut;
  }

  return attrs;
};

const getLabelFontMetrics = () => {
  const fontSize = 12; // keep labels legible and stable across zooms
  const charWidth = CHAR_WIDTH;
  return { fontSize, charWidth };
};

/**
 * used to build up all plasmid labels, for annotations, enzymes, etc
 *
 * a caveat to take into account here is that the names, outside the
 * map, might also overlap with one another. There will need to be a check, given
 * the dimensions of each name, calculated by the font, and the size
 * of the viewer, for scaling these names and positioning in the Y-direction
 * to avoid this overlap problem
 */
export class Labels extends React.Component<LabelsProps, LabelsState> {
  static contextType = HoveredEnzymeContext;
  declare context: React.ContextType<typeof HoveredEnzymeContext>;

  constructor(props: LabelsProps) {
    super(props);

    this.state = {
      hoveredGroup: "",
      hoverPinned: false,
      labelGroups: [],
    };
  }

  static getDerivedStateFromProps = (nextProps: LabelsProps, prevState: LabelsState) => {
    // I'm storing the name position groups in state because hovering and
    // leaving a hover both trigger a change in whether to render and show
    // the annotation block, it would be expensive to regroup labels
    // on every hover event
    return {
      hoveredGroup: prevState.hoveredGroup,
      hoverPinned: prevState.hoverPinned,
      labelGroups: Labels.groupOverlappingLabels(nextProps),
    };
  };

  /**
   * need to avoid having overlapping names. if names
   * overlap with one another, they should be grouped together and
   * just show the first name of the group. Ex: "M13-rev,GTP,+3"
   *
   * On hover over this group, all the other names should be shown
   *
   * this should return all the informaiton needed to render the
   * name by itself or in a grouping
   */
  static groupOverlappingLabels = (props: LabelsProps) => {
    const { center, findCoor, labels, lineHeight, radius, seqLength, size, yDiff, zoom } = props;
    const zoomNorm = Math.max(0, Math.min(zoom, 100)) / 100;
    const { charWidth, fontSize } = getLabelFontMetrics();

    // create a radius outside the plasmid map for placing the names
    const textRadiusAdjustBase = seqLength > RENDER_SEQ_LENGTH_CUTOFF ? lineHeight * 2 : lineHeight * 3.5;
    const textRadiusAdjust = textRadiusAdjustBase; // keep stable spacing so labels remain visible when zoomed
    const textRadius = radius + textRadiusAdjust;

    /**
     * Add positional information to each label. This includes:
     * - textCoor: point next to the text
     * - lineCoor: point next to the plasmid arc/circle
     * - textAnchor: alignment
     */
    const labelsWithCoordinates: LabelWithCoors[] = labels
      .map(a => {
        // find the mid-point, vertically, for the label, correcting for elements
        // that cross the zero-index
        let annCenter: number;
        if (a.type === "enzyme") {
          annCenter = a.start;
        } else if (a.end > a.start) {
          annCenter = (a.end + a.start) / 2;
        } else {
          const annStart = a.start - seqLength;
          const annMidSum = annStart + a.end;
          annCenter = annMidSum / 2;
        }

        // connect the label to the plasmid's index unless we're showing bases. If we're showing
        // bases, keep it just outside those.
        const lineCoorRadius = seqLength > RENDER_SEQ_LENGTH_CUTOFF ? radius : textRadius - lineHeight / 2;

        // find the seed-points
        const lineCoor = findCoor(annCenter, lineCoorRadius, true);
        const textCoor = findCoor(annCenter, textRadius, true);

        // find the textAnchor, based on which side of plasmid it's on
        const textAnchor: "start" | "end" = textCoor.x <= center.x ? "end" : "start";
        const label = a;
        return { label, lineCoor, textAnchor, textCoor };
      })
      .filter(
        l =>
          l.textCoor.y + yDiff >= -fontSize &&
          l.textCoor.y + yDiff <= size.height + fontSize &&
          l.textCoor.x >= -fontSize &&
          l.textCoor.x <= size.width + fontSize,
      );

    // a utility function for checking whether a label and textCoor will overflow
    const groupOverflows = (label: ILabel, textCoor: Coor) => {
      const nameLength = (label.name.length + 4) * charWidth; // +4 for ",+#" and padding
      let overflow = false;

      const heightYPos = textCoor.y + yDiff;
      if (heightYPos < 0 || heightYPos > size.height) {
        overflow = true; // vertical overflow
      } else if (textCoor.x - nameLength < 0 || textCoor.x + nameLength > size.width) {
        overflow = true; // horizontal overflow
      }
      return overflow;
    };

    /**
     * merge overlapping names into groupings. If multiple of the labels
     * will overlap with one another, create an array of them and generate an
     * overview name to show for all of them (ex above)
     */
    let labelsGrouped = labelsWithCoordinates.reduce((acc: GroupedLabelsWithCoors[], n) => {
      // search through the other names and check whether any would overlap
      const overlapThreshold = Math.max(8, 15 - 6 * zoomNorm);
      const overlapIndex = acc.findIndex(g => {
        if (g.textAnchor === n.textAnchor) {
          return Math.abs(g.textCoor.y - n.textCoor.y) < overlapThreshold;
        }
        return false;
      });

      if (overlapIndex > -1) {
        // add this label to an already existing group
        acc[overlapIndex].labels.push(n.label);
        acc[overlapIndex].grouped = true;
        return acc;
      }

      // this name doesn't overlap with any others
      // check whether the its name overflows the side of the viewer
      const overflow = groupOverflows(n.label, n.textCoor);

      // create a new "group" from this single label
      return acc.concat({
        forkCoor: null,
        grouped: overflow,
        labels: [n.label],
        lineCoor: n.lineCoor,
        name: n.label.name,
        overflow: overflow,
        textAnchor: n.textAnchor,
        textCoor: n.textCoor,
      });
    }, []);

    /**
     * we now want to *ungroup* labels that we can do overlap avoidance for by doing small vertical
     * adjustments. So for every group that is grouped but doesn't overlap (ie, the labels
     * overlap but the group doesn't overflow the viewer's edge), try to spread out the
     * labels so the user can see all of them at once and by default
     *
     * to do this we need to create a forkCoor, where the textCoors of the constituent
     * labels will connect. That forkCoor, in turn, will be what connects to the edge of
     * the plasmid
     */
    labelsGrouped = labelsGrouped.reduce((acc: GroupedLabelsWithCoors[], g: GroupedLabelsWithCoors, i: number) => {
      // wasn't grouped or overflows the side of viewer or too many labels to try and help
      if (!g.grouped || g.overflow || g.labels.length > 4) return acc.concat(g);

      // since the labels are sorted (see circular.filterOutsideLabels), we can just check the
      // coordinate of this group's neighbors to see whether we can spread out
      let leftNeighbor: GroupedLabelsWithCoors | undefined = acc[acc.length - 1];
      let rightNeighbor: GroupedLabelsWithCoors | undefined = labelsGrouped[i + 1];
      if (leftNeighbor && leftNeighbor.textAnchor !== g.textAnchor) {
        leftNeighbor = undefined;
      }
      if (rightNeighbor && rightNeighbor.textAnchor !== g.textAnchor) {
        rightNeighbor = undefined;
      }

      // try and split/shift labels horizontally
      const newLabels = g.labels.map((l, i2) => {
        // if on right side of the viewer, shfit rightward
        let xDelta = i2 * (3 * charWidth);
        if (g.textAnchor === "end") xDelta = -xDelta; // otherwise shift leftward

        let yDelta = (g.labels.length - i2) * -15; // start off by shifting upwards 15px if on top half
        if (g.textCoor.y > center.y) yDelta = (g.labels.length - i2) * 15; // otherwise shift down

        const newTextCoor = {
          x: g.textCoor.x + xDelta, // try to make the adjustment to the left/right
          y: g.textCoor.y + yDelta, // try ot make the adjustment to the top/bottom
        };
        const overflow = groupOverflows(l, newTextCoor);

        return {
          ...g,
          forkCoor: g.textCoor,
          grouped: overflow,
          labels: [l],
          overflow: overflow,
          textCoor: newTextCoor,
        };
      });

      // check whether any of these attempted new labels overlaps with the neighbors
      const overlapThreshold = Math.max(8, 15 - 6 * zoomNorm);
      const overlapWithNeighbors = newLabels.some(l =>
        [leftNeighbor, rightNeighbor].some(n => n && Math.abs(n.textCoor.y - l.textCoor.y) < overlapThreshold),
      );
      if (overlapWithNeighbors) return acc.concat(g); // just bail and return the original grouping
      return acc.concat(...newLabels); // add the newly created labels
    }, []);

    /**
     * give actual names. this is in a separate loop because the group name
     * is going to indicate how many other sub labels are in a block/grouping
     * and it's easier to make them once than to update continually in the reduce above
     */
    labelsGrouped = labelsGrouped.map(a => {
      const firstName = a.labels[0].name;
      const restLength = a.labels.length - 1;
      if (a.overflow) {
        // would extend outside the viewer if we included the group name
        return { ...a, name: `+${restLength + 1}` };
      } else if (a.grouped) {
        // does not extend outside width/height of the viewer with group name
        return { ...a, name: `${firstName},+${restLength}` };
      }
      // didn't have to be grouped at all
      return { ...a, name: firstName };
    });

    /**
     * prevent the labels from overflowing the side of the viewer
     * even the small "+1" labels can overflow the sides if the viewer is small enough
     * this pushes their textCoors inward to prevent that
     */
    return labelsGrouped.map(g => {
      let { x, y } = g.textCoor;
      // prevent the text label from overflowing the sides (w/ one char padding)
      x = Math.max(charWidth * (g.name.length + 1), x);
      x = Math.min(size.width - (g.name.length + 1) * charWidth, x);
      y = Math.max(charWidth, y);
      y = Math.min(size.height - charWidth - fontSize, y);
      return { ...g, textCoor: { x, y } };
    });
  };

  // set the currently hovered group
  setHoveredGroup = (hoveredGroup: string) => {
    if (this.state.hoverPinned) return;
    if (hoveredGroup !== this.state.hoveredGroup) {
      this.setState({ hoveredGroup });
    }
  };

  toggleGroupExpansion = (groupId: string) => {
    this.setState(prev => {
      // If any group is pinned, close it on the next tap/click.
      if (prev.hoverPinned && prev.hoveredGroup) {
        return { hoveredGroup: "", hoverPinned: false };
      }
      return { hoveredGroup: groupId, hoverPinned: true };
    });
  };

  handleLabelHover = (label: ILabel, hover: boolean) => {
    if (!label?.id) return;
    setHoveredLabelUnderline(label.id, hover);
    if (label.type !== "enzyme") return;
    const { hoveredEnzyme, highlightedEnzymes, setHoveredEnzyme } = this.context;
    if (hover) {
      setHoveredEnzyme({ id: label.id, name: label.name });
    } else if (matchesHoveredEnzyme(hoveredEnzyme, label, highlightedEnzymes)) {
      setHoveredEnzyme(null);
    }
  };

  render() {
    const { hoveredGroup, labelGroups } = this.state;
    const { lineHeight, size } = this.props;
    const { fontSize } = getLabelFontMetrics();
    const { hoveredEnzyme, highlightedEnzymes } = this.context;

    // find the currently hovered group
    const hovered = labelGroups.find((g: GroupedLabelsWithCoors) => g.labels[0].id === hoveredGroup);

    return (
      <g
        className="la-vz-circular-labels"
        onMouseLeave={() => (!this.state.hoverPinned ? this.setHoveredGroup("") : null)}
      >
        {labelGroups.map(g => {
          const [first] = g.labels;
          const selectionAttrs = g.grouped ? {} : getSelectionAttributes(first);
          // generate the line between the name and plasmid surface
          const fC = g.forkCoor || g.textCoor;
          const labelLines = (
            <>
              <path
                className="la-vz-label-line"
                d={`M${g.lineCoor.x} ${g.lineCoor.y} L${fC.x} ${fC.y}`}
                style={circularLabelLine}
              />
              {g.forkCoor && (
                <path
                  className="la-vz-label-line"
                  d={`M${fC.x} ${fC.y} L${g.textCoor.x} ${g.textCoor.y}`}
                  style={circularLabelLine}
                />
              )}
            </>
          );

          if (!g.grouped) {
            // just a single name in this position
            const labelHighlighted =
              first.type === "enzyme" && matchesHoveredEnzyme(hoveredEnzyme, first, highlightedEnzymes);
            const singleLabelStyle = {
              ...circularLabel,
              fontSize,
              fill: labelHighlighted ? enzymeHoverColor : circularLabel.fill,
              fontWeight: labelHighlighted ? LABEL_FONT_WEIGHT_HOVER : LABEL_FONT_WEIGHT_DEFAULT,
            } as React.CSSProperties;
            return (
              <g key={first.id}>
                {labelLines}
                <text
                  className="la-vz-circular-label"
                  id={first.id}
                  {...selectionAttrs}
                  {...g.textCoor}
                  dominantBaseline="middle"
                  style={singleLabelStyle}
                  textAnchor={g.textAnchor}
                  onMouseEnter={() => this.handleLabelHover(first, true)}
                  onMouseLeave={() => this.handleLabelHover(first, false)}
                >
                  {g.name}
                </text>
              </g>
            );
          } else if (first.id === hoveredGroup) {
            // return nothing, this group block needs to be rendered last to be on top of the other elements in the SVG
            return null;
          }
          // a group of names which should render an overlap block
          const groupContainsHighlighted = g.labels.some(
            label => label.type === "enzyme" && matchesHoveredEnzyme(hoveredEnzyme, label, highlightedEnzymes),
          );
          const groupLabelStyle = {
            ...circularLabel,
            fontSize,
            fill: groupContainsHighlighted ? enzymeHoverColor : circularLabel.fill,
            fontWeight: groupContainsHighlighted ? LABEL_FONT_WEIGHT_HOVER : LABEL_FONT_WEIGHT_DEFAULT,
          } as React.CSSProperties;
          return (
            <g key={`${first.id}-listener`} id={`${first.id}-label`}>
              {labelLines}
              <text
                className="la-vz-circular-label"
                dominantBaseline="middle"
                id={first.id}
                {...selectionAttrs}
                style={groupLabelStyle}
                textAnchor={g.textAnchor}
                onMouseEnter={() => this.setHoveredGroup(first.id || "")}
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const pointerType = (e.nativeEvent as any)?.pointerType || "mouse";
                  if (pointerType !== "touch") return;
                  this.toggleGroupExpansion(first.id || "");
                }}
                {...g.textCoor}
              >
                {g.name}
              </text>
            </g>
          );
        })}
        {hovered && (
          <WrappedGroupLabel
            getSelectionAttributes={getSelectionAttributes}
            group={hovered}
            lineHeight={lineHeight}
            setHoveredGroup={this.setHoveredGroup}
            onRequestClose={() => this.setState({ hoveredGroup: "", hoverPinned: false })}
            size={size}
          />
        )}
      </g>
    );
  }
}
