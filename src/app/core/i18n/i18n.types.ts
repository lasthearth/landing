/**
 * Доступные языки интерфейса.
 */
export type Language = 'ru' | 'en';

/**
 * Вложенный объект переводов.
 */
export type TranslationValue = string | { [key: string]: TranslationValue };

/**
 * Словарь переводов для одного языка.
 */
export type Translations = Record<string, TranslationValue>;

/**
 * Параметры интерполяции перевода.
 * Значение может отсутствовать (null) — в этом случае подстановка заменяется пустой строкой.
 */
export type TranslationParams = Record<string, string | number | null | undefined>;
