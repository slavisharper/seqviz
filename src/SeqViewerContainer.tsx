import * as React from "react";

import Circular, { CircularProps } from "./viewers/Circular/Circular";
import { EventHandler } from "./EventHandler";
import Linear, { LinearProps } from "./viewers/Linear/Linear";
import LinearMap, { LinearMapProps } from "./viewers/LinearMap/LinearMap";
import SelectionHandler, { InputRefFunc, ViewerContextMenuEvent } from "./SelectionHandler";
import CentralIndexContext from "./state/centralIndexContext";
import {
  Annotation,
  CutSite,
  Highlight,
  NameRange,
  Primer,
  SeqType,
  SingleStrandAnnotation,
  Size,
  TranslationProp,
} from "./core/elements";
import { isEqual } from "./utils/isEqual";
import SelectionContext, {
  ExternalSelection,
  FragmentSelection,
  Selection,
  SelectionEventMeta,
  defaultSelection,
} from "./state/selectionContext";
import { useResizeDetector } from "react-resize-detector";
import {
  createCircularPropsBuilder,
  createLinearMapPropsBuilder,
  createLinearPropsBuilder,
} from "./seqViewerInnerProps";

/**
 * This is the width in pixels of a character that's 12px
 * This will need to change whenever the css of the plasmid viewer text changes
 * just divide the width of some rectangular text by it's number of characters
 */
export const CHAR_WIDTH = 7.2;

export interface CustomChildrenProps {
  circularProps: Omit<CircularProps, "handleMouseEvent" | "inputRef" | "onUnmount">;
  handleContextMenu: (event: React.MouseEvent) => void;
  handleMouseEvent: React.MouseEventHandler;
  inputRef: InputRefFunc;
  linearMapProps: Omit<LinearMapProps, "handleMouseEvent" | "inputRef">;
  linearProps: Omit<LinearProps, "handleMouseEvent" | "inputRef" | "onUnmount">;
  onUnmount: (ref: string) => void;
  handleDoubleClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export interface SeqVizChildRefs {
  circular?: React.RefObject<HTMLElement>;
  linear?: React.RefObject<HTMLElement>;
}

type ResizeInjectedProps = {
  height: number;
  targetRef: React.LegacyRef<HTMLDivElement>;
  width: number;
};

type ViewerVisibility = {
  showCircular: boolean;
  showLinear: boolean;
  showLinearMap: boolean;
};

interface SeqViewerContainerProps extends ResizeInjectedProps {
  annotations: Annotation[];
  bpColors: { [key: number | string]: string };
  children?: (props: CustomChildrenProps) => React.ReactNode;
  compSeq: string;
  copyEvent: (event: React.KeyboardEvent<HTMLElement>) => boolean;
  cutSites: CutSite[];
  disableCircularMap?: boolean;
  disableLinearMap?: boolean;
  disableLinearSequence?: boolean;
  highlights: Highlight[];
  name: string;
  onContextMenu?: (event: ViewerContextMenuEvent) => void;
  onDoubleClick?: (event: ViewerContextMenuEvent) => void;
  onSelection: (selection: Selection, fragmentSelection?: FragmentSelection | null) => void;
  primers: Primer[];
  refs?: SeqVizChildRefs;
  rotateOnScroll: boolean;
  search: NameRange[];
  singleStrandAnnotations?: SingleStrandAnnotation[];
  selectAllEvent: (event: React.KeyboardEvent<HTMLElement>) => boolean;
  selection?: ExternalSelection;
  seq: string;
  seqType: SeqType;
  showComplement: boolean;
  showIndex: boolean;
  orfs: TranslationProp[];
  /** testSize is a forced height/width that overwrites anything from sizeMe. For testing */
  testSize?: { height: number; width: number };
  translations: NameRange[];
  viewer: "linear" | "circular" | "both" | "both_flip" | "linear_map" | "linear_map_linear";
  zoom: { circular: number; linear: number };
}

type SeqViewerContainerPublicProps = Omit<SeqViewerContainerProps, keyof ResizeInjectedProps>;

export interface SeqViewerContainerState {
  centralIndex: {
    circular: number;
    linear: number;
    setCentralIndex: (type: "LINEAR" | "CIRCULAR", value: number) => void;
  };
  selection: Selection;
}

/**
 * a parent sequence viewer component that holds whatever is common between
 * the linear and circular sequence viewers. The Header is an example
 */
class SeqViewerContainer extends React.Component<SeqViewerContainerProps, SeqViewerContainerState> {
  private buildLinearProps = createLinearPropsBuilder();

  private buildCircularProps = createCircularPropsBuilder();

  private buildLinearMapProps = createLinearMapPropsBuilder();

  constructor(props: SeqViewerContainerProps) {
    super(props);

    this.state = {
      centralIndex: {
        circular: 0,
        linear: 0,
        setCentralIndex: this.setCentralIndex,
      },
      selection: this.getSelection(defaultSelection, props.selection),
    };
  }

  selectionIsProgramatic(selection: any): selection is Selection {
    // If the selection was done programatically, it has not type
    if (selection) return !selection.type;
    return false;
  }

  // If the selection prop updates, also scroll the linear view to the new selection
  componentDidUpdate = (prevProps: SeqViewerContainerProps) => {
    // Only scroll if the selection was done passed in as a prop by a user of SeqViz. Otherwise the selection was
    // made by the user clicking an element or selecting a range of sequences
    if (this.selectionIsProgramatic(this.props.selection)) {
      if (
        this.props.selection?.start !== prevProps.selection?.start &&
        this.props.selection?.start !== this.props.selection?.end
      ) {
        this.setCentralIndex("LINEAR", this.props.selection?.start || 0);
      }
    }
  };

  /** this is here because the size listener is returning a new "size" prop every time */
  shouldComponentUpdate = (nextProps: SeqViewerContainerProps, nextState: any) =>
    !isEqual(nextProps, this.props) || !isEqual(nextState, this.state);

  /**
   * Update the central index of the linear or circular viewer.
   */
  setCentralIndex = (type: "LINEAR" | "CIRCULAR", value: number) => {
    if (type !== "LINEAR" && type !== "CIRCULAR") {
      throw new Error(`Unknown central index type: ${type}`);
    }

    if (this.state.centralIndex[type.toLowerCase()] === value) {
      return; // nothing changed
    }

    this.setState({ centralIndex: { ...this.state.centralIndex, [type.toLowerCase()]: value } });
  };

  /**
   * Update selection in state. Should only be performed from handlers/selection.jsx
   */
  setSelection = (selection: Selection, meta?: SelectionEventMeta) => {
    // If the user passed a selection, do not update our state here
    const { parent: _, ref: __, ...rest } = selection;
    if (!this.props.selection) this.setState({ selection });
    if (this.props.onSelection) this.props.onSelection(rest, meta?.fragmentSelection ?? null);
  };

  /**
   * Returns the selection that was either a prop (optional) or the selection maintained in state.
   */
  getSelection = (state: Selection, prop?: ExternalSelection): Selection => {
    if (prop) {
      return { ...prop, clockwise: typeof prop.clockwise === "undefined" || !!prop.clockwise, type: "" };
    }
    return state;
  };

  private getViewerSize = (): Size => {
    const { children, height, refs, testSize, viewer, width } = this.props;
    const baseSize = testSize ? { ...testSize } : { height, width };
    const { showCircular, showLinear } = this.getViewerVisibility();
    const isDual = (viewer === "both" || viewer === "both_flip") && showCircular && showLinear;

    if (refs?.linear?.current && children) {
      baseSize.width = refs.linear.current.clientWidth;
      baseSize.height = refs.linear.current.clientHeight;
    } else if (isDual) {
      baseSize.width /= 2;
    }

    return baseSize;
  };

  private getCircularViewerSize = (): Size => {
    const size = this.props.testSize ? { ...this.props.testSize } : { height: this.props.height, width: this.props.width };
    const { showCircular, showLinear } = this.getViewerVisibility();
    const isDual = (this.props.viewer === "both" || this.props.viewer === "both_flip") && showCircular && showLinear;

    if (this.props.refs?.circular?.current) {
      size.width = this.props.refs.circular.current.clientWidth;
      size.height = this.props.refs.circular.current.clientHeight;
    } else if (isDual) {
      size.width /= 2;
    }

    return size;
  };

  private getLinearProps = (viewerSize: Size) => {
    const {
      annotations,
      bpColors,
      compSeq,
      cutSites,
      highlights,
      singleStrandAnnotations = [],
      primers,
      search,
      seq,
      seqType,
      showComplement,
      showIndex,
      translations,
      zoom,
    } = this.props;

    return this.buildLinearProps(
      annotations,
      bpColors,
      compSeq,
      cutSites,
      highlights,
      singleStrandAnnotations,
      primers,
      search,
      seq,
      seqType,
      showComplement,
      showIndex,
      viewerSize.width,
      viewerSize.height,
      translations,
      zoom.linear
    );
  };

  private getCircularProps = () => {
    const {
      annotations,
      compSeq,
      cutSites,
      highlights,
      name,
      orfs,
      primers,
      rotateOnScroll,
      search,
      seq,
      showComplement,
      showIndex,
      zoom,
    } = this.props;
    const size = this.getCircularViewerSize();

    return this.buildCircularProps(
      annotations,
      compSeq,
      cutSites,
      highlights,
      orfs,
      primers,
      name,
      rotateOnScroll,
      search,
      seq,
      showComplement,
      showIndex,
      size.width,
      size.height,
      zoom.circular
    );
  };

  private getLinearMapProps = (viewerSize: Size, selection: Selection) => {
    const { annotations, cutSites, highlights, name, orfs, primers, rotateOnScroll, search, seq, showIndex } = this.props;

    return this.buildLinearMapProps(
      annotations,
      cutSites,
      highlights,
      name,
      orfs,
      primers,
      rotateOnScroll,
      search,
      selection,
      seq,
      showIndex,
      viewerSize.width,
      viewerSize.height
    );
  };

  private getViewerVisibility = (): ViewerVisibility => {
    const { disableCircularMap, disableLinearMap, disableLinearSequence, viewer } = this.props;

    const showCircular = !disableCircularMap && (viewer === "circular" || viewer === "both" || viewer === "both_flip");
    const showLinearMap = !disableLinearMap && (viewer === "linear_map" || viewer === "linear_map_linear");
    const showLinear =
      !disableLinearSequence && (viewer === "linear" || viewer === "linear_map_linear" || viewer === "both" || viewer === "both_flip");

    return { showCircular, showLinearMap, showLinear };
  };

  render() {
    const { selection: selectionProp, seq, viewer } = this.props;
    const { centralIndex, selection } = this.state;
    const visibility = this.getViewerVisibility();
    const { showCircular, showLinear, showLinearMap } = visibility;

    const mergedSelection = this.getSelection(selection, selectionProp);

    const viewerSize = this.getViewerSize();
    const linearProps = this.getLinearProps(viewerSize);
    const circularProps = this.getCircularProps();
    const linearMapProps = this.getLinearMapProps(viewerSize, mergedSelection);
    const combinedLinearMapProps =
      viewer === "linear_map_linear" && showLinearMap
        ? { ...linearMapProps, size: { ...linearMapProps.size, height: 0 } }
        : linearMapProps;

    return (
      <div
        ref={this.props.targetRef}
        className="la-vz-viewer-container"
        data-testid="la-vz-viewer-container"
        style={{
          height: "100%",
          position: "relative",
          width: "100%",
        }}
      >
        <CentralIndexContext.Provider value={centralIndex}>
          <SelectionContext.Provider value={mergedSelection}>
            <SelectionHandler
              center={circularProps.center}
              centralIndex={centralIndex.circular}
              onContextMenu={this.props.onContextMenu}
              onDoubleClick={this.props.onDoubleClick}
              seq={seq}
              setCentralIndex={this.setCentralIndex}
              setSelection={this.setSelection}
              yDiff={circularProps.yDiff}
            >
              {(inputRef, handleMouseEvent, onUnmount, handleContextMenu, handleDoubleClick) => (
                <EventHandler
                  bpsPerBlock={linearProps.bpsPerBlock}
                  copyEvent={this.props.copyEvent}
                  handleMouseEvent={handleMouseEvent}
                  onContextMenu={handleContextMenu}
                  onDoubleClick={handleDoubleClick}
                  selectAllEvent={this.props.selectAllEvent}
                  selection={mergedSelection}
                  seq={seq}
                  setSelection={this.setSelection}
                >
                  {this.props.children
                    ? this.props.children({
                        circularProps,
                        handleContextMenu,
                        handleDoubleClick,
                        handleMouseEvent,
                        inputRef,
                        linearMapProps,
                        linearProps,
                        onUnmount,
                      })
                    : renderViewerPanels({
                        circularProps,
                        combinedLinearMapProps,
                        handleContextMenu,
                        handleDoubleClick,
                        handleMouseEvent,
                        inputRef,
                        linearMapProps,
                        linearProps,
                        onUnmount,
                        showCircular,
                        showLinear,
                        showLinearMap,
                        viewer,
                      })}
                </EventHandler>
              )}
            </SelectionHandler>
          </SelectionContext.Provider>
        </CentralIndexContext.Provider>
      </div>
    );
  }
}

const SeqViewerContainerWithResize = (props: SeqViewerContainerPublicProps) => {
  const { ref, width, height } = useResizeDetector<HTMLDivElement>({ handleHeight: true, handleWidth: true });

  return <SeqViewerContainer {...props} height={height ?? 0} targetRef={ref} width={width ?? 0} />;
};

export default SeqViewerContainerWithResize;

type ViewerRendererProps = CustomChildrenProps & {
  combinedLinearMapProps: Omit<LinearMapProps, "handleMouseEvent" | "inputRef">;
  showCircular: boolean;
  showLinear: boolean;
  showLinearMap: boolean;
  viewer: SeqViewerContainerProps["viewer"];
};

const renderViewerPanels = ({
  circularProps,
  combinedLinearMapProps,
  handleMouseEvent,
  inputRef,
  linearMapProps,
  linearProps,
  onUnmount,
  showCircular,
  showLinear,
  showLinearMap,
  viewer,
}: ViewerRendererProps) => {
  const isDual = (viewer === "both" || viewer === "both_flip") && showCircular && showLinear;
  const layoutDirection: React.CSSProperties["flexDirection"] = isDual ? "row" : "column";

  const layoutStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: layoutDirection,
    height: "100%",
    width: "100%",
    overflow: "hidden",
  };

  const circularStyle: React.CSSProperties = {
    flex: isDual ? "1 1 50%" : undefined,
    order: viewer === "both_flip" ? 2 : undefined,
  };

  const isLinearMapLinear = viewer === "linear_map_linear";
  const isLinearMapOnly = viewer === "linear_map";

  const linearMapStyle: React.CSSProperties = {
    borderBottom: isLinearMapLinear ? "1px solid rgba(0, 0, 0, 0.15)" : undefined,
    boxShadow: isLinearMapLinear ? "0 2px 4px rgba(0, 0, 0, 0.08)" : undefined,
    flex: isLinearMapLinear ? "0 0 auto" : isLinearMapOnly ? "1 1 auto" : undefined,
    overflowY: isLinearMapLinear || isLinearMapOnly ? "auto" : undefined,
    overflowX: isLinearMapLinear || isLinearMapOnly ? "hidden" : undefined,
    maxHeight: isLinearMapLinear ? "50%" : undefined,
    minHeight: isLinearMapLinear ? "14rem" : undefined,
    height: isLinearMapOnly ? "100%" : undefined,
  };

  const linearStyle: React.CSSProperties = {
    flex: isLinearMapLinear ? "1 1 auto" : isDual ? "1 1 50%" : showLinear ? "1 1 auto" : undefined,
    minHeight: isLinearMapLinear || !isDual ? 0 : undefined,
    overflow: isLinearMapLinear ? "hidden" : undefined,
    order: viewer === "both" ? 2 : viewer === "both_flip" ? 1 : undefined,
  };

  const mapProps = viewer === "linear_map_linear" ? combinedLinearMapProps : linearMapProps;

  return (
    <div className={`la-vz-viewer-panels la-vz-viewer-panels-${viewer}`} style={layoutStyle}>
      {showCircular && (
        <div className="la-vz-viewer-panel la-vz-viewer-panel-circular" style={circularStyle}>
          <Circular {...circularProps} handleMouseEvent={handleMouseEvent} inputRef={inputRef} onUnmount={onUnmount} />
        </div>
      )}
      {showLinearMap && (
        <div className="la-vz-viewer-panel la-vz-viewer-panel-linear-map" style={linearMapStyle}>
          <LinearMap {...mapProps} handleMouseEvent={handleMouseEvent} inputRef={inputRef} />
        </div>
      )}
      {showLinear && (
        <div className="la-vz-viewer-panel la-vz-viewer-panel-linear" style={linearStyle}>
          <Linear {...linearProps} handleMouseEvent={handleMouseEvent} inputRef={inputRef} onUnmount={onUnmount} />
        </div>
      )}
    </div>
  );
};
