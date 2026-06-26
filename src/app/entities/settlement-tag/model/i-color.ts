/**
 * Цвет в формате google.type.Color.
 *
 * Каждый канал находится в диапазоне [0, 1].
 */
export interface IColor {
    /**
     * Красный канал.
     */
    red: number;

    /**
     * Зелёный канал.
     */
    green: number;

    /**
     * Синий канал.
     */
    blue: number;

    /**
     * Альфа-канал (необязательный).
     */
    alpha?: number;
}
