/**
 * Типограф: «ёлочки», длинное тире, многоточие и неразрывные пробелы после коротких слов.
 *
 * Блоки и фрагменты кода, ссылки и служебные строки (`:::`, `@youtube`, таблицы-разделители)
 * не трогаются.
 *
 * @param source Текст статьи.
 * @returns Исправленный текст.
 */
export function typograph(source: string): string {
    let inCode = false;

    return source
        .split('\n')
        .map((line) => {
            if (/^\s*```/.test(line)) {
                inCode = !inCode;
                return line;
            }

            if (inCode || /^:::|^@\w+\(|^\s*\|?\s*:?-{2,}/.test(line)) {
                return line;
            }

            // Код, ссылки и вики-ссылки сохраняются как есть.
            const held: string[] = [];
            const hold = (part: string): string => `\u0001${held.push(part) - 1}\u0001`;

            let text = line
                .replace(/`[^`]*`/g, hold)
                .replace(/\]\([^)]*\)/g, hold)
                .replace(/\[\[[^\]]*\]\]/g, hold)
                .replace(/https?:\/\/\S+/g, hold);

            text = text
                .replace(/(^|[\s(\[«])"(?=\S)/g, '$1«')
                .replace(/"/g, '»')
                .replace(/(\S) +- +/g, '$1 — ')
                .replace(/(\S) +-- +/g, '$1 — ')
                .replace(/^(\s*)-- /, '$1— ')
                .replace(/\.\.\./g, '…')
                .replace(/(^|\s)(в|во|и|к|ко|с|со|о|об|у|а|но|на|не|по|за|из|от|до)\s+(?=\S)/gi, '$1$2 ');

            return text.replace(/\u0001(\d+)\u0001/g, (_, index: string) => held[Number(index)]);
        })
        .join('\n');
}
