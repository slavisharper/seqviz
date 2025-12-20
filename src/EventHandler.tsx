import * as React from "react";

import CentralIndexContext from "./state/centralIndexContext";
import debounce from "./utils/debounce";
import { Selection } from "./state/selectionContext";

type ViewerPanelType = "CIRCULAR" | "LINEAR" | "LINEAR_MAP";

type PointerMeta = {
  viewer: ViewerPanelType | null;
  x: number;
  y: number;
};

interface PinchSession {
  baseZoom: number;
  initialDistance: number;
  lastScale: number;
  pointerIds: [number, number];
  viewer: ViewerPanelType;
}

export interface EventsHandlerProps {
  bpsPerBlock: number;
  children: React.ReactNode;
  copyEvent: (e: React.KeyboardEvent<HTMLElement>) => boolean;
  getZoomLevel?: (viewer: "CIRCULAR" | "LINEAR" | "LINEAR_MAP") => number;
  handleMouseEvent: (e: any) => void;
  onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onPinchZoom?: (viewer: "CIRCULAR" | "LINEAR" | "LINEAR_MAP", nextZoom: number) => void;
  selectAllEvent: (e: React.KeyboardEvent<HTMLElement>) => boolean;
  selection: Selection;
  seq: string;
  setSelection: (selection: Selection) => void;
}

/**
 * EventHandler handles the routing of all events, including keypresses, mouse clicks, etc.
 */
export class EventHandler extends React.PureComponent<EventsHandlerProps> {
  static contextType = CentralIndexContext;
  static context: React.ContextType<typeof CentralIndexContext>;
  declare context: React.ContextType<typeof CentralIndexContext>;

  clickedOnce: EventTarget | null = null;
  clickedTwice: EventTarget | null = null;

  private pointerPositions = new Map<number, PointerMeta>();
  private pinchSession: PinchSession | null = null;
  private lastTap = { time: 0, x: 0, y: 0, target: null as EventTarget | null };
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressPointerId: number | null = null;
  private longPressMeta: { x: number; y: number; target: EventTarget | null } | null = null;
  private longPressTriggered = false;

  /**
   * action handler for a keyboard keypresses.
   */
  handleKeyPress = (e: React.KeyboardEvent<HTMLElement>) => {
    const keyType = this.keypressMap(e);
    if (!keyType) {
      return; // not recognized key
    }
    e.preventDefault();
    this.handleSeqInteraction(keyType);
  };

  /**
   * maps a keypress to an interaction (String)
   *
   * ["All", "Copy", "Up", "Right", "Down", "Left"]
   */
  keypressMap = (e: React.KeyboardEvent<HTMLElement>) => {
    const { copyEvent, selectAllEvent } = this.props;

    if (copyEvent && copyEvent(e)) {
      return "Copy";
    }

    if (selectAllEvent && selectAllEvent(e)) {
      return "SelectAll";
    }

    const { key, shiftKey } = e;
    switch (key) {
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
      case "ArrowDown":
        return shiftKey ? `Shift${key}` : key;
      default:
        return null;
    }
  };

  /**
   * Respond to any of:
   * 	All: cmd + A, select all
   * 	Copy: cmd + C, copy
   * 	Up, Right, Down, Left: some directional movement of the cursor
   */
  handleSeqInteraction = async type => {
    const { seq } = this.props;
    const seqLength = seq.length;
    const bpsPerBlock = this.props.bpsPerBlock || 1;

    switch (type) {
      case "SelectAll": {
        this.selectAllHotkey();
        break;
      }
      case "Copy": {
        this.handleCopy();
        break;
      }
      case "ArrowUp":
      case "ArrowRight":
      case "ArrowDown":
      case "ArrowLeft":
      case "ShiftArrowUp":
      case "ShiftArrowRight":
      case "ShiftArrowDown":
      case "ShiftArrowLeft": {
        const { selection, setSelection } = this.props;
        const { end, start } = selection;

        if (typeof start === "undefined" || typeof end === "undefined") {
          return;
        }

        let { clockwise } = selection;
        let newPos = end;
        if (type === "ArrowUp" || type === "ShiftArrowUp") {
          // if there are multiple blocks or just one. If one, just inc by one
          if (seqLength / bpsPerBlock > 1) {
            newPos -= bpsPerBlock;
          } else {
            newPos -= 1;
          }
        } else if (type === "ArrowRight" || type === "ShiftArrowRight") {
          newPos += 1;
        } else if (type === "ArrowDown" || type === "ShiftArrowDown") {
          // if there are multiple blocks or just one. If one, just inc by one
          if (seqLength / bpsPerBlock > 1) {
            newPos += bpsPerBlock;
          } else {
            newPos += 1;
          }
        } else if (type === "ArrowLeft" || type === "ShiftArrowLeft") {
          newPos -= 1;
        }

        if (newPos <= -1) {
          newPos = seqLength + newPos;
        }
        if (newPos >= seqLength + 1) {
          newPos -= seqLength;
        }
        const selLength = Math.abs(start - end);
        clockwise =
          selLength === 0
            ? type === "ArrowRight" || type === "ShiftArrowRight" || type === "ArrowDown" || type === "ShiftArrowDown"
            : clockwise;
        if (newPos !== start && !type.startsWith("Shift")) {
          setSelection({
            clockwise: true,
            end: newPos,
            start: newPos,
            type: "SEQ",
          });
        } else if (type.startsWith("Shift")) {
          setSelection({
            clockwise: clockwise,
            end: newPos,
            start: start,
            type: "SEQ",
          });
        }
        break;
      }
      default: {
        break;
      }
    }
  };

  /**
   * Copy the current sequence selection to the user's clipboard
   */
  handleCopy = () => {
    const {
      selection: { end, ref, start },
      seq,
    } = this.props;

    if (!document) return;

    const formerFocus = document.activeElement;
    const tempNode = document.createElement("textarea");
    if (ref === "ALL") {
      tempNode.innerText = seq;
    } else {
      tempNode.innerText = seq.substring(start || 0, end);
    }
    if (document.body) {
      document.body.appendChild(tempNode);
    }
    tempNode.select();
    document.execCommand("copy");
    tempNode.remove();
    if (formerFocus) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'focus' does not exist on type 'Element'.
      formerFocus.focus();
    }
  };

  /**
   * select all of the sequence
   */
  selectAllHotkey = () => {
    const { selection, seq, setSelection } = this.props;

    const newSelection = {
      ...selection,
      clockwise: true,
      end: seq.length,
      start: 0,
    };

    setSelection(newSelection);
  };

  handleTripleClick = () => {
    this.selectAllHotkey();
  };

  resetClicked = debounce(() => {
    this.clickedOnce = null;
    this.clickedTwice = null;
  }, 250);

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

  private getViewerTypeFromTarget = (target: EventTarget | null): ViewerPanelType | null => {
    let element = target as HTMLElement | null;
    while (element) {
      const viewerType = element.getAttribute?.("data-viewer-type");
      if (viewerType === "CIRCULAR" || viewerType === "LINEAR" || viewerType === "LINEAR_MAP") {
        return viewerType;
      }
      element = element.parentElement;
    }
    return null;
  };

  private storePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    this.pointerPositions.set(e.pointerId, {
      viewer: this.getViewerTypeFromTarget(e.target),
      x: e.clientX,
      y: e.clientY,
    });
  };

  private updatePointerPosition = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!this.pointerPositions.has(e.pointerId)) {
      this.storePointer(e);
      return;
    }
    const existing = this.pointerPositions.get(e.pointerId);
    if (existing) {
      existing.x = e.clientX;
      existing.y = e.clientY;
    }
  };

  private distanceBetween = (a: PointerMeta, b: PointerMeta) => Math.hypot(a.x - b.x, a.y - b.y);

  private tryStartPinch = () => {
    if (this.pointerPositions.size < 2 || this.pinchSession) return;
    const pointers = Array.from(this.pointerPositions.entries());
    const first = pointers[pointers.length - 1];
    const second = pointers[pointers.length - 2];
    if (!first || !second) return;
    const viewer = first[1].viewer && first[1].viewer === second[1].viewer ? first[1].viewer : null;
    if (!viewer) return;
    const distance = this.distanceBetween(first[1], second[1]);
    if (distance < 20) return;
    const baseZoom = this.props.getZoomLevel ? this.props.getZoomLevel(viewer) : undefined;
    if (typeof baseZoom !== "number") return;
    this.cancelLongPress();
    this.pinchSession = {
      baseZoom,
      initialDistance: distance,
      lastScale: 1,
      pointerIds: [first[0], second[0]],
      viewer,
    };
  };

  private handlePinchMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!this.pinchSession) return;
    const [firstId, secondId] = this.pinchSession.pointerIds;
    const first = this.pointerPositions.get(firstId);
    const second = this.pointerPositions.get(secondId);
    if (!first || !second) return;
    const distance = this.distanceBetween(first, second);
    if (distance <= 0) return;
    const scale = distance / this.pinchSession.initialDistance;
    if (Math.abs(scale - this.pinchSession.lastScale) < 0.01) return;
    const targetZoom = this.pinchSession.baseZoom + (scale - 1) * 100;
    this.props.onPinchZoom?.(this.pinchSession.viewer, targetZoom);
    this.pinchSession.lastScale = scale;
    e.preventDefault();
  };

  private endPinch = () => {
    this.pinchSession = null;
  };

  private startLongPress = (e: React.PointerEvent<HTMLDivElement>) => {
    this.cancelLongPress();
    this.longPressPointerId = e.pointerId;
    this.longPressTriggered = false;
    this.longPressMeta = { x: e.clientX, y: e.clientY, target: e.target };
    this.longPressTimer = setTimeout(() => {
      if (!this.longPressMeta) return;
      this.longPressTriggered = true;
      this.dispatchSyntheticDomEvent(this.longPressMeta.target, "contextmenu", this.longPressMeta.x, this.longPressMeta.y);
      this.cancelLongPress();
    }, 600);
  };

  private cancelLongPress = () => {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.longPressPointerId = null;
    this.longPressMeta = null;
  };

  private maybeCancelLongPress = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!this.longPressMeta || this.longPressPointerId !== e.pointerId) return;
    const distance = Math.hypot(e.clientX - this.longPressMeta.x, e.clientY - this.longPressMeta.y);
    if (distance > 12) {
      this.cancelLongPress();
    }
  };

  private handleDoubleTapDetection = (e: React.PointerEvent<HTMLDivElement>) => {
    const now = Date.now();
    const distance = Math.hypot(e.clientX - this.lastTap.x, e.clientY - this.lastTap.y);
    if (this.lastTap.target === e.target && now - this.lastTap.time < 350 && distance < 20) {
      this.dispatchSyntheticDomEvent(e.target, "dblclick", e.clientX, e.clientY);
      this.lastTap = { time: 0, x: 0, y: 0, target: null };
      return;
    }
    this.lastTap = { time: now, x: e.clientX, y: e.clientY, target: e.target };
  };

  private dispatchSyntheticDomEvent = (target: EventTarget | null, type: "contextmenu" | "dblclick", x: number, y: number) => {
    const element = target as HTMLElement | null;
    if (!element) return;
    const synthetic = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
    });
    element.dispatchEvent(synthetic);
  };

  /**
   * if the contextMenu button is clicked, check whether it was clicked
   * over a noteworthy element, for which db mutations have been written.
   *
   * if it is, mutate the contextMenu to account for those potential interactions
   * and pass on the click. Otherwise, do nothing
   *
   * if it is a regular click, pass on as normal
   */
  handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      this.startLongPress(e);
    }
    this.storePointer(e);
    if (e.pointerType === "touch") {
      this.tryStartPinch();
    }
    this.handleMouseEvent(e);
  };

  handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    this.updatePointerPosition(e);
    if (this.pinchSession && this.pinchSession.pointerIds.includes(e.pointerId)) {
      this.handlePinchMove(e);
      return;
    }
    if (e.pointerType === "touch") {
      this.maybeCancelLongPress(e);
    }
    this.props.handleMouseEvent(e);
  };

  handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (this.pinchSession && this.pinchSession.pointerIds.includes(e.pointerId)) {
      this.endPinch();
    }
    if (e.pointerType === "touch") {
      const longPressTriggered = this.longPressTriggered;
      if (!longPressTriggered) {
        this.handleDoubleTapDetection(e);
      }
      this.cancelLongPress();
      this.longPressTriggered = false;
    }
    this.pointerPositions.delete(e.pointerId);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    this.handleMouseEvent(e);
  };

  handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (this.pinchSession && this.pinchSession.pointerIds.includes(e.pointerId)) {
      this.endPinch();
    }
    this.pointerPositions.delete(e.pointerId);
    this.cancelLongPress();
    this.longPressTriggered = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  handleMouseEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const { handleMouseEvent } = this.props;
    const normalizedType = this.normalizeEventType(e.type);

    if (normalizedType === "mouseup") {
      this.resetClicked();
      if (this.clickedOnce === e.target && this.clickedTwice === e.target) {
        this.handleTripleClick();
        this.resetClicked();
      } else if (this.clickedOnce === e.target && this.clickedTwice === null) {
        this.clickedOnce = e.target;
        this.clickedTwice = e.target;
        this.resetClicked();
      } else {
        this.clickedOnce = e.target;
        this.resetClicked();
      }
    }
    const { button, ctrlKey } = e;
    const ctxMenuClick = normalizedType === "mousedown" && button === 0 && ctrlKey;

    if (e.button === 0 && !ctxMenuClick) {
      // it's a mouse drag event or an element was clicked
      handleMouseEvent(e);
    }
  };

  render = () => (
    <div
      className="la-vz-viewer-event-router"
      id="la-vz-event-router"
      role="presentation"
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100%",
        outline: "none",
        position: "absolute",
        touchAction: "manipulation",
        width: "100%",
      }}
      tabIndex={-1}
      onKeyDown={this.handleKeyPress}
      onPointerDown={this.handlePointerDown}
      onPointerMove={this.handlePointerMove}
      onPointerUp={this.handlePointerUp}
      onPointerCancel={this.handlePointerCancel}
      onContextMenu={this.props.onContextMenu}
      onDoubleClick={this.props.onDoubleClick}
    >
      {this.props.children}
    </div>
  );
}
