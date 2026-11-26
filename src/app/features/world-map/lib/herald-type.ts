import { KEY_POINT_HERALD_NAMES } from '../config/key-point-herald-names.constant';
import { WorldMapSettlementType } from '../model/world-map-point.interface';

/** Гроссхольм на любой из локалей, с одной или двумя «с». */
const CAPITAL_NAME = /гросс?хольм|gross?holm/i;

/**
 * Приводит название с глашатая к виду для сравнения: нижний регистр,
 * «ё» как «е», любые кавычки убраны, пробелы схлопнуты.
 *
 * @param name Название с глашатая.
 * @returns Нормализованное название.
 */
export function normalizeHeraldName(name: string): string {
    return name
        .toLowerCase()
        .replaceAll('ё', 'е')
        .replace(/["'«»„“”]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Нормализованные названия ключевых точек. */
const KEY_POINT_NAMES: ReadonlySet<string> = new Set(KEY_POINT_HERALD_NAMES.map(normalizeHeraldName));

/**
 * Тип глашатая без надела по названию на блоке.
 *
 * Гроссхольм — столица, название из списка ключевых точек — ключевая точка,
 * остальные — усадьбы: их не регистрируют на сайте, но глашатая ставят.
 *
 * @param name Название с глашатая.
 * @returns `CAPITAL`, `KEY_POINT` или `HAMLET`.
 */
export function heraldType(name: string): Extract<WorldMapSettlementType, 'CAPITAL' | 'KEY_POINT' | 'HAMLET'> {
    if (CAPITAL_NAME.test(name)) {
        return 'CAPITAL';
    }

    return KEY_POINT_NAMES.has(normalizeHeraldName(name)) ? 'KEY_POINT' : 'HAMLET';
}
