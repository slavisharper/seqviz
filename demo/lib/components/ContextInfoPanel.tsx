import * as React from "react";

import type { FragmentSelection, Selection as SelectionType } from "../../../src/state/selectionContext";

export interface ContextInfo {
  name?: string;
  selection: SelectionType;
  fragmentSelection?: FragmentSelection | null;
  sequence: string;
  type?: SelectionType["type"];
  triggerLabel?: string;
}

interface ContextInfoPanelProps {
  info: ContextInfo | null;
  onDismiss: () => void;
  sequenceUnitLabel: string;
}

const formatSelectionRange = (start: number, end: number) => {
  if (start === end) {
    return `${start + 1}`;
  }

  return `${start + 1} - ${end}`;
};

const ContextInfoPanel = ({ info, onDismiss, sequenceUnitLabel }: ContextInfoPanelProps) => {
  if (!info) {
    return null;
  }

  const { selection, fragmentSelection, sequence } = info;
  const start = selection?.start ?? 0;
  const end = selection?.end ?? start;
  const derivedLength =
    typeof selection?.length === "number" && selection.length > 0
      ? selection.length
      : Math.abs(end - start) || sequence.length || 0;
  const viewerLabel = selection?.viewer ? selection.viewer.toLowerCase() : "linear";
  const typeLabel = (info.type || selection?.type || "SEQ").toLowerCase();
  const displayName = info.name || selection?.name || "Sequence selection";
  const truncatedSequence = sequence
    ? sequence.length > 220
      ? `${sequence.slice(0, 220)}…`
      : sequence
    : "No bases selected";

  const triggerLabel = info.triggerLabel || "Context Menu";

  return (
    <section className="context-info-panel" aria-live="polite">
      <header className="context-info-header">
        <div>
          <p className="context-info-label">{`${triggerLabel} Insight`}</p>
          <h4>{displayName}</h4>
        </div>
        <button
          aria-label="Dismiss selection details"
          className="context-info-close"
          onClick={onDismiss}
          type="button"
        >
          ×
        </button>
      </header>
      <div className="context-info-body">
        <div className="context-info-meta">
          <span className="context-pill">{typeLabel}</span>
          <span className="context-pill">{viewerLabel} view</span>
          <span className="context-pill">
            {derivedLength} {sequenceUnitLabel}
          </span>
        </div>
        <dl className="context-info-stats">
          <div>
            <dt>Range</dt>
            <dd>{formatSelectionRange(start, end)}</dd>
          </div>
          <div>
            <dt>Clockwise</dt>
            <dd>{selection?.clockwise === false ? "No" : "Yes"}</dd>
          </div>
          {fragmentSelection?.firstSelection && (
            <div>
              <dt>First Selection</dt>
              <dd>
                {formatSelectionRange(fragmentSelection.firstSelection.start, fragmentSelection.firstSelection.end)} ({fragmentSelection.firstSelection.type || "SEQ"})
              </dd>
            </div>
          )}
          {fragmentSelection?.secondSelection && (
            <div>
              <dt>Second Selection</dt>
              <dd>
                {formatSelectionRange(fragmentSelection.secondSelection.start, fragmentSelection.secondSelection.end)} ({fragmentSelection.secondSelection.type || "SEQ"})
              </dd>
            </div>
          )}
        </dl>
        <pre className="context-info-seq">{truncatedSequence}</pre>
      </div>
    </section>
  );
};

export default ContextInfoPanel;
