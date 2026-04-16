import * as React from "react";

import type { FragmentSelection, Selection } from "../../src/state/selectionContext";

interface HeaderProps {
  selection: Selection;
  fragmentSelection?: FragmentSelection | null;
  sequenceUnitLabel: string;
  showSelectionMeta: boolean;
}

const Header = ({
  selection,
  fragmentSelection,
  sequenceUnitLabel,
  showSelectionMeta,
}: HeaderProps) => (
  <header className="header" id="app-header">
    <div id="header-primary">
      <SelectionMetaRow selection={selection} fragmentSelection={fragmentSelection} sequenceUnitLabel={sequenceUnitLabel} />
      <a href="https://github.com/slavisharper/seqviz" id="github-link" rel="noopener noreferrer" target="_blank">
        GitHub
      </a>
      <img
        alt="SeqViz"
        id="brand"
        src="https://cdn.prod.website-files.com/683ef1d9d38049ac675f4cda/6932cc66f37f0c47fb14c938_Logo-Space2-WF.png"
      />
    </div>
    {showSelectionMeta && <div id="header-meta"></div>}
  </header>
);

export default Header;

const formatSelectionRange = (start: number, end: number) => {
  if (start === end) {
    return `${start + 1}`;
  }

  return `${start + 1} - ${end}`;
};

const SelectionMetaRow = ({
  selection,
  fragmentSelection,
  sequenceUnitLabel,
}: {
  selection: Selection;
  fragmentSelection?: FragmentSelection | null;
  sequenceUnitLabel: string;
}) => {
  const { end, name, type, length, start } = selection;

  return (
    selection && (
      <div className="selection-meta">
        {type && type !== "SEQ" && (
          <div className="meta-datum" id="feature-name">
            <p id="field">{type}</p>
            <p id="value">{name}</p>
          </div>
        )}
        {length > 0 && (
          <div className="meta-datum">
            <p id="field">LENGTH</p>
            <p id="value">
              {length} {sequenceUnitLabel}
            </p>
          </div>
        )}
        {start !== end && (
          <div className="meta-datum">
            <p id="field">RANGE</p>
            <p id="value">{formatSelectionRange(start, end)}</p>
          </div>
        )}
        {start === end && (
          <div className="meta-datum">
            <p id="field">Position</p>
            <p id="value">{(start ?? 0) + 1}</p>
          </div>
        )}
        {fragmentSelection?.firstSelection && (
          <div className="meta-datum">
            <p id="field">First Selection</p>
            <p id="value">{formatSelectionRange(fragmentSelection.firstSelection.start, fragmentSelection.firstSelection.end)}</p>
          </div>
        )}
        {fragmentSelection?.secondSelection && (
          <div className="meta-datum">
            <p id="field">Second Selection</p>
            <p id="value">{formatSelectionRange(fragmentSelection.secondSelection.start, fragmentSelection.secondSelection.end)}</p>
          </div>
        )}
      </div>
    )
  );
};
