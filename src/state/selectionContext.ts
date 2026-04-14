import * as React from "react";

type SelectionTypeEnum =
  | "ALL"
  | "ANNOTATION"
  | "FIND"
  | "TRANSLATION"
  | "TRANSLATION_HANDLE"
  | "ENZYME"
  | "SEQ"
  | "AMINOACID"
  | "HIGHLIGHT"
  | "SINGLE_STRAND_ANNOTATION"
  | "PRIMER"
  | "SEPARATOR"
  | "";

/* Selection holds meta about the viewer(s) active selection. */
export interface Selection {
  clockwise?: boolean;
  color?: string;
  direction?: number;
  end?: number;
  id?: string;
  length?: number;
  name?: string;
  parent?: Selection;
  fcut?: number;
  rcut?: number;
  ref?: null | string;
  scrollLinearOnSelect?: boolean;
  start?: number;
  type: SelectionTypeEnum;
  viewer?: "LINEAR" | "CIRCULAR";
}

export interface SelectionEventDetail {
  direction?: number;
  end: number;
  name?: string;
  start: number;
  type?: SelectionTypeEnum;
}

export interface SelectionEventMeta {
  fragmentSelection?: FragmentSelection;
  skipLastSelectionUpdate?: boolean;
}

export interface FragmentSelection {
  firstSelection?: SelectionEventDetail | null;
  secondSelection?: SelectionEventDetail | null;
}

export interface ExternalSelection {
  clockwise?: boolean;
  end?: number;
  start?: number;
  type?: SelectionTypeEnum;
}

/** Initial/default selection */
export const defaultSelection: Selection = {
  clockwise: true,
  end: 0,
  length: 0,
  name: "",
  ref: null,
  start: 0,
  type: "",
};

/** Context value shape, including the disable flag */
export interface SelectionContextValue extends Selection {
  disableSelection?: boolean;
}

/** Default context object */
const SelectionContext = React.createContext<SelectionContextValue>(defaultSelection);
SelectionContext.displayName = "SelectionContext";

export default SelectionContext;
