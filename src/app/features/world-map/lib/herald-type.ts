import { KEY_POINT_HERALD_WORDS } from '../config/key-point-herald-words.constant';
import { WorldMapSettlementType } from '../model/world-map-point.interface';

/** Гроссхольм на любой из локалей, с одной или двумя «с». */
const CAPITAL_NAME = /гросс?хольм|gross?holm/i;

/**
 * Тип глашатая без надела по названию на блоке.
 *
 * Гроссхольм — столица, название с типом ключевой точки — ключевая точка,
 * остальные — усадьбы: их не регистрируют на сайте, но глашатая ставят.
 *
 * @param name Название с глашатая.
 * @returns `CAPITAL`, `KEY_POINT` или `HAMLET`.
 */
export function heraldType(name: string): Extract<WorldMapSettlementType, 'CAPITAL' | 'KEY_POINT' | 'HAMLET'> {
    if (CAPITAL_NAME.test(name)) {
        return 'CAPITAL';
    }

    const words = name.toLowerCase().replaceAll('ё', 'е').split(/[^\p{L}]+/u);

    return words.some((word) => KEY_POINT_HERALD_WORDS.has(word)) ? 'KEY_POINT' : 'HAMLET';
}
