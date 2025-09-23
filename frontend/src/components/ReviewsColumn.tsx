import { format, parseISO } from "date-fns";
import type { IReview } from "../core/types";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { sentimentColor } from "../lib/utils";

export function ReviewsColumn({ title, reviews }: { title: string; reviews: IReview[] }) {
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
          <div key={r.id} className="rounded-xl border p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">{format(parseISO(r.date), 'dd.MM.yyyy')}</span>
              <span className={`h-2 w-2 rounded-full ${sentimentColor(r.sentiment)}`} />
              {r.products.map((p) => (
                <Badge key={p} variant="outline">{p}</Badge>
              ))}
            </div>
            <p className="text-sm leading-relaxed">{r.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}