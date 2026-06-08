/**
 * Тип, представляющий любой ключ из массива `fileFieldsCamp`.
 * Используется для обращения к конкретным файлам лагеря.
 */
export type FileKeyCamp = (typeof fileFieldsCamp)[number];
/**
 * Список ключей файлов, связанных с лагерь.
 */
export const fileFieldsCamp = ['preview', 'map', 'monument', 'fireplace', 'warehouse', 'beds'] as const;
