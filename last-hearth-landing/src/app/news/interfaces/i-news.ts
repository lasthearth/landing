/**
 * Модель новости.
 */
export interface INews {
    /**
     * Заголовок новости.
     */
    title: string;

    /**
     * Описание новости.
     */
    description: string;

    /**
     * Изображение новости.
     */
    image?: string;

    /**
     * Дата публикации новости.
     */
    date: string;
}
