import { useMemo, useState } from "react"
import type { IDateRange, ISentimentAgg, ITimelineBucket } from "../core/types"
import { MOCK_REVIEWS, PRODUCT_OPTIONS } from "../core/mocks"
import { withinRange } from "../lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Separator } from "@radix-ui/react-separator"
import { Input } from "./ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@radix-ui/react-popover"
import { Button } from "./ui/button"
import { CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk"
import {
ResponsiveContainer,
AreaChart,
Area,
CartesianGrid,
XAxis,
YAxis,
Tooltip,
Legend,
BarChart,
Bar,
} from 'recharts'
import { Badge } from "./ui/badge"
import { Command } from "./ui/command"
import { BLUE, GREEN, RED } from "../lib/constants"
import { ReviewsColumn } from "./ReviewsColumn"

export function ProductsAndReviewsTab() {
  const [dateRange, setDateRange] = useState<IDateRange>({ from: '2024-01-01', to: '2025-05-31' })
  const [selected, setSelected] = useState<string[]>([])
  const [q, setQ] = useState('')
  // const [realtime, setRealtime] = useState(false)
  const [realtime] = useState(false)

  const filtered = useMemo(() => {
    return MOCK_REVIEWS.filter((r) => {
      const inRange = withinRange(r.date, dateRange)
      const hasProduct = selected.length === 0 || r.products.some((p) => selected.includes(p))
      const byText = q.trim() === '' || r.text.toLowerCase().includes(q.trim().toLowerCase())
      return inRange && hasProduct && byText
    })
  }, [dateRange, selected, q])

  const productSentiments = useMemo(() => {
    const map: Record<string, ISentimentAgg> = {}
    for (const r of filtered) {
      for (const p of r.products) {
        if (selected.length && !selected.includes(p)) continue
        map[p] ||= { positive: 0, neutral: 0, negative: 0, total: 0 }
        map[p][r.sentiment] += 1
        map[p].total += 1
      }
    }
    const rows = Object.entries(map).map(([product, s]) => ({
      product,
      positive: Math.round((s.positive / s.total) * 100) || 0,
      neutral: Math.round((s.neutral / s.total) * 100) || 0,
      negative: Math.round((s.negative / s.total) * 100) || 0,
    }))
    rows.sort((a, b) => b.negative - a.negative)
    return rows
  }, [filtered, selected])

  const timeline = useMemo(() => {
    const buckets = new Map<string, ITimelineBucket>()
    const key = (iso: string) => iso.slice(0, 7) // YYYY-MM
    for (const r of filtered) {
      const k = key(r.date)
      if (!buckets.has(k)) buckets.set(k, { date: k, positive: 0, neutral: 0, negative: 0, total: 0 })
      const b = buckets.get(k)!
      b[r.sentiment] += 1
      b.total += 1
    }
    return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [filtered])

  return (
    <div className="space-y-6">
      {/* Панель фильтров */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Фильтры</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Период данных: 01.01.2024 — 31.05.2025
              <Separator orientation="vertical" className="mx-2 h-4" />
              Реальное время: <Badge variant={realtime ? 'default' : 'secondary'}>{realtime ? 'вкл' : 'выкл'}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Дата от/до */}
          <div className="space-y-2">
            <label className="text-sm font-medium">С</label>
            <div className="flex items-center gap-2">
              <Input type="date" value={dateRange.from ?? ''} onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))} />
              <span className="text-xs opacity-60">📅</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">По</label>
            <div className="flex items-center gap-2">
              <Input type="date" value={dateRange.to ?? ''} onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))} />
              <span className="text-xs opacity-60">📅</span>
            </div>
          </div>

          {/* Мультиселект продуктов */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Продукты</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selected.length ? `${selected.length} выбрано` : 'Выбрать продукты'}
                  <span aria-hidden className="text-xs">▾</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Command>
                  <CommandInput placeholder="Поиск продукта..." />
                  <CommandList>
                    <CommandEmpty>Ничего не найдено</CommandEmpty>
                    <CommandGroup>
                      {PRODUCT_OPTIONS.map((p) => (
                        <CommandItem
                          key={p}
                          onSelect={() => {
                            setSelected((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
                          }}
                        >
                          <div className={`mr-2 h-4 w-4 rounded-sm border ${selected.includes(p) ? 'bg-primary' : 'bg-background'}`} />
                          {p}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Поиск по тексту */}
          <div className="md:col-span-3">
            <Input placeholder="Поиск в тексте отзыва..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Верхняя аналитика */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Динамика отзывов и тональности (месяцы)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="negative" stackId="1" name="Негатив" fill={RED} stroke={RED} />
                <Area type="monotone" dataKey="neutral" stackId="1" name="Нейтрал" fill={BLUE} stroke={BLUE} />
                <Area type="monotone" dataKey="positive" stackId="1" name="Позитив" fill={GREEN} stroke={GREEN} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Тональность по продуктам (%) — топ по негативу</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productSentiments} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="negative" name="Негатив" stackId="a" fill={RED} />
                <Bar dataKey="neutral" name="Нейтрал" stackId="a" fill={BLUE} />
                <Bar dataKey="positive" name="Позитив" stackId="a" fill={GREEN} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Список отзывов по источникам */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ReviewsColumn title="Сравни.ру" reviews={filtered.filter((r) => r.source === 'sravni')} />
        <ReviewsColumn title="Банки.ру" reviews={filtered.filter((r) => r.source === 'bankiru')} />
        <ReviewsColumn title="Другое" reviews={filtered.filter((r) => r.source === 'other')} />
      </div>
    </div>
  )
}