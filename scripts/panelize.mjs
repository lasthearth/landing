/**
 * Разовая миграция: дубли пергаментной панели в шаблонах заменяются
 * на утилиту `.lh-panel`. Скрипт удаляется после прогона.
 *
 * `.lh-panel` уже даёт padding 1.5rem (= p-6) и радиус 1.5rem (= rounded-2xl),
 * поэтому у совпадающих по геометрии блоков утилиты убираются, а у остальных
 * остаются: слой utilities перебивает components без !important.
 */
import { readFileSync, writeFileSync, globSync } from 'node:fs';

const SHADOW = 'shadow-\\[0_2px_8px_rgba\\(0,0,0,0\\.06\\)\\]';
const BG = 'bg-lh-primary-2/10';
const BORDER = 'border border-lh-primary-2/10';

/**
 * Правила замены. Порядок значим: длинные шаблоны идут первыми,
 * иначе короткий шаблон съест часть длинного.
 */
const RULES = [
    // Каноничная панель: геометрия совпадает с .lh-panel — утилиты не нужны.
    [`${BG} ${BORDER} rounded-2xl p-6 ${SHADOW}`, 'lh-panel'],
    [`${BG} ${BORDER} rounded-2xl p-6`, 'lh-panel'],
    [`p-6 rounded-2xl ${BG} ${BORDER} ${SHADOW}`, 'lh-panel'],
    [`p-6 rounded-2xl ${BG} ${BORDER}`, 'lh-panel'],

    // Отличается только падингом — оставляем утилиту падинга.
    [`${BG} ${BORDER} rounded-2xl p-8`, 'lh-panel p-8'],
    [`${BG} ${BORDER} rounded-2xl p-5 ${SHADOW}`, 'lh-panel p-5'],
    [`${BG} ${BORDER} rounded-2xl p-4 ${SHADOW}`, 'lh-panel p-4'],
    [`${BG} ${BORDER} rounded-2xl p-4`, 'lh-panel p-4'],
    [`p-5 rounded-2xl ${BG} ${BORDER} ${SHADOW}`, 'lh-panel p-5'],
    [`p-4 rounded-2xl ${BG} ${BORDER} ${SHADOW}`, 'lh-panel p-4'],
    [`p-4 rounded-2xl ${BG} ${BORDER}`, 'lh-panel p-4'],
    [`p-3 lg:p-4 ${BG} ${BORDER} rounded-2xl`, 'lh-panel p-3 lg:p-4'],
    [`${BG} ${BORDER} rounded-2xl p-3 lg:p-4`, 'lh-panel p-3 lg:p-4'],

    // Мелкие плашки: свой радиус и падинги.
    [`px-4 py-3 rounded-xl ${BG} ${BORDER}`, 'lh-panel rounded-xl px-4 py-3'],
    [`${BG} rounded-xl px-4 py-3 ${BORDER}`, 'lh-panel rounded-xl px-4 py-3'],
    [`${BG} rounded-xl px-3 py-2 ${BORDER}`, 'lh-panel rounded-xl px-3 py-2'],
];

const files = globSync('src/**/*.html');
let touched = 0;
let total = 0;

for (const file of files) {
    const before = readFileSync(file, 'utf8');
    let after = before;

    for (const [pattern, replacement] of RULES) {
        const re = new RegExp(pattern, 'g');
        const hits = after.match(re);

        if (hits) {
            total += hits.length;
            after = after.replace(re, replacement);
        }
    }

    if (after !== before) {
        writeFileSync(file, after);
        touched += 1;
        console.log(`  ${file}`);
    }
}

console.log(`\nreplacements: ${total}, files: ${touched}`);
