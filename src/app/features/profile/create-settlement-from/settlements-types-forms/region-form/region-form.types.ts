/**
 * Тип, представляющий любой ключ из массива `fileFieldsRegion`.
 * Используется для обращения к конкретным файлам маркграфство.
 */
export type FileKeyRegion = (typeof fileFieldsRegion)[number];
/**
 * Список ключей файлов, связанных с маркграфство.
 */
export const fileFieldsRegion = ['preview', 'map', 'nobleScroll', 'passports', 'liberties', 'monument', 'pit', 'house1', 'house2', 'house3', 'house4', 'house5', 'house6', 'headBuilding', 'courtBuilding', 'warehouse', 'seedbeds', 'square', 'capitalRoad', 'roads', 'foodMarket', 'craftMarket', 'buyMarket', 'churchOrTavern', 'prison', 'workshop1', 'workshop2', 'capitalRepresentation', 'noticeBoard'] as const;
