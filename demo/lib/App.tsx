import * as React from "react";
import seqparse from "seqparse";

import Circular from "../../src/Circular/Circular";
import Linear from "../../src/Linear/Linear";
import LinearMap from "../../src/LinearMap/LinearMap";
import SeqViz from "../../src/SeqViz";
import { chooseRandomColor } from "../../src/colors";
import { AnnotationProp, Primer, TranslationProp } from "../../src/elements";
import { ViewerContextMenuEvent } from "../../src/SelectionHandler";
import type { Selection as SelectionType } from "../../src/selectionContext";
import Header from "./Header";
import file from "./file";

type ViewerOption = "both" | "circular" | "linear" | "both_flip" | "linear_map" | "linear_map_linear";

const viewerTypeOptions = [
  { key: "both", text: "Both", value: "both" },
  { key: "circular", text: "Circular", value: "circular" },
  { key: "linear", text: "Linear", value: "linear" },
  { key: "both_flip", text: "Both Flip", value: "both_flip" },
  { key: "linear_map", text: "Linear Map", value: "linear_map" },
  { key: "linear_map_linear", text: "Linear Map + Linear", value: "linear_map_linear" },
];

interface ContextInfo {
  name?: string;
  selection: SelectionType;
  sequence: string;
  type?: SelectionType["type"];
}

interface AppState {
  annotations: AnnotationProp[];
  contextInfo: ContextInfo | null;
  customChildren: boolean;
  disableCircularMap: boolean;
  disableLinearMap: boolean;
  disableLinearSequence: boolean;
  enzymes: any[];
  name: string;
  primers: Primer[];
  search: { query: string };
  searchResults: any;
  selection: any;
  seq: string;
  showComplement: boolean;
  showIndex: boolean;
  showSelectionMeta: boolean;
  showSidebar: boolean;
  translations: TranslationProp[];
  viewer: ViewerOption;
  zoom: number;
}

export default class App extends React.Component<any, AppState> {
  state: AppState = {
    annotations: [],
    contextInfo: null,
    customChildren: false,
    disableCircularMap: false,
    disableLinearMap: false,
    disableLinearSequence: false,
    // enzymes: ["PstI", "EcoRI", "XbaI", "SpeI"],
    // enzymes: [
    //   { fcut: 3, name: "Acc16I", rcut: 3, rseq: "TGCGCA" },
    //   { fcut: 3, name: "Acc16II", rcut: 3, rseq: "TGCGCA" },
    //   { fcut: 3, name: "Acc16III", rcut: 3, rseq: "TGCGCA" }
    // ],
    enzymes: [
      "PstI",
      "EcoRI",
      "XbaI",
      "SpeI",
      "Acc16I",
      "Acc65I",
      "AccIII",
      "AcII",
      "AfeuI",
      "AfIII",
      "AqeI",
      "AhaIII",
      "Aor14HI",
      "Aor51HI",
      "AseI",
      "AsiGI",
      "Asp718I",
      "AspA2O",
      "AssI",
      "AsuII",
      "AviII",
      "AvrII",
      "BaII",
      "BcII",
      "BqIII",
      "BInI",
      "BmcAI",
      "Bpu14I",
      "BseAI",
      "BshTI",
      "Bsp119I",
      "Bsp13I",
      "Bsp1407I",
      "Bsp19I",
      "Bsp68I",
      "BspEI",
      "BspHI",
      "BspMII",
      "BspMII",
      "BspTI04I",
      "BspTI",
      "BsrGI",
      "Bst98I",
      "BstAFI",
      "BstAUI",
      "BstBI",
      "BstHPI",
      "BstSNI",
      "BtuMI",
      "CciI",
      "Cfr42I",
      "Csp45I",
      "CspAI",
      "DraI",
      "EcI136II",
      "Eco105I",
      "Eco32I",
      "Eco47III",
      "Eco53kI",
      "EcoICRI",
      "EcoRI",
      "EcoRV",
      "EcoT22I",
      "FauNDI",
      "FvaI",
      "FspI",
      "HpaI",
      "Kpn2I",
      "KpnI",
      "Ksp22I",
      "KspAI",
      "KspI",
      "MIsI",
      "MiuNI",
      "MroI",
      "MscI",
      "Msp20I",
      "MspCI",
      "MstI",
      "NcoI",
      "NdeI",
      "NruI",
      "NsbI",
      "NsiI",
      "PaeR7I",
      "PaqI",
      "PinAI",
      "Ppu10I",
      "PshBI",
      "Psp123BI",
      "Psp1406I",
      "PstI",
      "PvuII",
      "RcaI",
      "RruI",
      "SacI",
      "SacII",
      "SaII",
      "ScaI",
      "SciI",
      "Sfr274I",
      "Sfr303I",
      "SfuI",
      "SqrBI",
      "SlaI",
      "SnaBI",
      "SpeI",
      "SspI",
      "SstI",
      "StrI",
      "VspI",
      "XbaI",
      "XhoI",
      "XmaJI",
    ],
    name: "",
    primers: [
      {
        color: chooseRandomColor(),
        direction: 1,
        end: 653,
        id: "527923581",
        name: "pLtetO-1 fw primer",
        start: 633,
      },
      {
        color: chooseRandomColor(),
        direction: -1,
        end: 706,
        id: "5279asdf582",
        name: "pLtetO-1 rev primer",
        start: 686,
      },
      {
        color: chooseRandomColor(),
        direction: 1,
        end: 535,
        id: "5279fd582",
        name: "pLtetO-1 fwd primer",
        start: 512,
      },
      {
        color: chooseRandomColor(),
        direction: -1,
        end: 535,
        id: "527923dfd582",
        name: "pLtetO-1 rev primer",
        start: 512,
      },
    ],
    search: { query: "ttnnnaat" },
    searchResults: {},
    selection: {},
    seq: "",
    showComplement: true,
    showIndex: true,
    showSelectionMeta: false,
    showSidebar: true,
    translations: [
      { color: chooseRandomColor(), direction: -1, end: 630, name: "ORF 1", start: 6 },
      { end: 1147, name: "", start: 736 },
      { end: 1885, name: "ORF 2", start: 1165 },
    ],
    viewer: "both",
    zoom: 50,
  };
  linearRef: React.RefObject<HTMLDivElement> = React.createRef();
  circularRef: React.RefObject<HTMLDivElement> = React.createRef();

  componentDidMount = async () => {
    const seq = await seqparse(file);

    this.setState({ annotations: seq.annotations, name: seq.name, seq: seq.seq });
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

  handleContextMenuEvent = (contextEvent: ViewerContextMenuEvent) => {
    if (!contextEvent) {
      return;
    }

    const { name, selection, sequence, type } = contextEvent;
    this.setState({
      contextInfo: {
        name: name || selection?.name || "Sequence selection",
        selection,
        sequence,
        type: type || selection?.type,
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

  renderContextInfoPanel = () => {
    const { contextInfo } = this.state;
    if (!contextInfo) {
      return null;
    }

    const { selection, sequence } = contextInfo;
    const start = selection?.start ?? 0;
    const end = selection?.end ?? start;
    const derivedLength =
      typeof selection?.length === "number" && selection.length > 0
        ? selection.length
        : Math.abs(end - start) || sequence.length || 0;
    const viewerLabel = selection?.viewer ? selection.viewer.toLowerCase() : "linear";
    const typeLabel = (contextInfo.type || selection?.type || "SEQ").toLowerCase();
    const displayName = contextInfo.name || selection?.name || "Sequence selection";
    const truncatedSequence = sequence
      ? sequence.length > 220
        ? `${sequence.slice(0, 220)}…`
        : sequence
      : "No bases selected";

    return (
      <section className="context-info-panel" aria-live="polite">
        <header className="context-info-header">
          <div>
            <p className="context-info-label">Context Menu Insight</p>
            <h4>{displayName}</h4>
          </div>
          <button
            aria-label="Dismiss selection details"
            className="context-info-close"
            onClick={this.dismissContextInfo}
            type="button"
          >
            ×
          </button>
        </header>
        <div className="context-info-body">
          <div className="context-info-meta">
            <span className="context-pill">{typeLabel}</span>
            <span className="context-pill">{viewerLabel} view</span>
            <span className="context-pill">{derivedLength} bp</span>
          </div>
          <dl className="context-info-stats">
            <div>
              <dt>Range</dt>
              <dd>
                {start} – {end}
              </dd>
            </div>
            <div>
              <dt>Clockwise</dt>
              <dd>{selection?.clockwise === false ? "No" : "Yes"}</dd>
            </div>
          </dl>
          <pre className="context-info-seq">{truncatedSequence}</pre>
        </div>
      </section>
    );
  };

  render() {
    const { disableCircularMap, disableLinearMap, disableLinearSequence } = this.state;
    let customChildren = null;
    if (this.state.customChildren) {
      customChildren = ({ circularProps, handleMouseEvent, inputRef, linearMapProps, linearProps, onUnmount }) => {
        if (this.state.viewer === "linear_map") {
          if (disableLinearMap) return null;
          return (
            <div ref={this.linearRef} style={{ height: "100%", width: "100%" }}>
              <LinearMap {...linearMapProps} handleMouseEvent={handleMouseEvent} inputRef={inputRef} />
            </div>
          );
        } else if (this.state.viewer === "linear_map_linear") {
          const canShowMap = !disableLinearMap;
          const canShowLinear = !disableLinearSequence;
          if (!canShowMap && !canShowLinear) return null;
          const mapProps = { ...linearMapProps, size: { ...linearMapProps.size, height: 0 } };
          return (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
              {canShowMap && (
                <div style={{ flex: "0 0 auto" }}>
                  <LinearMap {...mapProps} handleMouseEvent={handleMouseEvent} inputRef={inputRef} />
                </div>
              )}
              {canShowLinear && (
                <div style={{ flex: "1 1 auto", height: "100%", minHeight: 0, overflow: "hidden" }}>
                  <Linear
                    {...linearProps}
                    handleMouseEvent={handleMouseEvent}
                    inputRef={inputRef}
                    onUnmount={onUnmount}
                  />
                </div>
              )}
            </div>
          );
        } else if (this.state.viewer === "linear") {
          if (disableLinearSequence) return null;
          return (
            <div ref={this.linearRef} style={{ height: "100%", width: "100%" }}>
              <Linear {...linearProps} handleMouseEvent={handleMouseEvent} inputRef={inputRef} onUnmount={onUnmount} />
            </div>
          );
        } else if (this.state.viewer === "circular") {
          if (disableCircularMap) return null;
          return (
            <div ref={this.circularRef} style={{ height: "100%", width: "100%" }}>
              <Circular
                {...circularProps}
                handleMouseEvent={handleMouseEvent}
                inputRef={inputRef}
                onUnmount={onUnmount}
              />
            </div>
          );
        } else if (this.state.viewer === "both") {
          const canShowCircular = !disableCircularMap;
          const canShowLinear = !disableLinearSequence;
          if (!canShowCircular && !canShowLinear) return null;
          return (
            <div style={{ display: "flex", flexDirection: "row", height: "100%", width: "100%" }}>
              {canShowCircular && (
                <div ref={this.circularRef} style={{ height: "100%", width: canShowLinear ? "50%" : "100%" }}>
                  <Circular
                    {...circularProps}
                    handleMouseEvent={handleMouseEvent}
                    inputRef={inputRef}
                    onUnmount={onUnmount}
                  />
                </div>
              )}
              {canShowLinear && (
                <div ref={this.linearRef} style={{ height: "100%", width: canShowCircular ? "50%" : "100%" }}>
                  <Linear
                    {...linearProps}
                    handleMouseEvent={handleMouseEvent}
                    inputRef={inputRef}
                    onUnmount={onUnmount}
                  />
                </div>
              )}
            </div>
          );
        } else if (this.state.viewer === "both_flip") {
          const canShowCircular = !disableCircularMap;
          const canShowLinear = !disableLinearSequence;
          if (!canShowCircular && !canShowLinear) return null;
          return (
            <div style={{ display: "flex", flexDirection: "row", height: "100%", width: "100%" }}>
              {canShowLinear && (
                <div ref={this.linearRef} style={{ height: "100%", width: canShowCircular ? "50%" : "100%" }}>
                  <Linear
                    {...linearProps}
                    handleMouseEvent={handleMouseEvent}
                    inputRef={inputRef}
                    onUnmount={onUnmount}
                  />
                </div>
              )}
              {canShowCircular && (
                <div ref={this.circularRef} style={{ height: "100%", width: canShowLinear ? "50%" : "100%" }}>
                  <Circular
                    {...circularProps}
                    handleMouseEvent={handleMouseEvent}
                    inputRef={inputRef}
                    onUnmount={onUnmount}
                  />
                </div>
              )}
            </div>
          );
        } else {
          const canShowCircular = !disableCircularMap;
          const canShowLinear = !disableLinearSequence;
          return (
            <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
              {canShowLinear && (
                <div ref={this.linearRef} style={{ height: "25%", width: "100%" }}>
                  <Linear
                    {...linearProps}
                    handleMouseEvent={handleMouseEvent}
                    inputRef={inputRef}
                    onUnmount={onUnmount}
                  />
                </div>
              )}
              {canShowCircular && (
                <div ref={this.circularRef} style={{ height: canShowLinear ? "75%" : "100%", width: "100%" }}>
                  <Circular
                    {...circularProps}
                    handleMouseEvent={handleMouseEvent}
                    inputRef={inputRef}
                    onUnmount={onUnmount}
                  />
                </div>
              )}
            </div>
          );
        }
      };
    }

    return (
      <div className="demo-shell">
        <aside
          aria-hidden={!this.state.showSidebar}
          className={`options-panel ${this.state.showSidebar ? "open" : "closed"}`}
          id="options-sidebar"
        >
          <SidebarHeader toggleSidebar={this.toggleSidebar} />
          <div className="options-scroll">
            <ViewerTypeInput value={this.state.viewer} setType={(viewer: ViewerOption) => this.setState({ viewer })} />
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
            <CheckboxInput
              checked={this.state.customChildren}
              label="Custom children"
              set={(customChildren: boolean) => this.setState({ customChildren })}
            />
          </div>
          <SidebarFooter />
        </aside>
        <div className="viewer-panel">
          <div id="seqviz-container">
            <Header
              selection={this.state.selection}
              showSelectionMeta={this.state.showSelectionMeta}
              toggleShowSelectionMeta={this.toggleShowSelectionMeta}
              toggleSidebar={this.toggleSidebar}
            />
            <div id="seqviewer">
              {this.state.seq && (
                <SeqViz
                  // accession="MN623123"
                  key={`${this.state.viewer}${this.state.customChildren}`}
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
                  selection={this.state.selection}
                  seq={this.state.seq}
                  showComplement={this.state.showComplement}
                  showIndex={this.state.showIndex}
                  translations={this.state.translations}
                  viewer={this.state.viewer}
                  zoom={{ linear: this.state.zoom }}
                  onSelection={selection => {
                    this.setState({ selection });
                  }}
                  onContextMenu={this.handleContextMenuEvent}
                >
                  {customChildren}
                </SeqViz>
              )}
            </div>
            {this.renderContextInfoPanel()}
          </div>
        </div>
      </div>
    );
  }
}

const ViewerTypeInput = ({ setType, value }: { setType: (viewType: ViewerOption) => void; value: ViewerOption }) => (
  <label className="option" id="topology">
    <span>Topology</span>
    <select value={value} onChange={e => setType(e.target.value as ViewerOption)}>
      {viewerTypeOptions.map(option => (
        <option key={option.value} value={option.value}>
          {option.text}
        </option>
      ))}
    </select>
  </label>
);

const LinearZoomInput = ({ setZoom, value }: { setZoom: (zoom: number) => void; value: number }) => (
  <label className="option" id="zoom">
    <span>Zoom</span>
    <div className="slider-input">
      <input
        className="slider"
        max={100}
        min={1}
        type="range"
        value={value}
        onChange={e => {
          setZoom(parseInt(e.target.value));
        }}
      />
      <span className="slider-value">{value}</span>
    </div>
  </label>
);

const SearchQueryInput = ({ setQuery, value }: { setQuery: (query: string) => void; value: string }) => (
  <label className="option" id="options-search">
    <span>Search</span>
    <input placeholder="Search..." type="text" value={value} onChange={e => setQuery(e.target.value)} />
  </label>
);

const CheckboxInput = ({ checked, label, set }: { checked: boolean; label: string; set: (v: boolean) => void }) => (
  <label className="option checkbox-option">
    <input checked={checked} type="checkbox" onChange={e => set(e.target.checked)} />
    <span>{label}</span>
  </label>
);

const SidebarHeader = ({ toggleSidebar }: { toggleSidebar: () => void }) => (
  <div className="sidebar-header">
    <div id="header-left">
      <img alt="SeqViz" id="seqviz-graphic" src="https://tools.latticeautomation.com/seqviz/seqviz-logo.png" />
      <h3>Sequence Viewer</h3>
    </div>
  </div>
);

const SidebarFooter = () => (
  <div className="sidebar-footer">
    <img
      alt="Lattice Automation"
      className="brand-logo"
      src="https://tools.latticeautomation.com/seqviz/lattice-brand.png"
    />
    <p>
      Created by{" "}
      <strong>
        <a href="https://latticeautomation.com/" rel="noopener noreferrer" target="_blank">
          Lattice Automation
        </a>
      </strong>
    </p>
    <hr />
    <img
      alt="Lab Thread"
      className="brand-logo"
      src="https://cdn.prod.website-files.com/683ed6945a5c48c31a0f0e8a/685d55f0e506194500ac6fb2_Primary%20Logo%20Full%20Color%402x.png"
    />
    <p>
      Enhanced by{" "}
      <strong>
        <a href="https://labthread.com/" rel="noopener noreferrer" target="_blank">
          Lab Thread
        </a>
      </strong>
    </p>
    <hr />
    <p>
      <a href="https://github.com/Lattice-Automation/seqviz" rel="noopener noreferrer" target="_blank">
        GitHub
      </a>
      <span>{"  |  "}</span>
      <a
        href="https://medium.com/@lattice.core/visualize-your-dna-sequences-with-seqviz-b1d945eb9684"
        rel="noopener noreferrer"
        target="_blank"
      >
        Story
      </a>
      <span>{"  |  "}</span>
      <a
        href="https://docs.google.com/forms/d/1ILD3UwPvdkQlM06En7Pl9VqVpN_-g5iWs-B6gjKh9b0/viewform?edit_requested=true"
        rel="noopener noreferrer"
        target="_blank"
      >
        Survey
      </a>
    </p>
    <p>
      <span>contact@latticeautomation.com</span>
    </p>
    <p>
      <span>info@labthread.com</span>
    </p>
  </div>
);
