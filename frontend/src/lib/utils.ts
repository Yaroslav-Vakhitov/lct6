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

export function heatColor(score: number): string {
  const clamp = (n: number) => Math.max(-1, Math.min(1, n))
  const s = clamp(score)
  if (s === 0) return '#e5e7eb'
  const pos = s > 0
  const t = Math.abs(s)
  const from: [number, number, number] = [210, 10, 90]
  const to: [number, number, number] = pos ? [150, 60, 45] : [0, 70, 50]
  const h = from[0] + (to[0] - from[0]) * t
  const sat = from[1] + (to[1] - from[1]) * t
  const light = from[2] + (to[2] - from[2]) * t
  return `hsl(${h.toFixed(0)} ${sat.toFixed(0)}% ${light.toFixed(0)}%)`
}