/**
 * Тип, представляющий любой ключ из массива `fileFields`.
 * Используется для обращения к конкретным файлам деревни.
 */
export type FileKeyVillage = (typeof fileFields)[number];
/**
 * Список ключей файлов, связанных с деревней.
 */
export const fileFields = [
    'preview',
    'map',
    'monument',
    'warehouse',
    'beds',
    'playersDocuments',
    'document',
    'yardage',
    'pit',
    'roads',
    'barn',
    'seedbeds',
    'house1',
    'house2',
    'house3',
    'house4',
] as const;
