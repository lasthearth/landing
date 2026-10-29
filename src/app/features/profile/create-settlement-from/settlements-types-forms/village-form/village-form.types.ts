/**
 * Тип, представляющий любой ключ из массива `fileFields`.
 * Используется для обращения к конкретным файлам вотчину.
 */
export type FileKeyVillage = (typeof fileFields)[number];
/**
 * Список ключей файлов, связанных с вотчину.
 */
export const fileFields = ['preview', 'map', 'nobleScroll', 'liberties', 'monument', 'pit', 'house1', 'house2', 'warehouse', 'seedbeds', 'square', 'capitalRoad', 'roads', 'foodMarket'] as const;
