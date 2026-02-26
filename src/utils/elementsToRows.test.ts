import { CutSite, NameRange } from "../core/elements";
import { randomID } from "../core/sequence";
import { createCutSiteRows, stackElements } from "./elementsToRows";

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

  it("bins cut sites by cut coordinates even when recognition site is in another block", () => {
    const cutSite: CutSite = {
      direction: 1,
      end: 20,
      enzyme: { fcut: 15, name: "BaeI", rcut: 18, rseq: "NNNN" },
      fcut: 29,
      id: "cut-1",
      name: "BaeI",
      rcut: 31,
      start: 16,
    };

    const rows = createCutSiteRows([cutSite], 25, 3);

    expect(rows[0]).toHaveLength(1);
    expect(rows[1]).toHaveLength(1);
    expect(rows[1][0]).toBe(cutSite);
  });
});
