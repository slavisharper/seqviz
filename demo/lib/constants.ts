import { chooseRandomColor } from "../../src/colors";
import { AnnotationProp, Primer, SeqType, TranslationProp } from "../../src/elements";

export type SupportedSeqType = Extract<SeqType, "dna" | "rna" | "aa">;

export type ViewerOption = "both" | "circular" | "linear" | "both_flip" | "linear_map" | "linear_map_linear";

export const VIEWER_TYPE_OPTIONS = [
  { key: "linear", text: "Linear Sequence", value: "linear" },
  { key: "linear_map_linear", text: "Linear map + Sequence", value: "linear_map_linear" },
  { key: "linear_map", text: "Linear map", value: "linear_map" },
  { key: "both", text: "Circular Map + Sequence", value: "both" },
  { key: "both_flip", text: "Sequence + Circular Map", value: "both_flip" },
  { key: "circular", text: "Circular Map", value: "circular" },
] as const;

export const DEFAULT_ENZYMES: string[] = [
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
];

export const createDefaultTranslations = (): TranslationProp[] => [
  { color: chooseRandomColor(), direction: -1, end: 630, name: "ORF 1", start: 6 },
  { end: 1147, name: "", start: 736 },
  { end: 1885, name: "ORF 2", start: 1165 },
];

export interface DemoExampleConfig {
  annotations: AnnotationProp[];
  description: string;
  disableCircularMap: boolean;
  disableLinearMap: boolean;
  disableLinearSequence: boolean;
  enzymes: string[];
  name: string;
  primers: Primer[];
  search: { query: string };
  seq: string;
  showComplement: boolean;
  showIndex: boolean;
  seqType: SupportedSeqType;
  translations: TranslationProp[];
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
  name: "Linear Amino Demo",
  primers: [],
  search: { query: "" },
  seq: AMINO_LINEAR_SEQUENCE,
  seqType: "aa",
  showComplement: false,
  showIndex: true,
  translations: [],
  viewer: "linear",
  zoom: 35,
};

export type DemoExampleId = "default" | "amino_linear";

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
];
