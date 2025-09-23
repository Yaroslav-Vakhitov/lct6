import type { IReview } from "./types"

export const PRODUCT_OPTIONS = [
  'Кредитование',
  'Ипотека',
  'Банковские карты',
  'Вклады',
  'Накопительные счета',
  'Страхование',
  'ГПБ Мобайл',
  'Газпромбанк Инвестиции',
  'Счета эскроу',
  'Private Banking',
]

export const MOCK_REVIEWS: IReview[] = [
  { id: 'r1', date: '2025-05-28', source: 'sravni', products: ['Ипотека'], sentiment: 'negative', text: 'Долго рассматривали заявку, непонятные требования к объекту залога' },
  { id: 'r2', date: '2025-05-29', source: 'bankiru', products: ['Ипотека', 'Кредитование'], sentiment: 'neutral', text: 'Одобрили, но ставка выше ожиданий. Процесс в целом ок' },
  { id: 'r3', date: '2025-04-02', source: 'other', products: ['Банковские карты'], sentiment: 'positive', text: 'Кэшбэк пришёл вовремя, удобное приложение' },
  { id: 'r4', date: '2025-03-20', source: 'sravni', products: ['Вклады', 'Накопительные счета'], sentiment: 'positive', text: 'Нравятся ставки и прозрачные условия' },
  { id: 'r5', date: '2025-02-11', source: 'bankiru', products: ['ГПБ Мобайл'], sentiment: 'negative', text: 'Баг в приложении, платеж не прошёл с первого раза' },
  { id: 'r6', date: '2025-01-10', source: 'bankiru', products: ['Страхование', 'Ипотека'], sentiment: 'neutral', text: 'Страховку оформили, но было долго' },
  { id: 'r7', date: '2024-11-14', source: 'other', products: ['Газпромбанк Инвестиции'], sentiment: 'positive', text: 'Удобный интерфейс и быстрое пополнение' },
  { id: 'r8', date: '2024-07-05', source: 'sravni', products: ['Счета эскроу', 'Ипотека'], sentiment: 'negative', text: 'Escrow счёт открывали 2 дня, много бумажной волокиты' },
]