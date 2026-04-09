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
  SequenceEdges,
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

  /** clamp the visible sequence to [start, end]. Only features/enzymes that fit entirely within this range are shown. */
  clamp?: { start: number; end: number };

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

  /** prevents the user from making a selection and hides all selection visualization */
  disableSelection?: boolean;

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

  /** sequence edge information including 5' and 3' overhangs for visualization */
  sequenceEdges?: SequenceEdges;

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
  sequenceEdges?: SequenceEdges;
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
    sequenceEdges: undefined,
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
      sequenceEdges: props.sequenceEdges,
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
        import("webfontloader").then(WebFont => {
          WebFont.load({
            google: {
              families: ["Roboto Mono:300,400,500"],
            },
          });
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

    // New sequenceEdges provided.
    const prevSequenceEdges = this.state.sequenceEdges;
    if (!isEqual(prevSequenceEdges, this.props.sequenceEdges)) {
      this.setState({
        sequenceEdges: this.props.sequenceEdges,
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

    if (onSearch) onSearch(results);
    return { search: results };
  };

  /**
   * Find and save enzymes' cut-site locations.
   */
  cut = (seq: string, seqType: SeqType): { cutSites: CutSite[] } => ({
    cutSites: digest(seq || "", seqType, this.props.enzymes || [], this.props.enzymesCustom || {}),
  });

  /**
   * Process sequence edges (overhangs) to modify seq and compSeq accordingly.
   * Rules:
   * - If overhang on main strand: remove complement strand with the same length
   * - If overhang on complement strand: append overhang on complement and leave main strand empty
   */
  processSequenceEdges = (
    seq: string,
    compSeq: string,
    edges?: SequenceEdges,
  ): { processedSeq: string; processedCompSeq: string } => {
    if (!edges || (!edges.fivePrime && !edges.threePrime)) {
      return { processedSeq: seq, processedCompSeq: compSeq };
    }

    let processedSeq = seq;
    let processedCompSeq = compSeq;

    // Handle 5' overhang
    if (edges.fivePrime) {
      const { overhangSeq, onComplement } = edges.fivePrime;
      const overhangLen = overhangSeq.length;

      if (onComplement) {
        // Overhang on complement strand: prepend overhang to complement, prepend spaces to main
        processedSeq = " ".repeat(overhangLen) + processedSeq;
        processedCompSeq = overhangSeq + processedCompSeq;
      } else {
        // Overhang on main strand: main strand unchanged, cut complement at start
        processedCompSeq = " ".repeat(overhangLen) + processedCompSeq.slice(overhangLen);
      }
    }

    // Handle 3' overhang
    if (edges.threePrime) {
      const { overhangSeq, onComplement } = edges.threePrime;
      const overhangLen = overhangSeq.length;

      if (onComplement) {
        // Overhang on complement strand: append overhang to complement, append spaces to main
        processedSeq = processedSeq + " ".repeat(overhangLen);
        processedCompSeq = processedCompSeq + overhangSeq;
      } else {
        // Overhang on main strand: main strand unchanged, cut complement at end
        processedCompSeq = processedCompSeq.slice(0, processedCompSeq.length - overhangLen) + " ".repeat(overhangLen);
      }
    }

    return { processedSeq, processedCompSeq };
  };

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

    // Returns a sort key: negative values wrap positively, values equal to
    // seqLength stay as seqLength (sorts after all in-range positions),
    // and any other multiple-of-seqLength value also returns seqLength.
    const normalizeSortKey = (value?: number): number | undefined => {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return undefined;
      }
      if (seqLength <= 0) {
        return Math.max(0, Math.floor(value));
      }
      const floored = Math.floor(value);
      if (floored === seqLength) {
        return seqLength; // treat "end of sequence" as seqLength for sort purposes
      }
      return ((floored % seqLength) + seqLength) % seqLength;
    };

    // Converts a sort key to its circular output index (seqLength → 0).
    const toOutputIndex = (key: number): number => (key === seqLength ? 0 : key);

    type ParsedSeparator = Omit<Separator, "order">;

    const prepared: ParsedSeparator[] = separators
      .map((separator, i) => {
        const sortKey = normalizeSortKey(separator.index);
        if (typeof sortKey !== "number") {
          return null;
        }
        const complementSortKey = normalizeSortKey(separator.complementIndex);
        const entry: ParsedSeparator & { sortKey: number } = {
          id: `separator-${separator.name || i}-${i}-${sortKey}-${randomID()}`,
          name: separator.name || `Separator ${i + 1}`,
          color: separator.color || colorByIndex(i, COLORS),
          index: toOutputIndex(sortKey),
          complementIndex: complementSortKey !== undefined ? toOutputIndex(complementSortKey) : undefined,
          sortKey,
        };
        return entry;
      })
      .filter((value): value is ParsedSeparator & { sortKey: number } => value !== null);

    const sorted = prepared.sort((a, b) => {
      const aEntry = a as ParsedSeparator & { sortKey: number };
      const bEntry = b as ParsedSeparator & { sortKey: number };
      if (aEntry.sortKey === bEntry.sortKey) {
        return a.name.localeCompare(b.name);
      }
      return aEntry.sortKey - bEntry.sortKey;
    });

    return sorted.map((separator, order) => {
      const { sortKey: _sortKey, ...rest } = separator as ParsedSeparator & { sortKey: number };
      void _sortKey;
      return { ...rest, order: order + 1 };
    });
  };

  render() {
    const { highlights, primers, showComplement, showIndex, singleStrandAnnotations, style, zoom } = this.props;
    const { compSeq, seq, seqType, sequenceEdges } = this.state;

    // Process sequence edges (overhangs)
    const { processedSeq, processedCompSeq } = this.processSequenceEdges(seq, compSeq, sequenceEdges);

    // Apply clamping if specified
    const clampProp = this.props.clamp;
    let clampedSeq = processedSeq;
    let clampedCompSeq = processedCompSeq;
    let clampOffset = 0;

    if (clampProp) {
      const cs = Math.max(0, Math.floor(clampProp.start));
      const ce = Math.min(processedSeq.length, Math.floor(clampProp.end));
      if (cs < ce) {
        clampOffset = cs;
        clampedSeq = processedSeq.slice(cs, ce);
        clampedCompSeq = processedCompSeq.slice(cs, ce);
      } else {
        clampedSeq = "";
        clampedCompSeq = "";
      }
    }

    const clampEnd = clampOffset + clampedSeq.length;

    // Filter items to those entirely within the clamped range and remap positions to 0-based
    const filterAndRemap = <T extends { start: number; end: number }>(items: T[]): T[] => {
      if (!clampProp) return items;
      return items
        .filter(item => item.start < item.end && item.start >= clampOffset && item.end <= clampEnd)
        .map(item => ({ ...item, start: item.start - clampOffset, end: item.end - clampOffset }));
    };

    // For user-specified translation arrays, filter and remap before generation
    let translationsInput = this.props.translations;
    if (clampProp && Array.isArray(translationsInput)) {
      translationsInput = translationsInput
        .filter(t => t.start < t.end && t.start >= clampOffset && t.end <= clampEnd)
        .map(t => ({ ...t, start: t.start - clampOffset, end: t.end - clampOffset }));
    }

    const translations = generateTranslations(clampedSeq, seqType, translationsInput);
    const orfs = generateOrfs(clampedSeq, seqType, translationsInput);
    const allSeparators = this.parseSeparators(this.props.separators, processedSeq);
    const separators = clampProp
      ? allSeparators
          .filter(sep => sep.index >= clampOffset && sep.index < clampEnd)
          .map(sep => ({
            ...sep,
            index: sep.index - clampOffset,
            complementIndex:
              sep.complementIndex !== undefined && sep.complementIndex >= clampOffset && sep.complementIndex < clampEnd
                ? sep.complementIndex - clampOffset
                : undefined,
          }))
      : allSeparators;

    // This is an unfortunate bit of seq checking. We could get a seq directly or from a file parsed to a part.
    if (!clampedSeq) return <div className="la-vz-seqviz" />;

    // Since all the props are optional, we need to parse them to defaults.
    const props = {
      bpColors: this.props.bpColors || {},
      copyEvent: this.props.copyEvent || (() => false),
      selectAllEvent: this.props.selectAllEvent || (() => false),
      cutSites: filterAndRemap(this.state.cutSites),
      highlights: filterAndRemap(
        (highlights || []).map(
          (h, i): Highlight => ({
            ...h,
            direction: 1,
            end: h.end % (processedSeq.length + 1),
            id: `highlight-${i}-${h.start}-${h.end}`,
            name: "",
            start: h.start % (processedSeq.length + 1),
          }),
        ),
      ),
      singleStrandAnnotations: filterAndRemap(
        (singleStrandAnnotations || []).map(
          (annotation, i): SingleStrandAnnotation => ({
            ...annotation,
            color: annotation.color || colorByIndex(i, COLORS),
            direction: annotation.strand === -1 ? -1 : 1,
            end: annotation.end % (processedSeq.length + 1),
            id: `single-strand-${i}-${annotation.start}-${annotation.end}`,
            name: annotation.name,
            start: annotation.start % (processedSeq.length + 1),
            strand: annotation.strand === -1 ? -1 : 1,
          }),
        ),
      ),
      fragments: filterAndRemap(this.state.fragments),
      onSelection:
        this.props.onSelection ||
        (() => {
          // do nothing
        }),
      primers: filterAndRemap(
        primers.map((p, i) => ({ color: colorByIndex(i), id: `primer${p.name}${i}${p.start}${p.end}`, ...p })),
      ),
      orfs,
      rotateOnScroll: !!this.props.rotateOnScroll,
      showComplement: (!!clampedCompSeq && (typeof showComplement !== "undefined" ? showComplement : true)) || false,
      showIndex: !!showIndex,
      separators,
      translations: translations.map(
        (t, i): { direction: 1 | -1; end: number; start: number; color: string; id: string; name: string } => ({
          direction: t.direction ? (t.direction < 0 ? -1 : 1) : 1,
          end: seqType === "aa" ? t.end : t.start + Math.floor((t.end - t.start) / 3) * 3,
          start: t.start % clampedSeq.length,
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
        <SeqViewerContainer
          {...this.props}
          {...props}
          {...this.state}
          seq={clampedSeq}
          compSeq={clampedCompSeq}
          annotations={filterAndRemap(this.state.annotations)}
          cutSites={filterAndRemap(this.state.cutSites)}
          fragments={filterAndRemap(this.state.fragments)}
          search={filterAndRemap(this.state.search)}
        />
      </div>
    );
  }
}
