export type TSentiment = 'positive' | 'neutral' | 'negative'
export type TSource = 'sravni' | 'bankiru' | 'other'

export type TSentimentCounts = Record<TSentiment, number>
export interface ISentimentAgg extends TSentimentCounts { total: number }
export interface ITimelineBucket extends ISentimentAgg { date: string }

// types для нового формата (опционально, чтобы TS подсветку иметь)
export interface ExternalReview {
  url: string;
  author: string;
  location: string;
  date: string;        // "DD.MM.YYYY"
  time: string;        // "HH:MM"
  title: string;
  rating: number;      // 0..5 (0 = не засчитан)
  review_text: string;
  bank_response: boolean;
  categories: string[];     // из products
  main_category: string;    // первый из categories
  sentiment: 0 | 1 | 2 | 3; // 0=нет, 1=нег, 2=нейтр, 3=позитив
}

export interface IDateRange { from?: string; to?: string }