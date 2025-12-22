import * as React from "react";
import seqparse from "seqparse";

import SeqViz from "../../src/SeqViz";
import { AnnotationProp, Primer, SingleStrandAnnotationProp } from "../../src/core/elements";
import type { TranslationSettings } from "../../src/SeqViz";
import { ViewerContextMenuEvent } from "../../src/SelectionHandler";
import { FragmentSelection } from "../../src/state/selectionContext";
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
  createDefaultSingleStrandAnnotations,
  createDefaultTranslations,
} from "./constants";
import file from "./file";
import TranslationSettingsInput from "./components/TranslationSettingsInput";
import CircularZoomInput from "./components/CircularZoomInput";

type ViewerTypeOptionConfig = (typeof VIEWER_TYPE_OPTIONS)[number];

const buildDefaultPresetState = () => ({
  contextInfo: null as ContextInfo | null,
  disableCircularMap: false,
  disableLinearMap: false,
  disableLinearSequence: false,
  enzymes: [...DEFAULT_ENZYMES],
  primers: createDefaultPrimers(),
  search: { query: DEFAULT_SEARCH_QUERY },
  searchResults: {},
  selection: {},
  fragmentSelection: null as FragmentSelection | null,
  showComplement: true,
  showIndex: true,
  showSelectionMeta: false,
  seqType: "dna" as SupportedSeqType,
  singleStrandAnnotations: createDefaultSingleStrandAnnotations(),
  showTranslations: true,
  translations: createDefaultTranslations(),
  viewer: "both" as ViewerOption,
  zoom: DEFAULT_ZOOM,
  circularZoom: 0,
});

interface AppState {
  annotations: AnnotationProp[];
  contextInfo: ContextInfo | null;
  disableCircularMap: boolean;
  disableLinearMap: boolean;
  disableLinearSequence: boolean;
  exampleId: DemoExampleId;
  enzymes: any[];
  name: string;
  primers: Primer[];
  search: { query: string };
  searchResults: any;
  selection: any;
  fragmentSelection: FragmentSelection | null;
  seq: string;
  seqType: SupportedSeqType;
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
}

export default class App extends React.Component<any, AppState> {
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
  private defaultSequenceData: Pick<AppState, "annotations" | "name" | "seq"> | null = null;
  private presetStateFromConfig = (config: DemoExampleConfig): Omit<DemoExampleConfig, "description"> => {
    const { description: _description, singleStrandAnnotations = [], ...stateProjection } = config;
    return { ...stateProjection, singleStrandAnnotations };
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
        selection: {},
        fragmentSelection: null,
        showSelectionMeta: false,
        showSidebar: prevState.showSidebar,
      }));
      return;
    }

    const presetState = this.presetStateFromConfig(AMINO_LINEAR_EXAMPLE);

    this.setState(prevState => ({
      ...presetState,
      singleStrandAnnotations: presetState.singleStrandAnnotations || [],
      showTranslations: typeof presetState.showTranslations === "boolean" ? presetState.showTranslations : true,
      contextInfo: null,
      exampleId,
      searchResults: {},
      selection: {},
      fragmentSelection: null,
      showSelectionMeta: false,
      showSidebar: prevState.showSidebar,
    }));
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
            <CircularZoomInput value={this.state.circularZoom} setZoom={zoom => this.setState({ circularZoom: zoom })} />
            <LinearZoomInput value={this.state.zoom} setZoom={zoom => this.setState({ zoom })} />
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
            <TranslationSettingsInput
              enabled={this.state.showTranslations}
              seqType={this.state.seqType}
              value={this.state.translations}
              onToggle={this.handleTranslationsToggle}
              onChange={this.handleTranslationsChange}
            />
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
            <div id="seqviewer">
              {this.state.seq && (
                <SeqViz
                  seqType={this.state.seqType}
                  key={`${this.state.viewer}${this.state.exampleId}`}
                  annotations={this.state.annotations}
                  disableCircularMap={this.state.disableCircularMap}
                  disableLinearMap={this.state.disableLinearMap}
                  disableLinearSequence={this.state.disableLinearSequence}
                  enzymes={this.state.enzymes}
                  highlights={[{ end: 10, start: 0 }]}
                  name={this.state.name}
                  primers={this.state.primers}
                  refs={{ circular: this.circularRef, linear: this.linearRef }}
                  search={this.state.search}
                  singleStrandAnnotations={this.state.singleStrandAnnotations}
                  selection={this.state.selection}
                  seq={this.state.seq}
                  showComplement={this.state.showComplement}
                  showIndex={this.state.showIndex}
                  translations={this.state.showTranslations ? this.state.translations : undefined}
                  viewer={this.state.viewer}
                  zoom={{ linear: this.state.zoom, circular: this.state.circularZoom }}
                  onSelection={(selection, fragmentSelection) => {
                    this.setState({ selection, fragmentSelection: fragmentSelection || null });
                  }}
                  onContextMenu={event => this.handleContextMenuEvent(event, "Context Menu")}
                  onDoubleClick={event => this.handleContextMenuEvent(event, "Double Click")}
                >
                </SeqViz>
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
