import { TranslationProp } from "../../core/elements";
import { Selection as SelectionState } from "../../state/selectionContext";
import { LinearLabelDatum, LinearLabelItem } from "./Labels";
import { LinearOrf } from "./types";
import { normalizeBase } from "./utils";

export type RawLabelItem = LinearLabelItem;

export interface RawLabel {
  cutPosition?: number;
  direction?: 1 | -1;
  end: number;
  id: string;
  items?: RawLabelItem[];
  name: string;
  start: number;
  type: "annotation" | "primer" | "enzyme";
}

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

export const createLabelItemWithSelection = (
  config: {
    direction?: 1 | -1;
    end: number;
    id: string;
    name: string;
    start: number;
    type: "annotation" | "primer" | "enzyme";
  },
  selectionType: SelectionState["type"],
  options?: { scrollLinearOnSelect?: boolean },
): LinearLabelItem => ({
  direction: config.direction,
  id: config.id,
  name: config.name,
  selectionEnd: config.end,
  selectionName: config.name,
  selectionRef: config.id,
  selectionStart: config.start,
  selectionScrollLinearOnSelect: options?.scrollLinearOnSelect,
  selectionType,
  selectionViewer: "LINEAR",
  type: config.type,
});

export const getSelectionTypeForLabel = (type: RawLabel["type"]): SelectionState["type"] => {
  switch (type) {
    case "annotation":
      return "ANNOTATION";
    case "primer":
      return "PRIMER";
    case "enzyme":
      return "ENZYME";
    default:
      return "";
  }
};

export const getOrfId = (orf: LinearOrf) => orf.__id;

export const stripOrfMeta = (orf: LinearOrf): TranslationProp => {
  const { __colorIndex, __id, ...rest } = orf;
  void __colorIndex;
  void __id;
  return rest;
};

export const buildOrfIdentifier = (orf: TranslationProp, seqLength: number, colorIndex: number) => {
  const safeLength = Math.max(seqLength, 1);
  const dirLabel = orf.direction === -1 ? "rev" : "fwd";
  const normStart = normalizeBase(orf.start, safeLength);
  const normEnd = normalizeBase(orf.end, safeLength);
  const namePart = (orf.name || "orf").replace(/[^a-zA-Z0-9_-]+/g, "").toLowerCase() || "orf";
  return `linear-orf-${namePart}-${dirLabel}-${normStart}-${normEnd}-${colorIndex}`;
};

export const isFeatureHovered = (
  id: string,
  hoveredFeatures: Record<string, boolean>,
  selectedFeatureIds: Set<string>,
): boolean => {
  if (!id) return false;
  return !!hoveredFeatures[id] || selectedFeatureIds.has(id);
};

export const getMergedHoverState = (
  selectedFeatures: Set<string>,
  hoveredFeatures: Record<string, boolean>,
): Record<string, boolean> => {
  const merged: Record<string, boolean> = { ...hoveredFeatures };
  selectedFeatures.forEach(id => {
    if (id) {
      merged[id] = true;
    }
  });
  return merged;
};

export const getFeatureIdsForSelection = (
  selection: SelectionState | undefined,
  labelLookup: Map<string, LinearLabelDatum>,
): string[] => {
  if (!selection) return [];
  const { id, ref, type } = selection;
  const targetId = ref || id || "";
  if (!targetId) return [];
  const allowedTypes = new Set(["ANNOTATION", "PRIMER", "ENZYME", "TRANSLATION"]);
  if (!type || !allowedTypes.has(type)) {
    return [];
  }
  const label = labelLookup.get(targetId);
  if (label) {
    return label.labels.map(item => item.id).filter(Boolean);
  }
  return [targetId];
};
