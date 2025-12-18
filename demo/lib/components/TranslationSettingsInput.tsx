import * as React from "react";

import type { TranslationFrame, TranslationSettings } from "../../../src/SeqViz";
import type { SupportedSeqType } from "../constants";

interface TranslationSettingsInputProps {
  enabled: boolean;
  seqType: SupportedSeqType;
  value?: TranslationSettings;
  onToggle: (enabled: boolean) => void;
  onChange: (value: TranslationSettings) => void;
}

const FRAME_OPTIONS: { label: string; value: TranslationFrame }[] = [
  { label: "+1", value: 1 as TranslationFrame },
  { label: "+2", value: 2 as TranslationFrame },
  { label: "+3", value: 3 as TranslationFrame },
  { label: "-1", value: -1 as TranslationFrame },
  { label: "-2", value: -2 as TranslationFrame },
  { label: "-3", value: -3 as TranslationFrame },
];

const DEFAULT_ORF_SETTINGS = {
  minLength: 350,
  start: ["ATG"],
  end: ["TAA", "TAG", "TGA"],
};

const mergeWithDefaultOrf = (orf?: TranslationSettings["orf"]): TranslationSettings["orf"] => {
  if (!orf) {
    return {
      minLength: DEFAULT_ORF_SETTINGS.minLength,
      start: [...DEFAULT_ORF_SETTINGS.start],
      end: [...DEFAULT_ORF_SETTINGS.end],
    };
  }

  return {
    minLength: typeof orf.minLength === "number" ? orf.minLength : DEFAULT_ORF_SETTINGS.minLength,
    start: orf.start && orf.start.length ? [...orf.start] : [...DEFAULT_ORF_SETTINGS.start],
    end: orf.end && orf.end.length ? [...orf.end] : [...DEFAULT_ORF_SETTINGS.end],
  };
};

const formatCodonList = (codons?: string[]) => (codons && codons.length ? codons.join(", ") : "");

const parseCodonList = (value: string) =>
  value
    .split(",")
    .map(codon => codon.trim().toUpperCase())
    .filter(Boolean);

const TranslationSettingsInput: React.FC<TranslationSettingsInputProps> = ({
  enabled,
  seqType,
  value,
  onToggle,
  onChange,
}) => {
  const translationsDisabled = seqType === "aa";
  const canEdit = enabled && !translationsDisabled;
  const currentSettings = React.useMemo<TranslationSettings>(
    () => ({
      frames: value?.frames ? [...value.frames] : [],
      orf: value?.orf ? mergeWithDefaultOrf(value.orf) : undefined,
    }),
    [value]
  );

  const startKey = (currentSettings.orf?.start ?? DEFAULT_ORF_SETTINGS.start).join("-");
  const stopKey = (currentSettings.orf?.end ?? DEFAULT_ORF_SETTINGS.end).join("-");
  const [startCodons, setStartCodons] = React.useState(
    formatCodonList(currentSettings.orf?.start ?? DEFAULT_ORF_SETTINGS.start)
  );
  const [stopCodons, setStopCodons] = React.useState(
    formatCodonList(currentSettings.orf?.end ?? DEFAULT_ORF_SETTINGS.end)
  );

  React.useEffect(() => {
    setStartCodons(formatCodonList(currentSettings.orf?.start ?? DEFAULT_ORF_SETTINGS.start));
  }, [startKey]);

  React.useEffect(() => {
    setStopCodons(formatCodonList(currentSettings.orf?.end ?? DEFAULT_ORF_SETTINGS.end));
  }, [stopKey]);

  const updateFrames = (frame: TranslationFrame, nextChecked: boolean) => {
    const frames = new Set(currentSettings.frames);
    if (nextChecked) {
      frames.add(frame);
    } else {
      frames.delete(frame);
    }

    onChange({
      ...currentSettings,
      frames: FRAME_OPTIONS.filter(option => frames.has(option.value)).map(option => option.value),
    });
  };

  const updateOrfSettings = (next: TranslationSettings["orf"]) => {
    onChange({
      ...currentSettings,
      orf: next,
    });
  };

  const toggleOrf = (nextChecked: boolean) => {
    if (!nextChecked) {
      updateOrfSettings(undefined);
      return;
    }
    const nextOrf = mergeWithDefaultOrf(currentSettings.orf);
    updateOrfSettings(nextOrf);
    setStartCodons(formatCodonList(nextOrf.start));
    setStopCodons(formatCodonList(nextOrf.end));
  };

  const handleMinLengthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(event.target.value, 10);
    const minLength = Number.isFinite(raw) ? Math.max(raw, 30) : DEFAULT_ORF_SETTINGS.minLength;
    const nextOrf = mergeWithDefaultOrf(currentSettings.orf);
    updateOrfSettings({ ...nextOrf, minLength });
  };

  const handleCodonBlur = (type: "start" | "end", text: string) => {
    const parsed = parseCodonList(text);
    const nextOrf = mergeWithDefaultOrf(currentSettings.orf);

    if (!parsed.length) {
      nextOrf[type] = [...DEFAULT_ORF_SETTINGS[type]];
    } else {
      nextOrf[type] = parsed;
    }

    updateOrfSettings(nextOrf);
  };

  return (
    <section className="panel-card translation-settings">
      <div className="panel-card__header">
        <h4>Translations</h4>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={enabled && !translationsDisabled}
            disabled={translationsDisabled}
            onChange={event => onToggle(event.target.checked)}
          />
          <span>{translationsDisabled ? "Locked for amino sequences" : "Enabled"}</span>
        </label>
      </div>
      {canEdit && (
        <>
          <div className="panel-subtitle">Frames</div>
          <div className="frame-grid">
            {FRAME_OPTIONS.map(option => {
              const checked = currentSettings.frames?.includes(option.value) ?? false;
              return (
                <label key={option.value} className="frame-option">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={event => updateFrames(option.value, event.target.checked)}
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
          <div className="panel-divider" />
          <label className="toggle-label">
            <input type="checkbox" checked={!!currentSettings.orf} onChange={event => toggleOrf(event.target.checked)} />
            <span>Auto-detect ORFs</span>
          </label>
          {currentSettings.orf && (
            <div className="orf-grid">
              <label className="field-group">
                <span>Min length (bp)</span>
                <input
                  type="number"
                  min={30}
                  step={30}
                  value={currentSettings.orf.minLength ?? DEFAULT_ORF_SETTINGS.minLength}
                  onChange={handleMinLengthChange}
                />
              </label>
              <label className="field-group">
                <span>Start codons</span>
                <input
                  type="text"
                  placeholder="ATG, GTG"
                  value={startCodons}
                  onChange={event => setStartCodons(event.target.value)}
                  onBlur={event => handleCodonBlur("start", event.target.value)}
                />
              </label>
              <label className="field-group">
                <span>Stop codons</span>
                <input
                  type="text"
                  placeholder="TAA, TAG, TGA"
                  value={stopCodons}
                  onChange={event => setStopCodons(event.target.value)}
                  onBlur={event => handleCodonBlur("end", event.target.value)}
                />
              </label>
            </div>
          )}
        </>
      )}
      {!canEdit && translationsDisabled && (
        <p className="muted-note">Amino acid inputs always render as a single translation track.</p>
      )}
    </section>
  );
};

export default TranslationSettingsInput;
