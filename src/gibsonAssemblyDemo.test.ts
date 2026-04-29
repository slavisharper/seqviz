import seqparse from "seqparse";

import file from "../demo/lib/file";
import { buildGibsonAssemblyPreset } from "../demo/lib/gibsonAssembly";

const boundaryCutsFeature = (index: number, annotations: Array<{ start: number; end: number }>) =>
  annotations.some(annotation => index > annotation.start && index < annotation.end);

const rangeContains = (range: { start: number; end: number }, index: number) => {
  if (range.start <= range.end) {
    return index >= range.start && index <= range.end;
  }

  return index >= range.start || index <= range.end;
};

const DNA_COMPLEMENT: Record<string, string> = {
  A: "T",
  C: "G",
  G: "C",
  T: "A",
};

const reverseComplement = (seq: string) =>
  seq
    .toUpperCase()
    .split("")
    .reverse()
    .map(base => DNA_COMPLEMENT[base] || "N")
    .join("");

describe("buildGibsonAssemblyPreset", () => {
  it("keeps fragment boundaries out of annotated features, keeps fragments non-overlapping, and aligns dividers to joins", async () => {
    const parsed = await seqparse(file);
    const { annotations, fragments, primers, separators, seq } = buildGibsonAssemblyPreset(
      parsed.seq,
      parsed.annotations,
    );

    expect(seq.length).toBeGreaterThan(parsed.seq.length);
    expect(fragments).toHaveLength(4);
    expect(primers).toHaveLength(8);
    expect(separators).toHaveLength(4);

    primers.forEach(primer => {
      expect(primer.tail).toBeDefined();
      expect(primer.tail?.length).toBeGreaterThan(0);
    });

    fragments.forEach(fragment => {
      expect(boundaryCutsFeature(fragment.start, annotations)).toBe(false);
      expect(boundaryCutsFeature(fragment.end, annotations)).toBe(false);

      const fragmentPrimers = primers.filter(primer => primer.id?.startsWith(fragment.id || ""));
      expect(fragmentPrimers).toHaveLength(2);
    });

    const normalizedFragments = fragments.map(fragment => ({
      start: fragment.start,
      end: fragment.end < fragment.start ? fragment.end + parsed.seq.length : fragment.end,
    }));

    const sortedFragments = normalizedFragments.sort((a, b) => a.start - b.start);
    for (let i = 1; i < sortedFragments.length; i += 1) {
      expect(sortedFragments[i].start).toBeGreaterThanOrEqual(sortedFragments[i - 1].end);
    }

    const forwardTails = fragments.map(fragment => {
      const forwardPrimer = primers.find(primer => primer.id === `${fragment.id}-fwd`);
      expect(forwardPrimer?.tail).toBeDefined();
      return forwardPrimer?.tail || "";
    });

    fragments.forEach((fragment, index) => {
      const reversePrimer = primers.find(primer => primer.id === `${fragment.id}-rev`);
      expect(reversePrimer?.tail).toBeDefined();

      const nextForwardTail = forwardTails[(index + 1) % forwardTails.length];
      expect(reversePrimer?.tail).toBe(reverseComplement(nextForwardTail));
    });

    separators.forEach(separator => {
      const touchingFragments = fragments.filter(
        fragment => fragment.start === separator.index || fragment.end === separator.index,
      );
      expect(touchingFragments.length).toBeGreaterThanOrEqual(2);

      const coveringFragments = fragments.filter(fragment => rangeContains(fragment, separator.index));
      expect(coveringFragments.length).toBeLessThanOrEqual(2);
    });
  });
});
