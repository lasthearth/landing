/**
 * Публичный API слайса "News".
 *
 * Другие слайсы импортируют только отсюда: @features/news.
 * Внутренние файлы снаружи не читаются — проверяет scripts/check-architecture.mjs.
 */

export * from './components/create-news-form/create-news.component';
export * from './ui/news-card/news-card.component';
export * from './ui/news-page/news-page.component';
export * from './ui/news-list-page/news-list-page.component';
export * from './ui/news-skeleton/news-skeleton.component';
