import { SeqType, TranslationProp } from "./elements";
import { reverseComplement } from "./sequence";

export type TranslationFrame = -3 | -2 | -1 | 1 | 2 | 3;

export interface TranslationOrfSettings {
  start?: string[];
  end?: string[];
  minLength?: number;
}

export interface TranslationSettings {
  frames?: TranslationFrame[];
  orf?: TranslationOrfSettings;
}

export const generateTranslations = (
  seq: string,
  seqType: SeqType,
  translations?: TranslationProp[] | TranslationSettings,
): TranslationProp[] => {
  if (!seq.length) {
    return [];
  }

  if (seqType === "aa") {
    return [
      {
        direction: 1,
        end: seq.length,
        name: "",
        start: 0,
      },
    ];
  }

  if (!translations) {
    return [];
  }

  if (Array.isArray(translations)) {
    return translations;
  }

  const frames = buildFrameTranslations(seq.length, translations.frames);
  const orfs = buildOrfTranslations(seq, seqType, translations.orf);
  return [...frames, ...orfs];
};

export const generateOrfs = (
  seq: string,
  seqType: SeqType,
  translations?: TranslationProp[] | TranslationSettings,
): TranslationProp[] => {
  if (!seq.length || seqType === "aa" || !translations || Array.isArray(translations)) {
    return [];
  }

  return buildOrfTranslations(seq, seqType, translations.orf);
};

const buildFrameTranslations = (seqLength: number, frames?: TranslationFrame[]): TranslationProp[] => {
  if (!frames?.length || seqLength <= 0) {
    return [];
  }

  const allowedFrames: TranslationFrame[] = [-3, -2, -1, 1, 2, 3];
  const seen = new Set<TranslationFrame>();
  const results: TranslationProp[] = [];

  frames.forEach(frame => {
    if (!allowedFrames.includes(frame) || seen.has(frame)) {
      return;
    }
    seen.add(frame);

    const direction: 1 | -1 = frame > 0 ? 1 : -1;
    const offset = Math.abs(frame) - 1;
    const start = seqLength ? offset % seqLength : 0;
    const end = start + seqLength;

    results.push({
      direction,
      end,
      name: `Frame ${frame}`,
      start,
    });
  });

  return results;
};

const buildOrfTranslations = (seq: string, seqType: SeqType, orf?: TranslationOrfSettings): TranslationProp[] => {
  if (!orf || !seq.length) {
    return [];
  }

  const defaults = getDefaultCodons(seqType);
  const startList = orf.start?.length ? orf.start : defaults.start;
  const stopList = orf.end?.length ? orf.end : defaults.stop;
  const startCodons = normalizeCodons(startList, seqType);
  const stopCodons = normalizeCodons(stopList, seqType);

  if (!startCodons.size || !stopCodons.size) {
    return [];
  }

  const minLength = Math.max(orf.minLength ?? 75, 3);
  const forwardOrfs = findOpenReadingFrames(seq, startCodons, stopCodons, minLength, 1, seq.length);
  const reverseSeq = reverseComplement(seq, seqType);
  const reverseOrfs = findOpenReadingFrames(reverseSeq, startCodons, stopCodons, minLength, -1, seq.length);
  const combined = [...forwardOrfs, ...reverseOrfs];

  return combined.map((translation, idx) => ({
    ...translation,
    name: translation.name || `ORF ${idx + 1}`,
  }));
};

const findOpenReadingFrames = (
  seq: string,
  startCodons: Set<string>,
  stopCodons: Set<string>,
  minLength: number,
  direction: 1 | -1,
  referenceLength: number,
): TranslationProp[] => {
  const upperSeq = seq.toUpperCase();
  const seqLength = upperSeq.length;
  if (referenceLength <= 0 || seqLength < 3) {
    return [];
  }

  const orfs: TranslationProp[] = [];
  const frames = [0, 1, 2];

  frames.forEach(frame => {
    let startIndex: number | null = null;
    for (let i = frame; i <= seqLength - 3; i += 3) {
      const codon = upperSeq.slice(i, i + 3);

      if (startIndex === null) {
        if (startCodons.has(codon)) {
          startIndex = i;
        }
        continue;
      }

      if (!stopCodons.has(codon)) {
        continue;
      }

      const bpLength = i + 3 - startIndex;
      if (bpLength >= minLength) {
        if (direction === 1) {
          orfs.push({ direction: 1, end: i + 3, name: "", start: startIndex });
        } else {
          const start = Math.max(referenceLength - (i + 3), 0) % referenceLength;
          let end = (referenceLength - startIndex) % referenceLength;
          if (end === 0) {
            end = referenceLength;
          }
          orfs.push({ direction: -1, end, name: "", start });
        }
      }
      startIndex = null;
    }
  });

  return orfs;
};

const normalizeCodons = (codons: string[] | undefined, seqType: SeqType): Set<string> => {
  const upper = (codons || [])
    .map(codon => (codon || "").toUpperCase().replace(/[^A-Z]/g, ""))
    .filter(codon => codon.length === 3);

  if (!upper.length) {
    return new Set();
  }

  if (seqType === "rna") {
    return new Set(upper.map(codon => codon.replace(/T/g, "U")));
  }

  return new Set(upper.map(codon => codon.replace(/U/g, "T")));
};

const getDefaultCodons = (seqType: SeqType): { start: string[]; stop: string[] } =>
  seqType === "rna" ? { start: ["AUG"], stop: ["UAA", "UAG", "UGA"] } : { start: ["ATG"], stop: ["TAA", "TAG", "TGA"] };
