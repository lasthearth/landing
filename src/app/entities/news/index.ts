/**
 * Публичный API сущности "Новость".
 *
 * Экспортирует типы, мапперы и API-сервис для работы с новостями.
 */

export * from './model/news.types';
export type { NewsBanner } from './model/news-banner';
export { parseNewsBanner } from './lib/parse-news-banner.function';
export { stripNewsBanner } from './lib/strip-news-banner.function';
export { appendNewsBanner } from './lib/append-news-banner.function';
export { mapDtoToNews, mapCreateRequestToDto } from './model/news.mapper';
export { NewsApiService } from './api/news.api';
