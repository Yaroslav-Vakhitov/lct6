export type TSentiment = 'positive' | 'neutral' | 'negative'
export type TSource = 'sravni' | 'bankiru' | 'other'

export type TSentimentCounts = Record<TSentiment, number>
export interface ISentimentAgg extends TSentimentCounts { total: number }
export interface ITimelineBucket extends ISentimentAgg { date: string }

export interface IReview {
  id: string
  date: string // ISO YYYY-MM-DD
  source: TSource
  products: string[]
  sentiment: TSentiment
  text: string
}

export interface IDateRange { from?: string; to?: string }