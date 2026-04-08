/** Range is a single element with a range and direction in the viewer */
export interface Range {
  direction: -1 | 0 | 1;
  end: number;
  start: number;
}

/** NameRange elements have been parsed to include an id and name */
export interface NameRange extends Range {
  color?: string;
  id: string;
  name: string;
}

/** AnnotationProp is an annotation provided to SeqViz via the annotations prop. */
export interface AnnotationProp {
  color?: string;
  direction?: number | string;
  end: number;
  id?: string;
  name: string;
  start: number;
}

export type FragmentProp = AnnotationProp;

/** Single-strand annotation rendered over the sequence (similar to search highlights). */
export interface SingleStrandAnnotationProp extends AnnotationProp {
  strand: 1 | -1;
}

/** TranslationProp is an translation provided to SeqViz via the translation prop. */
export interface TranslationProp {
  color?: string;
  direction?: number;
  end: number;
  name: string;
  start: number;
}

/** Annotation is an annotation after parsing. */
export interface Annotation extends NameRange {
  color: string;
}

export type Fragment = Annotation;

/** Translation is a single translated CDS. */
export interface Translation extends NameRange {
  AAseq: string;
  direction: -1 | 1;
}

/** PrimerProp is a single primer to visualize above/below the linear viewer. */
export interface PrimerProp {
  color?: string;
  direction: 1 | -1;
  end: number;
  id?: string;
  /** mark primer as phosphorylated for display */
  isPhosphorylated?: boolean;
  name: string;
  start: number;
  /** optional tail sequence (5'→3') rendered as a bordered box adjacent to the primer body */
  tail?: string;
}

/** Primer is a single primer for PCR. */
export interface Primer extends NameRange {
  color: string;
  direction: 1 | -1;
  /** mark primer as phosphorylated for display */
  isPhosphorylated?: boolean;
  /** optional tail sequence (5'→3') rendered as a bordered box adjacent to the primer body */
  tail?: string;
}

/** A per-block segment representing part (or all) of a primer's tail region for rendering. */
export interface PrimerTailSegment {
  /** id of the originating primer */
  primerId: string;
  /** absolute sequence start of this tail segment */
  start: number;
  /** absolute sequence end of this tail segment */
  end: number;
  /** border/stroke color (matches primer color) */
  color: string;
  direction: 1 | -1;
  /** 0-based row index within the forward or reverse primer rows */
  rowIndex: number;
  /** the portion of the tail sequence string visible in this block */
  sequence: string;
}

/** Processed single-strand annotation for rendering. */
export interface SingleStrandAnnotation extends NameRange {
  strand: 1 | -1;
}

/** HighlightProp is a region of the plasmid and the desired highlight for that region. */
export interface HighlightProp {
  color?: string;
  end: number;
  start: number;
}

/** Highlight is the processed version of HighlightProp */
export interface Highlight extends HighlightProp {
  /* direction is ignored for now */
  direction: 1 | -1;
  id: string;
  name: string;
}

/** Description of a single cut/separator along the sequence. */
export interface SeparatorProp {
  color?: string;
  complementIndex?: number;
  index: number;
  name: string;
}

/** Parsed version of SeparatorProp with metadata for rendering. */
export interface Separator extends SeparatorProp {
  id: string;
  /** 1-based order of the separator once sorted by index. */
  order: number;
}

export interface SeparatorClickEvent {
  order: number;
  separator: Separator;
}

export interface Part {
  annotations: Annotation[];
  compSeq: string;
  cutSites: CutSite[];
  name: string;
  primers: Primer[];
  seq: string;
}

export interface Size {
  height: number;
  width: number;
}

export interface Coor {
  x: number;
  y: number;
}

/** a single enzyme to use to digest the sequence with */
export interface Enzyme {
  /** an optional color to highlight the recognition site with */
  color?: string;

  /** the index of the cut-site on the forward strand relative to the start of the recognition site */
  fcut: number;

  /** name is the name of the enzyme. Used in the label above a cut-site */
  name: string;

  /** an optional range over which this enzyme's cut-sites should be limited */
  range?: {
    end: number;
    start: number;
  };

  /** the index of the cut-site on the reverse strand relative to the start of the recognition site */
  rcut: number;

  /** the recognition sequence */
  rseq: string;
}

/**
 * a single recognition site on the sequence
 *
 * TODO: it should be possible to remove name from below (it's on the enzyme)
 * and calc fcut/rcut from start/end + enzyme.fcut/rcut
 */
export interface CutSite extends NameRange {
  /** `1` if top strand (`seq`), `-1` if bottom strand (`compSeq`) */
  direction: 1 | -1;

  /** enzyme used to create this cut-site */
  enzyme: Enzyme;

  /** index relative to start index of the cut on the top strand */
  fcut: number;

  /** index relative to start index of the cut on the bottom strand */
  rcut: number;
}

/** Overhang information for sequence ends */
export interface SequenceEdgeOverhang {
  overhangSeq: string;
  onComplement: boolean;
}

/** Sequence edge information including 5' and 3' overhangs */
export interface SequenceEdges {
  fivePrime?: SequenceEdgeOverhang;
  threePrime?: SequenceEdgeOverhang;
}

/** supported input sequence types */
export type SeqType = "dna" | "rna" | "aa" | "unknown";
