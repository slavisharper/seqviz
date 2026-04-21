import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";

import * as React from "react";

import SelectionHandler from "./SelectionHandler";
import SelectionContext, { Selection, defaultSelection } from "./state/selectionContext";

const mockRect = () => ({
  bottom: 40,
  height: 40,
  left: 0,
  right: 400,
  top: 0,
  width: 400,
  x: 0,
  y: 0,
  toJSON: () => ({}),
});

describe("SelectionHandler dataset fallback", () => {
  it("derives selection metadata from dataset when ref map is empty", () => {
    const setSelection = jest.fn();

    render(
      <SelectionContext.Provider value={defaultSelection as Selection}>
        <SelectionHandler
          center={{ x: 0, y: 0 }}
          centralIndex={0}
          seq={"A".repeat(400)}
          setCentralIndex={() => {}}
          setSelection={setSelection}
          yDiff={0}
        >
          {(_, handleMouseEvent) => (
            <svg
              data-selection-end="400"
              data-selection-start="0"
              data-selection-type="SEQ"
              data-selection-viewer="LINEAR"
              data-testid="mock-seq-block"
              id="mock-block"
              onMouseDown={handleMouseEvent as unknown as React.MouseEventHandler<SVGSVGElement>}
              onMouseMove={handleMouseEvent as unknown as React.MouseEventHandler<SVGSVGElement>}
              onMouseUp={handleMouseEvent as unknown as React.MouseEventHandler<SVGSVGElement>}
            />
          )}
        </SelectionHandler>
      </SelectionContext.Provider>,
    );

    const block = screen.getByTestId("mock-seq-block");
    Object.defineProperty(block, "getBoundingClientRect", {
      configurable: true,
      value: mockRect,
    });

    fireEvent.mouseDown(block, { buttons: 1, clientX: 20, clientY: 5 });
    fireEvent.mouseMove(block, { buttons: 1, clientX: 200, clientY: 5 });
    fireEvent.mouseUp(block, { buttons: 1, clientX: 200, clientY: 5 });

    expect(setSelection).toHaveBeenCalled();
    const lastCall = setSelection.mock.calls[setSelection.mock.calls.length - 1]?.[0];
    expect(lastCall).toMatchObject({ type: "SEQ" });
    expect(typeof lastCall?.start).toBe("number");
    expect(typeof lastCall?.end).toBe("number");
  });
});

describe("SelectionHandler amino acid selection", () => {
  it("selects full codon when an amino acid is clicked", () => {
    const setSelection = jest.fn();

    render(
      <SelectionContext.Provider value={defaultSelection as Selection}>
        <SelectionHandler
          center={{ x: 0, y: 0 }}
          centralIndex={0}
          seq={"A".repeat(200)}
          setCentralIndex={() => {}}
          setSelection={setSelection}
          yDiff={0}
        >
          {(inputRef, handleMouseEvent) => (
            <svg>
              <g
                data-testid="aa"
                id="aa"
                ref={node =>
                  node &&
                  inputRef("aa", {
                    end: 33,
                    parent: { end: 60, start: 30, type: "TRANSLATION", viewer: "LINEAR" },
                    start: 30,
                    type: "AMINOACID",
                    viewer: "LINEAR",
                  })
                }
                onMouseDown={handleMouseEvent as unknown as React.MouseEventHandler<SVGGElement>}
                onMouseMove={handleMouseEvent as unknown as React.MouseEventHandler<SVGGElement>}
                onMouseUp={handleMouseEvent as unknown as React.MouseEventHandler<SVGGElement>}
              />
            </svg>
          )}
        </SelectionHandler>
      </SelectionContext.Provider>,
    );

    const aa = screen.getByTestId("aa");
    fireEvent.mouseDown(aa, { button: 0, clientX: 10, clientY: 10 });

    expect(setSelection).toHaveBeenCalled();
    const lastCall = setSelection.mock.calls[setSelection.mock.calls.length - 1]?.[0];
    expect(lastCall).toMatchObject({ start: 30, end: 33, length: 3, type: "AMINOACID" });
  });
});

describe("SelectionHandler context menu enzyme selection", () => {
  it("keeps enzyme selection orientation consistent when direction is 0 in ref metadata", () => {
    const setSelection = jest.fn();
    const onContextMenu = jest.fn();

    render(
      <SelectionContext.Provider value={defaultSelection as Selection}>
        <SelectionHandler
          center={{ x: 0, y: 0 }}
          centralIndex={0}
          onContextMenu={onContextMenu}
          seq={"A".repeat(200)}
          setCentralIndex={() => {}}
          setSelection={setSelection}
          yDiff={0}
        >
          {(inputRef, _handleMouseEvent, _onUnmount, handleContextMenu) => (
            <svg>
              <g
                data-testid="enzyme-context-target"
                id="enzyme-context-target"
                ref={node =>
                  node &&
                  inputRef("enzyme-context-target", {
                    direction: 0,
                    end: 20,
                    start: 10,
                    type: "ENZYME",
                    viewer: "LINEAR",
                  })
                }
                onContextMenu={handleContextMenu as unknown as React.MouseEventHandler<SVGGElement>}
              />
            </svg>
          )}
        </SelectionHandler>
      </SelectionContext.Provider>,
    );

    const enzymeTarget = screen.getByTestId("enzyme-context-target");
    fireEvent.contextMenu(enzymeTarget, { button: 2, clientX: 12, clientY: 12 });

    expect(onContextMenu).toHaveBeenCalledTimes(1);
    const payload = onContextMenu.mock.calls[0]?.[0];
    expect(payload.selection).toMatchObject({
      clockwise: true,
      end: 20,
      start: 10,
      type: "ENZYME",
    });
    expect(payload.type).toBe("ENZYME");
  });

  it("preserves an existing fragment selection when right-click is inside the current selection", () => {
    const setSelection = jest.fn();
    const onContextMenu = jest.fn();
    const existingSelection: Selection = {
      ...defaultSelection,
      end: 90,
      length: 40,
      ref: "existing-selection",
      start: 50,
      type: "SEQ",
      viewer: "LINEAR",
    };
    const fragmentSelection = {
      firstSelection: { start: 50, end: 70, type: "SEQ" as const },
      secondSelection: { start: 70, end: 90, type: "SEQ" as const },
    };
    const handlerRef = React.createRef<SelectionHandler>();

    render(
      <SelectionContext.Provider value={existingSelection}>
        <SelectionHandler
          ref={handlerRef}
          center={{ x: 0, y: 0 }}
          centralIndex={0}
          onContextMenu={onContextMenu}
          seq={"A".repeat(200)}
          setCentralIndex={() => {}}
          setSelection={setSelection}
          yDiff={0}
        >
          {(_inputRef, _handleMouseEvent, _onUnmount, handleContextMenu) => (
            <div
              data-selection-end="200"
              data-selection-linear-offset="0"
              data-selection-linear-width="400"
              data-selection-start="0"
              data-selection-type="SEQ"
              data-selection-viewer="LINEAR"
              data-testid="seq-context-target"
              id="seq-context-target"
              onContextMenu={handleContextMenu as unknown as React.MouseEventHandler<HTMLDivElement>}
            />
          )}
        </SelectionHandler>
      </SelectionContext.Provider>,
    );

    act(() => {
      (handlerRef.current as unknown as { setSelection: typeof SelectionHandler.prototype.setSelection }).setSelection(
        existingSelection,
        {
          fragmentSelection,
          skipLastSelectionUpdate: true,
        },
      );
    });
    setSelection.mockClear();

    const target = screen.getByTestId("seq-context-target");
    Object.defineProperty(target, "getBoundingClientRect", {
      configurable: true,
      value: mockRect,
    });

    // clientX=140 on a 400px block covering [0,200] => base 70, which is inside [50,90]
    fireEvent.contextMenu(target, { button: 2, clientX: 140, clientY: 10 });

    expect(onContextMenu).toHaveBeenCalledTimes(1);
    expect(setSelection).not.toHaveBeenCalled();
    const payload = onContextMenu.mock.calls[0]?.[0];
    expect(payload.selection).toMatchObject({
      end: 90,
      start: 50,
      type: "SEQ",
      viewer: "LINEAR",
    });
    expect(payload.fragmentSelection).toEqual(fragmentSelection);
  });

  it("makes a new selection and clears fragment when right-click is outside the current selection", () => {
    const setSelection = jest.fn();
    const onContextMenu = jest.fn();
    const existingSelection: Selection = {
      ...defaultSelection,
      end: 90,
      length: 40,
      ref: "existing-selection",
      start: 50,
      type: "SEQ",
      viewer: "LINEAR",
    };
    const fragmentSelection = {
      firstSelection: { start: 50, end: 70, type: "SEQ" as const },
      secondSelection: { start: 70, end: 90, type: "SEQ" as const },
    };
    const handlerRef = React.createRef<SelectionHandler>();

    render(
      <SelectionContext.Provider value={existingSelection}>
        <SelectionHandler
          ref={handlerRef}
          center={{ x: 0, y: 0 }}
          centralIndex={0}
          onContextMenu={onContextMenu}
          seq={"A".repeat(200)}
          setCentralIndex={() => {}}
          setSelection={setSelection}
          yDiff={0}
        >
          {(_inputRef, _handleMouseEvent, _onUnmount, handleContextMenu) => (
            <div
              data-selection-end="200"
              data-selection-linear-offset="0"
              data-selection-linear-width="400"
              data-selection-start="0"
              data-selection-type="SEQ"
              data-selection-viewer="LINEAR"
              data-testid="seq-context-target-outside"
              id="seq-context-target-outside"
              onContextMenu={handleContextMenu as unknown as React.MouseEventHandler<HTMLDivElement>}
            />
          )}
        </SelectionHandler>
      </SelectionContext.Provider>,
    );

    act(() => {
      (handlerRef.current as unknown as { setSelection: typeof SelectionHandler.prototype.setSelection }).setSelection(
        existingSelection,
        {
          fragmentSelection,
          skipLastSelectionUpdate: true,
        },
      );
    });
    setSelection.mockClear();

    const target = screen.getByTestId("seq-context-target-outside");
    Object.defineProperty(target, "getBoundingClientRect", {
      configurable: true,
      value: mockRect,
    });

    // clientX=20 on a 400px block covering [0,200] => base 10, which is outside [50,90]
    fireEvent.contextMenu(target, { button: 2, clientX: 20, clientY: 10 });

    expect(onContextMenu).toHaveBeenCalledTimes(1);
    expect(setSelection).toHaveBeenCalledTimes(1);
    const newSel = setSelection.mock.calls[0]?.[0];
    expect(newSel.start).toBe(10);
    expect(newSel.end).toBe(10);
    const payload = onContextMenu.mock.calls[0]?.[0];
    expect(payload.fragmentSelection).toBeUndefined();
  });
});
