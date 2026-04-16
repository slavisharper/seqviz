import React from "react";
import { createRoot } from "react-dom/client";
import seqparse from "seqparse";

import App from "./App";
import { buildGibsonAssemblyPreset } from "./gibsonAssembly";
import file from "./file";

it("renders without crashing", () => {
  const div = document.createElement("div");
  const root = createRoot(div);

  root.render(<App />);
  root.unmount();
});

const boundaryCutsFeature = (index, annotations) => annotations.some(annotation => index > annotation.start && index < annotation.end);

const rangeContains = (range, index) => {
  if (range.start <= range.end) {
    return index >= range.start && index <= range.end;
  }

  return index >= range.start || index <= range.end;
};

it("builds Gibson fragments in feature-safe gaps with divider lines inside overlaps", async () => {
  const parsed = await seqparse(file);
  const { fragments, separators } = buildGibsonAssemblyPreset(parsed.seq);

  fragments.forEach(fragment => {
    expect(boundaryCutsFeature(fragment.start, parsed.annotations)).toBe(false);
    expect(boundaryCutsFeature(fragment.end, parsed.annotations)).toBe(false);
  });

  separators.forEach(separator => {
    const coveringFragments = fragments.filter(fragment => rangeContains(fragment, separator.index));
    expect(coveringFragments.length).toBeGreaterThanOrEqual(2);
  });
});
