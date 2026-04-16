import * as React from "react";
import seqparse from "seqparse";

import SeqViz from "../../src/SeqViz";
 import {
  AnnotationProp,
  FragmentProp,
  Primer,
  SeparatorClickEvent,
  SeparatorProp,
  SequenceEdges,
  SingleStrandAnnotationProp,
} from "../../src/core/elements";
import type { TranslationSettings } from "../../src/SeqViz";
import { ViewerContextMenuEvent } from "../../src/SelectionHandler";
import { defaultSelection, type FragmentSelection, type Selection } from "../../src/state/selectionContext";
import Header from "./Header";
import CheckboxInput from "./components/CheckboxInput";
import ContextInfoPanel, { type ContextInfo } from "./components/ContextInfoPanel";
import ExampleSelect from "./components/ExampleSelect";
import LinearZoomInput from "./components/LinearZoomInput";
import SearchQueryInput from "./components/SearchQueryInput";
import SidebarFooter from "./components/SidebarFooter";
import SidebarHeader from "./components/SidebarHeader";
import ViewerTypeInput from "./components/ViewerTypeInput";
import {
  AMINO_LINEAR_EXAMPLE,
  DEFAULT_ENZYMES,
  DEFAULT_SEARCH_QUERY,
  DEFAULT_ZOOM,
  SEQUENCE_EDGES_EXAMPLE,
  type DemoExampleConfig,
  type DemoExampleId,
  type SupportedSeqType,
  VIEWER_TYPE_OPTIONS,
  type ViewerOption,
  createDefaultTranslations,
} from "./constants";
import file from "./file";
import TranslationSettingsInput from "./components/TranslationSettingsInput";
import CircularZoomInput from "./components/CircularZoomInput";
import { buildGibsonAssemblyPreset } from "./gibsonAssembly";

type ViewerTypeOptionConfig = (typeof VIEWER_TYPE_OPTIONS)[number];

const buildDefaultPresetState = (seq = "") => {
  const { fragments, primers, separators, singleStrandAnnotations } = buildGibsonAssemblyPreset(seq);

  return {
  contextInfo: null as ContextInfo | null,
  disableCircularMap: false,
  disableLinearMap: false,
  disableLinearSequence: false,
  disableSelection: false,
  fragments,
  enzymes: [...DEFAULT_ENZYMES],
  highlightedEnzymes: [] as string[],
  highlightedEnzymesInput: "",
  primers,
  search: { query: DEFAULT_SEARCH_QUERY },
  searchResults: {} as Record<string, unknown>,
  selection: { ...defaultSelection },
  fragmentSelection: null as FragmentSelection | null,
  customSelectionStart: 0,
  customSelectionEnd: 100,
  showComplement: true,
  showEnzymes: true,
  showFeatures: true,
  showFragments: true,
  showHighlights: true,
  showPrimers: true,
  showSequenceName: true,
  showSeparators: true,
  showIndex: true,
  showSelectionMeta: false,
  seqType: "dna" as SupportedSeqType,
  sequenceEdges: undefined as SequenceEdges | undefined,
  singleStrandAnnotations,
  showTranslations: true,
  translations: createDefaultTranslations(),
  separators,
  viewer: "both" as ViewerOption,
  zoom: DEFAULT_ZOOM,
  circularZoom: 0,
  linearMapZoom: 0,
  zoomPopoverOpen: false,
  viewSettingsPopoverOpen: false,
  translationPopoverOpen: true,
  customSelectionPopoverOpen: false,
  highlightedEnzymesPopoverOpen: false,
  clampPopoverOpen: false,
  clampEnabled: false,
  clampStart: 26,
  clampEnd: 600,
  };
};

interface AppState {
  annotations: AnnotationProp[];
  contextInfo: ContextInfo | null;
  disableCircularMap: boolean;
  disableLinearMap: boolean;
  disableLinearSequence: boolean;
  disableSelection: boolean;
  exampleId: DemoExampleId;
  enzymes: string[];
  highlightedEnzymes: string[];
  highlightedEnzymesInput: string;
  fragments: FragmentProp[];
  name: string;
  primers: Primer[];
  search: { query: string };
  searchResults: Record<string, unknown>;
  selection: Selection;
  fragmentSelection: FragmentSelection | null;
  customSelectionStart: number;
  customSelectionEnd: number;
  seq: string;
  seqType: SupportedSeqType;
  separators: SeparatorProp[];
  sequenceEdges?: SequenceEdges;
  showComplement: boolean;
  showEnzymes: boolean;
  showFeatures: boolean;
  showFragments: boolean;
  showHighlights: boolean;
  showPrimers: boolean;
  showSequenceName: boolean;
  showSeparators: boolean;
  showIndex: boolean;
  showSelectionMeta: boolean;
  showSidebar: boolean;
  showTranslations: boolean;
  singleStrandAnnotations: SingleStrandAnnotationProp[];
  translations?: TranslationSettings;
  viewer: ViewerOption;
  zoom: number;
  circularZoom: number;
  linearMapZoom: number;
  zoomPopoverOpen: boolean;
  viewSettingsPopoverOpen: boolean;
  translationPopoverOpen: boolean;
  customSelectionPopoverOpen: boolean;
  highlightedEnzymesPopoverOpen: boolean;
  clampPopoverOpen: boolean;
  clampEnabled: boolean;
  clampStart: number;
  clampEnd: number;
}

export default class App extends React.Component<Record<string, never>, AppState> {
  state: AppState = {
    ...buildDefaultPresetState(),
    annotations: [],
    exampleId: "default",
    name: "",
    seq: "",
    showSidebar: true,
  };
  linearRef: React.RefObject<HTMLElement> = React.createRef<HTMLElement>() as React.RefObject<HTMLElement>;
  circularRef: React.RefObject<HTMLElement> = React.createRef<HTMLElement>() as React.RefObject<HTMLElement>;
  seqViewerRef: React.RefObject<HTMLDivElement | null> = React.createRef<HTMLDivElement>();
  private defaultSequenceData: Pick<AppState, "annotations" | "name" | "seq"> | null = null;
  private presetStateFromConfig = (config: DemoExampleConfig): Omit<DemoExampleConfig, "description"> => {
    const {
      description: _description,
      fragments = [],
      singleStrandAnnotations = [],
      separators = [],
      ...stateProjection
    } = config;
    void _description;
    return { ...stateProjection, fragments, singleStrandAnnotations, separators };
  };

  componentDidMount = async () => {
    const seq = await seqparse(file);
    const assemblyPreset = buildGibsonAssemblyPreset(seq.seq, seq.annotations);
    this.defaultSequenceData = { annotations: seq.annotations, name: seq.name, seq: seq.seq };

    if (this.state.exampleId === "default") {
      this.setState(prevState => ({
        ...prevState,
        ...assemblyPreset,
        annotations: assemblyPreset.annotations,
        name: seq.name,
        seq: assemblyPreset.seq,
      }));
    }
  };

  toggleSidebar = () => {
    const { showSidebar } = this.state;
    this.setState({ showSidebar: !showSidebar });
  };

  toggleZoomPopover = () => {
    this.setState(prev => ({ zoomPopoverOpen: !prev.zoomPopoverOpen }));
  };

  toggleViewSettingsPopover = () => {
    this.setState(prev => ({ viewSettingsPopoverOpen: !prev.viewSettingsPopoverOpen }));
  };

  toggleTranslationPopover = () => {
    this.setState(prev => ({ translationPopoverOpen: !prev.translationPopoverOpen }));
  };

  toggleCustomSelectionPopover = () => {
    this.setState(prev => ({ customSelectionPopoverOpen: !prev.customSelectionPopoverOpen }));
  };

  toggleHighlightedEnzymesPopover = () => {
    this.setState(prev => ({ highlightedEnzymesPopoverOpen: !prev.highlightedEnzymesPopoverOpen }));
  };

  toggleClampPopover = () => {
    this.setState(prev => ({ clampPopoverOpen: !prev.clampPopoverOpen }));
  };

  private clampZoom = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

  private handleZoomChange = (zoom: { circular: number; linear: number; linearMap?: number }) => {
    this.setState({
      zoom: this.clampZoom(zoom.linear),
      circularZoom: this.clampZoom(zoom.circular),
      linearMapZoom: this.clampZoom(zoom.linearMap ?? zoom.circular),
    });
  };

  toggleShowSelectionMeta = () => {
    const { showSelectionMeta } = this.state;
    this.setState({ showSelectionMeta: !showSelectionMeta });
  };

  handleHide = () => {
    this.setState({ showSidebar: false });
  };

  toggleEnzyme = (e: string) => {
    const { enzymes } = this.state;

    if (enzymes.includes(e)) {
      this.setState({ enzymes: enzymes.filter(enz => enz !== e) });
    } else {
      this.setState({ enzymes: [...enzymes, e] });
    }
  };

  handleContextMenuEvent = (contextEvent: ViewerContextMenuEvent, triggerLabel = "Context Menu") => {
    if (!contextEvent) {
      return;
    }

    const { name, selection, fragmentSelection, sequence, type } = contextEvent;
    this.setState({
      contextInfo: {
        name: name || selection?.name || "Sequence selection",
        fragmentSelection: fragmentSelection || null,
        selection,
        sequence,
        type: type || selection?.type,
        triggerLabel,
      },
    });
  };

  dismissContextInfo = () => {
    this.setState({ contextInfo: null });
  };

  copyContextSequence = () => {
    const { contextInfo } = this.state;
    if (!contextInfo || !contextInfo.sequence) {
      return;
    }

    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    navigator.clipboard.writeText(contextInfo.sequence).catch(err => {
      console.warn("Unable to copy sequence", err);
    });
  };

  handleTranslationsToggle = (enabled: boolean) => {
    if (enabled) {
      this.setState(prevState => ({
        showTranslations: true,
        translations: prevState.translations ?? createDefaultTranslations(),
      }));
      return;
    }
    this.setState({ showTranslations: false });
  };

  handleTranslationsChange = (translations: TranslationSettings) => {
    this.setState({ translations });
  };

  handleCustomSelectionStartInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    this.setState({ customSelectionStart: Number.isFinite(nextValue) ? nextValue : 0 });
  };

  handleCustomSelectionEndInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    this.setState({ customSelectionEnd: Number.isFinite(nextValue) ? nextValue : 0 });
  };

  private clampSelectionBoundary = (value: number, seqLength: number) => {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(seqLength, Math.round(value)));
  };

  applyCustomSelection = () => {
    const { customSelectionStart, customSelectionEnd, seq, selection } = this.state;
    const seqLength = seq.length;

    if (!seqLength) {
      return;
    }

    const clampedStart = this.clampSelectionBoundary(customSelectionStart, seqLength);
    const clampedEnd = this.clampSelectionBoundary(customSelectionEnd, seqLength);
    const start = Math.min(clampedStart, clampedEnd);
    const end = Math.max(clampedStart, clampedEnd);
    const length = Math.max(end - start, 0);

    this.setState({
      selection: {
        ...selection,
        clockwise: true,
        start,
        end,
        length,
        type: "",
        viewer: "LINEAR",
        scrollLinearOnSelect: true,
      },
      fragmentSelection: null,
    });
  };

  handleHighlightedEnzymesInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ highlightedEnzymesInput: event.target.value });
  };

  applyHighlightedEnzymes = () => {
    const { highlightedEnzymesInput } = this.state;
    const trimmed = highlightedEnzymesInput.trim();
    if (!trimmed) {
      this.setState({ highlightedEnzymes: [] });
      return;
    }

    const seen = new Set<string>();
    const parsed = trimmed
      .split(",")
      .map(name => name.trim())
      .filter(name => {
        if (!name.length) {
          return false;
        }
        const key = name.toLowerCase();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });

    this.setState({ highlightedEnzymes: parsed });
  };

  handleExampleChange = (exampleId: DemoExampleId) => {
    if (exampleId === this.state.exampleId) {
      return;
    }

    if (exampleId === "default") {
      if (!this.defaultSequenceData) {
        this.setState({ exampleId });
        return;
      }

      const assemblyPreset = buildGibsonAssemblyPreset(this.defaultSequenceData.seq, this.defaultSequenceData.annotations);

      this.setState(prevState => ({
        ...buildDefaultPresetState(this.defaultSequenceData.seq),
        ...assemblyPreset,
        annotations: assemblyPreset.annotations,
        contextInfo: null,
        exampleId,
        name: this.defaultSequenceData!.name,
        searchResults: {},
        selection: { ...defaultSelection },
        fragmentSelection: null,
        seq: assemblyPreset.seq,
        showSelectionMeta: false,
        showSidebar: prevState.showSidebar,
      }));
      return;
    }

    const exampleConfigs: Record<Exclude<DemoExampleId, "default">, DemoExampleConfig> = {
      amino_linear: AMINO_LINEAR_EXAMPLE,
      sequence_edges: SEQUENCE_EDGES_EXAMPLE,
    };
    const presetState = this.presetStateFromConfig(exampleConfigs[exampleId]);

    this.setState(prevState => ({
      ...buildDefaultPresetState(),
      ...presetState,
      fragments: presetState.fragments || [],
      singleStrandAnnotations: presetState.singleStrandAnnotations || [],
      separators: presetState.separators || [],
      showTranslations: typeof presetState.showTranslations === "boolean" ? presetState.showTranslations : true,
      contextInfo: null,
      exampleId,
      searchResults: {},
      selection: { ...defaultSelection },
      fragmentSelection: null,
      showSelectionMeta: false,
      showSidebar: prevState.showSidebar,
    }));
  };

  handleSeparatorClick = ({ order, separator }: SeparatorClickEvent) => {
    const label = separator?.name || (order ? `Separator ${order}` : "Separator");
    const index = separator?.index ?? 0;
    this.setState({
      contextInfo: {
        fragmentSelection: null,
        name: `${label} (position ${index + 1})`,
        selection: {
          ...defaultSelection,
          end: index,
          length: 0,
          name: label,
          start: index,
          type: "SEPARATOR",
          viewer: "LINEAR",
        },
        sequence: "",
        triggerLabel: "Separator",
        type: "SEPARATOR",
      },
    });
  };

  render() {
    const isAminoExample = this.state.exampleId === "amino_linear";
    const allowedLinearViewers: ViewerOption[] = ["linear", "linear_map", "linear_map_linear"];
    const viewerOptions: ReadonlyArray<ViewerTypeOptionConfig> = isAminoExample
      ? VIEWER_TYPE_OPTIONS.filter(option => allowedLinearViewers.includes(option.value))
      : VIEWER_TYPE_OPTIONS;
    const sequenceUnitLabel = this.state.seqType === "aa" ? "aa" : "bp";

    return (
      <div className="demo-shell">
        <aside
          aria-hidden={!this.state.showSidebar}
          className={`options-panel ${this.state.showSidebar ? "open" : "closed"}`}
          id="options-sidebar"
        >
          <SidebarHeader toggleSidebar={this.toggleSidebar} />
          <div className="options-scroll">
            <ExampleSelect value={this.state.exampleId} onChange={this.handleExampleChange} />
            <ViewerTypeInput
              options={viewerOptions}
              value={this.state.viewer}
              setType={(viewer: ViewerOption) => this.setState({ viewer })}
            />
            <SearchQueryInput
              value={this.state.search.query}
              setQuery={query => this.setState({ search: { query } })}
            />
            <div className="option view-settings-popover">
              <button
                className={`toggle-button ${this.state.viewSettingsPopoverOpen ? "active" : ""}`}
                type="button"
                onClick={this.toggleViewSettingsPopover}
              >
                View settings
              </button>
              {this.state.viewSettingsPopoverOpen && (
                <div className="popover">
                  <CheckboxInput
                    checked={this.state.showComplement}
                    label="Show complement"
                    set={(showComplement: boolean) => this.setState({ showComplement })}
                  />
                  <CheckboxInput
                    checked={this.state.showIndex}
                    label="Show index"
                    set={(showIndex: boolean) => this.setState({ showIndex })}
                  />
                  <CheckboxInput
                    checked={this.state.showFeatures}
                    label="Show features"
                    set={(showFeatures: boolean) => this.setState({ showFeatures })}
                  />
                  <CheckboxInput
                    checked={this.state.showFragments}
                    label="Show fragments"
                    set={(showFragments: boolean) => this.setState({ showFragments })}
                  />
                  <CheckboxInput
                    checked={this.state.showPrimers}
                    label="Show primers"
                    set={(showPrimers: boolean) => this.setState({ showPrimers })}
                  />
                  <CheckboxInput
                    checked={this.state.showHighlights}
                    label="Show highlights"
                    set={(showHighlights: boolean) => this.setState({ showHighlights })}
                  />
                  <CheckboxInput
                    checked={this.state.showSequenceName}
                    label="Show sequence name"
                    set={(showSequenceName: boolean) => this.setState({ showSequenceName })}
                  />
                  <CheckboxInput
                    checked={this.state.showEnzymes}
                    label="Show enzymes"
                    set={(showEnzymes: boolean) => this.setState({ showEnzymes })}
                  />
                  <CheckboxInput
                    checked={this.state.showSeparators}
                    label="Show section dividers"
                    set={(showSeparators: boolean) => this.setState({ showSeparators })}
                  />
                  <div className="panel-divider" />
                  <CheckboxInput
                    checked={this.state.disableCircularMap}
                    label="Disable circular viewer"
                    set={(disableCircularMap: boolean) => this.setState({ disableCircularMap })}
                  />
                  <CheckboxInput
                    checked={this.state.disableLinearMap}
                    label="Disable linear map"
                    set={(disableLinearMap: boolean) => this.setState({ disableLinearMap })}
                  />
                  <CheckboxInput
                    checked={this.state.disableLinearSequence}
                    label="Disable linear sequence"
                    set={(disableLinearSequence: boolean) => this.setState({ disableLinearSequence })}
                  />
                  <CheckboxInput
                    checked={this.state.disableSelection}
                    label="Disable selection"
                    set={(disableSelection: boolean) => this.setState({ disableSelection })}
                  />
                </div>
              )}
            </div>
            <div className="option zoom-popover">
              <button
                className={`toggle-button ${this.state.zoomPopoverOpen ? "active" : ""}`}
                type="button"
                onClick={this.toggleZoomPopover}
              >
                Zoom settings
              </button>
              {this.state.zoomPopoverOpen && (
                <div className="popover">
                  <CircularZoomInput
                    value={this.state.circularZoom}
                    setZoom={zoom => this.setState({ circularZoom: zoom })}
                  />
                  <LinearZoomInput value={this.state.zoom} setZoom={zoom => this.setState({ zoom })} />
                  <label className="option" id="linear-map-zoom">
                    <span>Linear map zoom</span>
                    <div className="slider-input">
                      <input
                        className="slider"
                        max={100}
                        min={0}
                        type="range"
                        value={this.state.linearMapZoom}
                        onChange={e => this.setState({ linearMapZoom: parseInt(e.target.value, 10) })}
                      />
                      <span className="slider-value">{this.state.linearMapZoom}</span>
                    </div>
                  </label>
                </div>
              )}
            </div>
            <div className="option translation-popover">
              <button
                className={`toggle-button ${this.state.translationPopoverOpen ? "active" : ""}`}
                type="button"
                onClick={this.toggleTranslationPopover}
              >
                Translation settings
              </button>
              {this.state.translationPopoverOpen && (
                <div className="popover">
                  <TranslationSettingsInput
                    enabled={this.state.showTranslations}
                    seqType={this.state.seqType}
                    value={this.state.translations}
                    onToggle={this.handleTranslationsToggle}
                    onChange={this.handleTranslationsChange}
                  />
                </div>
              )}
            </div>
            <div className="option custom-selection-popover">
              <button
                className={`toggle-button ${this.state.customSelectionPopoverOpen ? "active" : ""}`}
                type="button"
                onClick={this.toggleCustomSelectionPopover}
              >
                Custom selection
              </button>
              {this.state.customSelectionPopoverOpen && (
                <div className="popover">
                  <div className="custom-selection-inputs">
                    <label htmlFor="custom-selection-start">
                      <span>Start</span>
                      <input
                        id="custom-selection-start"
                        min={0}
                        max={this.state.seq.length}
                        type="number"
                        value={this.state.customSelectionStart}
                        onChange={this.handleCustomSelectionStartInput}
                      />
                    </label>
                    <label htmlFor="custom-selection-end">
                      <span>End</span>
                      <input
                        id="custom-selection-end"
                        min={0}
                        max={this.state.seq.length}
                        type="number"
                        value={this.state.customSelectionEnd}
                        onChange={this.handleCustomSelectionEndInput}
                      />
                    </label>
                  </div>
                  <button disabled={!this.state.seq} type="button" onClick={this.applyCustomSelection}>
                    Apply selection
                  </button>
                </div>
              )}
            </div>
            <div className="option highlighted-enzymes-popover">
              <button
                className={`toggle-button ${this.state.highlightedEnzymesPopoverOpen ? "active" : ""}`}
                type="button"
                onClick={this.toggleHighlightedEnzymesPopover}
              >
                Highlighted enzymes
              </button>
              {this.state.highlightedEnzymesPopoverOpen && (
                <div className="popover">
                  <span className="highlighted-enzymes-note">Comma-separated names that stay highlighted.</span>
                  <div className="highlighted-enzymes-input">
                    <input
                      aria-label="Comma separated list of enzyme names to highlight"
                      placeholder="EcoRI, BamHI"
                      type="text"
                      value={this.state.highlightedEnzymesInput}
                      onChange={this.handleHighlightedEnzymesInputChange}
                    />
                    <button type="button" onClick={this.applyHighlightedEnzymes}>
                      Apply
                    </button>
                  </div>
                  {this.state.highlightedEnzymes.length > 0 && (
                    <div className="highlighted-enzymes-active">
                      Active: {this.state.highlightedEnzymes.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="option clamp-popover">
              <button
                className={`toggle-button ${this.state.clampPopoverOpen ? "active" : ""}`}
                type="button"
                onClick={this.toggleClampPopover}
              >
                Clamp settings
              </button>
              {this.state.clampPopoverOpen && (
                <div className="popover">
                  <CheckboxInput
                    checked={this.state.clampEnabled}
                    label="Enable clamp"
                    set={(clampEnabled: boolean) => this.setState({ clampEnabled })}
                  />
                  <label className="option" id="clamp-start">
                    <span>Start (bp)</span>
                    <input
                      disabled={!this.state.clampEnabled}
                      min={0}
                      max={this.state.seq.length}
                      type="number"
                      value={this.state.clampStart}
                      onChange={e => this.setState({ clampStart: Number(e.target.value) })}
                    />
                  </label>
                  <label className="option" id="clamp-end">
                    <span>End (bp)</span>
                    <input
                      disabled={!this.state.clampEnabled}
                      min={0}
                      max={this.state.seq.length}
                      type="number"
                      value={this.state.clampEnd}
                      onChange={e => this.setState({ clampEnd: Number(e.target.value) })}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
          <SidebarFooter />
        </aside>
        <div className="viewer-panel">
          <div id="seqviz-container">
            <Header
              selection={this.state.selection}
              fragmentSelection={this.state.fragmentSelection}
              showSelectionMeta={this.state.showSelectionMeta}
              sequenceUnitLabel={sequenceUnitLabel}
            />
            <div id="seqviewer" ref={this.seqViewerRef}>
              {this.state.seq && (
                <SeqViz
                  seqType={this.state.seqType}
                  key={`${this.state.viewer}${this.state.exampleId}`}
                  annotations={this.state.showFeatures ? this.state.annotations : []}
                  fragments={this.state.showFragments ? this.state.fragments : []}
                  disableCircularMap={this.state.disableCircularMap}
                  disableLinearMap={this.state.disableLinearMap}
                  disableLinearSequence={this.state.disableLinearSequence}
                  disableSelection={this.state.disableSelection}
                  enzymes={this.state.showEnzymes ? this.state.enzymes : []}
                  highlightedEnzymes={this.state.highlightedEnzymes}
                  highlights={this.state.showHighlights ? [{ end: 10, start: 0 }] : []}
                  name={this.state.showSequenceName ? this.state.name : ""}
                  primers={this.state.showPrimers ? this.state.primers : []}
                  refs={{ circular: this.circularRef, linear: this.linearRef }}
                  search={this.state.search}
                  sequenceEdges={this.state.sequenceEdges}
                  separators={this.state.showSeparators ? this.state.separators : []}
                  singleStrandAnnotations={this.state.singleStrandAnnotations}
                  selection={this.state.selection}
                  seq={this.state.seq}
                  showComplement={this.state.showComplement}
                  showIndex={this.state.showIndex}
                  translations={this.state.showTranslations ? this.state.translations : undefined}
                  viewer={this.state.viewer}
                  zoom={{
                    linear: this.state.zoom,
                    circular: this.state.circularZoom,
                    linearMap: this.state.linearMapZoom,
                  }}
                  onZoomChange={this.handleZoomChange}
                  onSeparatorClick={this.handleSeparatorClick}
                  onSelection={(selection, fragmentSelection) => {
                    this.setState({ selection, fragmentSelection: fragmentSelection || null });
                  }}
                  onContextMenu={event => this.handleContextMenuEvent(event, "Context Menu")}
                  clamp={this.state.clampEnabled ? { start: this.state.clampStart, end: this.state.clampEnd } : undefined}
                  onDoubleClick={event => this.handleContextMenuEvent(event, "Double Click")}
                ></SeqViz>
              )}
            </div>
            <ContextInfoPanel
              info={this.state.contextInfo}
              sequenceUnitLabel={sequenceUnitLabel}
              onDismiss={this.dismissContextInfo}
            />
          </div>
        </div>
      </div>
    );
  }
}
