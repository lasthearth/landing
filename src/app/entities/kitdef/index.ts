/**
 * Публичный API сущности «Захваченный набор» (kitdef).
 *
 * Экспортирует категории, DTO и UI-модели наборов, мапперы
 * и API-сервис для чтения списка и правки отображаемых метаданных.
 */

export type { KitCategory } from './model/kit-category.type';
export type { IKitDef, IKitDefDto, IKitItem, IKitItemDto, IUpdateKitRequest } from './model/kit-def.interface';
export { mapDtoToKitDef, mapDtoToKitItem, normalizeKitCategory } from './model/kitdef.mapper';
export { KitdefService } from './api/kitdef.service';
