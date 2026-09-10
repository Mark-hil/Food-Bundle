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

export interface ParsedBundleItem {
  raw: string;
  name: string;
  quantity: number;
  inventoryItem?: { name: string; price: number };
  unitPrice: number;
  totalPrice: number;
}

/**
 * Fuzzy matches a clean item string to an inventory item.
 * Handles:
 * - Direct name matches (e.g. "Sardine" <-> "Sardine")
 * - Singular/plural variations ("Sardines" <-> "Sardine", "Eggs" <-> "Egg")
 * - Parenthetical sub-labels ("Sardine" / "5 Sardine" <-> "Sardines (Titus / Ena Pa)")
 * - Brand/alias matches ("Titus" <-> "Sardines (Titus / Ena Pa)")
 * - Word token overlap ("Frytol 1lt oil" <-> "Frytol 500ml oil")
 */
export function findMatchingInventoryItem(
  cleanName: string,
  inventoryItems: { name: string; price: number }[] = []
): { name: string; price: number } | undefined {
  const norm = cleanName.toLowerCase().trim();
  if (!norm) return undefined;

  // 1. Direct exact match
  let found = inventoryItems.find(i => i.name.toLowerCase() === norm);
  if (found) return found;

  // 2. Singular / plural direct match
  found = inventoryItems.find(i => {
    const l = i.name.toLowerCase();
    return norm === `${l}s` || `${norm}s` === l || norm === `${l}es` || `${norm}es` === l;
  });
  if (found) return found;

  // 3. Match base name stripped of parentheses (e.g. "Sardines (Titus / Ena Pa)" -> "sardines")
  found = inventoryItems.find(i => {
    const baseInv = i.name.replace(/\s*\(.*?\)/g, '').toLowerCase().trim();
    if (baseInv === norm || norm === `${baseInv}s` || `${norm}s` === baseInv) return true;
    if (baseInv === `${norm}s` || `${baseInv}s` === norm) return true;
    return false;
  });
  if (found) return found;

  // 4. Check if a parenthetical alias explicitly contains the term (e.g. "Titus" or "Ena Pa")
  found = inventoryItems.find(i => {
    const parenMatch = i.name.match(/\((.*?)\)/);
    if (parenMatch) {
      const aliases = parenMatch[1].split(/[\/,]/).map(a => a.toLowerCase().trim()).filter(a => a.length > 2);
      const normWords = norm.split(/\s+/);
      if (aliases.some(a => a === norm || normWords.includes(a) || a.split(/\s+/).every(w => normWords.includes(w)))) return true;
    }
    return false;
  });
  if (found) return found;

  // 5. Significant word token matching
  const unitStopwords = /^(?:box|boxes|tin|tins|crate|crates|pack|packs|bottle|bottles|piece|pieces|pcs|pk|kg|\d+kg|\d+l|\d+lt|\d+ml|lt|l|ml|of|a|an|the)$/i;
  const cleanTokens = norm
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !unitStopwords.test(t));

  if (cleanTokens.length > 0) {
    const matches = inventoryItems.filter(inv => {
      const invWords = inv.name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
      return cleanTokens.some(ct => {
        const root = ct.endsWith('s') ? ct.slice(0, -1) : ct;
        return invWords.some(iw => iw === ct || iw === root || iw.startsWith(ct) || iw.startsWith(root));
      });
    });

    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      let best = matches[0];
      let bestScore = -1;
      for (const m of matches) {
        const mLower = m.name.toLowerCase();
        let score = 0;
        for (const ct of cleanTokens) {
          const root = ct.endsWith('s') ? ct.slice(0, -1) : ct;
          if (mLower.includes(ct)) score += 3;
          else if (mLower.includes(root)) score += 2;
        }
        if (mLower.includes(cleanTokens[0])) score += 3;
        if (score > bestScore) {
          bestScore = score;
          best = m;
        }
      }
      return best;
    }
  }

  return undefined;
}

/**
 * Parses a single item string token (e.g. "5 Sardines", "Sardine x 5", "Rice")
 */
export function parseBundleItemString(
  rawItem: string,
  inventoryItems: { name: string; price: number }[] = []
): ParsedBundleItem | null {
  const trimmed = rawItem.trim();
  if (!trimmed) return null;

  let quantity = 1;
  let cleanName = trimmed;

  // Pattern A: "5x Sardine" or "5 x Sardine" or "5* Sardine"
  const prefixMultiply = cleanName.match(/^(\d+)\s*(?:x|\*)\s+(.+)$/i);
  // Pattern B: "2 5kg Milicent Rice" or "5 Sardine" (leading quantity followed by item name)
  const prefixNum = cleanName.match(/^(\d+)\s+(.+)$/i);
  // Pattern C: "Sardine x5" or "5kg Milicent Rice x 2"
  const suffixMultiply = cleanName.match(/^(.+?)\s*(?:x|\*)\s*(\d+)$/i);
  // Pattern D: "Sardine (5)" or "5kg Milicent Rice (2 bags)"
  const suffixParen = cleanName.match(/^(.+?)\s*\(\s*(\d+)\s*(?:x|pcs|tins|packs|pieces|pk|bags|boxes|bottles|sachets)?\s*\)$/i);

  if (prefixMultiply) {
    quantity = parseInt(prefixMultiply[1], 10) || 1;
    cleanName = prefixMultiply[2].trim();
  } else if (prefixNum) {
    // Check if the whole string is an exact inventory item (e.g. "1 Ceres")
    const isFullItemMatch = inventoryItems.some(i => i.name.toLowerCase() === cleanName.toLowerCase());
    if (!isFullItemMatch) {
      quantity = parseInt(prefixNum[1], 10) || 1;
      cleanName = prefixNum[2].trim();
    }
  } else if (suffixMultiply) {
    quantity = parseInt(suffixMultiply[2], 10) || 1;
    cleanName = suffixMultiply[1].trim();
  } else if (suffixParen) {
    quantity = parseInt(suffixParen[2], 10) || 1;
    cleanName = suffixParen[1].trim();
  }

  // Find matching inventory item with smart matching
  const matched = findMatchingInventoryItem(cleanName, inventoryItems);

  const canonicalName = matched ? matched.name : cleanName;
  const unitPrice = matched ? Number(matched.price) || 0 : 0;
  const totalPrice = unitPrice * quantity;

  return {
    raw: trimmed,
    name: canonicalName,
    quantity: Math.max(1, quantity),
    inventoryItem: matched,
    unitPrice,
    totalPrice,
  };
}

/**
 * Parses a comma-separated items string into structured ParsedBundleItem array
 */
export function parseBundleItemsList(
  itemsString: string,
  inventoryItems: { name: string; price: number }[] = []
): ParsedBundleItem[] {
  if (!itemsString || !itemsString.trim()) return [];
  const rawTokens = itemsString.split(',').map(i => i.trim()).filter(Boolean);
  const items: ParsedBundleItem[] = [];

  for (const token of rawTokens) {
    const parsed = parseBundleItemString(token, inventoryItems);
    if (parsed) {
      // Check if we already have this canonical item in the list
      const existingIdx = items.findIndex(it => {
        if (it.inventoryItem && parsed.inventoryItem) {
          return it.inventoryItem.name.toLowerCase() === parsed.inventoryItem.name.toLowerCase();
        }
        return it.name.toLowerCase() === parsed.name.toLowerCase();
      });

      if (existingIdx !== -1) {
        const existing = items[existingIdx];
        const newQty = existing.quantity + parsed.quantity;
        const newTotal = existing.unitPrice * newQty;
        items[existingIdx] = {
          ...existing,
          quantity: newQty,
          totalPrice: newTotal,
          raw: newQty > 1 ? `${newQty} ${existing.name}` : existing.name,
        };
      } else {
        items.push(parsed);
      }
    }
  }

  return items;
}

/**
 * Formats a single item and quantity into a clean string
 */
export function formatBundleItem(name: string, quantity: number): string {
  if (quantity <= 0) return '';
  return quantity > 1 ? `${quantity} ${name}` : name;
}

/**
 * Formats an array of items and quantities into a clean comma-separated string
 */
export function formatBundleItems(items: { name: string; quantity: number }[]): string {
  return items
    .filter(it => it.quantity > 0 && it.name.trim())
    .map(it => formatBundleItem(it.name, it.quantity))
    .join(', ');
}

/**
 * Updates an inventory item's quantity in a comma-separated string (increments, decrements, or removes).
 */
export function updateItemQuantityInString(
  currentItemsString: string,
  targetItemName: string,
  delta: number,
  inventoryItems: { name: string; price: number }[] = []
): string {
  const parsedItems = parseBundleItemsList(currentItemsString, inventoryItems);
  const targetMatched = findMatchingInventoryItem(targetItemName, inventoryItems);
  const targetCanonical = targetMatched ? targetMatched.name.toLowerCase() : targetItemName.toLowerCase();

  const existingIdx = parsedItems.findIndex(it => {
    if (it.inventoryItem && targetMatched) {
      return it.inventoryItem.name.toLowerCase() === targetCanonical;
    }
    return it.name.toLowerCase() === targetCanonical || 
           it.name.toLowerCase() === targetItemName.toLowerCase();
  });

  if (existingIdx !== -1) {
    const newQty = parsedItems[existingIdx].quantity + delta;
    if (newQty <= 0) {
      parsedItems.splice(existingIdx, 1);
    } else {
      parsedItems[existingIdx].quantity = newQty;
    }
  } else if (delta > 0) {
    // Keep user-friendly clean name
    const cleanAddName = targetItemName.replace(/\s*\(.*?\)/g, '').trim() || targetItemName;
    parsedItems.push({
      raw: cleanAddName,
      name: cleanAddName,
      quantity: delta,
      inventoryItem: targetMatched,
      unitPrice: targetMatched ? Number(targetMatched.price) || 0 : 0,
      totalPrice: (targetMatched ? Number(targetMatched.price) || 0 : 0) * delta,
    });
  }

  return formatBundleItems(parsedItems);
}


