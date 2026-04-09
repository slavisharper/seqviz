import * as React from "react";
import { useResizeDetector } from "react-resize-detector";

import { EventHandler } from "./EventHandler";
import SelectionHandler, { InputRefFunc, ViewerContextMenuEvent } from "./SelectionHandler";
import {
  Annotation,
  CutSite,
  Highlight,
  NameRange,
  Primer,
  Separator,
  SeparatorClickEvent,
  SeqType,
  SingleStrandAnnotation,
  Size,
  TranslationProp,
} from "./core/elements";
import {
  createCircularPropsBuilder,
  createLinearMapPropsBuilder,
  createLinearPropsBuilder,
} from "./seqViewerInnerProps";
import CentralIndexContext from "./state/centralIndexContext";
import SelectionContext, {
  ExternalSelection,
  FragmentSelection,
  Selection,
  SelectionContextValue,
  SelectionEventMeta,
  defaultSelection,
} from "./state/selectionContext";
import HoveredEnzymeContext, { HoveredEnzyme } from "./state/hoveredEnzymeContext";
import { isEqual } from "./utils/isEqual";
import Circular, { CircularProps } from "./viewers/Circular/Circular";
import Linear, { LinearProps } from "./viewers/Linear/Linear";
import LinearHorizontal from "./viewers/LinearHorizontal/LinearHorizontal";
import LinearMap, { LinearMapProps } from "./viewers/LinearMap/LinearMap";

/**
 * This is the width in pixels of a character that's 12px
 * This will need to change whenever the css of the plasmid viewer text changes
 * just divide the width of some rectangular text by it's number of characters
 */
export const CHAR_WIDTH = 7.2;

type LinearMapChildProps = Omit<LinearMapProps, "handleMouseEvent" | "inputRef">;

export interface CustomChildrenProps {
  circularProps: Omit<CircularProps, "handleMouseEvent" | "inputRef" | "onUnmount">;
  handleContextMenu: (event: React.MouseEvent) => void;
  handleMouseEvent: React.MouseEventHandler;
  inputRef: InputRefFunc;
  linearMapProps: LinearMapChildProps;
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
  fragments: Annotation[];
  bpColors: { [key: number | string]: string };
  children?: (props: CustomChildrenProps) => React.ReactNode;
  compSeq: string;
  copyEvent: (event: React.KeyboardEvent<HTMLElement>) => boolean;
  cutSites: CutSite[];
  disableCircularMap?: boolean;
  disableLinearMap?: boolean;
  disableLinearSequence?: boolean;
  disableSelection?: boolean;
  highlights: Highlight[];
  name: string;
  onContextMenu?: (event: ViewerContextMenuEvent) => void;
  onDoubleClick?: (event: ViewerContextMenuEvent) => void;
  onSelection: (selection: Selection, fragmentSelection?: FragmentSelection | null) => void;
  primers: Primer[];
  refs?: SeqVizChildRefs;
  separators: Separator[];
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
  highlightedEnzymes?: string[];
  /** testSize is a forced height/width that overwrites anything from sizeMe. For testing */
  testSize?: { height: number; width: number };
  translations: NameRange[];
  viewer: "linear" | "circular" | "both" | "both_flip" | "linear_map" | "linear_map_linear" | "linear_horizontal" | "linear_map_horizontal" | "circular_horizontal";
  zoom: { circular: number; linear: number; linearMap?: number };
  enableInteractiveZoom?: boolean;
  onZoomChange?: (zoom: { circular: number; linear: number; linearMap?: number }) => void;
  onSeparatorClick?: (event: SeparatorClickEvent) => void;
}

type SeqViewerContainerPublicProps = Omit<SeqViewerContainerProps, keyof ResizeInjectedProps>;

export interface SeqViewerContainerState {
  centralIndex: {
    circular: number;
    linear: number;
    setCentralIndex: (type: "LINEAR" | "CIRCULAR", value: number) => void;
  };
  selection: Selection;
  managedZoom: { circular: number; linear: number; linearMap: number };
  linearPanelHeight: number;
  hoveredEnzyme: HoveredEnzyme | null;
}

/**
 * a parent sequence viewer component that holds whatever is common between
 * the linear and circular sequence viewers. The Header is an example
 */
class SeqViewerContainer extends React.Component<SeqViewerContainerProps, SeqViewerContainerState> {
  private buildLinearProps = createLinearPropsBuilder();

  private buildCircularProps = createCircularPropsBuilder();

  private buildLinearMapProps = createLinearMapPropsBuilder();

  private containerEl: HTMLDivElement | null = null;
  private linearPanelEl: HTMLDivElement | null = null;
  private linearResizeObserver: ResizeObserver | null = null;
  private pinchTouches = new Map<number, { x: number; y: number }>();
  private pinchBaseDist: number | null = null;
  private pinchStartViewer: "linear" | "circular" | "linearMap" | null = null;
  private interactiveZoomListenersAttached = false;

  constructor(props: SeqViewerContainerProps) {
    super(props);

    const clamp = (viewer: "linear" | "circular" | "linearMap", value: number) => this.clampZoomValue(viewer, value);

    this.state = {
      centralIndex: {
        circular: 0,
        linear: 0,
        setCentralIndex: this.setCentralIndex,
      },
      selection: this.getSelection(defaultSelection, props.selection),
      managedZoom: {
        circular: clamp("circular", props.zoom?.circular ?? 0),
        linear: clamp("linear", props.zoom?.linear ?? 50),
        linearMap: clamp("linearMap", props.zoom?.linearMap ?? props.zoom?.circular ?? 0),
      },
      linearPanelHeight: 0,
      hoveredEnzyme: null,
    };
  }

  selectionIsProgramatic(selection: any): selection is Selection {
    // If the selection was done programatically, it has not type
    if (selection) return !selection.type;
    return false;
  }

  componentDidMount() {
    if (!this.props.selection && this.state.selection !== defaultSelection) {
      this.setSelection(defaultSelection);
    }

    this.attachInteractiveListeners(this.containerEl);

    // Setup ResizeObserver for linear panel to track height changes
    if (this.linearPanelEl) {
      this.linearResizeObserver = new ResizeObserver(() => {
        if (this.linearPanelEl) {
          this.setState({ linearPanelHeight: this.linearPanelEl.offsetHeight });
        }
      });
      this.linearResizeObserver.observe(this.linearPanelEl);
    }
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

    if (!isEqual(prevProps.zoom, this.props.zoom)) {
      this.setState(prev => ({
        ...prev,
        managedZoom: {
          circular: this.clampZoomValue("circular", this.props.zoom?.circular ?? prev.managedZoom.circular),
          linear: this.clampZoomValue("linear", this.props.zoom?.linear ?? prev.managedZoom.linear),
          linearMap: this.clampZoomValue(
            "linearMap",
            this.props.zoom?.linearMap ?? this.props.zoom?.circular ?? prev.managedZoom.linearMap,
          ),
        },
      }));
    }

    const prevInteractive = prevProps.enableInteractiveZoom ?? true;
    const nextInteractive = this.props.enableInteractiveZoom ?? true;
    if (prevInteractive !== nextInteractive) {
      if (nextInteractive) {
        this.attachInteractiveListeners(this.containerEl);
      } else {
        this.detachInteractiveListeners(this.containerEl);
      }
    }
  };

  componentWillUnmount() {
    this.detachInteractiveListeners(this.containerEl);
    if (this.linearResizeObserver) {
      this.linearResizeObserver.disconnect();
    }
  }

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
    const { parent: _parent, ref: _ref, ...rest } = selection;
    void _parent;
    void _ref;
    if (!this.props.selection) this.setState({ selection });
    if (this.props.onSelection) this.props.onSelection(rest, meta?.fragmentSelection ?? null);
  };

  private setHoveredEnzyme = (hoveredEnzyme: HoveredEnzyme | null) => {
    this.setState(prev => {
      const prevValue = prev.hoveredEnzyme;
      if (!prevValue && !hoveredEnzyme) {
        return null;
      }
      if (prevValue && hoveredEnzyme && prevValue.id === hoveredEnzyme.id && prevValue.name === hoveredEnzyme.name) {
        return null;
      }
      if (!prevValue && hoveredEnzyme) {
        return { hoveredEnzyme };
      }
      if (prevValue && !hoveredEnzyme) {
        return { hoveredEnzyme: null };
      }
      return { hoveredEnzyme };
    });
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

  private clampZoomValue(viewer: "linear" | "circular" | "linearMap", value: number) {
    const min = viewer === "linear" ? 20 : 0;
    const max = 100;
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  private bumpZoom = (viewer: "linear" | "circular" | "linearMap" | null, delta: number) => {
    if (!viewer) return;

    let updatedZoom: { circular: number; linear: number; linearMap: number } | null = null;

    this.setState(
      prev => {
        const nextValue = this.clampZoomValue(viewer, prev.managedZoom[viewer] + delta);
        if (nextValue === prev.managedZoom[viewer]) return null;
        const nextZoom = { ...prev.managedZoom, [viewer]: nextValue } as SeqViewerContainerState["managedZoom"];
        updatedZoom = nextZoom;
        return { ...prev, managedZoom: nextZoom };
      },
      () => {
        if (updatedZoom && this.props.onZoomChange) {
          this.props.onZoomChange(updatedZoom);
        }
      },
    );
  };

  private viewerFromTarget = (el: HTMLElement | null): "linear" | "circular" | "linearMap" | null => {
    let node: HTMLElement | null = el;
    while (node) {
      if (node.classList?.contains("la-vz-viewer-panel-linear-map")) return "linearMap";
      if (node.classList?.contains("la-vz-viewer-panel-linear")) return "linear";
      if (node.classList?.contains("la-vz-viewer-panel-circular")) return "circular";
      node = node.parentElement;
    }
    return null;
  };

  private handleZoomWheel = (e: WheelEvent) => {
    if (!(this.props.enableInteractiveZoom ?? true)) return;
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    e.stopPropagation();
    const viewer = this.viewerFromTarget(e.target as HTMLElement | null);
    const delta = e.deltaY > 0 ? -5 : 5;
    this.bumpZoom(viewer, delta);
  };

  private handlePointerDown = (e: PointerEvent) => {
    if (!(this.props.enableInteractiveZoom ?? true)) return;
    if (e.pointerType !== "touch") return;
    this.pinchTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinchTouches.size === 2) {
      this.pinchBaseDist = this.calcPinchDistance();
      this.pinchStartViewer = this.viewerFromTarget(e.target as HTMLElement | null);
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!(this.props.enableInteractiveZoom ?? true)) return;
    if (e.pointerType !== "touch") return;
    if (!this.pinchTouches.has(e.pointerId)) return;
    this.pinchTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinchTouches.size === 2 && this.pinchBaseDist && this.pinchStartViewer) {
      const dist = this.calcPinchDistance();
      if (!dist) return;
      const scale = dist / this.pinchBaseDist;
      const delta = (scale - 1) * 40;
      if (delta !== 0) {
        this.bumpZoom(this.pinchStartViewer, delta);
        this.pinchBaseDist = dist;
        e.preventDefault();
        e.stopPropagation();
      }
    }
  };

  private handlePointerUpOrCancel = (e: PointerEvent) => {
    if (e.pointerType !== "touch") return;
    this.pinchTouches.delete(e.pointerId);
    if (this.pinchTouches.size < 2) {
      this.pinchBaseDist = null;
      this.pinchStartViewer = null;
    }
  };

  private calcPinchDistance(): number {
    const touches = Array.from(this.pinchTouches.values());
    if (touches.length !== 2) return 0;
    const [a, b] = touches;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  private attachInteractiveListeners = (el: HTMLDivElement | null) => {
    if (!el) return;
    if (!(this.props.enableInteractiveZoom ?? true)) return;
    if (this.interactiveZoomListenersAttached) return;

    el.addEventListener("wheel", this.handleZoomWheel, { passive: false });
    el.addEventListener("pointerdown", this.handlePointerDown, { passive: true });
    el.addEventListener("pointermove", this.handlePointerMove, { passive: false });
    el.addEventListener("pointerup", this.handlePointerUpOrCancel, { passive: true });
    el.addEventListener("pointercancel", this.handlePointerUpOrCancel, { passive: true });
    this.interactiveZoomListenersAttached = true;
  };

  private detachInteractiveListeners = (el: HTMLDivElement | null) => {
    if (!el) return;
    if (!this.interactiveZoomListenersAttached) return;

    el.removeEventListener("wheel", this.handleZoomWheel as any);
    el.removeEventListener("pointerdown", this.handlePointerDown as any);
    el.removeEventListener("pointermove", this.handlePointerMove as any);
    el.removeEventListener("pointerup", this.handlePointerUpOrCancel as any);
    el.removeEventListener("pointercancel", this.handlePointerUpOrCancel as any);
    this.interactiveZoomListenersAttached = false;
    this.pinchTouches.clear();
    this.pinchBaseDist = null;
    this.pinchStartViewer = null;
  };

  private setContainerRef = (el: HTMLDivElement | null) => {
    if (this.containerEl && this.containerEl !== el) {
      this.detachInteractiveListeners(this.containerEl);
    }

    this.containerEl = el;

    if (typeof this.props.targetRef === "function") {
      this.props.targetRef(el);
    } else if (this.props.targetRef && "current" in (this.props.targetRef as any)) {
      (this.props.targetRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    }

    if (el) {
      this.attachInteractiveListeners(el);
    }
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
    const size = this.props.testSize
      ? { ...this.props.testSize }
      : { height: this.props.height, width: this.props.width };
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

  private getLinearProps = (viewerSize: Size): Omit<LinearProps, "handleMouseEvent" | "inputRef" | "onUnmount"> => {
    const {
      annotations,
      fragments,
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
    } = this.props;
    const managedZoom = this.state.managedZoom;

    const linearProps = this.buildLinearProps(
      annotations,
      fragments,
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
      managedZoom.linear,
    );

    return {
      ...linearProps,
      separators: this.props.separators || [],
      onSeparatorClick: this.props.onSeparatorClick,
    };
  };

  private getCircularProps = () => {
    const {
      annotations,
      fragments,
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
    } = this.props;
    const managedZoom = this.state.managedZoom;
    const size = this.getCircularViewerSize();

    const circularProps = this.buildCircularProps(
      annotations,
      fragments,
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
      managedZoom.circular,
    );

    return {
      ...circularProps,
      separators: this.props.separators || [],
      onSeparatorClick: this.props.onSeparatorClick,
    };
  };

  private getLinearMapProps = (viewerSize: Size, selection: Selection): LinearMapChildProps => {
    const { annotations, fragments, cutSites, highlights, name, orfs, primers, rotateOnScroll, search, seq, showIndex } =
      this.props;
    const managedZoom = this.state.managedZoom;
    const zoomLinearMap = managedZoom.linearMap;

    const linearMapProps = this.buildLinearMapProps(
      annotations,
      fragments,
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
      viewerSize.height,
      zoomLinearMap,
    );

    return {
      ...linearMapProps,
      separators: this.props.separators || [],
      onSeparatorClick: this.props.onSeparatorClick,
    };
  };

  private getViewerVisibility = (): ViewerVisibility => {
    const { disableCircularMap, disableLinearMap, disableLinearSequence, viewer } = this.props;

    const showCircular = !disableCircularMap && (viewer === "circular" || viewer === "both" || viewer === "both_flip" || viewer === "circular_horizontal");
    const showLinearMap = !disableLinearMap && (viewer === "linear_map" || viewer === "linear_map_linear" || viewer === "linear_map_horizontal");
    const showLinear =
      !disableLinearSequence &&
      (viewer === "linear" ||
        viewer === "linear_map_linear" ||
        viewer === "both" ||
        viewer === "both_flip" ||
        viewer === "linear_horizontal" ||
        viewer === "linear_map_horizontal" ||
        viewer === "circular_horizontal");

    return { showCircular, showLinearMap, showLinear };
  };

  render() {
    const { selection: selectionProp, seq, viewer } = this.props;
    const highlightedEnzymes = Array.isArray(this.props.highlightedEnzymes) ? this.props.highlightedEnzymes : [];
    const { centralIndex, selection } = this.state;
    const visibility = this.getViewerVisibility();
    const { showCircular, showLinear, showLinearMap } = visibility;

    const mergedSelection = this.props.disableSelection
      ? defaultSelection
      : this.getSelection(selection, selectionProp);

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
        ref={this.setContainerRef}
        className="la-vz-viewer-container"
        data-testid="la-vz-viewer-container"
        style={{
          height: "100%",
          position: "relative",
          width: "100%",
        }}
      >
        <style>{`.la-vz-hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; } .la-vz-hide-scrollbar::-webkit-scrollbar { display: none; } .la-vz-annotation-label:hover, .la-vz-primer-label:hover, .la-vz-handle-label:hover, .la-vz-cut-site-text:hover { text-decoration: underline; cursor: pointer; }`}</style>
        <CentralIndexContext.Provider value={centralIndex}>
          <SelectionContext.Provider value={{ ...mergedSelection, disableSelection: !!this.props.disableSelection }}>
            <HoveredEnzymeContext.Provider
              value={{
                hoveredEnzyme: this.state.hoveredEnzyme,
                highlightedEnzymes,
                setHoveredEnzyme: this.setHoveredEnzyme,
              }}
            >
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
              {(inputRef, handleMouseEvent, onUnmount, handleContextMenu, handleDoubleClick) => {
                const effectiveMouseEvent = this.props.disableSelection ? () => {} : handleMouseEvent;
                return <EventHandler
                  bpsPerBlock={linearProps.bpsPerBlock}
                  copyEvent={this.props.copyEvent}
                  handleMouseEvent={effectiveMouseEvent}
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
                        handleMouseEvent: effectiveMouseEvent,
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
                        handleMouseEvent: effectiveMouseEvent,
                        inputRef,
                        linearMapProps,
                        linearProps,
                        onUnmount,
                        showCircular,
                        showLinear,
                        showLinearMap,
                        viewer,
                        containerHeight: this.props.height,
                        linearPanelHeight: this.state.linearPanelHeight,
                        setLinearPanelRef: (el) => { this.linearPanelEl = el; },
                      })}
                </EventHandler>
              }}
              </SelectionHandler>
            </HoveredEnzymeContext.Provider>
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
  combinedLinearMapProps: LinearMapChildProps;
  showCircular: boolean;
  showLinear: boolean;
  showLinearMap: boolean;
  viewer: SeqViewerContainerProps["viewer"];
  containerHeight: number;
  linearPanelHeight: number;
  setLinearPanelRef: (el: HTMLDivElement | null) => void;
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
  containerHeight,
  linearPanelHeight,
  setLinearPanelRef,
}: ViewerRendererProps) => {
  const isDual = (viewer === "both" || viewer === "both_flip") && showCircular && showLinear;
  const isCircularHorizontal = viewer === "circular_horizontal" && showCircular && showLinear;
  const isLinearMapHorizontal = viewer === "linear_map_horizontal" && showLinearMap && showLinear;

  // For circular_horizontal, stack vertically: circular map on top, horizontal linear on bottom full width.
  const layoutDirection: React.CSSProperties["flexDirection"] = isDual ? "row" : "column";

  const layoutStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: layoutDirection,
    height: "100%",
    width: "100%",
    overflow: "hidden",
  };

  const circularStyle: React.CSSProperties = {
    flex: isDual ? "1 1 50%" : isCircularHorizontal ? "1 1 auto" : undefined,
    order: viewer === "both_flip" ? 2 : undefined,
    minWidth: 0,
    overflow: isCircularHorizontal ? "hidden" : undefined,
    height: isCircularHorizontal ? `${containerHeight - linearPanelHeight}px` : undefined,
  };

  const isLinearMapLinear = viewer === "linear_map_linear";
  const isLinearMapOnly = viewer === "linear_map";

  const mapZoom = (viewer === "linear_map_linear" || viewer === "linear_map_horizontal" ? combinedLinearMapProps : linearMapProps).zoom ?? 0;

  const linearMapStyle: React.CSSProperties = {
    borderBottom: isLinearMapLinear || isLinearMapHorizontal ? "1px solid rgba(0, 0, 0, 0.15)" : undefined,
    boxShadow: isLinearMapLinear || isLinearMapHorizontal ? "0 2px 4px rgba(0, 0, 0, 0.08)" : undefined,
    flex: isLinearMapLinear || isLinearMapHorizontal ? "0 0 auto" : isLinearMapOnly ? "1 1 auto" : undefined,
    overflowY: isLinearMapLinear || isLinearMapHorizontal || isLinearMapOnly ? "auto" : undefined,
    overflowX: mapZoom > 0 ? (isLinearMapLinear || isLinearMapHorizontal || isLinearMapOnly ? "auto" : undefined) : "hidden",
    maxHeight: isLinearMapLinear || isLinearMapHorizontal ? "45%" : undefined,
    minHeight: isLinearMapLinear || isLinearMapHorizontal ? "10rem" : undefined,
    height: isLinearMapOnly ? "100%" : undefined,
    minWidth: 0,
  };

  const linearStyle: React.CSSProperties = {
    flex: isLinearMapLinear || isLinearMapHorizontal ? "1 1 auto" : isDual ? "1 1 50%" : isCircularHorizontal ? "0 0 auto" : showLinear ? "1 1 auto" : undefined,
    minHeight: isLinearMapLinear || isLinearMapHorizontal || !isDual ? 0 : undefined,
    overflow: isLinearMapLinear || isLinearMapHorizontal || isCircularHorizontal ? "hidden" : undefined,
    order: viewer === "both" ? 2 : viewer === "both_flip" ? 1 : viewer === "circular_horizontal" ? 2 : undefined,
    minWidth: 0,
  };

  const mapProps = viewer === "linear_map_linear" || viewer === "linear_map_horizontal" ? combinedLinearMapProps : linearMapProps;

  const useHorizontalLinear = viewer === "linear_horizontal" || viewer === "linear_map_horizontal" || viewer === "circular_horizontal";

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
        <div
          ref={setLinearPanelRef}
          className="la-vz-viewer-panel la-vz-viewer-panel-linear"
          style={linearStyle}
        >
          {useHorizontalLinear ? (
            <LinearHorizontal
              {...linearProps}
              handleMouseEvent={handleMouseEvent}
              inputRef={inputRef}
              onUnmount={onUnmount}
            />
          ) : (
            <Linear {...linearProps} handleMouseEvent={handleMouseEvent} inputRef={inputRef} onUnmount={onUnmount} />
          )}
        </div>
      )}
    </div>
  );
};
