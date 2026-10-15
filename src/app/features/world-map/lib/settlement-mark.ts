import { WorldMapSettlementType } from '../model/world-map-point.interface';

/**
 * Курс поселения для цвета кольца метки.
 */
export type WorldMapCourse = 'peace' | 'neutral' | 'danger';

/**
 * Ранг типа: от лагеря (0) до провинции (4).
 *
 * @param type Тип поселения.
 * @returns Ранг.
 */
export function settlementTier(type: WorldMapSettlementType): number {
    switch (type) {
        case 'VILLAGE':
            return 1;
        case 'TOWNSHIP':
            return 2;
        case 'CITY':
            return 3;
        case 'PROVINCE':
            return 4;
        case 'CAMP':
        default:
            return 0;
    }
}

/**
 * Радиус свечения вокруг метки: чем крупнее поселение, тем ярче его огонь в темноте.
 *
 * @param type Тип поселения.
 * @returns Радиус, пиксели.
 */
export function glowRadius(type: WorldMapSettlementType): number {
    return 22 + settlementTier(type) * 9;
}

/**
 * Курс по значению дипломатии из API.
 *
 * Значения те же, что у бейджа дипломатии в списке поселений: всё, что не
 * «Миролюбивый» и не «Нейтральный», считается агрессивным.
 *
 * @param diplomacy Дипломатия из API.
 * @returns Курс.
 */
export function settlementCourse(diplomacy: string): WorldMapCourse {
    switch (diplomacy) {
        case 'Миролюбивый':
            return 'peace';
        case 'Нейтральный':
            return 'neutral';
        default:
            return 'danger';
    }
}

/**
 * Пиктограмма типа поселения: контур в квадрате 16×16 с центром в нуле.
 *
 * Форма — второй признак типа помимо размера свечения: шатёр, дом, два дома,
 * башня, крепость. Цвет кольца при этом занят курсом.
 *
 * @param type Тип поселения.
 * @returns Атрибут `d` для `<path>`.
 */
export function settlementGlyph(type: WorldMapSettlementType): string {
    switch (type) {
        case 'VILLAGE':
            return 'M-5 5V-1L0-5.5L5-1V5Z';
        case 'TOWNSHIP':
            return 'M-7 5V0L-3.5-3.5L0 0V5ZM0 5V-2L3.5-5.5L7-2V5Z';
        case 'CITY':
            return 'M-4 6V-6.5H-2.4V-5H-0.8V-6.5H0.8V-5H2.4V-6.5H4V6ZM-1.2 6V2.5H1.2V6Z';
        case 'PROVINCE':
            return 'M-7.5 6V-5H-5.5V-3.5H-4V-5H-2V-2H2V-5H4V-3.5H5.5V-5H7.5V6ZM-1.5 6V2H1.5V6Z';
        case 'CAMP':
        default:
            return 'M-6 5L0-6L6 5ZM-1.5 5L0 1.5L1.5 5Z';
    }
}
