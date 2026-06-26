/**
 * Публичный API сущности "Тег поселения".
 */

export { SettlementTagService } from './api/settlement-tag.service';
export { SettlementTagStore } from './model/settlement-tag.store';
export { SettlementTagMapper } from './model/settlement-tag.mapper';

export type { IColor } from './model/i-color';
export type { ISettlementTag } from './model/i-settlement-tag';
export type { ISettlementTagDto } from './model/i-settlement-tag-dto';

export { colorToCss } from './lib/color-to-css.function';
export { hexToColor } from './lib/hex-to-color.function';
export { getContrastColor } from './lib/get-contrast-color.function';
