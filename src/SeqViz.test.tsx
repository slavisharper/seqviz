import SeqViz, { type SeqVizProps } from "./SeqViz";
import type { SeparatorProp } from "./core/elements";

describe("SeqViz segments", () => {
  const baseProps: Pick<SeqVizProps, "annotations" | "primers"> = {
    annotations: [],
    primers: [],
  };

  it("normalizes indices and preserves complement pairs", () => {
    const seq = "ATGCAT";
    const component = new SeqViz({ ...baseProps, seq });
    const rawSeparators: SeparatorProp[] = [
      { name: "PstI", index: -2, complementIndex: 4, color: "#ff0000" },
      { name: "EcoRI", index: 6 },
    ];

    const parsed = component.parseSeparators(rawSeparators, seq);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].index).toBe(seq.length - 2);
    expect(parsed[0].complementIndex).toBe(4);
    expect(parsed[0].color).toBe("#ff0000");
    expect(parsed[0].order).toBe(1);
    expect(parsed[1].index).toBe(0);
    expect(parsed[1].complementIndex).toBeUndefined();
    expect(parsed[1].order).toBe(2);
  });

  it("returns an empty array when there is no sequence to project", () => {
    const component = new SeqViz({ ...baseProps, seq: "" });
    const parsed = component.parseSeparators([{ name: "Empty", index: 0 }], "");
    expect(parsed).toEqual([]);
  });
});
