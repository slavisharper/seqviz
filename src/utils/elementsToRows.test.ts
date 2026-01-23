import { NameRange } from "../core/elements";
import { randomID } from "../core/sequence";
import { stackElements } from "./elementsToRows";

describe("Elements to rows", () => {
  // https://github.com/Lattice-Automation/seqviz/issues/201
  it("order consistent", () => {
    const elements: NameRange[] = [
      {
        direction: 1,
        end: 12,
        id: randomID(),
        name: "promoter",
        start: 9,
      },
      {
        direction: 1,
        end: 6,
        id: randomID(),
        name: "promoter",
        start: 3,
      },
      {
        direction: 1,
        end: 3,
        id: randomID(),
        name: "promoter",
        start: 0,
      },
    ];

    const rows = stackElements(elements, 100);

    expect(rows).toHaveLength(1);
    expect(rows).toEqual(stackElements(elements.reverse(), 100));
  });

  it("keeps adjacent fragments in the same row", () => {
    const fragments: NameRange[] = [
      {
        direction: 1,
        end: 775,
        id: "fragment-a",
        name: "Fragment A",
        start: 56,
      },
      {
        direction: 1,
        end: 56,
        id: "fragment-b",
        name: "Fragment B",
        start: 775,
      },
    ];

    const rows = stackElements(fragments, 2500);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(2);
  });
});
