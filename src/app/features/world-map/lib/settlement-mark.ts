import { WorldMapSettlementType } from '../model/world-map-point.interface';

/**
 * Курс поселения: цвет акварельной заливки под знаком. У хутора курса нет.
 */
export type WorldMapCourse = 'peace' | 'neutral' | 'danger' | 'none';

/**
 * Ранг типа: от хутора (0) до провинции (5).
 *
 * @param type Тип поселения.
 * @returns Ранг.
 */
export function settlementTier(type: WorldMapSettlementType): number {
    switch (type) {
        case 'HAMLET':
            return 0;
        case 'VILLAGE':
            return 2;
        case 'TOWNSHIP':
            return 3;
        case 'CITY':
            return 4;
        case 'PROVINCE':
            return 5;
        case 'CAMP':
        default:
            return 1;
    }
}

/**
 * Радиус акварельной заливки под знаком: чем крупнее поселение, тем шире
 * размыта краска — как на раскрашенных от руки картах.
 *
 * @param type Тип поселения.
 * @returns Радиус, пиксели.
 */
export function washRadius(type: WorldMapSettlementType): number {
    return 10 + settlementTier(type) * 4;
}

/**
 * Курс по значению дипломатии из API.
 *
 * Значения те же, что у бейджа дипломатии в списке поселений: всё, что не
 * «Миролюбивый» и не «Нейтральный», считается агрессивным. Без значения (хутор)
 * курса нет.
 *
 * @param diplomacy Дипломатия из API.
 * @returns Курс.
 */
export function settlementCourse(diplomacy: string | undefined): WorldMapCourse {
    switch (diplomacy) {
        case undefined:
        case '':
            return 'none';
        case 'Миролюбивый':
            return 'peace';
        case 'Нейтральный':
            return 'neutral';
        default:
            return 'danger';
    }
}

/**
 * Условный знак типа поселения — контур в квадрате 18×18 с центром в нуле,
 * в манере гравированных карт: хутор — кружок с точкой, лагерь — шатёр,
 * деревня — дом, посёлок — два дома, город — башня со стенами, провинция —
 * замок с флагом. Рисуется с `fill-rule="evenodd"`: двери — вырезы.
 *
 * @param type Тип поселения.
 * @returns Атрибут `d` для `<path>`.
 */
export function settlementGlyph(type: WorldMapSettlementType): string {
    switch (type) {
        case 'HAMLET':
            return 'M0-3.6a3.6 3.6 0 1 0 0 7.2a3.6 3.6 0 1 0 0-7.2ZM0-2.3a2.3 2.3 0 1 0 0 4.6a2.3 2.3 0 1 0 0-4.6ZM0-1a1 1 0 1 0 0 2a1 1 0 1 0 0-2Z';
        case 'VILLAGE':
            return 'M-5 5V-0.5L0-5L5-0.5V5ZM-1.2 5V1.8H1.2V5Z';
        case 'TOWNSHIP':
            return 'M-7 5V0L-3.5-3.5L0 0V5ZM-4.6 5V2.4H-2.4V5ZM0 5V-2L3.5-5.5L7-2V5ZM2.4 5V2H4.6V5Z';
        case 'CITY':
            return 'M-7 6V0H-4.5V-6.5H-3V-5H-1.5V-6.5H1.5V-5H3V-6.5H4.5V0H7V6ZM-1.2 6V2.6H1.2V6Z';
        case 'PROVINCE':
            return 'M-8 6V-4H-6.5V-2.8H-5V-4H-3.5V-1H3.5V-4H5V-2.8H6.5V-4H8V6ZM-1.6 6V1.8H1.6V6ZM-0.4-1V-9H0.4V-1ZM0.4-9L4.5-7.6L0.4-6.2Z';
        case 'CAMP':
        default:
            return 'M-6 5L0-6L6 5ZM-1.6 5L0 1L1.6 5Z';
    }
}
