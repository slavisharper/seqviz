import * as React from "react";

import SelectionContext, {
  FragmentSelection,
  Selection,
  SelectionEventDetail,
  SelectionEventMeta,
  defaultSelection,
} from "./state/selectionContext";

interface RefSelection extends Selection {
  linearOffset?: number;
  linearWidth?: number;
  viewer: "LINEAR" | "CIRCULAR";
}

export type InputRefFunc = (id: string, ref: RefSelection) => any;

export type SeqVizMouseEvent = React.MouseEvent & {
  target: EventTarget & { id?: string; dataset?: DOMStringMap };
  currentTarget: EventTarget & { id?: string; dataset?: DOMStringMap };
};

export interface ViewerContextMenuEvent {
  event: React.MouseEvent;
  name?: string;
  selection: Selection;
  sequence: string;
  type?: Selection["type"];
  fragmentSelection?: FragmentSelection;
}

export interface SelectionHandlerProps {
  center: { x: number; y: number };
  centralIndex: number;
  children: (
    inputRef: InputRefFunc,
    handleMouseEvent: (e: SeqVizMouseEvent) => void,
    onUnmount: (ref: string) => void,
    handleContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void,
    handleDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void,
  ) => React.ReactNode;
  onContextMenu?: (event: ViewerContextMenuEvent) => void;
  onDoubleClick?: (event: ViewerContextMenuEvent) => void;
  seq: string;
  setCentralIndex: (viewer: "LINEAR" | "CIRCULAR", index: number) => void;
  setSelection: (selection: Selection, meta?: SelectionEventMeta) => void;
  yDiff: number;
}

/**
 * SelectionHandler handles sequence selection. Each click, drag, etc, is
 * noted and mapped to a sequence index.
 */
export default class SelectionHandler extends React.PureComponent<SelectionHandlerProps> {
  static displayName = "WithSelectionHandler";

  static contextType = SelectionContext;
  static context: React.ContextType<typeof SelectionContext>;
  declare context: React.ContextType<typeof SelectionContext>;

  /** Only state is the selection range */
  state = { ...defaultSelection };

  /* previous base cursor is over, used in circular drag select */
  previousBase: null | number = null;

  /* directionality of drag (true if clockwise), used in circular drag select */
  forward: null | boolean = null;

  /* full selection length, used in circular drag select */
  fullSelectionLength = 0;

  /* is the user currently dragging across the surface of the seqViewer? this is tracked on SeqBlocks in particular (onMouseOver), used in circular drag select */
  dragEvent = false;

  /* is there a selection already, used for shift-click catch up */
  selectionStarted = false;

  /* was the last selection action a shift click, used for shift-click catch up */
  shiftSelection = false;

  /* unix time of the last click (awful attempt at detecting double clicks) */
  lastClick = 0;

  /* last completed selection used for ctrl-extend */
  private lastSelection: Selection | null = null;

  private lastFragmentSelection: FragmentSelection | null = null;

  /** a map between the id of child elements and their associated SelectRanges */
  idToRange = new Map<string, Selection>();

  private activeViewer: "LINEAR" | "CIRCULAR" | null = null;

  private linearDragMeta: {
    blockRect: DOMRect;
    range: { end: number; linearOffset?: number; linearWidth?: number; ref?: string | null; start: number };
  } | null = null;

  componentDidMount = () => {
    if (!document) return;
    document.addEventListener("mouseup", this.stopDrag);
    document.addEventListener("pointerup", this.stopDrag);
    document.addEventListener("pointercancel", this.stopDrag);
  };

  componentWillUnmount = () => {
    if (!document) return;
    document.removeEventListener("mouseup", this.stopDrag);
    document.removeEventListener("pointerup", this.stopDrag);
    document.removeEventListener("pointercancel", this.stopDrag);
  };

  /** Stop the current drag event from happening */
  stopDrag = () => {
    this.dragEvent = false;
    this.linearDragMeta = null;
    this.activeViewer = null;
  };

  private normalizeEventType = (type: string) => {
    switch (type) {
      case "pointerdown":
        return "mousedown";
      case "pointermove":
        return "mousemove";
      case "pointerup":
      case "pointercancel":
        return "mouseup";
      default:
        return type;
    }
  };

  private isTouchLike = (e: React.PointerEvent | React.MouseEvent) => {
    const anyE = e as { pointerType?: string };
    return anyE.pointerType === "touch" || anyE.pointerType === "pen";
  };

  private findRangeForEvent = (e: SeqVizMouseEvent, preferCurrentTarget = false): Selection | null => {
    const target = e.target as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement | null;
    const targetId = target?.id;
    const currentId = currentTarget?.id;

    let knownRange: Selection | undefined | null = null;

    if (preferCurrentTarget && currentId) {
      knownRange = this.idToRange.get(currentId) || null;
    }

    if (!knownRange && targetId) {
      knownRange = this.idToRange.get(targetId) || null;
    }

    if (!knownRange) {
      const datasetRange = this.getDatasetRange(target) || this.getDatasetRange(currentTarget);
      if (datasetRange) {
        knownRange = datasetRange;
      }
    }

    if (!knownRange && !preferCurrentTarget && currentId) {
      knownRange = this.idToRange.get(currentId) || null;
    }

    if (!knownRange) {
      return null;
    }

    return {
      ...knownRange,
      end: typeof knownRange.end === "number" ? knownRange.end : knownRange.start || 0,
      start: typeof knownRange.start === "number" ? knownRange.start : knownRange.end || 0,
    } as Selection;
  };

  private normalizeSelection = (selection: Selection): Selection => {
    const start = typeof selection.start === "number" ? selection.start : selection.end || 0;
    const end = typeof selection.end === "number" ? selection.end : start;

    return {
      ...selection,
      clockwise: typeof selection.clockwise === "boolean" ? selection.clockwise : true,
      end,
      start,
    };
  };

  private selectionHasLength = (
    selection?: Selection | null,
  ): selection is Selection & { end: number; start: number } => {
    if (!selection) {
      return false;
    }

    const { end, start } = selection;
    return typeof start === "number" && typeof end === "number" && start !== end;
  };

  private selectionContainsBase = (selection: Selection, base: number): boolean => {
    if (typeof base !== "number" || Number.isNaN(base)) {
      return false;
    }

    const start = typeof selection.start === "number" ? selection.start : (selection.end ?? 0);
    const end = typeof selection.end === "number" ? selection.end : (selection.start ?? start);
    const viewer = selection.viewer === "CIRCULAR" ? "CIRCULAR" : "LINEAR";
    const seqLength = this.props.seq?.length || 0;
    const selectionLength = typeof selection.length === "number" ? selection.length : undefined;

    if (start === end) {
      return false;
    }

    if (start < end) {
      return base >= start && base <= end;
    }

    const wrapsAround =
      viewer === "CIRCULAR" ||
      (viewer === "LINEAR" && selectionLength && seqLength > 0 && selectionLength > Math.abs(start - end));

    if (wrapsAround) {
      return base >= start || base <= end;
    }

    const min = Math.min(start, end);
    const max = Math.max(start, end);
    return base >= min && base <= max;
  };

  private normalizeIndexValue = (idx: number, seqLength: number): number => {
    if (!Number.isFinite(idx) || seqLength <= 0) {
      return idx;
    }

    const modded = idx % seqLength;
    return modded < 0 ? modded + seqLength : modded;
  };

  private getCutPosition = (selection: Selection, seqLength: number): number | null => {
    const candidate =
      typeof selection.fcut === "number"
        ? selection.fcut
        : typeof selection.rcut === "number"
          ? selection.rcut
          : typeof selection.start === "number"
            ? selection.start
            : typeof selection.end === "number"
              ? selection.end
              : null;
    if (typeof candidate !== "number" || Number.isNaN(candidate)) {
      return null;
    }

    return this.normalizeIndexValue(candidate, seqLength);
  };

  private complementSelection = (selection: Selection, seqLength: number): Selection => {
    if (
      typeof selection.start !== "number" ||
      typeof selection.end !== "number" ||
      Number.isNaN(selection.start) ||
      Number.isNaN(selection.end) ||
      seqLength <= 0 ||
      selection.start === selection.end
    ) {
      return selection;
    }

    const normalizedStart = this.normalizeIndexValue(selection.start, seqLength);
    const normalizedEnd = this.normalizeIndexValue(selection.end, seqLength);
    const clockwise = typeof selection.clockwise === "boolean" ? selection.clockwise : true;

    return {
      ...selection,
      clockwise,
      end: normalizedStart,
      start: normalizedEnd,
    };
  };

  private extendWithLastSelection = (selection: Selection): Selection => {
    const normalizedContext = this.normalizeSelection(this.context);
    const base = this.lastSelection || (this.selectionHasLength(normalizedContext) ? normalizedContext : null);
    if (!base || typeof base.start !== "number" || typeof base.end !== "number") {
      return selection;
    }

    const selStart = typeof selection.start === "number" ? selection.start : base.start;
    const selEnd = typeof selection.end === "number" ? selection.end : base.end;

    if (typeof selStart !== "number" || typeof selEnd !== "number") {
      return selection;
    }

    const seqLength = this.props.seq?.length || 0;

    // Special handling for enzyme-to-enzyme fragment selection: span the cut positions
    if (base.type === "ENZYME" && selection.type === "ENZYME") {
      const startCut = this.getCutPosition(base, seqLength);
      const endCut = this.getCutPosition(selection, seqLength);
      if (typeof startCut !== "number" || typeof endCut !== "number") {
        return selection;
      }

      const viewer = selection.viewer || base.viewer || "CIRCULAR";

      if (viewer === "LINEAR") {
        const start = Math.min(startCut, endCut);
        const end = Math.max(startCut, endCut);

        return {
          ...defaultSelection,
          clockwise: true,
          end,
          ref: selection.ref || base.ref,
          start,
          type: "SEQ",
          viewer: "LINEAR",
        };
      }

      const cwLength = this.calcSelectionLength(startCut, endCut, true);
      const ccwLength = this.calcSelectionLength(startCut, endCut, false);
      const clockwise = cwLength <= ccwLength;

      return {
        ...defaultSelection,
        clockwise,
        end: endCut,
        ref: selection.ref || base.ref,
        start: startCut,
        type: "SEQ",
        viewer: "CIRCULAR",
      };
    }

    const newStart = Math.min(base.start, base.end, selStart, selEnd);
    const newEnd = Math.max(base.start, base.end, selStart, selEnd);

    return {
      ...defaultSelection,
      clockwise: newStart <= newEnd,
      end: newEnd,
      ref: selection.ref || base.ref,
      start: newStart,
      type: "SEQ",
      viewer: selection.viewer || base.viewer,
    };
  };

  private toSelectionEventDetail = (selection?: Selection | null): SelectionEventDetail | null => {
    if (!selection) {
      return null;
    }

    const normalized = this.normalizeSelection(selection);

    return {
      direction:
        typeof normalized.direction === "number"
          ? normalized.direction
          : typeof normalized.clockwise === "boolean"
            ? normalized.clockwise
              ? 1
              : -1
            : undefined,
      end: normalized.end || 0,
      name: normalized.name,
      start: normalized.start || 0,
      type: normalized.type,
    };
  };

  private deriveSelectionFromContextTarget = (
    range: Selection,
    e: SeqVizMouseEvent,
    existingSelection?: Selection | null,
  ): Selection | null => {
    const normalizedRange: Selection & { end: number; start: number } = {
      ...range,
      end: range.end ?? range.start ?? 0,
      start: range.start ?? range.end ?? 0,
    };

    switch (range.type) {
      case "SEQ": {
        const seqRange = normalizedRange as RefSelection & {
          linearOffset?: number;
          linearWidth?: number;
        };
        const viewerType = seqRange.viewer || "LINEAR";
        const blockElement =
          typeof seqRange.ref === "string" && typeof document !== "undefined"
            ? (document.getElementById(seqRange.ref) as HTMLElement | null)
            : null;
        const blockRect = blockElement?.getBoundingClientRect();
        const base =
          viewerType === "LINEAR"
            ? this.calculateBaseLinear(
                e,
                {
                  end: seqRange.end as number,
                  linearOffset: seqRange.linearOffset,
                  linearWidth: seqRange.linearWidth,
                  start: seqRange.start as number,
                },
                blockRect,
              )
            : this.calculateBaseCircular(e, blockRect);

        if (typeof base !== "number" || Number.isNaN(base)) {
          return null;
        }

        const normalizedSelection = existingSelection ? this.normalizeSelection(existingSelection) : null;
        if (this.selectionHasLength(normalizedSelection) && this.selectionContainsBase(normalizedSelection, base)) {
          return { ...normalizedSelection };
        }

        return {
          ...defaultSelection,
          clockwise: true,
          end: base,
          ref: "SEQ-RIGHT-CLICK",
          start: base,
          type: "SEQ",
          viewer: viewerType,
        };
      }
      case "ANNOTATION":
      case "FIND":
      case "TRANSLATION":
      case "TRANSLATION_HANDLE":
      case "ENZYME":
      case "PRIMER":
      case "HIGHLIGHT":
      case "SINGLE_STRAND_ANNOTATION":
      case "AMINOACID": {
        const inferredDirection =
          typeof range.direction === "number"
            ? range.direction
            : typeof (range as any).strand === "number"
              ? (range as any).strand
              : 1;
        const clockwise = inferredDirection === 1;
        const selectionStart = clockwise ? normalizedRange.start : normalizedRange.end;
        const selectionEnd = clockwise ? normalizedRange.end : normalizedRange.start;

        return {
          ...normalizedRange,
          clockwise,
          end: selectionEnd,
          start: selectionStart,
        };
      }
      default:
        return normalizedRange;
    }
  };

  private getSequenceForSelection = (selection: Selection): string => {
    const { seq } = this.props;
    if (!seq || !seq.length) {
      return "";
    }
    const len = seq.length;
    const rawStart = typeof selection.start === "number" ? selection.start : (selection.end ?? 0);
    const rawEnd = typeof selection.end === "number" ? selection.end : rawStart;

    if (rawStart === rawEnd) {
      return "";
    }

    const start = ((rawStart % len) + len) % len;
    const end = ((rawEnd % len) + len) % len;

    if (start < end) {
      return seq.substring(start, end);
    }

    return seq.substring(start) + seq.substring(0, end);
  };

  private getLinearBlockRect = (ref: Selection["ref"], fallback?: EventTarget | null): DOMRect | null => {
    if (typeof document !== "undefined" && typeof ref === "string") {
      const element = document.getElementById(ref);
      if (element) {
        return element.getBoundingClientRect();
      }
    }

    const fallbackElement = fallback as HTMLElement | null;
    if (fallbackElement && typeof fallbackElement.getBoundingClientRect === "function") {
      return fallbackElement.getBoundingClientRect();
    }

    return null;
  };

  private storeLinearDragMeta = (
    blockRect: DOMRect,
    knownRange: {
      end: number;
      linearOffset?: number;
      linearWidth?: number;
      ref?: string | null;
      start: number;
    },
  ) => {
    this.linearDragMeta = {
      blockRect,
      range: { ...knownRange },
    };
    this.activeViewer = "LINEAR";
  };

  private continueLinearDragThroughOverlay = (e: SeqVizMouseEvent) => {
    if (!this.linearDragMeta) {
      return;
    }

    const eventType = this.normalizeEventType(e.type);
    const selection = this.context;
    const currBase = this.calculateBaseLinear(e, this.linearDragMeta.range, this.linearDragMeta.blockRect);

    const clockwiseDrag = selection.start !== null && currBase >= (selection.start || 0);

    if (eventType === "mousedown" && currBase !== null) {
      this.setSelection({
        ...defaultSelection,
        clockwise: clockwiseDrag,
        end: currBase,
        start: e.shiftKey ? selection.start : currBase,
        type: "SEQ",
      });
      return;
    }

    if (this.dragEvent && currBase !== null) {
      this.setSelection({
        ...defaultSelection,
        clockwise: clockwiseDrag,
        end: currBase,
        start: selection.start,
        type: "SEQ",
      });
    }
  };

  private getRangeAtViewportPoint = (clientX: number, clientY: number): Selection | null => {
    if (typeof document === "undefined") {
      return null;
    }

    const router = document.getElementById("la-vz-event-router");
    let previousPointerEvents: string | null = null;
    if (router) {
      previousPointerEvents = router.style.pointerEvents || null;
      router.style.pointerEvents = "none";
    }

    const element = document.elementFromPoint(clientX, clientY) as HTMLElement | null;

    if (router) {
      if (previousPointerEvents === null) {
        router.style.removeProperty("pointer-events");
      } else {
        router.style.pointerEvents = previousPointerEvents;
      }
    }

    if (!element) {
      return null;
    }

    return this.getDatasetRange(element) || this.idToRange.get(element.id) || null;
  };

  private getDatasetRange = (target?: EventTarget | null): RefSelection | null => {
    if (!target) {
      return null;
    }

    let element = target as Element | null;

    while (element && typeof element.getAttribute !== "function") {
      element = element.parentElement;
    }

    if (!element) {
      return null;
    }

    const selectionElement = element.matches?.("[data-selection-type]")
      ? element
      : element.closest?.("[data-selection-type]") || null;

    if (!selectionElement) {
      return null;
    }

    const datasetElement = selectionElement as Element & { dataset?: DOMStringMap };
    const dataset = datasetElement.dataset;
    if (!dataset) {
      return null;
    }
    const {
      selectionEnd,
      selectionDirection,
      selectionFcut,
      selectionName,
      selectionRcut,
      selectionRef,
      selectionStart,
      selectionType,
      selectionViewer,
      selectionLinearWidth,
      selectionLinearOffset,
      scrollLinearOnSelect,
    } = dataset;
    if (!selectionType || typeof selectionStart === "undefined" || typeof selectionEnd === "undefined") {
      return null;
    }

    const start = Number(selectionStart);
    const end = Number(selectionEnd);
    const fcut = typeof selectionFcut === "undefined" ? undefined : Number(selectionFcut);
    const rcut = typeof selectionRcut === "undefined" ? undefined : Number(selectionRcut);
    const direction = typeof selectionDirection === "undefined" ? undefined : Number(selectionDirection);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return null;
    }

    const viewer = selectionViewer === "CIRCULAR" ? "CIRCULAR" : "LINEAR";
    const shouldScrollLinear = typeof scrollLinearOnSelect === "string" ? scrollLinearOnSelect === "true" : undefined;
    const linearWidth = typeof selectionLinearWidth === "undefined" ? undefined : Number(selectionLinearWidth);
    const linearOffset = typeof selectionLinearOffset === "undefined" ? undefined : Number(selectionLinearOffset);

    return {
      clockwise: true,
      direction: Number.isFinite(direction) && direction !== 0 ? (direction as number > 0 ? 1 : -1) : undefined,
      end,
      fcut: Number.isFinite(fcut) ? fcut : undefined,
      name: selectionName,
      rcut: Number.isFinite(rcut) ? rcut : undefined,
      ref: selectionRef || datasetElement.id || `${viewer}-${start}-${end}`,
      scrollLinearOnSelect: shouldScrollLinear,
      start,
      linearWidth: Number.isFinite(linearWidth) ? linearWidth : undefined,
      linearOffset: Number.isFinite(linearOffset) ? linearOffset : undefined,
      type: selectionType as Selection["type"],
      viewer,
    };
  };

  /**
   * Called at start of drag to make sure checkers are reset to default state
   */
  resetCircleDragVars = (start: null | number) => {
    this.previousBase = start;
    this.forward = null;
    this.fullSelectionLength = 0;
    this.dragEvent = true; // start a drag event
  };

  /**
   * a ref callback for mapping the id of child to its SelectRange
   * it stores the id of all elements
   **/
  inputRef = (ref: string, selectRange: Selection) => {
    this.idToRange.set(ref, { ref, ...selectRange });
  };

  /**
   * remove the ref by ID.
   */
  removeMountedBlock = (ref: string) => {
    this.idToRange.delete(ref);
  };

  /**
   * the selected child element is something that is known by reference.
   * update its SeqBlock's range (or any others affected) with the newly
   * active range
   */
  private createViewerEventPayload = (
    rawEvent: React.MouseEvent<HTMLDivElement>,
    preferCurrentTarget = false,
  ): ViewerContextMenuEvent | null => {
    const e = rawEvent as SeqVizMouseEvent;

    let clickedRange = this.findRangeForEvent(e, preferCurrentTarget);
    if (!clickedRange) {
      clickedRange = this.getRangeAtViewportPoint(e.clientX, e.clientY);
    }

    let selectionForEvent: Selection | null = null;

    if (clickedRange) {
      selectionForEvent = this.deriveSelectionFromContextTarget(clickedRange, e, this.context);
    }

    if (!selectionForEvent) {
      selectionForEvent = this.context;
    }

    if (!selectionForEvent) {
      return null;
    }

    const fragmentSelectionForEvent: FragmentSelection | undefined =
      this.lastFragmentSelection?.firstSelection && this.lastFragmentSelection?.secondSelection
        ? this.lastFragmentSelection
        : undefined;

    this.setSelection(selectionForEvent);

    const normalized = this.normalizeSelection(selectionForEvent);
    const sequence = this.getSequenceForSelection(normalized);

    return {
      event: rawEvent,
      name: normalized.name,
      selection: normalized,
      fragmentSelection: fragmentSelectionForEvent,
      sequence,
      type: normalized.type,
    };
  };

  handleContextMenu = (rawEvent: React.MouseEvent<HTMLDivElement>) => {
    rawEvent.preventDefault();
    rawEvent.stopPropagation();
    const payload = this.createViewerEventPayload(rawEvent, this.dragEvent);
    if (payload && this.props.onContextMenu) {
      this.props.onContextMenu(payload);
    }
  };

  handleDoubleClick = (rawEvent: React.MouseEvent<HTMLDivElement>) => {
    const payload = this.createViewerEventPayload(rawEvent);
    if (payload && this.props.onDoubleClick) {
      this.props.onDoubleClick(payload);
    }
  };

  mouseEvent = (e: SeqVizMouseEvent) => {
    const { setCentralIndex } = this.props;
    const eventType = this.normalizeEventType(e.type);

    // Ignore touch/pen interactions to allow native scroll/drag/rotate without creating selections.
    if (this.isTouchLike(e)) {
      this.dragEvent = false;
      this.activeViewer = null;
      return;
    }

    const currentEl = e.currentTarget as HTMLElement | null;
    const targetEl = e.target as HTMLElement | null;
    if (
      this.dragEvent &&
      currentEl?.id === "la-vz-event-router" &&
      targetEl &&
      targetEl !== currentEl &&
      this.idToRange.has(targetEl.id)
    ) {
      return;
    }

    if ((eventType === "mousedown" || eventType === "mouseup") && typeof e.button === "number" && e.button !== 0) {
      return;
    }

    // should not be updating selection since it's not a drag event time
    if ((eventType === "mousemove" || eventType === "mouseup") && !this.dragEvent) {
      return;
    }

    // react provides click counts via e.detail; use that instead of custom timing
    const clickCount = e.detail || 1;
    let knownRange = this.findRangeForEvent(e, this.dragEvent);

    if (!knownRange && eventType === "mousedown") {
      knownRange = this.getRangeAtViewportPoint(e.clientX, e.clientY);
    }

    if (!knownRange) {
      if (this.dragEvent && this.activeViewer === "LINEAR") {
        this.continueLinearDragThroughOverlay(e);
      }
      return; // there isn't a known range with the id of the element
    }

    if (this.dragEvent && this.activeViewer === "LINEAR" && knownRange.type !== "SEQ") {
      this.continueLinearDragThroughOverlay(e);
      return;
    }

    const { direction, end, scrollLinearOnSelect, start, viewer } = knownRange as Selection & {
      scrollLinearOnSelect?: boolean;
    };

    const isCtrlSelect = e.ctrlKey || e.metaKey;
    const invertCtrlSelection = isCtrlSelect && e.shiftKey;

    if (isCtrlSelect && eventType === "mousedown") {
      const derived = this.deriveSelectionFromContextTarget(knownRange, e, this.context);
      if (derived) {
        const baseSelection = this.lastSelection || this.context;
        const extended = this.extendWithLastSelection(derived);
        const finalSelection = invertCtrlSelection
          ? this.complementSelection(extended, this.props.seq?.length || 0)
          : extended;
        const firstDetailSource = invertCtrlSelection ? derived : baseSelection;
        const secondDetailSource = invertCtrlSelection ? baseSelection : derived;
        const fragmentSelection: FragmentSelection = {
          firstSelection: this.toSelectionEventDetail(firstDetailSource || undefined),
          secondSelection: this.toSelectionEventDetail(secondDetailSource || undefined),
        };
        this.setSelection(finalSelection, {
          fragmentSelection,
          skipLastSelectionUpdate: true,
        });
      }
      return;
    }

    switch (knownRange.type) {
      case "ANNOTATION":
      case "FIND":
      case "TRANSLATION":
      case "TRANSLATION_HANDLE":
      case "ENZYME":
      case "PRIMER":
      case "HIGHLIGHT":
      case "SINGLE_STRAND_ANNOTATION": {
        const shouldScrollLinear = scrollLinearOnSelect || viewer !== "LINEAR";
        if (shouldScrollLinear && setCentralIndex) {
          // if an element was clicked on the circular viewer, scroll the linear
          // viewer so the element starts on the first SeqBlock
          setCentralIndex("LINEAR", start || 0);
        }

        // Annotation or find selection range
        const clockwise = direction ? direction === 1 : true;
        const selectionStart = clockwise ? start : end;
        const selectionEnd = clockwise ? end : start;

        this.setSelection({
          ...knownRange,
          clockwise: clockwise,
          end: selectionEnd,
          start: selectionStart,
        });

        this.dragEvent = false;
        this.lastClick = Date.now();

        break;
      }
      case "AMINOACID": {
        // Annotation or find selection range
        const clockwise = direction ? direction === 1 : true;
        const selectionStart = clockwise ? start : end;
        const selectionEnd = clockwise ? end : start;

        // On double-click, immediately select the full translation once and exit to avoid flicker
        if (clickCount >= 2 && knownRange.parent) {
          const parent = { ...knownRange.parent, end: knownRange.parent.end || 0, start: knownRange.parent.start || 0 };
          const parentClockwise = parent.direction ? parent.direction === 1 : clockwise;
          const parentStart = parentClockwise ? parent.start : parent.end;
          const parentEnd = parentClockwise ? parent.end : parent.start;

          this.setSelection({
            ...parent,
            clockwise: parentClockwise,
            end: parentEnd,
            start: parentStart,
          });

          this.dragEvent = false;
          this.lastClick = Date.now();
          e.stopPropagation();
          break;
        }

        this.setSelection({
          ...knownRange,
          clockwise: clockwise,
          end: selectionEnd,
          start: selectionStart,
        });

        this.dragEvent = false;
        this.lastClick = Date.now();

        e.stopPropagation(); // necessary to stop a double click

        break;
      }
      case "SEQ": {
        if (viewer === "LINEAR") {
          this.handleLinearSeqEvent(e, { ...knownRange, end: knownRange.end || 0, start: knownRange.start || 0 });
        } else if (viewer === "CIRCULAR") {
          this.handleCircularSeqEvent(e);
        }

        break;
      }
      default:
    }
  };

  /**
   * Handle a sequence selection on a linear viewer
   */
  handleLinearSeqEvent = (
    e: SeqVizMouseEvent,
    knownRange: {
      end: number;
      linearOffset?: number;
      linearWidth?: number;
      ref?: string | null;
      scrollLinearOnSelect?: boolean;
      start: number;
    },
  ) => {
    const selection = this.context;
    const eventType = this.normalizeEventType(e.type);
    const blockRect = this.getLinearBlockRect(knownRange.ref, e.currentTarget as HTMLElement | null);
    if (!blockRect) {
      return;
    }
    const currBase = this.calculateBaseLinear(e, knownRange, blockRect);
    this.storeLinearDragMeta(blockRect, knownRange);
    const clockwiseDrag = selection.start !== null && currBase >= (selection.start || 0);

    if (eventType === "mousedown" && currBase !== null) {
      this.activeViewer = "LINEAR";
      if (knownRange.scrollLinearOnSelect) {
        this.props.setCentralIndex("LINEAR", currBase);
      }
      // this is the start of a drag event
      this.setSelection({
        ...defaultSelection,
        clockwise: clockwiseDrag,
        end: currBase,
        start: e.shiftKey ? selection.start : currBase,
        type: "SEQ",
      });
      this.dragEvent = true;
    } else if (this.dragEvent && currBase !== null) {
      // continue a drag event that's currently happening
      this.setSelection({
        ...defaultSelection,
        clockwise: clockwiseDrag,
        end: currBase,
        start: selection.start,
        type: "SEQ",
      });
    }
  };

  /**
   * Handle a sequence selection event on the circular viewer
   */
  handleCircularSeqEvent = (e: SeqVizMouseEvent) => {
    const { seq, setCentralIndex } = this.props;
    const selection = this.context;
    const eventType = this.normalizeEventType(e.type);

    const { start } = selection;
    let { clockwise, end } = selection;

    const currBase = this.calculateBaseCircular(e);
    const seqLength = seq.length;

    if (eventType === "mousedown") {
      this.activeViewer = "CIRCULAR";
      const selStart = e.shiftKey ? start || 0 : currBase;
      const lookahead = e.shiftKey
        ? this.calcSelectionLength(selStart, currBase, false)
        : this.calcSelectionLength(selStart, currBase, true); // check clockwise selection length
      this.selectionStarted = lookahead > 0; // update check for whether there is a prior selection
      this.resetCircleDragVars(selStart); // begin drag event
      setCentralIndex?.("LINEAR", selStart);

      this.setSelection({
        ...defaultSelection,
        clockwise: clockwise,
        end: currBase,
        ref: "",
        start: selStart,
        type: "SEQ",
      });
    } else if (
      eventType === "mousemove" &&
      this.dragEvent &&
      currBase &&
      this.previousBase &&
      currBase !== this.previousBase
    ) {
      const increased = currBase > this.previousBase; // bases increased
      const changeThreshold = seqLength * 0.9; // threshold for unrealistic change by mouse movement
      const change = Math.abs(this.previousBase - currBase); // index change from this mouse movement
      const crossedZero = change > changeThreshold; // zero was crossed if base jumped more than changeThreshold
      this.forward = increased ? !crossedZero : crossedZero; // bases increased XOR crossed zero
      const lengthChange = crossedZero ? seqLength - change : change; // the change at the point where we cross zero has to be normalized by seqLength
      let sameDirectionMove = this.forward === selection.clockwise || selection.clockwise === null; // moving in same direction as start of drag or start of drag

      if (sameDirectionMove) {
        this.fullSelectionLength += lengthChange;
      } else {
        this.fullSelectionLength -= lengthChange;
      }

      this.previousBase = currBase; // done comparing with previous base, update previous base
      if (this.fullSelectionLength < seqLength * 0.01 && !this.shiftSelection) {
        clockwise = this.forward; // near selection start so selection direction is up for grabs
        const check = this.calcSelectionLength(selection.start || 0, currBase, this.forward); // check actual current selection length
        if (this.fullSelectionLength < 0) {
          // This is to correct for errors when dragging too fast
          this.fullSelectionLength = check;
        }
        if (check > this.fullSelectionLength) {
          // the actual selection length being greater than additive selection
          // length means we have come back to start and want to go in opposite direction
          clockwise = !this.forward;
        }
        end = currBase;
      }
      sameDirectionMove = this.forward === selection.clockwise; // recalculate this in case we've switched selection directionality

      // check the selection length, this is agnostic to the ALL reference and
      // will always calculate from where you cursor is to the start of selection
      const check = this.calcSelectionLength(selection.start || 0, currBase, selection.clockwise || true);

      if (this.selectionStarted && this.shiftSelection && check > this.fullSelectionLength) {
        this.fullSelectionLength = check; // shift select catch up
      }

      // there is an ongoing drag in the same direction as the direction the selection started in
      const sameDirectionDrag = this.dragEvent && sameDirectionMove;
      const fullSelection = false; // selection is full sequence

      // TODO: fix const fullSelection = currRef === "ALL"; // selection is full sequence
      const hitFullSelection = !fullSelection && this.fullSelectionLength >= seqLength; // selection became full sequence
      if (sameDirectionDrag && hitFullSelection) {
        end = start;
      } else if (fullSelection) {
        // this ensures that backtracking doesn't require making up to your overshoot forward circles
        this.fullSelectionLength = seqLength + (this.fullSelectionLength % seqLength);

        if (
          !sameDirectionDrag && // changed direction
          check === this.fullSelectionLength - seqLength && // back tracking
          check > seqLength * 0.9 // passed selection start
        ) {
          end = currBase; // start decreasing selection size due to backtracking

          // reset calculated additive selection length to normal now that we are not at ALL length
          this.fullSelectionLength = this.fullSelectionLength - seqLength;
        }
      } else {
        end = currBase; // nothing special just update the selection
      }
      this.shiftSelection = false;

      this.setSelection({
        ...defaultSelection,
        clockwise: clockwise,
        end: end,
        start: start,
        type: "SEQ",
      });
    }
  };

  /**
   * in a linear sequence viewer, given the bounding box of a component, the basepairs
   * by SeqBlock and the position of the mouse event, find the current base
   */
  calculateBaseLinear = (
    e: SeqVizMouseEvent,
    knownRange: { end: number; linearOffset?: number; linearWidth?: number; start: number },
    blockOverride?: DOMRect,
  ) => {
    const block = blockOverride ?? e.currentTarget.getBoundingClientRect();
    const offset = knownRange.linearOffset || 0;
    const width = knownRange.linearWidth || block.width;
    if (width <= 0) {
      return knownRange.start;
    }

    const leftBoundary = block.left + offset;
    const distFromLeft = e.clientX - leftBoundary;
    const clampedDist = Math.max(0, Math.min(distFromLeft, width));
    const ratioFromLeft = clampedDist / width;
    const basesInRange = Math.max(knownRange.end - knownRange.start, 1);
    const bpsFromLeft = Math.round(ratioFromLeft * basesInRange);

    return Math.min(knownRange.start + bpsFromLeft, knownRange.end);
  };

  /**
   * in a circular plasmid viewer, given the center of the viewer, and position of the
   * mouse event, find the currently hovered or clicked basepair
   */
  calculateBaseCircular = (e: SeqVizMouseEvent, blockOverride?: DOMRect | null) => {
    const { center, centralIndex, seq, yDiff } = this.props;

    if (!center) return 0;

    const block = blockOverride ?? e.currentTarget.getBoundingClientRect();

    // position on the plasmid viewer
    const distFromLeft = e.clientX - block.left;
    const distFromTop = e.clientY - block.top;

    // position relative to center
    const x = distFromLeft - center.x;
    const y = distFromTop - (center.y + (yDiff as number));

    const riseToRun = y / x;
    const posInRads = Math.atan(riseToRun);
    let posInDeg = posInRads * (180 / Math.PI) + 90; // convert and shift to vertical is 0
    if (x < 0) {
      posInDeg += 180; // left half of the viewer
    }
    const posInPerc = posInDeg / 360; // position as a percentage

    let currBase = Math.round(seq.length * posInPerc); // account for rotation of the viewer
    currBase += centralIndex as number;
    if (currBase > seq.length) {
      currBase -= seq.length;
    }
    return currBase;
  };

  /**
   * Update the selection in state. Only update the specified
   * properties of the selection that should be updated.
   */
  setSelection = (newSelection: Selection, meta?: SelectionEventMeta) => {
    const selection = this.context;
    const { setSelection } = this.props;

    if (
      newSelection.start === selection.start &&
      newSelection.end === selection.end &&
      newSelection.ref === selection.ref &&
      // to support re-clicking the annotation and causing it to fire a la gh issue https://github.com/Lattice-Automation/seqviz/issues/142
      ["SEQ", "AMINOACID", ""].includes(newSelection.type || "")
    ) {
      return;
    }
    const { clockwise, end, name, ref, start, type }: any = {
      ...selection,
      ...newSelection,
    };

    const length = this.calcSelectionLength(start, end, clockwise);
    const mergedSelection = {
      ...selection,
      ...newSelection,
      clockwise,
      end,
      length,
      name,
      ref,
      start,
      type,
    } as Selection;

    setSelection(mergedSelection, meta);

    if (meta && Object.prototype.hasOwnProperty.call(meta, "fragmentSelection")) {
      this.lastFragmentSelection = meta.fragmentSelection || null;
    } else {
      this.lastFragmentSelection = null;
    }

    if (!meta?.skipLastSelectionUpdate) {
      const normalized = this.normalizeSelection(mergedSelection);
      this.lastSelection = { ...normalized };
    }
  };

  /**
   * Check what the length of the selection is in circle drag select
   */
  calcSelectionLength = (start: number, base: number, clock: boolean | null) => {
    const { seq } = this.props;
    if (base < start && !clock) {
      return start - base;
    }
    if (base > start && !clock) {
      return start + (seq.length - base);
    }
    if (base > start && clock) {
      return base - start;
    }
    if (base < start && clock) {
      return seq.length - start + base;
    }
    return 0;
  };

  render() {
    return this.props.children(
      this.inputRef,
      this.mouseEvent,
      this.removeMountedBlock,
      this.handleContextMenu,
      this.handleDoubleClick,
    );
  }
}
