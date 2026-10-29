/**
 * Тип, представляющий любой ключ из массива `fileFieldsCamp`.
 * Используется для обращения к конкретным файлам стан.
 */
export type FileKeyCamp = (typeof fileFieldsCamp)[number];
/**
 * Список ключей файлов, связанных с стан.
 */
export const fileFieldsCamp = ['preview', 'map', 'passport', 'monument', 'fireplace', 'beds', 'warehouse'] as const;
