/**
 * Тип, представляющий любой ключ из массива `fileFieldsTownship`.
 * Используется для обращения к конкретным файлам баронство.
 */
export type FileKeyTownship = (typeof fileFieldsTownship)[number];
/**
 * Список ключей файлов, связанных с баронство.
 */
export const fileFieldsTownship = ['preview', 'map', 'nobleScroll', 'passports', 'liberties', 'monument', 'pit', 'house1', 'house2', 'house3', 'warehouse', 'seedbeds', 'square', 'capitalRoad', 'roads', 'foodMarket', 'craftMarket', 'churchOrTavern'] as const;
