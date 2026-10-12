/**
 * Русские буквы латиницей (ГОСТ-подобная транслитерация для адресов).
 */
const TRANSLIT: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/**
 * Адрес из заголовка: латиница, цифры и дефисы.
 *
 * `slugify('Как объявить набег')` → `kak-obyavit-nabeg`.
 *
 * @param text Заголовок.
 * @returns Адрес (может быть пустым).
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .split('')
        .map((char) => TRANSLIT[char] ?? char)
        .join('')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

/**
 * Подходит ли строка как адрес статьи.
 *
 * @param slug Адрес.
 */
export function isValidSlug(slug: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 80;
}
