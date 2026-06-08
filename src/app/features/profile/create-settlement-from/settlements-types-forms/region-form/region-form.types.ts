/**
 * Тип, представляющий любой ключ из массива `fileFieldsRegion`.
 * Используется для обращения к конкретным файлам региона.
 */
export type FileKeyRegion = (typeof fileFieldsRegion)[number];
/**
 * Список ключей файлов, связанных с провинцией.
 */
export const fileFieldsRegion = [
    'preview',
    'map',
    'monument',
    'playersDocuments',
    'loreBooks',
    'yardage',
    'bigYardage',
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
    'doubleFloorHouse6',
    'thirdFloorHouse1',
    'workshop1',
    'workshop2',
    'blacksmithShop',
    'religionOrCultureOrEconomicHouse1',
    'religionOrCultureOrEconomicHouse2',
    'marketPlace1',
    'marketPlace2',
    'marketPlace3',
    'marketPlace4',
    'marketPlace5',
    'stablesOrHarbor',
    'tavern',
    'importantBuilding',
    'greateBuilding',
    'steelBuilding',
] as const;
