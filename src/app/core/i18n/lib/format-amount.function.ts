import { Language } from '../i18n.types';

/**
 * Форматирует число по правилам языка сайта: «5 000» по-русски, «5,000» по-английски.
 * Нечисловое значение (например, «—» или пустое) возвращается как есть.
 *
 * @param value Число или числовая строка (баланс приходит с бэкенда строкой).
 * @param language Язык сайта.
 * @param maxFractionDigits Сколько знаков после запятой оставлять (по умолчанию — ни одного).
 * @returns Отформатированная строка.
 */
export function formatAmount(
    value: number | string | null | undefined,
    language: Language,
    maxFractionDigits = 0
): string {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) {
        return String(value);
    }

    // `useGrouping: 'always'`: по-русски Intl не делит четырёхзначные числа («5000»),
    // а рядом стоят «10 000» — разряды делим всегда, чтобы суммы читались одинаково.
    // Значение 'always' описано только в lib ES2023, а проект собирается с ES2022 —
    // поэтому приведение типа; браузеры поддерживают его давно.
    const options = {
        maximumFractionDigits: maxFractionDigits,
        useGrouping: 'always',
    } as unknown as Intl.NumberFormatOptions;
    return new Intl.NumberFormat(language, options).format(number);
}
