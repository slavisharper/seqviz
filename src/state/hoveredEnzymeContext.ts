import * as React from "react";

export interface HoveredEnzyme {
  id?: string | null;
  name: string;
}

export interface HoveredEnzymeContextValue {
  hoveredEnzyme: HoveredEnzyme | null;
  setHoveredEnzyme: (enzyme: HoveredEnzyme | null) => void;
  highlightedEnzymes: string[];
}

const defaultHoveredEnzymeContext: HoveredEnzymeContextValue = {
  hoveredEnzyme: null,
  highlightedEnzymes: [],
  setHoveredEnzyme: () => {
    // noop by default
  },
};

export const matchesHoveredEnzyme = (
  hovered: HoveredEnzyme | null,
  candidate?: { id?: string | null; name?: string | null },
  forcedHighlightedNames?: string[],
): boolean => {
  if (!candidate) return false;
  const candidateName = candidate.name?.trim().toLowerCase();

  if (forcedHighlightedNames?.length && candidateName) {
    const isForced = forcedHighlightedNames.some(name => name?.trim().toLowerCase() === candidateName);
    if (isForced) {
      return true;
    }
  }

  if (!hovered) return false;
  if (hovered.id && candidate.id && hovered.id === candidate.id) {
    return true;
  }
  const hoveredName = hovered.name?.trim().toLowerCase();
  if (!hoveredName || !candidateName) {
    return false;
  }
  return hoveredName === candidateName;
};

const HoveredEnzymeContext = React.createContext<HoveredEnzymeContextValue>(defaultHoveredEnzymeContext);
HoveredEnzymeContext.displayName = "HoveredEnzymeContext";

export default HoveredEnzymeContext;
