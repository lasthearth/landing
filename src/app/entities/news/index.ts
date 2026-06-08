/**
 * Публичный API сущности "Новость".
 *
 * Экспортирует типы, мапперы и API-сервис для работы с новостями.
 */

export * from './model/news.types';
export { mapDtoToNews, mapCreateRequestToDto } from './model/news.mapper';
export { NewsApiService } from './api/news.api';
