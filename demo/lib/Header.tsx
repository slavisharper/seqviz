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
      <button
        aria-label="Toggle options"
        className="circular-button"
        id="sidebar-toggle-open"
        onClick={toggleSidebar}
        type="button"
      >
        ☰
      </button>
      <ToggleSelectionMetaButton
        showSelectionMeta={showSelectionMeta}
        toggleShowSelectionMeta={toggleShowSelectionMeta}
      />
      <a href="https://github.com/Lattice-Automation/seqviz" id="github-link" rel="noopener noreferrer" target="_blank">
        GitHub
      </a>
      <img alt="SeqViz" id="brand" src="https://tools.latticeautomation.com/seqviz/seqviz-logo.png" />
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
  const { end, feature, length, start } = selection;
  const noneSelected = start === end;

  return (
    selection && (
      <div className="selection-meta">
        {noneSelected && (
          <div className="meta-datum" id="no-selection">
            <p>Make a selection on the circular or linear viewer.</p>
          </div>
        )}
        {feature && (
          <div className="meta-datum" id="feature-name">
            <p id="field">FEATURE</p>
            <p id="value">{feature ? feature.name : ""}</p>
          </div>
        )}
        {feature && feature.type && (
          <div className="meta-datum" id="feature-type">
            <p id="field">TYPE</p>
            <p id="value">{feature.type}</p>
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
