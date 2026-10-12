/**
 * Свойства, от которых зависит раскладка текста в textarea.
 */
const COPIED = [
    'boxSizing',
    'width',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'fontFeatureSettings',
    'textAlign',
    'textTransform',
    'textIndent',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
] as const;

/**
 * Невидимая копия поля с той же раскладкой текста.
 *
 * @param area Поле.
 */
function createMirror(area: HTMLTextAreaElement): HTMLDivElement {
    const mirror = document.createElement('div');
    const style = getComputedStyle(area);
    const target = mirror.style as unknown as Record<string, string>;
    const source = style as unknown as Record<string, string>;

    for (const prop of COPIED) {
        target[prop] = source[prop];
    }

    // Ширина без полосы прокрутки — по ней переносится текст.
    mirror.style.boxSizing = 'content-box';
    mirror.style.width = `${area.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)}px`;
    mirror.style.borderWidth = '0';
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.top = '0';
    mirror.style.left = '-9999px';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.overflowWrap = 'break-word';
    mirror.style.wordBreak = style.wordBreak;
    document.body.appendChild(mirror);

    return mirror;
}

/**
 * Координаты позиции текста внутри поля (без учёта прокрутки).
 *
 * @param area Поле.
 * @param position Индекс символа.
 * @returns Отступы от верхнего левого угла содержимого и высота строки.
 */
export function caretCoordinates(area: HTMLTextAreaElement, position: number): { top: number; left: number; height: number } {
    const mirror = createMirror(area);
    mirror.textContent = area.value.slice(0, position);

    const marker = document.createElement('span');
    marker.textContent = area.value.slice(position) || '.';
    mirror.appendChild(marker);

    const style = getComputedStyle(area);
    const result = {
        top: marker.offsetTop + parseFloat(style.borderTopWidth),
        left: marker.offsetLeft + parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth),
        height: parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4,
    };

    mirror.remove();
    return result;
}

/**
 * Вертикальные позиции начала каждой строки текста (с учётом переносов).
 *
 * @param area Поле.
 * @returns Отступ сверху для каждой строки и полная высота текста.
 */
export function lineOffsets(area: HTMLTextAreaElement): { tops: number[]; height: number } {
    const mirror = createMirror(area);
    const style = getComputedStyle(area);
    const padTop = parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth);
    const lines = area.value.split('\n');
    const fragment = document.createDocumentFragment();

    mirror.style.paddingTop = '0';
    mirror.style.paddingBottom = '0';

    for (const line of lines) {
        const row = document.createElement('div');
        // Пустая строка всё равно занимает высоту строки.
        row.textContent = line || '​';
        fragment.appendChild(row);
    }

    mirror.appendChild(fragment);

    const rows = mirror.children;
    const tops: number[] = [];

    for (let index = 0; index < rows.length; index++) {
        tops.push((rows[index] as HTMLElement).offsetTop + padTop);
    }

    const height = mirror.scrollHeight + padTop;
    mirror.remove();

    return { tops, height };
}
