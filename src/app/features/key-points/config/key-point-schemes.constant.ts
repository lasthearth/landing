import { KeyPointScheme } from '../model/key-point-scheme.interface';
import { FORT_SCHEME } from './fort-scheme.constant';
import { HARBOR_SCHEME } from './harbor-scheme.constant';
import { INDUSTRY_SCHEME } from './industry-scheme.constant';
import { MINE_SCHEME } from './mine-scheme.constant';
import { TRADE_SCHEME } from './trade-scheme.constant';

/**
 * Схемы всех типов ключевых точек в порядке вкладок на странице.
 * Первая схема открывается по умолчанию.
 */
export const KEY_POINT_SCHEMES: readonly KeyPointScheme[] = [
    MINE_SCHEME,
    FORT_SCHEME,
    HARBOR_SCHEME,
    INDUSTRY_SCHEME,
    TRADE_SCHEME,
];
