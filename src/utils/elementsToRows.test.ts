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
});
