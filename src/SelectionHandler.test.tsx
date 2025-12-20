import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
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
      </SelectionContext.Provider>
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
      </SelectionContext.Provider>
    );

    const aa = screen.getByTestId("aa");
    fireEvent.mouseDown(aa, { button: 0, clientX: 10, clientY: 10 });

    expect(setSelection).toHaveBeenCalled();
    const lastCall = setSelection.mock.calls[setSelection.mock.calls.length - 1]?.[0];
    expect(lastCall).toMatchObject({ start: 30, end: 33, length: 3, type: "AMINOACID" });
  });
});
