import { compressImage } from './compress-image.function';

/**
 * Ограничивает значение канала диапазоном 0..255.
 *
 * @param value Значение канала.
 * @returns Целое в диапазоне 0..255.
 */
function clampChannel(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Кодирует canvas в Blob.
 *
 * @param canvas Элемент canvas.
 * @param mimeType Целевой MIME-тип.
 * @returns Promise с Blob.
 */
function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('canvas.toBlob вернул null'));

                return;
            }

            resolve(blob);
        }, mimeType);
    });
}

/**
 * Создаёт PNG с детерминированным шумом поверх градиента — stand-in скриншота игры.
 *
 * Шум обязателен: гладкий кадр PNG кодирует в десятки килобайт, и на нём не видно
 * ни выигрыша от WebP, ни подгонки под лимит размера. Детерминированный генератор
 * даёт один и тот же файл от запуска к запуску, поэтому проверки размеров не плавают.
 *
 * @param width Ширина кадра.
 * @param height Высота кадра.
 * @param noiseAmplitude Разброс шума по каналам.
 * @param name Имя файла.
 * @returns Promise с PNG-файлом.
 */
async function createNoisePng(
    width: number,
    height: number,
    noiseAmplitude: number,
    name = 'screenshot.png'
): Promise<File> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Браузер не дал 2D-контекст');
    }

    const frame = context.createImageData(width, height);
    let seed = 20261103;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            seed = (seed * 1103515245 + 12345) % 2147483648;
            const noise = (seed % (noiseAmplitude + 1)) - noiseAmplitude / 2;
            const index = (y * width + x) * 4;

            frame.data[index] = clampChannel((x / width) * 180 + noise);
            frame.data[index + 1] = clampChannel((y / height) * 160 + noise);
            frame.data[index + 2] = clampChannel(90 + noise);
            frame.data[index + 3] = 255;
        }
    }

    context.putImageData(frame, 0, 0);

    return new File([await canvasToBlob(canvas, 'image/png')], name, { type: 'image/png' });
}

/**
 * Читает размеры закодированного файла.
 *
 * @param file Файл изображения.
 * @returns Promise с шириной и высотой.
 */
async function readImageSize(file: File): Promise<{ width: number; height: number }> {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();

    return size;
}

describe('compressImage', () => {
    it('оставляет файл как есть, если это не изображение', async () => {
        const text = new File(['текст'], 'note.txt', { type: 'text/plain' });

        await expectAsync(compressImage(text)).toBeResolvedTo(text);
    });

    it('возвращает исходный файл, если браузер не смог его декодировать', async () => {
        const broken = new File([new Uint8Array([1, 2, 3, 4])], 'photo.heic', { type: 'image/heic' });

        await expectAsync(compressImage(broken)).toBeResolvedTo(broken);
    });

    it('уменьшает кадр до 1920 по большей стороне и перекодирует в WebP', async () => {
        const source = await createNoisePng(2600, 1500, 24);

        const result = await compressImage(source);
        const size = await readImageSize(result);

        expect(result.type).toBe('image/webp');
        expect(result.size).toBeLessThan(source.size);
        expect(size.width).toBe(1920);
        expect(size.height).toBe(1108);
    }, 30000);

    it('сохраняет маленький кадр в исходном размере', async () => {
        const source = await createNoisePng(640, 480, 24, 'small.png');

        const size = await readImageSize(await compressImage(source));

        expect(size.width).toBe(640);
        expect(size.height).toBe(480);
    }, 30000);

    it('подгоняет результат под maxSizeBytes: качество, затем кадр', async () => {
        const source = await createNoisePng(2000, 1200, 48);

        const single = await compressImage(source);
        const limit = Math.round(single.size * 0.4);
        const fitted = await compressImage(source, { maxSizeBytes: limit });

        expect(fitted.size).toBeLessThanOrEqual(limit);
        expect(fitted.size).toBeLessThan(single.size);
        expect(fitted.size).toBeGreaterThan(0);
    }, 60000);

    it('не увеличивает файл: результат больше исходника возвращает исходник', async () => {
        const source = await createNoisePng(64, 64, 8, 'tiny.png');

        const result = await compressImage(source, { quality: 1, mimeType: 'image/png' });

        expect(result.size).toBeLessThanOrEqual(source.size);
    }, 30000);
});
