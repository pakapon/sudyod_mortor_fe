import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/

/** Generic client-side sort for table rows. Handles dates, numeric, and string values. */
export function sortRows<T>(
  rows: T[],
  key: string,
  dir: 'asc' | 'desc',
  accessor?: (row: T) => any,
): T[] {
  return [...rows].sort((a, b) => {
    const av = accessor ? accessor(a) : (a as any)[key] ?? ''
    const bv = accessor ? accessor(b) : (b as any)[key] ?? ''
    const avStr = String(av)
    const bvStr = String(bv)
    // ISO date / datetime strings (YYYY-MM-DD...) — must check before parseFloat
    // because parseFloat("2026-04-18") === 2026, discarding month/day
    if (ISO_DATE_RE.test(avStr) && ISO_DATE_RE.test(bvStr)) {
      const ad = Date.parse(avStr)
      const bd = Date.parse(bvStr)
      if (!isNaN(ad) && !isNaN(bd)) return dir === 'asc' ? ad - bd : bd - ad
    }
    const an = parseFloat(avStr)
    const bn = parseFloat(bvStr)
    if (!isNaN(an) && !isNaN(bn)) return dir === 'asc' ? an - bn : bn - an
    const as = avStr.toLowerCase()
    const bs = bvStr.toLowerCase()
    if (as < bs) return dir === 'asc' ? -1 : 1
    if (as > bs) return dir === 'asc' ? 1 : -1
    return 0
  })
}
