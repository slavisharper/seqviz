import { SeqType, Enzyme, CutSite } from "./elements";
import { reverseComplement } from "./sequence";
import { createRegex } from "../utils/search";
import presetEnzymes from "./enzymes";

/**
 * Digest a sequence with the enzymes and return an array of cut-site.
 *
 * This is slow enough to impact rendering so shouldn't be ran on each prop change.
 */
export default (
  seq: string,
  seqType: SeqType,
  enzymes: (Enzyme | string)[] = [],
  enzymesCustom: { [key: string]: Enzyme } = {},
): CutSite[] => {
  const seqToCut = seq + seq;

  return (
    enzymes
      // if it's a string, assume it's an enzyme name in the pre-defined enzyme list
      .map(e => (typeof e === "string" ? presetEnzymes[e.toLowerCase()] : e))
      // filter out enzyme names that were wrong
      .filter((e): e is Enzyme => Boolean(e))
      // add in custom enzymes
      .concat(Object.values(enzymesCustom))
      // build up cut-sites
      .reduce((acc: CutSite[], enzyme: Enzyme) => {
        const sites = findCutSites(enzyme, seqToCut, seqType, seq.length);
        if (sites.length) acc.push(...sites);
        return acc;
      }, [] as CutSite[])
  );
};

/**
 * Search through the sequence with the enzyme and return an array of cut and hang indexes.
 *
 * Exported for testing.
 */
export const findCutSites = (enzyme: Enzyme, seq: string, seqType: SeqType, seqL: number): CutSite[] => {
  if (seqType === "aa") return [];

  // get the recognitionSite, fcut, and rcut
  const { fcut, rcut, rseq } = enzyme;
  const cutSites: CutSite[] = [];

  // Find matches on the top/forward sequence.
  const matcher = createRegex(rseq, seqType);
  let result = matcher.exec(seq);
  while (result) {
    // add the cut site index, after correcting for actual cut site index
    const index = result.index;
    cutSites.push({
      direction: 1,
      end: index + rseq.length,
      enzyme: enzyme,
      fcut: index + fcut,
      id: "",
      name: enzyme.name,
      rcut: index + rcut,
      start: index,
    });
    result = matcher.exec(seq);
  }

  // We don't want to double-count cuts by enzymes whose recognition seq is the
  // same in the forward and reverse complement direction (eg SpeI).
  const dupRevComp = rseq === reverseComplement(rseq, seqType);

  // Now matches in the reverse complement direction.
  const rcMatcher = createRegex(reverseComplement(rseq, seqType), seqType);
  result = rcMatcher.exec(seq);
  while (result && !dupRevComp) {
    // same as above but correcting for the new reverse complement indexes
    const index = result.index;
    cutSites.push({
      direction: -1,
      end: index + rseq.length,
      enzyme: enzyme,
      fcut: index + rseq.length - rcut,
      id: "",
      name: enzyme.name,
      rcut: index + rseq.length - fcut,
      start: index,
    });
    result = rcMatcher.exec(seq);
  }

  // reduce so there's only one enzyme per template cut index
  const processed = cutSites
    .sort((a, b) => a.fcut - b.fcut)
    // filter out cut sites that only start/end at 0-index. I no longer remember what this was for
    .filter(c => !(c.fcut === 0 && c.rcut === 0))
    // modulo the start/end and add an id to each cut-site
    .map(c => ({
      ...c,
      end: c.end % seqL,
      fcut: c.fcut % seqL,
      id: `${enzyme.name}-${enzyme.rseq}-${c.fcut}-${c.direction > 0 ? "fwd" : "rev"}`,
      rcut: c.rcut % seqL,
      start: c.start % seqL,
    }))
    // if `.range` was provided on the enzyme, limit the search to that range.
    // https://github.com/Lattice-Automation/seqviz/issues/95
    .filter(c => (c.enzyme.range ? c.start >= c.enzyme.range.start && c.end <= c.enzyme.range.end : true));

  const deduped = Array.from(
    processed
      .reduce((acc, site) => {
        const key = `${site.enzyme.name}-${site.start}-${site.direction}`;
        acc.set(key, site); // keep the most recent occurrence for duplicated wrap-around hits
        return acc;
      }, new Map<string, CutSite>())
      .values(),
  );

  return deduped;
};
