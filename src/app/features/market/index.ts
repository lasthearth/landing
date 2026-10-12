/**
 * Публичный API слайса "Market".
 *
 * Другие слайсы импортируют только отсюда: @features/market.
 * Внутренние файлы снаружи не читаются — проверяет scripts/check-architecture.mjs.
 */

export * from './components/how-to-buy/how-to-buy.component';
export * from './market.component';
