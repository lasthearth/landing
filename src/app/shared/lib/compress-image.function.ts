import { CompressImageOptions } from './compress-image-options';

/**
 * Максимальная ширина по умолчанию.
 */
const DEFAULT_MAX_WIDTH = 1920;

/**
 * Максимальная высота по умолчанию.
 */
const DEFAULT_MAX_HEIGHT = 1920;

/**
 * Качество по умолчанию.
 */
const DEFAULT_QUALITY = 0.92;

/**
 * Целевой MIME-тип по умолчанию.
 */
const DEFAULT_MIME_TYPE = 'image/webp';

/**
 * MIME-тип, используемый в случае отсутствия поддержки WebP.
 */
const FALLBACK_MIME_TYPE = 'image/jpeg';

/**
 * Загружает файл в HTMLImageElement.
 *
 * @param file Исходный файл изображения.
 * @returns Promise с загруженным элементом изображения.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Не удалось загрузить изображение для сжатия'));
        };

        image.src = objectUrl;
    });
}

/**
 * Вычисляет новые размеры изображения с сохранением пропорций.
 *
 * @param sourceWidth Исходная ширина.
 * @param sourceHeight Исходная высота.
 * @param maxWidth Максимальная ширина.
 * @param maxHeight Максимальная высота.
 * @returns Новые ширина и высота.
 */
function calculateSize(
    sourceWidth: number,
    sourceHeight: number,
    maxWidth: number,
    maxHeight: number
): { width: number; height: number } {
    if (sourceWidth <= maxWidth && sourceHeight <= maxHeight) {
        return { width: sourceWidth, height: sourceHeight };
    }

    const ratio = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);

    return {
        width: Math.round(sourceWidth * ratio),
        height: Math.round(sourceHeight * ratio),
    };
}

/**
 * Проверяет поддержку WebP в текущем браузере.
 *
 * @returns true, если WebP поддерживается.
 */
function isWebpSupported(): boolean {
    const canvas = document.createElement('canvas');

    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
}

/**
 * Определяет целевой MIME-тип с учётом поддержки браузером.
 *
 * @param preferredMimeType Предпочтительный MIME-тип.
 * @returns MIME-тип для использования в canvas.toBlob.
 */
function resolveMimeType(preferredMimeType: string): string {
    if (preferredMimeType === 'image/webp' && !isWebpSupported()) {
        return FALLBACK_MIME_TYPE;
    }

    return preferredMimeType;
}

/**
 * Преобразует содержимое canvas в File.
 *
 * @param canvas Элемент canvas.
 * @param fileName Имя результирующего файла.
 * @param mimeType MIME-тип результирующего файла.
 * @param quality Качество сжатия.
 * @returns Promise с файлом.
 */
function canvasToFile(
    canvas: HTMLCanvasElement,
    fileName: string,
    mimeType: string,
    quality: number
): Promise<File> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Не удалось сжать изображение: canvas.toBlob вернул null'));

                    return;
                }

                resolve(new File([blob], fileName, { type: mimeType }));
            },
            mimeType,
            quality
        );
    });
}

/**
 * Сжимает изображение через canvas с сохранением соотношения сторон.
 *
 * Алгоритм:
 * 1. Масштабирует изображение до указанных максимальных размеров (по умолчанию 1920×1920),
 *    сохраняя пропорции.
 * 2. Перекодирует в WebP с качеством 0.92 (визуально без заметных потерь).
 * 3. Если сжатый файл оказался больше исходного, возвращает исходный файл.
 *
 * @param file Исходный файл изображения.
 * @param options Настройки сжатия.
 * @returns Promise со сжатым или исходным файлом.
 */
export async function compressImage(
    file: File,
    options?: CompressImageOptions
): Promise<File> {
    if (!file.type.startsWith('image/')) {
        return file;
    }

    const maxWidth = options?.maxWidth ?? DEFAULT_MAX_WIDTH;
    const maxHeight = options?.maxHeight ?? DEFAULT_MAX_HEIGHT;
    const quality = options?.quality ?? DEFAULT_QUALITY;
    const mimeType = resolveMimeType(options?.mimeType ?? DEFAULT_MIME_TYPE);

    try {
        const image = await loadImage(file);
        const { width, height } = calculateSize(image.width, image.height, maxWidth, maxHeight);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
            return file;
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, width, height);

        const extension = mimeType === 'image/webp' ? 'webp' : 'jpg';
        const fileName = `${file.name.replace(/\.[^/.]+$/, '')}.${extension}`;

        const compressedFile = await canvasToFile(canvas, fileName, mimeType, quality);

        return compressedFile.size < file.size ? compressedFile : file;
    } catch {
        return file;
    }
}
