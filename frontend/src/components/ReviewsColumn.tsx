import { format, parseISO } from "date-fns"
import type { ExternalReview } from "../core/types"
import { Badge } from "./ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { ruToISO, sentimentColor, mapSentiment } from "../lib/utils"

export function ReviewsColumn({ title, reviews }: { title: string; reviews: ExternalReview[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="secondary">{reviews.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviews.length === 0 && <p className="text-sm text-muted-foreground">Нет отзывов по текущим фильтрам</p>}
        {reviews.map((r) => (
          <div key={r.url} className="rounded-xl border p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                {format(parseISO(ruToISO(r.date)), "dd.MM.yyyy")} · {r.time}
              </span>
              <span className={`h-2 w-2 rounded-full ${sentimentColor(mapSentiment(r.sentiment))}`} />
              <span className="text-muted-foreground">{r.location}</span>
              {r.categories.map((p) => (
                <Badge key={p} variant="outline">{p}</Badge>
              ))}
            </div>
            <div className="mb-1 text-sm font-medium">{r.title}</div>
            <p className="text-sm leading-relaxed">{r.review_text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
