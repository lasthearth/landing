/**
 * Модель Каротчки игрового предмета.
 */
export interface IGameItemCard {
    /**
     * Название предмета.
     */
    title: string;

    /**
     * Количество предметов.
     */
    count: string;

    /**
     * Изображение предмета.
     */
    image?: string;
}
