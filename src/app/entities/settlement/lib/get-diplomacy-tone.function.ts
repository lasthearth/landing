import { SettlementBadgeTone } from '../model/settlement-badge-tone';

/**
 * Возвращает тон бейджа дипломатии по её значению.
 *
 * @param diplomacy Статус дипломатии из API.
 * @returns Тон бейджа.
 */
export function getDiplomacyTone(diplomacy: string | undefined): SettlementBadgeTone {
    switch (diplomacy) {
        case 'Миролюбивый':
            return 'peace';
        case 'Нейтральный':
            return 'neutral';
        default:
            return 'danger';
    }
}
