import * as React from "react";

import { InputRefFunc } from "../../SelectionHandler";
import { SingleStrandAnnotation } from "../../core/elements";
import { highlight as highlightStyle } from "../../style";
import { FindXAndWidthElementType } from "./SeqBlock";

/**
 * Render strand-specific translucent overlays similar to search highlights.
 */
export const SingleStrandHighlights = (props: {
  compYDiff: number;
  findXAndWidth: FindXAndWidthElementType;
  firstBase: number;
  hasComplementRow: boolean;
  indexYDiff: number;
  inputRef: InputRefFunc;
  lastBase: number;
  lineHeight: number;
  listenerOnly: boolean;
  seqBlockRef: unknown;
  singleStrandAnnotations: SingleStrandAnnotation[];
}) => (
  <>
    {props.singleStrandAnnotations.map((annotation, i) => (
      <SingleStrandHighlight
        key={`linear-ss-annotation-${annotation.id}-${props.listenerOnly}`}
        {...props}
        annotation={annotation}
        index={i}
      />
    ))}
  </>
);

const SingleStrandHighlight = (props: {
  annotation: SingleStrandAnnotation;
  compYDiff: number;
  findXAndWidth: FindXAndWidthElementType;
  firstBase: number;
  hasComplementRow: boolean;
  index: number;
  indexYDiff: number;
  inputRef: InputRefFunc;
  lastBase: number;
  lineHeight: number;
  listenerOnly: boolean;
  seqBlockRef: unknown;
  singleStrandAnnotations: SingleStrandAnnotation[];
}) => {
  const { width, x } = props.findXAndWidth(props.index, props.annotation, props.singleStrandAnnotations);

  const fill = props.listenerOnly ? "transparent" : props.annotation.color || highlightStyle.fill || "rgba(255, 251, 7, 0.25)";
  const stroke = props.listenerOnly ? "none" : "rgba(0, 0, 0, 0.35)";

  const y = props.annotation.strand === -1 && props.hasComplementRow ? props.compYDiff : props.indexYDiff;

  // Avoid passing annotation color into selection metadata so selection uses the default blue fill
  const { color: _annotationColor, ...annotationSelectionProps } = props.annotation;

  return (
    <rect
      ref={props.inputRef(props.annotation.id, {
        ref: props.annotation.id,
        ...annotationSelectionProps,
        type: "SINGLE_STRAND_ANNOTATION",
        viewer: "LINEAR",
      })}
      className="la-vz-single-strand-annotation"
      data-selection-name={props.annotation.name}
      data-selection-ref={props.annotation.id}
      data-selection-type="SINGLE_STRAND_ANNOTATION"
      data-selection-viewer="LINEAR"
      height={props.lineHeight}
      id={props.annotation.id}
      shapeRendering="crispEdges"
      stroke={stroke}
      strokeWidth={1}
      style={{ ...highlightStyle, fill }}
      width={width}
      x={x}
      y={y}
    />
  );
};
