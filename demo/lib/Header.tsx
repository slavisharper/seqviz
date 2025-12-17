import * as React from "react";

interface HeaderProps {
  selection: any;
  showSelectionMeta: boolean;
  toggleShowSelectionMeta: () => void;
  toggleSidebar: () => void;
}

const Header = ({ selection, showSelectionMeta, toggleShowSelectionMeta, toggleSidebar }: HeaderProps) => (
  <header className="header" id="app-header">
    <div id="header-primary">
      <ToggleSelectionMetaButton
        showSelectionMeta={showSelectionMeta}
        toggleShowSelectionMeta={toggleShowSelectionMeta}
      />
      <a href="https://github.com/slavisharper/seqviz" id="github-link" rel="noopener noreferrer" target="_blank">
        GitHub
      </a>
      <img alt="SeqViz" id="brand" src="https://cdn.prod.website-files.com/683ef1d9d38049ac675f4cda/6932cc66f37f0c47fb14c938_Logo-Space2-WF.png" />
    </div>
    {showSelectionMeta && (
      <div id="header-meta">
        <SelectionMetaRow selection={selection} />
      </div>
    )}
  </header>
);

export default Header;

const ToggleSelectionMetaButton = ({ showSelectionMeta, toggleShowSelectionMeta }) => (
  <div className="meta-toggle">
    <button
      aria-pressed={showSelectionMeta}
      className={`meta-button ${showSelectionMeta ? "active" : ""}`}
      id="meta-button"
      onClick={toggleShowSelectionMeta}
      type="button"
    >
      {showSelectionMeta ? "HIDE META" : "SHOW META"}
    </button>
  </div>
);

const SelectionMetaRow = ({ selection }) => {
  const { end, name, type, length, start } = selection;
  const noneSelected = start === end;

  return (
    selection && (
      <div className="selection-meta">
        {noneSelected && (
          <div className="meta-datum" id="no-selection">
            <p>Make a selection on the circular or linear viewer.</p>
          </div>
        )}
        {type && (
          <div className="meta-datum" id="feature-name">
            <p id="field">{type}</p>
            <p id="value">{name}</p>
          </div>
        )}
        {length !== 0 && (
          <div className="meta-datum">
            <p id="field">LENGTH</p>
            <p id="value">{length}bp</p>
          </div>
        )}
        {start !== end && (
          <div className="meta-datum">
            <p id="field">RANGE</p>
            <p id="value">
              {start + 1} - {end + 1}
            </p>
          </div>
        )}
      </div>
    )
  );
};
