/**
 * Настройки сжатия изображения.
 */
export interface CompressImageOptions {
    /**
     * Максимальная ширина результирующего изображения.
     * @default 1920
     */
    maxWidth?: number;

    /**
     * Максимальная высота результирующего изображения.
     * @default 1920
     */
    maxHeight?: number;

    /**
     * Качество сжатия для lossy-форматов (0..1).
     * @default 0.92
     */
    quality?: number;

    /**
     * Целевой MIME-тип (например, "image/webp").
     * @default "image/webp"
     */
    mimeType?: string;
}
