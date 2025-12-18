import * as React from "react";
import * as ReactDOM from "react-dom";
import { renderToString as reactRenderToString } from "react-dom/server";

import Circular from "./viewers/Circular/Circular";
import Linear from "./viewers/Linear/Linear";
import LinearMap from "./viewers/LinearMap/LinearMap";
import SeqViz, { SeqVizProps } from "./SeqViz";
import enzymes from "./core/enzymes";

/**
 * Export a React component directly for React-based development
 */
export { SeqViz, Linear, Circular, LinearMap, enzymes as Enzymes };

export default SeqViz;

export type { SeqVizProps, TranslationFrame, TranslationOrfSettings, TranslationSettings } from "./SeqViz";

export type { CircularProps } from "./viewers/Circular/Circular";

export type { LinearProps } from "./viewers/Linear/Linear";

export type { LinearMapProps } from "./viewers/LinearMap/LinearMap";

/**
 * Return a Viewer object with three properties:
 *  - `render` to an HTML element
 *  - `setState(options)` to update the viewer's internal state
 *  - `renderToString` to return an HTML representation of the Viewer
 */
const Viewer = (element: string | HTMLElement = "root", options: SeqVizProps) => {
  // used to keep track of whether to re-render after a "set" call
  let rendered = false;
  // get the HTML element by ID or use as is if passed directly
  let domElement: HTMLElement | null = null;
  if (typeof document === "undefined") return;

  if (typeof element === "string") {
    if (document.getElementById(element)) {
      domElement = document.getElementById(element);
    } else {
      throw new Error(`Failed to find an element with ID: ${element}`);
    }
  } else {
    domElement = element;
  }
  let viewer = React.createElement(SeqViz, options, null);
  const legacyReactDOM = ReactDOM as unknown as {
    render?: (element: React.ReactElement | null, container: Element | DocumentFragment) => void;
  };
  let reactRootChecked = false;
  let reactRoot: { render: (element: React.ReactElement | null) => void } | null = null;

  const getOrCreateRoot = () => {
    if (reactRoot || reactRootChecked) {
      return reactRoot;
    }

    reactRootChecked = true;
    try {
      const client = require("react-dom/client");
      if (client && typeof client.createRoot === "function" && domElement) {
        reactRoot = client.createRoot(domElement);
      }
    } catch (error) {
      reactRoot = null;
    }

    return reactRoot;
  };

  /**
   * Render the Viewer to the element passed
   */
  const render = () => {
    rendered = true;
    const root = getOrCreateRoot();
    if (root) {
      root.render(viewer);
    } else if (domElement && legacyReactDOM.render) {
      legacyReactDOM.render(viewer, domElement);
    }
    return viewer;
  };

  /**
   * Return an HTML string representation of the viewer
   */
  const renderToString = () => {
    return reactRenderToString(viewer);
  };

  /**
   * Update the viewer with new settings. Re-renders if render was already called.
   */
  const setState = (state: SeqVizProps) => {
    options = { ...options, ...state };
    viewer = React.createElement(SeqViz, options, null);

    if (rendered) {
      const root = getOrCreateRoot();
      if (root) {
        root.render(viewer);
      } else if (domElement && legacyReactDOM.render) {
        legacyReactDOM.render(viewer, domElement);
      }
    }
    return viewer;
  };

  return {
    render,
    renderToString,
    setState,
  };
};

export { Viewer };
