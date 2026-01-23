import * as React from "react";
import seqparse from "seqparse";

import SeqViz from "../../src/SeqViz";
 import {
  AnnotationProp,
  FragmentProp,
  Primer,
  SeparatorClickEvent,
  SeparatorProp,
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
  type DemoExampleConfig,
  type DemoExampleId,
  type SupportedSeqType,
  VIEWER_TYPE_OPTIONS,
  type ViewerOption,
  createDefaultPrimers,
  createDefaultSeparators,
  createDefaultSingleStrandAnnotations,
  createDefaultTranslations,
} from "./constants";
import file from "./file";
import TranslationSettingsInput from "./components/TranslationSettingsInput";
import CircularZoomInput from "./components/CircularZoomInput";

type ViewerTypeOptionConfig = (typeof VIEWER_TYPE_OPTIONS)[number];

const DEMO_FRAGMENT: FragmentProp = {
  color: "#FFB347",
  direction: 1,
  end: 775,
  id: "demo-fragment-1-1343",
  name: "Fragment (AciI - PvuII)",
  start: 56,
};

const buildDefaultPresetState = () => ({
  contextInfo: null as ContextInfo | null,
  disableCircularMap: false,
  disableLinearMap: false,
  disableLinearSequence: false,
  fragments: [{ ...DEMO_FRAGMENT }],
  enzymes: [...DEFAULT_ENZYMES],
  primers: createDefaultPrimers(),
  search: { query: DEFAULT_SEARCH_QUERY },
  searchResults: {} as Record<string, unknown>,
  selection: { ...defaultSelection },
  fragmentSelection: null as FragmentSelection | null,
  showComplement: true,
  showIndex: true,
  showSelectionMeta: false,
  seqType: "dna" as SupportedSeqType,
  singleStrandAnnotations: createDefaultSingleStrandAnnotations(),
  showTranslations: true,
  translations: createDefaultTranslations(),
  separators: createDefaultSeparators(),
  viewer: "both" as ViewerOption,
  zoom: DEFAULT_ZOOM,
  circularZoom: 0,
  linearMapZoom: 0,
  zoomPopoverOpen: false,
  translationPopoverOpen: true,
});

interface AppState {
  annotations: AnnotationProp[];
  contextInfo: ContextInfo | null;
  disableCircularMap: boolean;
  disableLinearMap: boolean;
  disableLinearSequence: boolean;
  exampleId: DemoExampleId;
  enzymes: string[];
  fragments: FragmentProp[];
  name: string;
  primers: Primer[];
  search: { query: string };
  searchResults: Record<string, unknown>;
  selection: Selection;
  fragmentSelection: FragmentSelection | null;
  seq: string;
  seqType: SupportedSeqType;
  separators: SeparatorProp[];
  showComplement: boolean;
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
  translationPopoverOpen: boolean;
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
  linearRef: React.RefObject<HTMLDivElement> = React.createRef();
  circularRef: React.RefObject<HTMLDivElement> = React.createRef();
  seqViewerRef: React.RefObject<HTMLDivElement> = React.createRef();
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
    this.defaultSequenceData = { annotations: seq.annotations, name: seq.name, seq: seq.seq };

    if (this.state.exampleId === "default") {
      this.setState(this.defaultSequenceData);
    }
  };

  toggleSidebar = () => {
    const { showSidebar } = this.state;
    this.setState({ showSidebar: !showSidebar });
  };

  toggleZoomPopover = () => {
    this.setState(prev => ({ zoomPopoverOpen: !prev.zoomPopoverOpen }));
  };

  toggleTranslationPopover = () => {
    this.setState(prev => ({ translationPopoverOpen: !prev.translationPopoverOpen }));
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

  handleExampleChange = (exampleId: DemoExampleId) => {
    if (exampleId === this.state.exampleId) {
      return;
    }

    if (exampleId === "default") {
      if (!this.defaultSequenceData) {
        this.setState({ exampleId });
        return;
      }

      this.setState(prevState => ({
        ...buildDefaultPresetState(),
        ...this.defaultSequenceData!,
        singleStrandAnnotations: createDefaultSingleStrandAnnotations(),
        contextInfo: null,
        exampleId,
        searchResults: {},
        selection: { ...defaultSelection },
        fragmentSelection: null,
        showSelectionMeta: false,
        showSidebar: prevState.showSidebar,
      }));
      return;
    }

    const presetState = this.presetStateFromConfig(AMINO_LINEAR_EXAMPLE);

    this.setState(prevState => ({
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
        name: `${label} (position ${index})`,
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
          <style>{`
            .zoom-popover .popover,
            .translation-popover .popover {
              border: 1px solid rgba(0,0,0,0.1);
              border-radius: 6px;
              margin-top: 8px;
              padding: 8px 10px;
              background: #fff;
              box-shadow: 0 6px 14px rgba(0,0,0,0.08);
            }
            .toggle-button {
              align-items: center;
              border: 1px solid rgba(0,0,0,0.15);
              border-radius: 4px;
              cursor: pointer;
              display: inline-flex;
              gap: 8px;
              padding: 6px 10px;
              background: #f7f7f7;
            }
            .toggle-button.active {
              background: #e8f0ff;
              border-color: #5b8def;
            }
            .toggle-button::after {
              content: "▾";
              font-size: 0.8rem;
              opacity: 0.7;
            }
            .toggle-button.active::after {
              content: "▴";
              opacity: 1;
            }
          `}</style>
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
              toggleShowSelectionMeta={this.toggleShowSelectionMeta}
              toggleSidebar={this.toggleSidebar}
            />
            <div id="seqviewer" ref={this.seqViewerRef}>
              {this.state.seq && (
                <SeqViz
                  seqType={this.state.seqType}
                  key={`${this.state.viewer}${this.state.exampleId}`}
                  annotations={this.state.annotations}
                  fragments={this.state.fragments}
                  disableCircularMap={this.state.disableCircularMap}
                  disableLinearMap={this.state.disableLinearMap}
                  disableLinearSequence={this.state.disableLinearSequence}
                  enzymes={this.state.enzymes}
                  highlights={[{ end: 10, start: 0 }]}
                  name={this.state.name}
                  primers={this.state.primers}
                  refs={{ circular: this.circularRef, linear: this.linearRef }}
                  search={this.state.search}
                  separators={this.state.separators}
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
                  onDoubleClick={event => this.handleContextMenuEvent(event, "Double Click")}
                ></SeqViz>
              )}
            </div>
            <ContextInfoPanel
              info={this.state.contextInfo}
              sequenceUnitLabel={sequenceUnitLabel}
              onCopySequence={this.copyContextSequence}
              onDismiss={this.dismissContextInfo}
            />
          </div>
        </div>
      </div>
    );
  }
}
