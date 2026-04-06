/**
 * Модель Карточки игрового предмета.
 */
export interface KitItem {
    /**
     * Название предмета.
     */
    hint: string;

    /**
     * Количество предметов.
     */
    count: number;

    /**
     * Изображение предмета.
     */
    image?: string;
}
