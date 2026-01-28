import * as React from "react";
import seqparse, { ParseOptions, parseFile } from "seqparse";

import { ViewerContextMenuEvent } from "./SelectionHandler";
import SeqViewerContainer, { CustomChildrenProps, SeqVizChildRefs } from "./SeqViewerContainer";
import { COLORS, colorByIndex } from "./core/colors";
import digest from "./core/digest";
import {
  Annotation,
  AnnotationProp,
  CutSite,
  Fragment,
  FragmentProp,
  Enzyme,
  Highlight,
  HighlightProp,
  NameRange,
  PrimerProp,
  Range,
  Separator,
  SeparatorClickEvent,
  SeparatorProp,
  SeqType,
  SingleStrandAnnotation,
  SingleStrandAnnotationProp,
  TranslationProp,
} from "./core/elements";
import { complement, directionality, guessType, randomID } from "./core/sequence";
import { generateOrfs, generateTranslations } from "./core/translations";
import type { TranslationSettings } from "./core/translations";
import { ExternalSelection, FragmentSelection, Selection } from "./state/selectionContext";
import { isEqual } from "./utils/isEqual";
import search from "./utils/search";

export type { TranslationFrame, TranslationOrfSettings, TranslationSettings } from "./core/translations";

/** `SeqViz` props. See the README for more details. One of `seq`, `file` or `accession` is required. */
export interface SeqVizProps {
  /**
   * an NCBI or iGEM accession to retrieve a sequence using
   *
   * @deprecated use `...seqparse.parse(accession)` to fetch and parse the accession to SeqViz props
   */
  accession?: string;

  /** a list of annotations to render to the viewer */
  annotations?: AnnotationProp[];

  /** fragments render like annotations but are prioritized to the outer/top rows */
  fragments?: FragmentProp[];

  /**
   * an iGEM backbone to render within the viewer
   *
   * @deprecated append `backbone` to `props.seq`
   */
  backbone?: string;

  /** nucleotides keyed by symbol or index and the color to apply to it */
  bpColors?: { [key: number | string]: string };

  /** Custom children to render within the SeqViz component. This is useful for when custom rendering the positioning of children viewers (Linear, Circular). */
  children?: (props: CustomChildrenProps) => React.ReactNode;

  /** a list of colors to populate un-colored annotations with. HEX, RGB, names are supported */
  colors?: string[];

  /** the complementary sequence to `seq`. Inferred by default. Ignored if `seqType: "aa"` */
  compSeq?: string;

  /** a callback that is applied within SeqViz on each keyboard event. If it returns truthy, the currently selected seq is copied */
  copyEvent?: (event: React.KeyboardEvent<HTMLElement>) => boolean;

  /**
   * if true SeqViz will not download fonts from external sites. Right now this only applies to Roboto Mono from Google Fonts. Set this
   * to true if you want to host the font yourself or cannot make requests for external assets. If true, you will need to host "Roboto Mono:300,400,500"
   */
  disableExternalFonts?: boolean;

  /** prevents the circular map viewer from rendering */
  disableCircularMap?: boolean;

  /** prevents the linear map overview from rendering */
  disableLinearMap?: boolean;

  /** prevents the linear sequence viewer from rendering */
  disableLinearSequence?: boolean;

  /** a list of enzymes or enzyme names to digest the sequence with. see seqviz.Enzymes */
  enzymes?: (Enzyme | string)[];

  /**
   * a map from enzyme name to definition for custom enzymes not already supported
   *
   * @deprecated use `enzymes` for custom enzymes
   */
  enzymesCustom?: {
    [key: string]: Enzyme;
  };

  /**
   * a file to parse and render. Genbank, FASTA, SnapGene, JBEI, SBOLv1/2, ab1, and SeqBuilder formats are supported
   *
   * @deprecated use `...seqparse.parse(file)` outside of SeqViz to parse a file to SeqViz props
   */
  file?: string | File;

  /** ranges of sequence to highlight on the viewer */
  highlights?: HighlightProp[];

  /** enzyme names that should always render in a highlighted state */
  highlightedEnzymes?: string[];

  /** strand-aware overlays rendered over the sequence similar to search highlights */
  singleStrandAnnotations?: SingleStrandAnnotationProp[];

  /** the name of the sequence to show in the middle of the circular viewer */
  name?: string;

  /** a callback that's executed on each change to the search parameters or sequence */
  onSearch?: (search: Range[]) => void;

  /** a callback that's executed on each click of the sequence viewer. Selection includes meta about the selected element */
  onSelection?: (selection: Selection, fragmentSelection?: FragmentSelection | null) => void;

  /** fired when a separator line is clicked */
  onSeparatorClick?: (payload: SeparatorClickEvent) => void;

  /** fired on right-clicks within the viewer with the associated selection metadata */
  onContextMenu?: (event: ViewerContextMenuEvent) => void;

  /** fired on double-clicks within the viewer with the associated selection metadata */
  onDoubleClick?: (event: ViewerContextMenuEvent) => void;

  /** enable ctrl+scroll / pinch zoom interactions inside SeqViz. Defaults to true */
  enableInteractiveZoom?: boolean;

  /** notify consumers when interactive zoom changes occur */
  onZoomChange?: (zoom: { circular: number; linear: number; linearMap?: number }) => void;

  /** a list of primers to render above or below the sequences. At the time of writing, only the Linear viewer is supported. */
  primers: PrimerProp[];

  /** separators mark restriction or ligation cut lines within the sequence */
  separators?: SeparatorProp[];

  /** Refs associated with custom children. */
  refs?: SeqVizChildRefs;

  /** whether the circular viewer should rotate when the mouse scrolls over the plasmid */
  rotateOnScroll?: boolean;

  /** search parameters. Matched sequences on the viewer are highlighted and selectable. */
  search?: {
    mismatch?: number;
    query: string;
  };

  /** a callback that is applied within SeqViz on each keyboard event. If it returns truthy, the all seq is selected */
  selectAllEvent?: (event: React.KeyboardEvent<HTMLElement>) => boolean;

  /**
   * Externally managed selection.
   *
   * If passed, SeqViz uses this prop as the selection range, rather than the internally managed selection */
  selection?: ExternalSelection;

  /** a sequence to render. Can be DNA, RNA, or an amino acid sequence. Setting accession or file overrides this */
  seq?: string;

  /** the type of the sequence. If this isn't passed, the type is guessed */
  seqType?: "dna" | "rna" | "aa";

  /** whether to render the complement sequence */
  showComplement?: boolean;

  /** whether to show the index row with ticks and indexes  */
  showIndex?: boolean;

  /** extra style props to apply to the outermost div of SeqViz */
  style?: Record<string, unknown>;

  /**
   * Configure amino acid translations. Pass a TranslationSettings object to select frames/ORFs or provide
   * a TranslationProp[] for legacy manual ranges.
   */
  translations?: TranslationProp[] | TranslationSettings;

  /** the orientation of the viewer(s). "both", the default, has a circular viewer on left and a linear viewer on right. */
  viewer?: "linear" | "circular" | "both" | "both_flip" | "linear_map" | "linear_map_linear" | "linear_horizontal" | "linear_map_horizontal" | "circular_horizontal";

  /** how large to make the sequence and elements [0,100]. A larger zoom increases the size of text and elements for that viewer. */
  zoom?: {
    /** how zoomed to make the circular viewer. default: 0 */
    circular?: number;

    /** how zoomed to make the linear viewer. default: 50 */
    linear?: number;

    /** how zoomed to make the linear map overview. default: 0 */
    linearMap?: number;
  };
}

export interface SeqVizState {
  annotations: Annotation[];
  fragments: Fragment[];
  compSeq: string;
  cutSites: CutSite[];
  name: string;
  search: NameRange[];
  seq: string;
  seqType: SeqType;
}

/**
 * SeqViz is a viewer for rendering sequences in a linear and/or circular viewer.
 */
export default class SeqViz extends React.Component<SeqVizProps, SeqVizState> {
  static defaultProps: SeqVizProps = {
    accession: "",
    annotations: [],
    backbone: "",
    bpColors: {},
    colors: [],
    compSeq: "",
    copyEvent: e => e.key === "c" && (e.metaKey || e.ctrlKey),
    disableCircularMap: false,
    disableExternalFonts: false,
    disableLinearMap: false,
    disableLinearSequence: false,
    enzymes: [],
    enzymesCustom: {},
    fragments: [],
    highlightedEnzymes: [],
    name: "",
    onSearch: () => null,
    onSelection: () => null,
    onSeparatorClick: () => null,
    onContextMenu: () => null,
    onDoubleClick: () => null,
    enableInteractiveZoom: true,
    primers: [],
    separators: [],
    singleStrandAnnotations: [],
    rotateOnScroll: true,
    search: { mismatch: 0, query: "" },
    selectAllEvent: e => e.key === "a" && (e.metaKey || e.ctrlKey),
    seq: "",
    showComplement: true,
    showIndex: true,
    style: {},
    viewer: "both",
    zoom: { circular: 0, linear: 50, linearMap: 0 },
  };

  constructor(props: SeqVizProps) {
    super(props);

    const seq = this.parseInput(props);
    this.state = {
      ...seq,
      ...this.search(props, seq.seq),
      ...this.cut(seq.seq, seq.seqType),
    };
  }

  /**
   * If an accession was provided, query it here.
   */
  componentDidMount(): void {
    if (typeof window !== "undefined") {
      // Allow the user to choose whether to load fonts from Google Fonts or from another source
      if (!this.props.disableExternalFonts) {
        // Fetch Roboto Mono, the only font used by SeqViz (at the time of writing)
        // https://github.com/typekit/webfontloader/issues/383#issuecomment-389627920
        /* eslint-disable */
        require("webfontloader").load({
          google: {
            families: ["Roboto Mono:300,400,500"],
          },
        });
      }
    }

    // Check if an accession was passed, we'll query it here if so
    const { accession } = this.props;
    if (!accession || !accession.length) {
      return;
    }

    // Query an accession to a sequence
    seqparse(accession, { cors: true }).then(parsed => {
      const seqType = guessType(parsed.seq);

      this.setState({
        annotations: this.parseAnnotations(parsed.annotations, parsed.seq),
        compSeq: complement(parsed.seq, seqType).compSeq,
        name: parsed.name,
        seq: parsed.seq,
        seqType,
        ...this.search(this.props, parsed.seq),
        ...this.cut(parsed.seq, seqType),
      });
    });
  }

  /** Log caught errors. */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught in SeqViz: %v %v", error, errorInfo);
  }

  /**
   * Re-parse props to state if there are changes to:
   * - seq/accession/file (this probably means we need to update the rest)
   * - search input changes
   * - enzymes change
   * - annotations
   *
   * This is needed for the parse(accession) call that makes an async fetch to a remote repository
   * https://reactjs.org/docs/react-component.html#componentdidupdate
   */
  componentDidUpdate = (
    // previous props
    { accession = "", annotations, enzymes, enzymesCustom, file, fragments: prevFragments, search }: SeqVizProps,
    // previous state
    { seq, seqType, name }: SeqVizState,
  ) => {
    // New accession or file provided, fetch and/or parse.
    if (
      accession !== this.props.accession ||
      file !== this.props.file ||
      (this.props.seq && this.props.seq !== seq) ||
      (this.props.name && this.props.name !== name) ||
      (this.props.seqType && this.props.seqType !== seqType)
    ) {
      const input = this.parseInput();
      this.setState({
        annotations: input.annotations,
        fragments: input.fragments,
        compSeq: input.compSeq,
        name: input.name,
        seq: input.seq,
        seqType: input.seqType,
        ...this.search(this.props, input.seq),
        ...this.cut(input.seq, input.seqType),
      });
      return;
    }

    // New search parameters provided.
    if (
      search &&
      (!this.props.search || search.query !== this.props.search.query || search.mismatch !== this.props.search.mismatch)
    ) {
      this.setState(this.search(this.props, seq)); // new search parameters
    }

    // New digest parameters.
    if (!isEqual(enzymes, this.props.enzymes) || !isEqual(enzymesCustom, this.props.enzymesCustom)) {
      this.setState(this.cut(seq, seqType));
    }

    // New annotations provided.
    if (!isEqual(annotations, this.props.annotations)) {
      this.setState({
        annotations: this.parseAnnotations(this.props.annotations, this.props.seq),
      });
    }

    if (!isEqual(prevFragments, this.props.fragments)) {
      this.setState({
        fragments: this.parseAnnotations(this.props.fragments, this.props.seq),
      });
    }
  };

  /**
   * If a file is provided or a sequence is provided, parse it and its annotations.
   * If an accession is provided, query a remote repository and parse the sequence and annotations.
   */
  parseInput = (
    props?: SeqVizProps,
  ): {
    annotations: Annotation[];
    fragments: Fragment[];
    compSeq: string;
    name: string;
    seq: string;
    seqType: SeqType;
  } => {
    const { annotations, compSeq, file, fragments, name = "", seq, seqType } = props || this.props;

    if (file) {
      // Parse a sequence file
      const parseOptions = {} as ParseOptions;
      if (file && file instanceof File) {
        parseOptions.fileName = file.name;
      }

      const parsed = parseFile(file.toString(), parseOptions);
      if (parsed.length) {
        const parsedSeqType = seqType ?? guessType(parsed[0].seq);
        return {
          annotations: this.parseAnnotations(parsed[0].annotations, parsed[0].seq),
          fragments: this.parseAnnotations(fragments, parsed[0].seq),
          compSeq: complement(parsed[0].seq, parsedSeqType).compSeq,
          name: parsed[0].name,
          seq: parsed[0].seq,
          seqType: parsedSeqType,
        };
      }
    } else if (seq) {
      // Fill in default props just using the seq
      const parsedSeqType = seqType ?? guessType(seq);
      return {
        annotations: this.parseAnnotations(annotations, seq),
        fragments: this.parseAnnotations(fragments, seq),
        compSeq: compSeq || complement(seq, parsedSeqType).compSeq,
        name,
        seq,
        seqType: parsedSeqType,
      };
    }

    return {
      annotations: [],
      fragments: [],
      compSeq: "",
      name: "",
      seq: "",
      seqType: "dna",
    };
  };

  /**
   * Search for the query sequence in the part sequence, set in state.
   */
  search = (props: SeqVizProps, seq: string): { search: NameRange[] } => {
    const { onSearch, search: searchProp, seqType } = props;

    if (!searchProp || !seq || !seq.length) {
      return { search: [] };
    }

    const results = search(searchProp.query, searchProp.mismatch, seq, seqType || guessType(seq));
    if (this.state && isEqual(results, this.state.search)) {
      return { search: this.state.search };
    }

    onSearch && onSearch(results);
    return { search: results };
  };

  /**
   * Find and save enzymes' cut-site locations.
   */
  cut = (seq: string, seqType: SeqType): { cutSites: CutSite[] } => ({
    cutSites: digest(seq || "", seqType, this.props.enzymes || [], this.props.enzymesCustom || {}),
  });

  /**
   * Fix annotations to add unique ids, fix directionality, and modulo the start and end of each.
   */
  parseAnnotations = (annotations: AnnotationProp[] | null = null, seq = ""): Annotation[] =>
    (annotations || []).map((a, i) => ({
      id: randomID(),
      ...a,
      color: a.color || colorByIndex(i, COLORS),
      direction: directionality(a.direction),
      end: a.end % (seq.length + 1),
      start: a.start % (seq.length + 1),
    }));

  parseSeparators = (separators: SeparatorProp[] | null = null, seq = ""): Separator[] => {
    if (!separators || !separators.length || !seq.length) {
      return [];
    }

    const seqLength = seq.length;
    const normalize = (value?: number): number | undefined => {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return undefined;
      }
      if (seqLength <= 0) {
        return Math.max(0, Math.floor(value));
      }
      if (value === seqLength) {
        return seqLength;
      }
      const modded = value % seqLength;
      if (modded === 0 && value !== 0 && Math.floor(value / seqLength) !== 0) {
        return seqLength;
      }
      return ((modded + seqLength) % seqLength + seqLength) % seqLength;
    };

    type ParsedSeparator = Omit<Separator, "order">;

    const prepared: ParsedSeparator[] = separators
      .map((separator, i) => {
        const primaryIndex = normalize(separator.index);
        if (typeof primaryIndex !== "number") {
          return null;
        }
        const complementIndex = normalize(separator.complementIndex);
        const entry: ParsedSeparator = {
          id: `separator-${separator.name || i}-${i}-${primaryIndex}-${randomID()}`,
          name: separator.name || `Separator ${i + 1}`,
          color: separator.color || colorByIndex(i, COLORS),
          index: primaryIndex,
          complementIndex,
        };
        return entry;
      })
      .filter((value): value is ParsedSeparator => value !== null);

    const sorted = prepared.sort((a, b) => {
      if (a.index === b.index) {
        return a.name.localeCompare(b.name);
      }
      return a.index - b.index;
    });

    return sorted.map((separator, order) => ({
      ...separator,
      order: order + 1,
    }));
  };

  render() {
    const { highlights, primers, showComplement, showIndex, singleStrandAnnotations, style, zoom } = this.props;
    const { compSeq, seq, seqType } = this.state;
    const translations = generateTranslations(seq, seqType, this.props.translations);
    const orfs = generateOrfs(seq, seqType, this.props.translations);
    const separators = this.parseSeparators(this.props.separators, seq);

    // This is an unfortunate bit of seq checking. We could get a seq directly or from a file parsed to a part.
    if (!seq) return <div className="la-vz-seqviz" />;

    // Since all the props are optional, we need to parse them to defaults.
    const props = {
      bpColors: this.props.bpColors || {},
      copyEvent: this.props.copyEvent || (() => false),
      selectAllEvent: this.props.selectAllEvent || (() => false),
      cutSites: this.state.cutSites,
      highlights: (highlights || []).map(
        (h, i): Highlight => ({
          ...h,
          direction: 1,
          end: h.end % (seq.length + 1),
          id: `highlight-${i}-${h.start}-${h.end}`,
          name: "",
          start: h.start % (seq.length + 1),
        }),
      ),
      singleStrandAnnotations: (singleStrandAnnotations || []).map(
        (annotation, i): SingleStrandAnnotation => ({
          ...annotation,
          color: annotation.color || colorByIndex(i, COLORS),
          direction: annotation.strand === -1 ? -1 : 1,
          end: annotation.end % (seq.length + 1),
          id: `single-strand-${i}-${annotation.start}-${annotation.end}`,
          name: annotation.name,
          start: annotation.start % (seq.length + 1),
          strand: annotation.strand === -1 ? -1 : 1,
        }),
      ),
      fragments: this.state.fragments,
      onSelection:
        this.props.onSelection ||
        (() => {
          // do nothing
        }),
      primers: primers.map((p, i) => ({ color: colorByIndex(i), id: `primer${p.name}${i}${p.start}${p.end}`, ...p })),
      orfs,
      rotateOnScroll: !!this.props.rotateOnScroll,
      showComplement: (!!compSeq && (typeof showComplement !== "undefined" ? showComplement : true)) || false,
      showIndex: !!showIndex,
      separators,
      translations: translations.map(
        (t, i): { direction: 1 | -1; end: number; start: number; color: string; id: string; name: string } => ({
          direction: t.direction ? (t.direction < 0 ? -1 : 1) : 1,
          end: seqType === "aa" ? t.end : t.start + Math.floor((t.end - t.start) / 3) * 3,
          start: t.start % seq.length,
          color: t.color || colorByIndex(i, COLORS),
          id: `translation${t.name}${i}${t.start}${t.end}`,
          name: t.name,
        }),
      ),
      viewer: this.props.viewer || "both",
      zoom: {
        circular: typeof zoom?.circular == "number" ? Math.min(Math.max(zoom.circular, 0), 100) : 0,
        linear: typeof zoom?.linear == "number" ? Math.min(Math.max(zoom.linear, 20), 100) : 50,
        linearMap: typeof zoom?.linearMap == "number" ? Math.min(Math.max(zoom.linearMap, 0), 100) : 0,
      },
      onSeparatorClick: this.props.onSeparatorClick,
    };

    return (
      <div className="la-vz-seqviz" data-testid="la-vz-seqviz" style={{ height: "100%", width: "100%", ...style }}>
        <SeqViewerContainer {...this.props} {...props} {...this.state} />
      </div>
    );
  }
}
