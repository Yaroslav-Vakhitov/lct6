import { useMemo, useState, useCallback } from "react"
import type { ExternalReview, IDateRange, ISentimentAgg, ITimelineBucket } from "../core/types"
import { EXTERNAL_MOCK_REVIEWS } from "../core/mocks"
import { cn, heatColor, withinRange, ruToISO, mapSentiment, detectSource } from "../lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Separator } from "@radix-ui/react-separator"
import { Input } from "./ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@radix-ui/react-popover"
import { Button } from "./ui/button"
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend, BarChart, Bar,
} from 'recharts'
import { Badge } from "./ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command"
import { BLUE, GREEN, RED } from "../lib/constants"
import { ReviewsColumn } from "./ReviewsColumn"
import { ProductPhrasesDialog } from "./ProductPhrasesDialog"
import { Check, ChevronDown, X } from "lucide-react"

export function ProductsAndReviewsTab() {
  const [dateRange, setDateRange] = useState<IDateRange>({ from: '2024-01-01', to: '2025-05-31' })
  const [selected, setSelected] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')            // <-- фильтр по городу
  const [realtime] = useState(false)
  const [productModal, setProductModal] = useState<string | null>(null)
  const [prodOpen, setProdOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [cityQuery, setCityQuery] = useState("")

  // Деривим список категорий и подкатегорий из данных
  const PRODUCT_OPTIONS = useMemo<string[]>(() => {
    const set = new Set<string>()
    for (const r of EXTERNAL_MOCK_REVIEWS) {
      if (r.main_category) set.add(r.main_category)
      for (const c of r.categories || []) set.add(c)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'))
  }, [])

  const CITY_OPTIONS = useMemo<string[]>(
    () => Array.from(new Set(EXTERNAL_MOCK_REVIEWS.map(r => r.location))).sort((a,b) => a.localeCompare(b, "ru")),
    []
  )

  const citySuggestions = useMemo(
    () => CITY_OPTIONS.filter(c => c.toLowerCase().includes(cityQuery.trim().toLowerCase())),
    [CITY_OPTIONS, cityQuery]
  )

  const filtered: ExternalReview[] = useMemo(() => {
    return EXTERNAL_MOCK_REVIEWS.filter((r) => {
      const inRange = withinRange(r.date, dateRange)
      const hasProduct = selected.length === 0 || r.categories.some((p) => selected.includes(p))
      const byText = q.trim() === '' ||
        r.review_text.toLowerCase().includes(q.trim().toLowerCase()) ||
        r.title.toLowerCase().includes(q.trim().toLowerCase())
      const byCity = city.trim() === '' || r.location.toLowerCase().includes(city.trim().toLowerCase())
      return inRange && hasProduct && byText && byCity
    })
  }, [dateRange, selected, q, city])

  const productSentiments = useMemo(() => {
    const map: Record<string, ISentimentAgg> = {}
    for (const r of filtered) {
      const s = mapSentiment(r.sentiment)
      for (const p of r.categories) {
        if (selected.length && !selected.includes(p)) continue
        map[p] ||= { positive: 0, neutral: 0, negative: 0, total: 0 }
        map[p][s] += 1
        map[p].total += 1
      }
    }
    const rows = Object.entries(map).map(([product, s]) => ({
      product,
      positive: Math.round((s.positive / s.total) * 100) || 0,
      neutral: Math.round((s.neutral / s.total) * 100) || 0,
      negative: Math.round((s.negative / s.total) * 100) || 0,
      total: s.total,
      score: s.total ? (s.positive - s.negative) / s.total : 0,
    }))
    rows.sort((a, b) => b.negative - a.negative)
    return rows
  }, [filtered, selected])

  const timeline = useMemo(() => {
    const buckets = new Map<string, ITimelineBucket>()
    const key = (iso: string) => iso.slice(0, 7) // YYYY-MM
    for (const r of filtered) {
      const k = key(ruToISO(r.date))
      if (!buckets.has(k)) buckets.set(k, { date: k, positive: 0, neutral: 0, negative: 0, total: 0 })
      const b = buckets.get(k)!
      b[mapSentiment(r.sentiment)] += 1
      b.total += 1
    }
    return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [filtered])

  // ---------------- Темы и облако слов (наивная токенизация RU) ----------------
  const STOP: Set<string> = useMemo(() => new Set([
    'и','в','во','не','что','он','на','я','с','со','как','а','то','все','она','так','его','но','да','ты','к','у','же','вы','за','бы','по','только','ее','мне','было','вот','от','меня','еще','нет','о','из','ему','теперь','когда','даже','ну','вдруг','ли','если','уже','или','ни','быть','был','него','до','вас','нибудь','опять','уж','вам','ведь','там','потом','себя','ничего','ей','может','они','тут','где','есть','надо','ней','для','мы','тебя','их','чем','сказал','сказала','бывает','раз','два','три','этот','эта','это','эти','такой','также','всего','всем','при','больше','после','её'
  ]), [])

  const tokenize = useCallback((text: string): string[] => {
    return text
      .toLowerCase()
      .replace(/[^а-яa-zё0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .filter((w) => !STOP.has(w) && w.length > 2)
  }, [STOP])


  // Word cloud
  const wordCloud = useMemo(() => {
    const freq = new Map<string, number>()
    for (const r of filtered) {
      for (const w of tokenize(r.review_text)) {
        freq.set(w, (freq.get(w) ?? 0) + 1)
      }
    }
    const entries = Array.from(freq.entries())
    if (entries.length === 0) return [] as { word: string; count: number; size: number }[]
    const counts = entries.map(([, c]) => c)
    const maxCount = Math.max(...counts)
    const minCount = Math.min(...counts)
    const maxSize = 36
    const minSize = 12
    const scale = (c: number) => {
      if (maxCount === minCount) return (maxSize + minSize) / 2
      return minSize + ((c - minCount) / (maxCount - minCount)) * (maxSize - minSize)
    }
    return entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([word, count]) => ({ word, count, size: scale(count) }))
  }, [filtered, tokenize])

  const grams = useCallback((text: string): string[] => {
    const tokens = tokenize(text)
    const bigrams: string[] = []
    for (let i = 0; i < tokens.length - 1; i++) {
      bigrams.push(tokens[i] + ' ' + tokens[i + 1])
    }
    return [...tokens, ...bigrams]
  }, [tokenize])

  const allGrams = useMemo(() => {
    const m = new Map<string, { count: number; pos: number; neg: number }>()
    for (const r of filtered) {
      const s = mapSentiment(r.sentiment)
      for (const g of grams(r.review_text)) {
        if (!m.has(g)) m.set(g, { count: 0, pos: 0, neg: 0 })
        const rec = m.get(g)!
        rec.count += 1
        if (s === 'positive') rec.pos += 1
        if (s === 'negative') rec.neg += 1
      }
    }
    return m
  }, [filtered, grams])

  const topPosThemes = useMemo(() => {
    return Array.from(allGrams.entries())
      .filter(([, v]) => v.pos > 0)
      .sort((a, b) => b[1].pos - a[1].pos)
      .slice(0, 5)
      .map(([k, v]) => ({ theme: k, count: v.pos }))
  }, [allGrams])

  const topNegThemes = useMemo(() => {
    return Array.from(allGrams.entries())
      .filter(([, v]) => v.neg > 0)
      .sort((a, b) => b[1].neg - a[1].neg)
      .slice(0, 5)
      .map(([k, v]) => ({ theme: k, count: v.neg }))
  }, [allGrams])

  function openProductDetails(product: string) { setProductModal(product) }

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
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
            <Popover open={prodOpen} onOpenChange={setProdOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selected.length ? `${selected.length} выбрано` : 'Выбрать продукты'}
                  <ChevronDown className="h-4 w-4 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                side="bottom"
                sideOffset={6}
                // ширина = ширине кнопки, поверх всего, кликабельно
                className="z-[9999] w-[--radix-popover-trigger-width] p-0
             border border-border rounded-md bg-popover shadow-sm"
              >
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

          {/* Город */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Город/регион</label>
            <Popover open={cityOpen} onOpenChange={setCityOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {city ? city : "Выбрать город"}
                  <ChevronDown className="h-4 w-4 opacity-60" />
                </Button>
              </PopoverTrigger>

              <PopoverContent
                align="start"
                side="bottom"
                sideOffset={6}
                className="z-[9999] w-[--radix-popover-trigger-width] p-0
                          border border-border rounded-md bg-popover shadow-sm"
              >
                <Command>
                  <div className="flex items-center gap-1 border-b p-2">
                    <CommandInput
                      placeholder="Поиск города..."
                      value={cityQuery}
                      onValueChange={setCityQuery}
                    />
                    {city && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => { setCity(""); setCityQuery(""); }}
                        title="Сбросить город"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <CommandList className="max-h-64 overflow-auto">
                    <CommandEmpty>Ничего не найдено</CommandEmpty>
                    <CommandGroup heading="Доступные города">
                      {citySuggestions.map((c) => {
                        const isSelected = c === city
                        return (
                          <CommandItem
                            key={c}
                            onSelect={() => {
                              setCity(c)
                              setCityOpen(false)
                            }}
                            className="flex w-full items-center justify-between"
                          >
                            <span className="truncate">{c}</span>
                            <Check className={`ml-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                          </CommandItem>
                        )
                      })}
                      {/* Пункт 'Любой город' для быстрого сброса */}
                      <CommandItem
                        key="__any__"
                        onSelect={() => { setCity(""); setCityQuery(""); setCityOpen(false) }}
                        className="flex w-full items-center justify-between"
                      >
                        <span className="truncate text-muted-foreground">Любой город</span>
                        <X className={`ml-2 h-4 w-4 ${city ? "opacity-60" : "opacity-0"}`} />
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Поиск по тексту */}
          <div className="md:col-span-4">
            <Input placeholder="Поиск в тексте/заголовке..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Верхняя аналитика */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Динамика отзывов и тональностей (месяцы)</CardTitle>
          </CardHeader>
          <CardContent className={cn("h-72", prodOpen && "pointer-events-none")}>
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
          <CardContent className={cn("h-72", prodOpen && "pointer-events-none")}>
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

      {/* Тепловая карта продуктов */}
      <Card>
        <CardHeader>
          <CardTitle>Тепловая карта продуктов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {productSentiments.map((p) => (
              <button
                key={p.product}
                onClick={() => openProductDetails(p.product)}
                className="rounded-xl border p-3 text-left transition hover:shadow"
                style={{ backgroundColor: heatColor(p.score) }}
                title={`П+: ${p.positive}%  Н: ${p.neutral}%  -: ${p.negative}%  (n=${p.total})`}
              >
                <div className="text-sm font-medium">{p.product}</div>
                <div className="mt-1 text-xs text-muted-foreground">П {p.positive}% · Н {p.neutral}% · - {p.negative}%</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Топ-5 тем: позитив / негатив */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Топ-5 тем (позитив)</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm">
              {topPosThemes.map((t) => (
                <li key={t.theme}><span className="font-medium">{t.theme}</span> — {t.count}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Топ-5 тем (негатив)</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm">
              {topNegThemes.map((t) => (
                <li key={t.theme}><span className="font-medium">{t.theme}</span> — {t.count}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Тренды + Облако слов */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Тренды (доли тональностей)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline.map(x => ({
                date: x.date,
                positive: x.total ? Math.round((x.positive / x.total) * 100) : 0,
                neutral: x.total ? Math.round((x.neutral / x.total) * 100) : 0,
                negative: x.total ? Math.round((x.negative / x.total) * 100) : 0,
              }))} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis unit="%" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="negative" name="Негатив %" fill={RED} stroke={RED} />
                <Area type="monotone" dataKey="neutral" name="Нейтрал %" fill={BLUE} stroke={BLUE} />
                <Area type="monotone" dataKey="positive" name="Позитив %" fill={GREEN} stroke={GREEN} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Облако слов (размер = частота)</CardTitle>
          </CardHeader>
          <CardContent>
            {wordCloud.length === 0 ? (
              <p className="text-sm text-muted-foreground">Недостаточно данных для облака слов</p>
            ) : (
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                {wordCloud.map((w) => (
                  <span key={w.word} className="select-none" style={{ fontSize: `${w.size}px` }} title={`повторений: ${w.count}`}>
                    {w.word}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Список отзывов по источникам */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ReviewsColumn title="Сравни.ру" reviews={filtered.filter((r) => detectSource(r.url) === 'sravni')} />
        <ReviewsColumn title="Банки.ру" reviews={filtered.filter((r) => detectSource(r.url) === 'bankiru')} />
        <ReviewsColumn title="Другое" reviews={filtered.filter((r) => detectSource(r.url) === 'other')} />
      </div>

      {productModal && (
        <ProductPhrasesDialog product={productModal} onClose={() => setProductModal(null)} reviews={filtered} />
      )}
    </div>
  )
}
