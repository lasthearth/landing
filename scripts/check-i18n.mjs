import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Проверяет, что каждая ветка i18n-словаря присутствует в обеих локалях.
 * Запуск: node scripts/check-i18n.mjs <файл.i18n.ts> [...]
 */
const flatten = (value, prefix = '') =>
    Object.entries(value).flatMap(([key, item]) =>
        item && typeof item === 'object' ? flatten(item, `${prefix}${key}.`) : [`${prefix}${key}`]
    );

const dir = await mkdtemp(join(tmpdir(), 'lh-i18n-'));
let failed = false;

for (const file of process.argv.slice(2)) {
    const source = await readFile(file, 'utf8');
    const temp = join(dir, `${Math.random().toString(36).slice(2)}.mjs`);

    await writeFile(temp, source.replace(/export const \w+\s*=/, 'export default'));

    const dict = (await import(`file:///${temp.replace(/\\/g, '/')}`)).default;
    const ru = new Set(flatten(dict.ru));
    const en = new Set(flatten(dict.en));
    const noEn = [...ru].filter((key) => !en.has(key));
    const noRu = [...en].filter((key) => !ru.has(key));

    console.log(`${file}: ru=${ru.size} en=${en.size}`);

    if (noEn.length) {
        failed = true;
        console.log(`  без английского: ${noEn.join(', ')}`);
    }

    if (noRu.length) {
        failed = true;
        console.log(`  без русского: ${noRu.join(', ')}`);
    }
}

process.exit(failed ? 1 : 0);
