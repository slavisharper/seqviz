// My css.d.ts file
import type * as CSS from "csstype";

declare module "csstype" {
  interface Properties {
    // Allow namespaced CSS Custom Properties
    [index: `--theme-${string}`]: any;

    // Allow any CSS Custom Properties
    [index: `--${string}`]: any;

    // ...or allow any other property
    [index: string]: any;

    // Add a CSS Custom Property
    "--theme-color"?: "black" | "white";

    // Add a missing property
    WebkitRocketLauncher?: string;
  }
}

export const svgText: CSS.Properties = {
  MozUserSelect: "none",
  WebkitFontSmoothing: "antialiased",
  WebkitUserSelect: "none",
  background: "none",
  fill: "rgb(42, 42, 42)",
  fontFamily: "JetBrains Mono, Fira Code, Roboto Mono, Monaco, monospace",
  msUserSelect: "none",
  userSelect: "none",
};


export const search: CSS.Properties = {
  cursor: "pointer",
  fill: "rgba(250, 204, 21, 0.35)",
};

export const highlight: CSS.Properties = {
  cursor: "pointer",
  fill: "rgba(250, 204, 21, 0.2)",
  strokeWidth: "1",
};

export const selection: CSS.Properties = {
  fill: "rgba(59, 130, 246, 0.15)",
  shapeRendering: "auto",
  stroke: "rgba(59, 130, 246, 0.3)",
  strokeWidth: "0.5",
};

export const selectionEdge: CSS.Properties = {
  fill: "rgba(59, 130, 246, 0.8)",
  shapeRendering: "geometricPrecision",
  stroke: "rgba(59, 130, 246, 0.8)",
};

export const separatorLine: CSS.Properties = {
  cursor: "pointer",
  fill: "none",
  pointerEvents: "stroke",
  shapeRendering: "geometricPrecision",
  stroke: "rgba(32, 45, 90, 0.95)",
  strokeLinecap: "butt",
  strokeWidth: "2.5",
};

export const separatorConnectorLine: CSS.Properties = {
  cursor: "pointer",
  fill: "none",
  shapeRendering: "geometricPrecision",
  stroke: "rgba(32, 45, 90, 0.65)",
  strokeLinecap: "butt",
  strokeWidth: "1.5",
};

export const cutSite: CSS.Properties = {
  fill: "transparent",
  shapeRendering: "auto",
  stroke: "rgb(160, 165, 170)",
  strokeWidth: "1",
};

export const cutSiteHighlight: CSS.Properties = {
  cursor: "pointer",
  fill: "rgb(250, 204, 21)",
  fillOpacity: 0,
  shapeRendering: "auto",
  stroke: "rgb(160, 165, 170)",
  strokeWidth: "1",
};

export const indexLine: CSS.Properties = {
  fill: "transparent",
  shapeRendering: "geometricPrecision",
  stroke: "rgb(190, 195, 200)",
  strokeWidth: "0.75",
};

export const indexTick: CSS.Properties = {
  fill: "transparent",
  shapeRendering: "geometricPrecision",
  stroke: "rgb(190, 195, 200)",
  strokeWidth: "0.75",
};

export const indexTickLabel: CSS.Properties = {
  ...svgText,
  fill: "rgb(150, 155, 160)",
  fontSize: "12",
  fontWeight: 400,
  textRendering: "optimizeLegibility",
};

export const annotation: CSS.Properties = {
  fillOpacity: "0.85",
  shapeRendering: "geometricPrecision",
  strokeWidth: "1",
  transition: "fill-opacity 0.15s ease, stroke-width 0.15s ease",
};

export const annotationLabel: CSS.Properties = {
  ...svgText,
  color: "rgb(42, 42, 42)",
  fontWeight: 400,
  shapeRendering: "geometricPrecision",
  strokeLinejoin: "round",
  textRendering: "optimizeLegibility",
};

export const translationHandle: CSS.Properties = {
  fillOpacity: "0.85",
  shapeRendering: "geometricPrecision",
  strokeWidth: "1",
  transition: "fill-opacity 0.15s ease, stroke-width 0.15s ease",
};

export const translationHandleLabel: CSS.Properties = {
  ...svgText,
  color: "rgb(42, 42, 42)",
  fontSize: "9",
  fontWeight: 400,
  shapeRendering: "geometricPrecision",
  strokeLinejoin: "round",
  textRendering: "optimizeLegibility",
};

export const translationAminoAcidLabel: CSS.Properties = {
  ...svgText,
  color: "rgb(42, 42, 42)",
  fontSize: "12",
  fontWeight: 400,
};

export const viewerCircular: CSS.Properties = {
  cursor: "text",
  fontSize: "12",
  fontWeight: 400,
  margin: "auto",
};

// Enable rotation gestures on the circular viewer without blocking scroll elsewhere.
export const viewerCircularTouchRotate: CSS.Properties = {
  ...viewerCircular,
  touchAction: "none",
};

export const circularLabel: CSS.Properties = {
  ...svgText,
  cursor: "pointer",
};

export const circularLabelHover: CSS.Properties = {
  ...circularLabel,
  textDecoration: "underline",
};

export const circularLabelLine: CSS.Properties = {
  fill: "none",
  stroke: "rgb(190, 195, 200)",
  strokeWidth: "0.75",
};

export const circularLabelLineHover: CSS.Properties = {
  ...circularLabelLine,
  stroke: "black",
};

export const linearScroller: CSS.Properties = {
  cursor: "text",
  fontWeight: 400,
  height: "100%",
  outline: "none !important",
  overflowX: "hidden",
  overflowY: "scroll",
  padding: "10px",
  position: "relative",
};

export const seqBlock: CSS.Properties = {
  overflow: "visible",
  padding: 0,
  width: "100%",
};

export const linearHorizontalScroller: CSS.Properties = {
  cursor: "text",
  fontWeight: 400,
  height: "100%",
  outline: "none !important",
  overflowX: "scroll",
  overflowY: "hidden",
  padding: "10px",
  position: "relative",
};
