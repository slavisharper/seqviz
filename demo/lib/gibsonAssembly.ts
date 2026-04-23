import { AnnotationProp, FragmentProp, Primer, SeparatorProp, SingleStrandAnnotationProp } from "../../src/core/elements";

const GIBSON_PRIMER_LENGTH = 22;
const GIBSON_PRIMER_COLOR = "#7C3AED";

// These overlap windows are intentionally placed inside annotation gaps so the demo fragments
// model a Gibson Assembly without bisecting any of the plasmid's existing features.
const GIBSON_JUNCTIONS = [
  {
    color: "#2563EB",
    dividerIndex: 808,
    name: "CMV / Ψ overlap",
    overlapEnd: 820,
    overlapStart: 796,
  },
  {
    color: "#16A34A",
    dividerIndex: 2732,
    name: "SFFV / WPRE overlap",
    overlapEnd: 2744,
    overlapStart: 2720,
  },
  {
    color: "#F97316",
    dividerIndex: 3704,
    name: "LTR / backbone overlap",
    overlapEnd: 3716,
    overlapStart: 3692,
  },
  {
    color: "#DC2626",
    dividerIndex: 6944,
    name: "Backbone / CMV overlap",
    overlapEnd: 6956,
    overlapStart: 6932,
  },
];

const GIBSON_FRAGMENT_BLUEPRINTS: Array<Pick<FragmentProp, "color" | "direction" | "id" | "name"> & { primerColor: string }> = [
  {
    color: "#93C5FD",
    direction: 1,
    id: "gibson-fragment-a",
    name: "Fragment A · CMV / 5' LTR",
    primerColor: GIBSON_PRIMER_COLOR,
  },
  {
    color: "#86EFAC",
    direction: 1,
    id: "gibson-fragment-b",
    name: "Fragment B · Ψ / RRE / cPPT / SFFV",
    primerColor: GIBSON_PRIMER_COLOR,
  },
  {
    color: "#FDBA74",
    direction: 1,
    id: "gibson-fragment-c",
    name: "Fragment C · WPRE / 3' LTR",
    primerColor: GIBSON_PRIMER_COLOR,
  },
  {
    color: "#FCA5A5",
    direction: 1,
    id: "gibson-fragment-d",
    name: "Fragment D · backbone / ori / NeoR",
    primerColor: GIBSON_PRIMER_COLOR,
  },
];

const shiftIndexByInsertedTails = (index: number, junctions: typeof GIBSON_JUNCTIONS, insertedLengths: number[]) =>
  junctions.reduce((shiftedIndex, junction, idx) => {
    if (index < junction.dividerIndex) {
      return shiftedIndex;
    }

    return shiftedIndex + insertedLengths[idx];
  }, index);

const sliceCircularSequence = (seq: string, start: number, end: number) => {
  if (!seq.length) {
    return "";
  }

  if (start < end) {
    return seq.slice(start, end).toUpperCase();
  }

  return `${seq.slice(start)}${seq.slice(0, end)}`.toUpperCase();
};

export const buildGibsonAssemblyPreset = (seq = "", annotations: AnnotationProp[] = []) => {
  const overlapSeqs = GIBSON_JUNCTIONS.map(junction => sliceCircularSequence(seq, junction.overlapStart, junction.overlapEnd));

  let assembledSeq = seq;
  let cumulativeShift = 0;
  const adjustedJunctions = GIBSON_JUNCTIONS.map((junction, index) => {
    const overlapSeq = overlapSeqs[index];
    const insertAt = junction.dividerIndex + cumulativeShift;

    assembledSeq = `${assembledSeq.slice(0, insertAt)}${overlapSeq}${assembledSeq.slice(insertAt)}`;

    const adjustedOverlapStart = insertAt;
    const adjustedOverlapEnd = insertAt + overlapSeq.length;
    const adjustedDividerIndex = adjustedOverlapStart + Math.floor(overlapSeq.length / 2);

    cumulativeShift += overlapSeq.length;

    return {
      ...junction,
      adjustedDividerIndex,
      adjustedOverlapEnd,
      adjustedOverlapStart,
      overlapSeq,
    };
  });

  const shiftedAnnotations: AnnotationProp[] = annotations.map(annotation => ({
    ...annotation,
    end: shiftIndexByInsertedTails(annotation.end, GIBSON_JUNCTIONS, overlapSeqs.map(s => s.length)),
    start: shiftIndexByInsertedTails(annotation.start, GIBSON_JUNCTIONS, overlapSeqs.map(s => s.length)),
  }));

  const positionedFragments = GIBSON_FRAGMENT_BLUEPRINTS.map((fragment, index) => {
    const startJunction = adjustedJunctions[(index + adjustedJunctions.length - 1) % adjustedJunctions.length];
    const endJunction = adjustedJunctions[index];

    return {
      ...fragment,
      end: endJunction.adjustedDividerIndex,
      start: startJunction.adjustedDividerIndex,
    };
  });

  const fragments: FragmentProp[] = positionedFragments.map(fragment => ({
    color: fragment.color,
    direction: fragment.direction,
    end: fragment.end,
    id: fragment.id,
    name: fragment.name,
    start: fragment.start,
  }));

  const primers: Primer[] = positionedFragments.flatMap(fragment => [
    {
      color: fragment.primerColor,
      direction: 1,
      end: fragment.start + GIBSON_PRIMER_LENGTH,
      id: `${fragment.id}-fwd`,
      name: `${fragment.name} forward primer`,
      start: fragment.start,
      isPhosphorylated: true,
    },
    {
      color: fragment.primerColor,
      direction: -1,
      end: fragment.end,
      id: `${fragment.id}-rev`,
      name: `${fragment.name} reverse primer`,
      start: fragment.end - GIBSON_PRIMER_LENGTH,
      isPhosphorylated: true,
    },
  ]);

  const separators: SeparatorProp[] = adjustedJunctions.map(({ adjustedDividerIndex, color, name }) => ({
    color,
    complementIndex: adjustedDividerIndex,
    index: adjustedDividerIndex,
    name: `${name} divider`,
  }));

  const singleStrandAnnotations: SingleStrandAnnotationProp[] = adjustedJunctions.flatMap(
    ({ adjustedDividerIndex, adjustedOverlapEnd, adjustedOverlapStart, color, name }) => [
      {
        color: `${color}33`,
        end: adjustedDividerIndex,
        name: `${name} overlap`,
        start: adjustedOverlapStart,
        strand: 1,
      },
      {
        color: `${color}33`,
        end: adjustedOverlapEnd,
        name: `${name} overlap`,
        start: adjustedDividerIndex,
        strand: -1,
      },
    ]
  );

  return { annotations: shiftedAnnotations, fragments, primers, separators, seq: assembledSeq, singleStrandAnnotations };
};
