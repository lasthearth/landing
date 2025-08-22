/**
 * Модель Титула.
 */
export interface ITitles {
    /**
     * Название титула.
     */
    title: string;

    /**
     * Описание титула.
     */
    price: string;

    /**
     * Тип титула.
     */
    type: string;

    /**
     * Изображение титула.
     */
    image?: string;

    /**
     * Изображение титула.
     */
    path: string;
}
