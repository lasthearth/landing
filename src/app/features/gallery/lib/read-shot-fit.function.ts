/**
 * Как вписать кадр в раму стены.
 *
 * `cover` — кадр заполняет раму, и под обрезку уходит немного: край читается
 * как край. `contain` — кадр заметно уже или шире рамы, он показывается
 * целиком на тёмном паспарту.
 */
export type ShotFit = 'cover' | 'contain';

/**
 * Пропорция рамы отпечатка стены.
 *
 * Она одна на все отпечатки и задана в стилях (`aspect-ratio: 16 / 9` у
 * `.gallery-wall__core`), поэтому сетка не перестраивается ни на шаге
 * «дальше», ни на resize.
 */
export const FRAME_RATIO = 16 / 9;

/**
 * Какая доля кадра может уйти под обрезку.
 *
 * Правило считается от потери, а не от полосы пропорций. Полоса 0.75…1.9 была
 * замером архива на 3 ноября 2026 и сломалась на первом же новом кадре:
 * 800×1067 (пропорция ровно 0.75) попал на границу, остался `cover` и потерял
 * 58% высоты. Потеря от нового кадра не зависит — она свойство рамы и пропорции.
 */
export const MAX_DISCARD = 1 / 3;

/**
 * Самая узкая пропорция, которая ещё вписывается в раму обрезкой.
 *
 * Выведена из {@link MAX_DISCARD}: при R < рамы `cover` оставляет в кадре
 * долю R / FRAME_RATIO.
 */
export const MIN_RATIO = FRAME_RATIO * (1 - MAX_DISCARD);

/**
 * Самая широкая пропорция, которая ещё вписывается в раму обрезкой.
 *
 * Выведена из {@link MAX_DISCARD}: при R > рамы `cover` оставляет в кадре
 * долю FRAME_RATIO / R.
 */
export const MAX_RATIO = FRAME_RATIO / (1 - MAX_DISCARD);

/**
 * Пропорция кадра, когда размеры оригинала неизвестны.
 */
const FALLBACK_RATIO = FRAME_RATIO;

/**
 * Сколько кадра съедает `cover` в раме {@link FRAME_RATIO}.
 *
 * @param width Ширина кадра в пикселях.
 * @param height Высота кадра в пикселях.
 * @returns Доля потерянного кадра от 0 до 1; 0, когда пропорция совпала с рамой.
 */
export function readShotDiscard(width?: number, height?: number): number {
    const natural = width && height ? width / height : FALLBACK_RATIO;
    const ratio = Number.isFinite(natural) && natural > 0 ? natural : FALLBACK_RATIO;
    const visible = ratio > FRAME_RATIO ? FRAME_RATIO / ratio : ratio / FRAME_RATIO;

    return 1 - visible;
}

/**
 * Выбирает способ вписывания кадра в раму стены.
 *
 * Кадр, у которого `cover` отнимает больше {@link MAX_DISCARD}, показывается
 * целиком: обрезка телефонного скриншота 9:19 или полоски 12:1 уничтожила бы
 * снимок, а квадратный кадр потерял бы 44% высоты.
 *
 * @param width Ширина кадра в пикселях.
 * @param height Высота кадра в пикселях.
 * @returns `cover` или `contain`.
 */
export function readShotFit(width?: number, height?: number): ShotFit {
    return readShotDiscard(width, height) <= MAX_DISCARD ? 'cover' : 'contain';
}
