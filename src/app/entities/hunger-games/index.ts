/**
 * Публичный API сущности "Hunger Games".
 *
 * Экспортирует типы, мапперы и API-сервис для работы
 * с сезонами, лидербордами и результатами матчей.
 */

export * from './model/season-info.interface';
export * from './model/season-result-entry.interface';
export * from './model/match-result-request.interface';
export {
    mapDtoToSeasonInfo,
    mapDtoToSeasonResultEntry,
    mapMatchPlayerToDto,
} from './model/hunger-games.mapper';
export { HungerGamesService } from './api/hunger-games.service';
