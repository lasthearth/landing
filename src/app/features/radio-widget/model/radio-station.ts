/**
 * Модель радиостанции.
 */
export interface RadioStation {
    /**
     * Уникальный идентификатор станции.
     */
    id: string;

    /**
     * Название станции.
     */
    name: string;

    /**
     * URL потока для воспроизведения.
     */
    streamUrl: string;

    /**
     * URL обложки/превью.
     */
    thumbnailUrl: string;
}
