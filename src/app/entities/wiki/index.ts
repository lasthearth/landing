/**
 * Публичный API сущности «Вики».
 *
 * Отдаёт модель статьи, контракт DTO, мапперы и API-сервис.
 */

export * from './model/wiki-article.model';
export * from './model/wiki.types';
export {
    mapArticleFromDto,
    mapDraftToDto,
    mapRevisionFromDto,
    mapStatusFromDto,
    mapStatusToDto,
} from './model/wiki.mapper';
export { WikiApiService, mapSuggestionFromDto } from './api/wiki.api';
export type { WikiSavePayload, WikiSuggestion, WikiSuggestionPayload } from './api/wiki.api';
export { WikiAuthorNameService } from './lib/wiki-author-name.service';
