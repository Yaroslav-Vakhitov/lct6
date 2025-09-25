import { useMemo } from "react";
import type { IReview } from "../core/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

export function ProductPhrasesDialog({ product, onClose, reviews }: { product: string; onClose: () => void; reviews: IReview[] }) {
  const listPos = useMemo(() => reviews.filter(r => r.products.includes(product) && r.sentiment === 'positive'), [reviews, product])
  const listNeg = useMemo(() => reviews.filter(r => r.products.includes(product) && r.sentiment === 'negative'), [reviews, product])

  function topPhrases(list: IReview[], limit: number): { phrase: string; count: number }[] {
    const m = new Map<string, number>()
    for (const r of list) {
      const tokens = r.text.toLowerCase().replace(/[^а-яa-zё0-9\s]/gi, ' ').split(/\s+/).filter(Boolean)
      for (let i = 0; i < tokens.length - 1; i++) {
        const bg = tokens[i] + ' ' + tokens[i + 1]
        if (bg.length < 5) continue
        m.set(bg, (m.get(bg) ?? 0) + 1)
      }
    }
    return Array.from(m.entries()).sort((a,b) => b[1]-a[1]).slice(0, limit).map(([phrase, count]) => ({ phrase, count }))
  }

  const posPhrases = useMemo(() => topPhrases(listPos, 6), [listPos])
  const negPhrases = useMemo(() => topPhrases(listNeg, 6), [listNeg])

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Формулировки клиентов — {product}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 font-medium">Похвалы</div>
            {posPhrases.length === 0 && <p className="text-sm text-muted-foreground">Нет данных</p>}
            <ul className="list-disc pl-5 text-sm">
              {posPhrases.map(p => (<li key={p.phrase}>{p.phrase} — {p.count}</li>))}
            </ul>
          </div>
          <div>
            <div className="mb-2 font-medium">Жалобы</div>
            {negPhrases.length === 0 && <p className="text-sm text-muted-foreground">Нет данных</p>}
            <ul className="list-disc pl-5 text-sm">
              {negPhrases.map(p => (<li key={p.phrase}>{p.phrase} — {p.count}</li>))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}