/**
 * Тип, представляющий любой ключ из массива `fileFieldsCity`.
 * Используется для обращения к конкретным файлам города.
 */
export type FileKeyCity = (typeof fileFieldsCity)[number];
/**
 * Список ключей файлов, связанных с городом.
 */
export const fileFieldsCity = [
    'preview',
    'map',
    'monument',
    'playersDocuments',
    'document',
    'yardage',
    'pit',
    'localRoads',
    'globalRoads',
    'warehouse',
    'barn',
    'seedbeds',
    'oneFloorHouse1',
    'oneFloorHouse2',
    'oneFloorHouse3',
    'oneFloorHouse4',
    'doubleFloorHouse1',
    'doubleFloorHouse2',
    'doubleFloorHouse3',
    'doubleFloorHouse4',
    'doubleFloorHouse5',
    'workshop',
    'blacksmithShop',
    'religionOrCultureOrEconomicHouse',
    'marketPlace1',
    'marketPlace2',
] as const;
