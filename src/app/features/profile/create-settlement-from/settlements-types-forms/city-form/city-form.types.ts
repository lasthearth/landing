/**
 * Тип, представляющий любой ключ из массива `fileFieldsCity`.
 * Используется для обращения к конкретным файлам графство.
 */
export type FileKeyCity = (typeof fileFieldsCity)[number];
/**
 * Список ключей файлов, связанных с графство.
 */
export const fileFieldsCity = ['preview', 'map', 'nobleScroll', 'passports', 'liberties', 'patentCounty', 'monument', 'pit', 'house1', 'house2', 'house3', 'house4', 'house5', 'headBuilding', 'warehouse', 'seedbeds', 'square', 'capitalRoad', 'roads', 'foodMarket', 'craftMarket', 'buyMarket', 'churchOrTavern', 'prison', 'workshop1', 'noticeBoard'] as const;
