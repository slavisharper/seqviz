import { COLORS, chooseRandomColor, darkerColor } from "./colors";

describe("Colors", () => {
  it("chooses a random color", () => {
    const randomColor = chooseRandomColor();

    expect(COLORS).toContain(randomColor);
  });

  it("darkens colors", () => {
    const hexMap = {
      "#7DD3E8": "#69b1c2",
      "#F07": "#d50064",
      "#F0BA65": "#c99c55",
      "rgb(157, 234, 237)": "rgb(131,196,198)",
      "rgba(157, 234, 237, 0.3)": "rgba(131,196,198,0.3)",
    };

    Object.keys(hexMap).forEach(k => {
      expect(darkerColor(k)).toEqual(hexMap[k]);
    });
  });
});
