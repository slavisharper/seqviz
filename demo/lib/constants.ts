import { chooseRandomColor } from "../../src/core/colors";
import { AnnotationProp, FragmentProp, Primer, SeparatorProp, SeqType, SingleStrandAnnotationProp, SequenceEdges } from "../../src/core/elements";
import type { TranslationSettings } from "../../src/SeqViz";

export type SupportedSeqType = Extract<SeqType, "dna" | "rna" | "aa">;

export type ViewerOption =
  | "both"
  | "circular"
  | "linear"
  | "both_flip"
  | "linear_map"
  | "linear_map_linear"
  | "linear_horizontal"
  | "linear_map_horizontal"
  | "circular_horizontal";

export const VIEWER_TYPE_OPTIONS = [
  { key: "linear", text: "Linear Sequence", value: "linear" },
  { key: "linear_horizontal", text: "Linear Sequence (Horizontal)", value: "linear_horizontal" },
  { key: "linear_map_linear", text: "Linear map + Sequence", value: "linear_map_linear" },
  { key: "linear_map_horizontal", text: "Linear map + Sequence (Horizontal)", value: "linear_map_horizontal" },
  { key: "circular_horizontal", text: "Circular Map + Sequence (Horizontal)", value: "circular_horizontal" },
  { key: "linear_map", text: "Linear map", value: "linear_map" },
  { key: "both", text: "Circular Map + Sequence", value: "both" },
  { key: "both_flip", text: "Sequence + Circular Map", value: "both_flip" },
  { key: "circular", text: "Circular Map", value: "circular" },
] as const;

export const DEFAULT_ENZYMES: string[] = [
  "AcuI",
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
];

export const DEFAULT_SEARCH_QUERY = "ttnnnaat";

export const DEFAULT_ZOOM = 50;

export const createDefaultPrimers = (): Primer[] => [
  {
    color: chooseRandomColor(),
    direction: 1,
    end: 659,
    id: "527923581",
    isPhosphorylated: true,
    name: "pLtetO-1 fw primer",
    start: 633,
  },
  {
    color: chooseRandomColor(),
    direction: -1,
    end: 710,
    id: "5279asdf582",
    isPhosphorylated: true,
    name: "pLtetO-1 rev primer",
    start: 686,
  },
  {
    color: chooseRandomColor(),
    direction: 1,
    end: 535,
    id: "5279fd582",
    name: "LtetO-1 fwd primer",
    start: 512,
  },
  {
    color: chooseRandomColor(),
    direction: -1,
    end: 535,
    id: "527923dfd582",
    name: "LtetO-1 rev primer",
    start: 512,
  },
];

export const createDefaultSingleStrandAnnotations = (): SingleStrandAnnotationProp[] => [
  {
    color: "rgba(255, 193, 7, 0.35)",
    end: 641,
    name: "pLtetO-1 fw tail",
    start: 633,
    strand: 1,
  },
  {
    color: "rgba(124, 58, 237, 0.35)",
    end: 710,
    name: "pLtetO-1 rev tail",
    start: 700,
    strand: -1,
  },
];

export const createDefaultTranslations = (): TranslationSettings => ({
  frames: [],
  orf: {
    minLength: 350,
  },
});

export const createDefaultSeparators = (): SeparatorProp[] => [
  {
    color: "#2563EB",
    complementIndex: 633,
    index: 633,
    name: "PstI Assembly Junction",
  },
  {
    color: "#16A34A",
    complementIndex: 1424,
    index: 1420,
    name: "Assembly B Boundary",
  },
  {
    color: "#F97316",
    complementIndex: 1974,
    index: 1980,
    name: "Assembly C Boundary",
  },
];

export interface DemoExampleConfig {
  annotations: AnnotationProp[];
  description: string;
  disableCircularMap: boolean;
  disableLinearMap: boolean;
  disableLinearSequence: boolean;
  enzymes: string[];
  fragments?: FragmentProp[];
  name: string;
  primers: Primer[];
  search: { query: string };
  separators?: SeparatorProp[];
  singleStrandAnnotations?: SingleStrandAnnotationProp[];
  seq: string;
  sequenceEdges?: SequenceEdges;
  showComplement: boolean;
  showIndex: boolean;
  seqType: SupportedSeqType;
  translations?: TranslationSettings;
  showTranslations: boolean;
  viewer: ViewerOption;
  zoom: number;
}

const AMINO_LINEAR_SEQUENCE = 'LRPALPLIAVLL*FIKHSADMEAITNGMMNLNRQRHQHLVALRIIFAHGENGGEEVVHIGHV*IKTGETHPGIG*DEKHILNKPFREIGQVFTVTRHILRIYV*KLPEIVVVFTPER*KRFSLLMENGVTRVNTIPYHQLTVFHCHTKFRMSIHQAGKNVNKGRIKLVLIFLYGL*KGRNIQLNGLVIGTLSN*LKCLKMFFTMPLGYINGGISSDFFLH'

const AMINO_DOMAIN_BOUNDARIES = {
  coreEnd: 120,
  leaderEnd: 60,
  total: AMINO_LINEAR_SEQUENCE.length,
};

export const AMINO_LINEAR_EXAMPLE: DemoExampleConfig = {
  annotations: [
    { color: "#7C3AED", direction: 1, end: AMINO_DOMAIN_BOUNDARIES.leaderEnd, name: "Signal leader", start: 0 },
    {
      color: "#10B981",
      direction: 1,
      end: AMINO_DOMAIN_BOUNDARIES.coreEnd,
      name: "Catalytic core",
      start: AMINO_DOMAIN_BOUNDARIES.leaderEnd,
    },
    {
      color: "#FBBF24",
      direction: 1,
      end: AMINO_DOMAIN_BOUNDARIES.total,
      name: "Regulatory tail",
      start: AMINO_DOMAIN_BOUNDARIES.coreEnd,
    },
  ],
  description:
    "Synthetic 60-amino-acid polypeptide split into leader, catalytic, and regulatory domains for amino-view demos.",
  disableCircularMap: true,
  disableLinearMap: false,
  disableLinearSequence: false,
  enzymes: [],
  fragments: [],
  name: "Linear Amino Demo",
  primers: [],
  search: { query: "" },
  singleStrandAnnotations: [],
  separators: [],
  seq: AMINO_LINEAR_SEQUENCE,
  seqType: "aa",
  showComplement: false,
  showIndex: true,
  showTranslations: false,
  viewer: "linear",
  zoom: 35,
};

export const SEQUENCE_EDGES_EXAMPLE: DemoExampleConfig = {
  annotations: [
    { color: "#3B82F6", direction: 1, start: 0,  end: 89, name: "Main Sequence" },
  ],
  description:
    "DNA sequence with sticky overhangs at the 5' and 3' ends, demonstrating jagged sequence edges for molecular biology applications.",
  disableCircularMap: true,
  disableLinearMap: false,
  disableLinearSequence: false,
  enzymes: [],
  fragments: [],
  name: "Sequence with Overhangs",
  primers: [],
  search: { query: "" },
  singleStrandAnnotations: [],
  separators: [],
  seq: "GGCCGGGGGGGGAATTGCG",
  sequenceEdges: {
    fivePrime: {
      overhangSeq: "GGCC",
      onComplement: false,
    },
    threePrime: {
      overhangSeq: "AATT",
      onComplement: true,
    },
  },
  seqType: "dna",
  showComplement: true,
  showIndex: true,
  showTranslations: false,
  viewer: "linear",
  zoom: 50,
};

export type DemoExampleId = "default" | "amino_linear" | "sequence_edges";

export interface DemoExampleOption {
  description: string;
  id: DemoExampleId;
  label: string;
  preset?: DemoExampleConfig;
}

export const DEMO_EXAMPLE_OPTIONS: DemoExampleOption[] = [
  {
    description: "",
    id: "default",
    label: "DNA Sequence",
  },
  {
    description: "",
    id: "amino_linear",
    label: "Amino Sequence",
    preset: AMINO_LINEAR_EXAMPLE,
  },
  {
    description: "",
    id: "sequence_edges",
    label: "Sequence with Overhangs",
    preset: SEQUENCE_EDGES_EXAMPLE,
  },
];
