import { pSBC } from "./pSBC";

/**
 * a color palette of colors (for LinearSeq right now)
 * modernized with slightly desaturated, calmer tones
 */
export const COLORS = [
  "#7DD3E8", // cyan
  "#7CCF7A", // green
  "#C5E87A", // light green
  "#7AD4B2", // teal
  "#E896C2", // pink
  "#F0BA65", // orange
  "#E87272", // red
  "#F29B7A", // red-orange
  "#E88DF0", // magenta
  "#B48EF0", // purple
  "#5E75F0", // blue
  "#7A9BF0", // light blue
];

export const COLOR_BORDER_MAP: Record<string, string> = {
  "#5E75F0": "#3D4DA3", // blue
  "#7A9BF0": "#5570B8", // light blue
  "#7AD4B2": "#519B80", // teal
  "#7CCF7A": "#5A9958", // green
  "#7DD3E8": "#5AA3B5", // cyan
  "#B48EF0": "#7E60B8", // purple
  "#C5E87A": "#8AAD4A", // light green
  "#E87272": "#A84D4D", // red
  "#E88DF0": "#A860AD", // magenta
  "#E896C2": "#B06090", // pink
  "#F0BA65": "#B88538", // orange
  "#F29B7A": "#B06850", // red-orange
};

// color generator function
export const chooseRandomColor = (colors?: string[]) => {
  const choices = colors || COLORS;
  const randIndex = Math.floor(Math.random() * choices.length);
  return choices[randIndex];
};

/** get an "indexed" color from the colors array */
export const colorByIndex = (i: number, colors?: string[]) => (colors || COLORS)[i % (colors || COLORS).length];

/** get an "indexed" color from the colors array */
export const borderColorByIndex = (i: number) => COLOR_BORDER_MAP[COLORS[i % COLORS.length]];

/** cache for input color to those 50% darker */
const darkerColorCache = {};

/** darken a HEX color by 30% */
export const darkerColor = (c: string): string => {
  if (darkerColorCache[c]) {
    return darkerColorCache[c];
  }

  const darkerColor = pSBC(-0.3, c);
  darkerColorCache[c] = darkerColor;
  return darkerColor || c;
};
