import * as React from "react";
import {
  Button,
  Checkbox,
  Container,
  Divider,
  Dropdown,
  Grid,
  Icon,
  Image,
  Input,
  Menu,
  Sidebar,
} from "semantic-ui-react";
import seqparse from "seqparse";

import Circular from "../../src/Circular/Circular";
import Linear from "../../src/Linear/Linear";
import LinearMap from "../../src/LinearMap/LinearMap";
import SeqViz from "../../src/SeqViz";
import { chooseRandomColor } from "../../src/colors";
import { AnnotationProp, Primer, TranslationProp } from "../../src/elements";
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

interface AppState {
  annotations: AnnotationProp[];
  customChildren: boolean;
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
    customChildren: true,
    enzymes: ["PstI", "EcoRI", "XbaI", "SpeI"],
    // enzymes: [
    //   { fcut: 3, name: "Acc16I", rcut: 3, rseq: "TGCGCA" },
    //   { fcut: 3, name: "Acc16II", rcut: 3, rseq: "TGCGCA" },
    //   { fcut: 3, name: "Acc16III", rcut: 3, rseq: "TGCGCA" }
    // ],
    // enzymes: ["PstI", "EcoRI", "XbaI", "SpeI", "Acc16I", "Acc65I", "AccIII", "AcII", "AfeuI", "AfIII", "AqeI", "AhaIII", "Aor14HI", "Aor51HI", "AseI", "AsiGI", "Asp718I", "AspA2O", "AssI", "AsuII", "AviII", "AvrII", "BaII", "BcII", "BqIII", "BInI", "BmcAI", "Bpu14I", "BseAI", "BshTI", "Bsp119I", "Bsp13I", "Bsp1407I", "Bsp19I", "Bsp68I", "BspEI", "BspHI", "BspMII", "BspMII", "BspTI04I", "BspTI", "BsrGI", "Bst98I", "BstAFI", "BstAUI", "BstBI", "BstHPI", "BstSNI", "BtuMI", "CciI", "Cfr42I", "Csp45I", "CspAI", "DraI", "EcI136II", "Eco105I", "Eco32I", "Eco47III", "Eco53kI", "EcoICRI", "EcoRI", "EcoRV", "EcoT22I", "FauNDI", "FvaI", "FspI", "HpaI", "Kpn2I", "KpnI", "Ksp22I", "KspAI", "KspI", "MIsI", "MiuNI", "MroI", "MscI", "Msp20I", "MspCI", "MstI", "NcoI", "NdeI", "NruI", "NsbI", "NsiI", "PaeR7I", "PaqI", "PinAI", "Ppu10I", "PshBI", "Psp123BI", "Psp1406I", "PstI", "PvuII", "RcaI", "RruI", "SacI", "SacII", "SaII", "ScaI", "SciI", "Sfr274I", "Sfr303I", "SfuI", "SqrBI", "SlaI", "SnaBI", "SpeI", "SspI", "SstI", "StrI", "VspI", "XbaI", "XhoI", "XmaJI"],
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
    showSidebar: false,
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

  render() {
    let customChildren = null;
    if (this.state.customChildren) {
      customChildren = ({ circularProps, handleMouseEvent, inputRef, linearMapProps, linearProps, onUnmount }) => {
        if (this.state.viewer === "linear_map") {
          return (
            <div ref={this.linearRef} style={{ height: "100%", width: "100%" }}>
              <LinearMap {...linearMapProps} handleMouseEvent={handleMouseEvent} inputRef={inputRef} />
            </div>
          );
        } else if (this.state.viewer === "linear_map_linear") {
          const mapProps = { ...linearMapProps, size: { ...linearMapProps.size, height: 0 } };
          return (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
              <div style={{ flex: "0 0 auto" }}>
                <LinearMap {...mapProps} handleMouseEvent={handleMouseEvent} inputRef={inputRef} />
              </div>
              <div style={{ flex: "1 1 auto", height: "100%", minHeight: 0, overflow: "hidden" }}>
                <Linear
                  {...linearProps}
                  handleMouseEvent={handleMouseEvent}
                  inputRef={inputRef}
                  onUnmount={onUnmount}
                />
              </div>
            </div>
          );
        } else if (this.state.viewer === "linear") {
          return (
            <div ref={this.linearRef} style={{ height: "100%", width: "100%" }}>
              <Linear {...linearProps} handleMouseEvent={handleMouseEvent} inputRef={inputRef} onUnmount={onUnmount} />
            </div>
          );
        } else if (this.state.viewer === "circular") {
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
          return (
            <div style={{ display: "flex", flexDirection: "row", height: "100%", width: "100%" }}>
              <div ref={this.circularRef} style={{ height: "100%", width: "50%" }}>
                <Circular
                  {...circularProps}
                  handleMouseEvent={handleMouseEvent}
                  inputRef={inputRef}
                  onUnmount={onUnmount}
                />
              </div>
              <div ref={this.linearRef} style={{ height: "100%", width: "50%" }}>
                <Linear
                  {...linearProps}
                  handleMouseEvent={handleMouseEvent}
                  inputRef={inputRef}
                  onUnmount={onUnmount}
                />
              </div>
            </div>
          );
        } else if (this.state.viewer === "both_flip") {
          return (
            <div style={{ display: "flex", flexDirection: "row", height: "100%", width: "100%" }}>
              <div ref={this.linearRef} style={{ height: "100%", width: "50%" }}>
                <Linear
                  {...linearProps}
                  handleMouseEvent={handleMouseEvent}
                  inputRef={inputRef}
                  onUnmount={onUnmount}
                />
              </div>
              <div ref={this.circularRef} style={{ height: "100%", width: "50%" }}>
                <Circular
                  {...circularProps}
                  handleMouseEvent={handleMouseEvent}
                  inputRef={inputRef}
                  onUnmount={onUnmount}
                />
              </div>
            </div>
          );
        } else {
          return (
            <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
              <div ref={this.linearRef} style={{ height: "25%", width: "100%" }}>
                <Linear
                  {...linearProps}
                  handleMouseEvent={handleMouseEvent}
                  inputRef={inputRef}
                  onUnmount={onUnmount}
                />
              </div>
              <div ref={this.circularRef} style={{ height: "75%", width: "100%" }}>
                <Circular
                  {...circularProps}
                  handleMouseEvent={handleMouseEvent}
                  inputRef={inputRef}
                  onUnmount={onUnmount}
                />
              </div>
            </div>
          );
        }
      };
    }

    return (
      <div style={{ height: "100vh" }}>
        <Sidebar.Pushable className="sidebar-container">
          <Sidebar
            animation="overlay"
            as={Menu}
            id="options-sidebar"
            stylename="sidebar-container"
            vertical
            visible={this.state.showSidebar}
            onHide={this.handleHide}
          >
            <SidebarHeader toggleSidebar={this.toggleSidebar} />
            <Menu.Item as="a">
              <ViewerTypeInput
                setType={(viewer: ViewerOption) => {
                  this.setState({ viewer });
                }}
              />
            </Menu.Item>
            <Menu.Item as="a">
              <LinearZoomInput setZoom={zoom => this.setState({ zoom })} />
            </Menu.Item>
            <Menu.Item as="a">
              <SearchQueryInput setQuery={query => this.setState({ search: { query } })} />
            </Menu.Item>
            <Menu.Item as="a" className="options-checkbox">
              <CheckboxInput
                label="Show complement"
                name="showComplement"
                set={(showComplement: boolean) => this.setState({ showComplement })}
              />
            </Menu.Item>
            <Menu.Item as="a" className="options-checkbox">
              <CheckboxInput label="Show index" name="index" set={showIndex => this.setState({ showIndex })} />
            </Menu.Item>
            <Menu.Item as="a" className="options-checkbox">
              <CheckboxInput
                label="Custom Children"
                name="customChildren"
                set={customChildren => this.setState({ customChildren })}
              />
            </Menu.Item>
            <Menu.Item as="a">
              <EnzymeInput enzymes={this.state.enzymes} toggleEnzyme={this.toggleEnzyme} />
            </Menu.Item>
            <SidebarFooter />
          </Sidebar>
          <Sidebar.Pusher as={Container} dimmed={this.state.showSidebar} fluid>
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
                  >
                    {customChildren}
                  </SeqViz>
                )}
              </div>
            </div>
          </Sidebar.Pusher>
        </Sidebar.Pushable>
      </div>
    );
  }
}

const ViewerTypeInput = ({ setType }: { setType: (viewType: ViewerOption) => void }) => (
  <div className="option" id="topology">
    <span>Topology</span>
    <Dropdown
      defaultValue="both"
      fluid
      options={viewerTypeOptions}
      selection
      onChange={(_, data) => {
        setType(data.value as ViewerOption);
      }}
    />
  </div>
);

const LinearZoomInput = ({ setZoom }: { setZoom: (zoom: number) => void }) => (
  <div className="option" id="zoom">
    <span>Zoom</span>
    <input
      className="slider"
      defaultValue="50"
      id="zoom"
      max="100"
      min="1"
      type="range"
      onChange={e => {
        setZoom(parseInt(e.target.value));
      }}
    />
  </div>
);

const SearchQueryInput = ({ setQuery }: { setQuery: (query: string) => void }) => (
  <div className="option" id="options-search">
    <Input icon="search" placeholder="Search..." onChange={(_, data) => setQuery(data.value)} />
  </div>
);

const CheckboxInput = ({ label, name, set }: { label: string; name: string; set: (v: any) => void }) => (
  <Checkbox defaultChecked label={label} name={name} toggle onChange={(_, data) => set(data.checked)} />
);

const EnzymeInput = ({ enzymes, toggleEnzyme }: { enzymes: string[]; toggleEnzyme: (e: string) => void }) => (
  <div className="option" id="enzymes">
    <span>Enzymes</span>
    <Grid columns={2} id="enzyme-grid">
      <Grid.Row className="enzyme-grid-row">
        <Grid.Column className="enzyme-grid-column">
          <Button
            active={enzymes.includes("PstI")}
            className="enzyme-button"
            color={enzymes.includes("PstI") ? "blue" : null}
            fluid
            onClick={() => toggleEnzyme("PstI")}
          >
            PstI
          </Button>
        </Grid.Column>
        <Grid.Column className="enzyme-grid-column">
          <Button
            active={enzymes.includes("EcoRI")}
            className="enzyme-button"
            color={enzymes.includes("EcoRI") ? "blue" : null}
            fluid
            onClick={() => toggleEnzyme("EcoRI")}
          >
            EcoRI
          </Button>
        </Grid.Column>
      </Grid.Row>
      <Grid.Row className="enzyme-grid-row">
        <Grid.Column className="enzyme-grid-column">
          <Button
            active={enzymes.includes("XbaI")}
            className="enzyme-button"
            color={enzymes.includes("XbaI") ? "blue" : null}
            fluid
            onClick={() => toggleEnzyme("XbaI")}
          >
            XbaI
          </Button>
        </Grid.Column>
        <Grid.Column className="enzyme-grid-column">
          <Button
            active={enzymes.includes("SpeI")}
            className="enzyme-button"
            color={enzymes.includes("SpeI") ? "blue" : null}
            fluid
            onClick={() => toggleEnzyme("SpeI")}
          >
            SpeI
          </Button>
        </Grid.Column>
      </Grid.Row>
    </Grid>
  </div>
);

const SidebarHeader = ({ toggleSidebar }: { toggleSidebar: () => void }) => (
  <div className="sidebar-header">
    <div id="header-left">
      <Image id="seqviz-graphic" src="https://tools.latticeautomation.com/seqviz/seqviz-logo.png" />
      <h3>Settings</h3>
    </div>
    <Button
      circular
      className="circular-button"
      floated="right"
      icon="angle left"
      id="sidebar-toggle-close"
      onClick={toggleSidebar}
    />
  </div>
);

const SidebarFooter = () => (
  <div className="sidebar-footer">
    <Divider clearing />
    <Image id="lattice-brand" src="https://tools.latticeautomation.com/seqviz/lattice-brand.png" />
    <p>
      Created by{" "}
      <span>
        <a href="https://latticeautomation.com/" rel="noopener noreferrer" target="_blank">
          Lattice Automation
        </a>
      </span>
    </p>
    <p>
      <Icon name="github" />
      <span>
        <a href="https://github.com/Lattice-Automation/seqviz" rel="noopener noreferrer" target="_blank">
          seqviz
        </a>
      </span>
      <span>{"  |  "}</span>
      <Icon name="medium" />
      <span>
        <a
          href="https://medium.com/@lattice.core/visualize-your-dna-sequences-with-seqviz-b1d945eb9684"
          rel="noopener noreferrer"
          target="_blank"
        >
          Story
        </a>
      </span>
      <span>{"  |  "}</span>
      <Icon name="edit outline" />
      <span>
        <a
          href="https://docs.google.com/forms/d/1ILD3UwPvdkQlM06En7Pl9VqVpN_-g5iWs-B6gjKh9b0/viewform?edit_requested=true"
          rel="noopener noreferrer"
          target="_blank"
        >
          Survey
        </a>
      </span>
    </p>
    <p>
      <span>contact@latticeautomation.com</span>
    </p>
  </div>
);
