/**
 * Тип, представляющий любой ключ из массива `fileFieldsTownship`.
 * Используется для обращения к конкретным файлам посёлка/тауншипа.
 */
export type FileKeyTownship = (typeof fileFieldsTownship)[number];
/**
 * Список ключей файлов, связанных с поселком.
 */
export const fileFieldsTownship = [
    'preview',
    'map',
    'monument',
    'playersDocuments',
    'yardage',
    'pit',
    'roads',
    'warehouse',
    'barn',
    'seedbeds',
    'oneFloorHouse1',
    'oneFloorHouse2',
    'oneFloorHouse3',
    'oneFloorHouse4',
    'doubleFloorHouse1',
    'workshop',
    'blacksmithShop',
    'religionOrCultureOrEconomicHouse',
] as const;
