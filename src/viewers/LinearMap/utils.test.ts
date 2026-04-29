import { computeLinearMapZoomFactor, computeVisibleBp } from "./utils";

describe("computeLinearMapZoomFactor", () => {
  it("z=0 returns 1x regardless of sequence length", () => {
    expect(computeLinearMapZoomFactor(0, 100)).toBeCloseTo(1, 5);
    expect(computeLinearMapZoomFactor(0, 10000)).toBeCloseTo(1, 5);
    expect(computeLinearMapZoomFactor(0, 1)).toBeCloseTo(1, 5);
  });

  it("z=100 returns at least 8x for short sequences", () => {
    expect(computeLinearMapZoomFactor(100, 100)).toBeCloseTo(8, 5);
    expect(computeLinearMapZoomFactor(100, 500)).toBeCloseTo(8, 5);
  });

  it("z=100 returns approximately seqLength/100 for long sequences", () => {
    const seqLength = 10000;
    const factor = computeLinearMapZoomFactor(100, seqLength);
    expect(factor).toBeCloseTo(seqLength / 100, 0);
  });

  it("z=100 for seqLength=10000 gives factor ~100", () => {
    expect(computeLinearMapZoomFactor(100, 10000)).toBeCloseTo(100, 1);
  });

  it("zoomFactor is monotonically increasing with z", () => {
    const seqLength = 5000;
    let prev = computeLinearMapZoomFactor(0, seqLength);
    for (let z = 1; z <= 100; z++) {
      const curr = computeLinearMapZoomFactor(z, seqLength);
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });

  it("clamps zoom below 0 to 1x", () => {
    expect(computeLinearMapZoomFactor(-10, 5000)).toBeCloseTo(1, 5);
  });

  it("clamps zoom above 100 to maxFactor", () => {
    const f100 = computeLinearMapZoomFactor(100, 5000);
    const f150 = computeLinearMapZoomFactor(150, 5000);
    expect(f150).toBeCloseTo(f100, 5);
  });
});

describe("computeVisibleBp", () => {
  it("visible bp decreases as zoom factor increases", () => {
    const seqLength = 10000;
    const viewWidth = 800;
    const mapWidthBase = 760;
    let prevBp = computeVisibleBp(computeLinearMapZoomFactor(0, seqLength), seqLength, viewWidth, mapWidthBase);
    for (let z = 10; z <= 100; z += 10) {
      const factor = computeLinearMapZoomFactor(z, seqLength);
      const currBp = computeVisibleBp(factor, seqLength, viewWidth, mapWidthBase);
      expect(currBp).toBeLessThanOrEqual(prevBp);
      prevBp = currBp;
    }
  });

  it("at max zoom (z=100), long sequence shows approximately 100bp in viewport", () => {
    const seqLength = 10000;
    const mapWidthBase = 760;
    const viewWidth = 760; // viewport same as map base width
    const factor = computeLinearMapZoomFactor(100, seqLength);
    const visibleBp = computeVisibleBp(factor, seqLength, viewWidth, mapWidthBase);
    // Should be close to 100bp
    expect(visibleBp).toBeGreaterThanOrEqual(90);
    expect(visibleBp).toBeLessThanOrEqual(110);
  });

  it("returns seqLength for zoomFactor=0 (degenerate case)", () => {
    expect(computeVisibleBp(0, 5000, 800, 760)).toBe(5000);
  });

  it("returns seqLength for mapWidthBase=0 (degenerate case)", () => {
    expect(computeVisibleBp(2, 5000, 800, 0)).toBe(5000);
  });
});
