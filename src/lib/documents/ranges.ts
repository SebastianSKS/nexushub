export type PageRange = readonly [start: number, end: number];

export interface ParsedRanges {
  ranges: PageRange[];
  error?: string;
}

/**
 * Interpreta "1-3, 5, 7-9" (páginas base 1) contra un total de páginas.
 * Acepta comas o punto y coma, espacios y rangos invertidos ("9-7" = 7-9).
 */
export function parseRanges(input: string, pageCount: number): ParsedRanges {
  const text = input.trim();
  if (!text) return { ranges: [], error: "Indica al menos una página o rango, por ejemplo 1-3, 5." };

  const ranges: PageRange[] = [];
  for (const part of text.split(/[,;]+/)) {
    const token = part.trim();
    if (!token) continue;
    const match = /^(\d+)\s*(?:-\s*(\d+))?$/.exec(token);
    if (!match) return { ranges: [], error: `«${token}» no es un rango válido. Usa números y guiones, como 1-3, 5.` };
    const a = Number(match[1]);
    const b = match[2] === undefined ? a : Number(match[2]);
    const start = Math.min(a, b);
    const end = Math.max(a, b);
    if (start < 1 || end > pageCount) {
      return {
        ranges: [],
        error: `El rango ${token} queda fuera del documento, que tiene ${pageCount} ${pageCount === 1 ? "página" : "páginas"}.`,
      };
    }
    ranges.push([start, end]);
  }
  if (ranges.length === 0) return { ranges: [], error: "Indica al menos una página o rango, por ejemplo 1-3, 5." };
  return { ranges };
}

/** Páginas (base 1) contenidas en los rangos, sin duplicados y ordenadas. */
export function rangesToPages(ranges: readonly PageRange[]): number[] {
  const set = new Set<number>();
  for (const [s, e] of ranges) for (let p = s; p <= e; p++) set.add(p);
  return [...set].sort((a, b) => a - b);
}

/** [1,2,3,5,7,8] → "1-3, 5, 7-8" */
export function pagesToRangeText(pages: readonly number[]): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const parts: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) j++;
    parts.push(i === j ? `${sorted[i]}` : `${sorted[i]}-${sorted[j]}`);
    i = j + 1;
  }
  return parts.join(", ");
}
