/**
 * Проверка контраста семантических токенов по WCAG AA.
 *
 * Читает значения токенов прямо из `src/styles.css` (блок `:root`
 * и блок `html[data-theme='dark']`), считает коэффициент контраста
 * каждого текстового токена к поверхностям и падает с кодом 1,
 * если какая-то пара ниже порога.
 *
 * Запуск: node scripts/check-contrast.mjs
 */
import { readFileSync } from 'node:fs';

/** Порог WCAG AA для обычного текста. */
const AA_NORMAL = 4.5;

/** Порог WCAG AA для крупного текста (18px+ или 14px bold). */
const AA_LARGE = 3;

/** Токены-поверхности, на которых рисуется текст. */
const SURFACES = ['surface', 'surface-3'];

/**
 * Текстовые токены и минимально допустимый для них порог.
 * Бейджи и подписи ранга допускаются на уровне крупного текста:
 * они всегда выводятся полужирным в увеличенном кегле.
 */
const TEXT_TOKENS = {
    ink: AA_NORMAL,
    'ink-2': AA_NORMAL,
    'ink-3': AA_NORMAL,
    'brand-ink': AA_NORMAL,
    'danger-ink': AA_NORMAL,
    peace: AA_LARGE,
    'warning-ink': AA_LARGE,
    'leader-ink': AA_LARGE,
    'medal-gold': AA_LARGE,
    'medal-silver': AA_LARGE,
    'medal-bronze': AA_LARGE,
    'rank-iron': AA_LARGE,
    'rank-silver': AA_LARGE,
    'status-issued': AA_LARGE,
    'status-done': AA_LARGE,
    'status-refund': AA_LARGE,
    'status-wait': AA_LARGE,
    sber: AA_LARGE,
};

/**
 * Относительная яркость цвета по формуле WCAG.
 *
 * @param hex Цвет в формате #rrggbb.
 * @returns Значение яркости от 0 до 1.
 */
function luminance(hex) {
    const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Коэффициент контраста между двумя цветами.
 *
 * @param a Первый цвет в формате #rrggbb.
 * @param b Второй цвет в формате #rrggbb.
 * @returns Коэффициент от 1 до 21.
 */
function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/**
 * Извлекает объявления `--lh-*: #hex` из фрагмента CSS.
 *
 * @param css Фрагмент CSS.
 * @returns Карта имя-токена в hex-значение.
 */
function parseTokens(css) {
    const tokens = {};
    for (const [, name, value] of css.matchAll(/--lh-([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
        tokens[name] = value;
    }
    return tokens;
}

const css = readFileSync('src/styles.css', 'utf8');
const darkIndex = css.indexOf("html[data-theme='dark']");
const light = parseTokens(css.slice(0, darkIndex));
const dark = { ...light, ...parseTokens(css.slice(darkIndex)) };

const failures = [];

for (const [themeName, tokens] of [
    ['light', light],
    ['dark', dark],
]) {
    for (const [token, threshold] of Object.entries(TEXT_TOKENS)) {
        const fg = tokens[token];
        if (!fg) {
            failures.push(`${themeName}: токен --lh-${token} не найден в styles.css`);
            continue;
        }

        for (const surface of SURFACES) {
            const ratio = contrast(fg, tokens[surface]);
            if (ratio < threshold) {
                failures.push(
                    `${themeName}: ${token} (${fg}) на ${surface} (${tokens[surface]}) = ${ratio.toFixed(2)}, нужно ${threshold}`
                );
            }
        }
    }
}

if (failures.length) {
    console.error(`Контраст не пройден (${failures.length}):`);
    failures.forEach((line) => console.error(`  ${line}`));
    process.exit(1);
}

console.log('Контраст токенов: все пары проходят WCAG AA.');
