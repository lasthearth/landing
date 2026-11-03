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
 * Сколько перекодирований разрешено при подгонке под `maxSizeBytes`.
 *
 * Восемь попыток покрывают четыре шага качества и четыре шага уменьшения кадра;
 * на FullHD-скриншоте это доли секунды, на 4K — пара секунд.
 */
const MAX_FIT_ATTEMPTS = 8;

/**
 * Шаг снижения качества при подгонке под размер.
 */
const FIT_QUALITY_STEP = 0.1;

/**
 * Качество, ниже которого подгонка переходит к уменьшению кадра.
 */
const FIT_MIN_QUALITY = 0.5;

/**
 * Множитель уменьшения кадра, когда качество уже на полу.
 */
const FIT_SIZE_STEP = 0.8;

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
 * Рисует изображение в новый canvas заданного размера и кодирует его в файл.
 *
 * @param image Декодированное исходное изображение.
 * @param width Ширина результата.
 * @param height Высота результата.
 * @param mimeType MIME-тип результата.
 * @param quality Качество кодирования.
 * @param fileName Имя результирующего файла.
 * @returns Promise с файлом либо null, если браузер не дал 2D-контекст.
 */
async function encodeFrame(
    image: HTMLImageElement,
    width: number,
    height: number,
    mimeType: string,
    quality: number,
    fileName: string
): Promise<File | null> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
        return null;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, width, height);

    return canvasToFile(canvas, fileName, mimeType, quality);
}

/**
 * Строит имя результирующего файла: имя исходного с расширением целевого формата.
 *
 * @param sourceName Имя исходного файла.
 * @param mimeType Целевой MIME-тип.
 * @returns Имя файла для результата.
 */
function buildFileName(sourceName: string, mimeType: string): string {
    const extension = mimeType === 'image/webp' ? 'webp' : 'jpg';

    return `${sourceName.replace(/\.[^/.]+$/, '')}.${extension}`;
}

/**
 * Сжимает изображение через canvas с сохранением соотношения сторон.
 *
 * Алгоритм:
 * 1. Масштабирует изображение до указанных максимальных размеров (по умолчанию 1920×1920),
 *    сохраняя пропорции.
 * 2. Перекодирует в WebP с качеством 0.92 (визуально без заметных потерь).
 * 3. Если задан `options.maxSizeBytes` и результат больше лимита, повторяет
 *    кодирование: сначала снижает качество шагом 0.1 до 0.5, затем уменьшает кадр
 *    множителем 0.8, не более восьми попыток.
 * 4. Если сжатый файл оказался больше исходного, возвращает исходный файл.
 *
 * Файл, который браузер не смог декодировать (например HEIC в Chrome), возвращается
 * как есть: вызывающий код увидит исходный размер и сам решит, годится ли файл.
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
    const maxSizeBytes = options?.maxSizeBytes;
    const mimeType = resolveMimeType(options?.mimeType ?? DEFAULT_MIME_TYPE);
    const fileName = buildFileName(file.name, mimeType);

    try {
        const image = await loadImage(file);
        const initialSize = calculateSize(image.width, image.height, maxWidth, maxHeight);

        let width = initialSize.width;
        let height = initialSize.height;
        let quality = options?.quality ?? DEFAULT_QUALITY;

        let encoded = await encodeFrame(image, width, height, mimeType, quality, fileName);

        if (!encoded) {
            return file;
        }

        for (
            let attempt = 0;
            maxSizeBytes !== undefined && encoded.size > maxSizeBytes && attempt < MAX_FIT_ATTEMPTS;
            attempt++
        ) {
            if (quality > FIT_MIN_QUALITY) {
                quality = Math.max(FIT_MIN_QUALITY, quality - FIT_QUALITY_STEP);
            } else {
                width = Math.max(1, Math.round(width * FIT_SIZE_STEP));
                height = Math.max(1, Math.round(height * FIT_SIZE_STEP));
            }

            const retry = await encodeFrame(image, width, height, mimeType, quality, fileName);

            if (!retry) {
                break;
            }

            encoded = retry;
        }

        return encoded.size < file.size ? encoded : file;
    } catch {
        // Декодирование или кодирование не удалось (битый файл, HEIC, отказ canvas).
        // Исходный файл лучше, чем потерянная загрузка: вызывающий код проверит размер.
        return file;
    }
}
