import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { IDateRange, TSentiment } from "../core/types"
import { isAfter, isBefore, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function withinRange(dateISO: string, range: IDateRange): boolean {
  const d = parseISO(dateISO)
  if (range.from && isBefore(d, parseISO(range.from))) return false
  if (range.to && isAfter(d, parseISO(range.to))) return false
  return true
}

export function sentimentColor(s: TSentiment) {
  if (s === 'positive') return 'bg-emerald-500'
  if (s === 'neutral') return 'bg-slate-400'
  return 'bg-rose-500'
}