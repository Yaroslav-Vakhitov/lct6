import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { ProductsAndReviewsTab } from '../components/ProductsAndReviewsTab'

export default function Dashboard() {
  return (
    <div className="min-h-svh bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-6">
        <Tabs defaultValue="products" className="w-full">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="products">Продукты и отзывы</TabsTrigger>
              <TabsTrigger value="hypotheses">Гипотезы</TabsTrigger>
            </TabsList>
          </div>

          {/* TAB: Продукты и отзывы */}
          <TabsContent value="products" className="mt-6 space-y-6">
            <ProductsAndReviewsTab />
          </TabsContent>

          {/* TAB: Гипотезы */}
          <TabsContent value="hypotheses" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Гипотезы — заглушка</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Тут будут гипотезы, этапы проверки и результаты экспериментов.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
