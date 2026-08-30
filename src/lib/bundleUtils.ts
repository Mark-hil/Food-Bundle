/**
 * Sorts bundles so that ALPHA, BETA, and GAMMA always appear at the top / first row,
 * in order (Alpha -> Beta -> Gamma), followed by all other bundles sorted by price descending.
 */
export const sortBundlesWithAlphaBetaGamma = <T extends { name?: string; price?: number | string }>(bundles: T[]): T[] => {
  const priorityList = ['alpha', 'beta', 'gamma'];

  return [...bundles].sort((a, b) => {
    const aName = (a.name || '').toLowerCase().trim();
    const bName = (b.name || '').toLowerCase().trim();

    const aIndex = priorityList.findIndex(p => aName === p || aName.startsWith(`${p} `) || aName.startsWith(`${p}-`) || aName.startsWith(`${p}_`) || aName === `${p} bundle` || aName.includes(p));
    const bIndex = priorityList.findIndex(p => bName === p || bName.startsWith(`${p} `) || bName.startsWith(`${p}-`) || bName.startsWith(`${p}_`) || bName === `${p} bundle` || bName.includes(p));

    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    // Secondary fallback sorting: highest price first
    const aPrice = typeof a.price === 'string' ? parseFloat(a.price) || 0 : (a.price || 0);
    const bPrice = typeof b.price === 'string' ? parseFloat(b.price) || 0 : (b.price || 0);
    return bPrice - aPrice;
  });
};
