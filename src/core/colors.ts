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

/**
 * Parse a CSS color (hex 3/6/8-digit, rgb(), rgba()) to [r, g, b] in 0-255.
 * Returns null if the color cannot be parsed.
 */
const parseColor = (c: string): [number, number, number] | null => {
  if (!c) return null;
  const s = c.trim();

  // hex
  const hexMatch = s.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    if (hex.length === 8) hex = hex.slice(0, 6); // strip alpha
    if (hex.length === 6) {
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
    }
  }

  // rgb(a)
  const rgbMatch = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10)];
  }

  return null;
};

/**
 * Return a text fill color (white or dark) that is legible on the given
 * background color.  Uses WCAG relative-luminance to pick the higher-contrast
 * option.
 */
export const contrastText = (bg: string): string => {
  const rgb = parseColor(bg);
  if (!rgb) return "rgb(42, 42, 42)"; // default dark

  // sRGB → linear
  const [rs, gs, bs] = rgb.map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });

  // relative luminance
  const L = 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;

  return L > 0.4 ? "rgb(42, 42, 42)" : "#fff";
};

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
