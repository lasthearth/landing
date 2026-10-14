/**
 * Генерирует favicon, иконки PWA и apple-touch-icon из исходников в public/.
 *
 * Запуск: npm run icons (результат коммитится, в prebuild не нужен).
 *
 * Источники:
 * - public/logo.ico            — favicon 16/32/48 (кадры уже растрированы,
 *                                поэтому берутся как есть, без пересжатия);
 * - public/apple-touch-icon.png — 180×180, база для иконок PWA 192/512.
 *
 * Если sharp когда-нибудь научится писать .ico, ICO-сборку можно заменить одной строкой;
 * сейчас ICO-контейнер собирается вручную (PNG-кадры внутри — валидный ICO с 2010 года).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

/** Кадры favicon.ico: размер стороны в пикселях. */
const FAVICON_SIZES = [16, 32, 48];

/** Фон maskable-иконки Android: тёмный фон логотипа. */
const MASKABLE_BACKGROUND = '#2a231d';

/**
 * Читает кадры из существующего ICO-файла.
 *
 * @param {string} file Путь к .ico.
 * @returns {Promise<Map<number, Buffer>>} Размер стороны → PNG-кадр.
 */
async function readIcoFrames(file) {
    const ico = await readFile(file);

    if (ico.readUInt32LE(0) !== 0x00010000) {
        throw new Error(`${file}: не ICO-файл`);
    }

    const frames = new Map();
    const count = ico.readUInt16LE(4);

    for (let index = 0; index < count; index += 1) {
        const entry = 6 + index * 16;
        // В ICO нулевая ширина/высота означает 256.
        const size = ico[entry] || 256;
        const offset = ico.readUInt32LE(entry + 12);
        const length = ico.readUInt32LE(entry + 8);
        frames.set(size, ico.subarray(offset, offset + length));
    }

    return frames;
}

/**
 * Собирает ICO-контейнер из PNG-кадров.
 *
 * @param {Array<{ size: number, data: Buffer }>} frames Кадры в порядке отображения.
 * @returns {Buffer} Содержимое .ico.
 */
function buildIco(frames) {
    const header = Buffer.alloc(6 + frames.length * 16);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(frames.length, 4);

    let offset = header.length;

    frames.forEach((frame, index) => {
        const entry = 6 + index * 16;
        // Для 256 в байте пишется 0.
        header.writeUInt8(frame.size >= 256 ? 0 : frame.size, entry);
        header.writeUInt8(frame.size >= 256 ? 0 : frame.size, entry + 1);
        header.writeUInt8(0, entry + 2);
        header.writeUInt8(0, entry + 3);
        header.writeUInt16LE(1, entry + 4);
        header.writeUInt32LE(32, entry + 6);
        header.writeUInt32LE(frame.data.length, entry + 8);
        header.writeUInt32LE(offset, entry + 12);
        offset += frame.data.length;
    });

    return Buffer.concat([header, ...frames.map((frame) => frame.data)]);
}

await mkdir('public/images', { recursive: true });

const logoFrames = await readIcoFrames('public/logo.ico');
const faviconFrames = FAVICON_SIZES.map((size) => {
    const data = logoFrames.get(size);

    if (!data) {
        throw new Error(`public/logo.ico: нет кадра ${size}×${size}`);
    }

    return { size, data };
});

await writeFile('public/favicon.ico', buildIco(faviconFrames));

const source = 'public/apple-touch-icon.png';

/** PNG-иконки: путь → размер стороны. */
const PNG_ICONS = {
    'public/apple-touch-icon.png': 180,
    'public/icon-192.png': 192,
    'public/icon-512.png': 512,
};

for (const [file, size] of Object.entries(PNG_ICONS)) {
    // apple-touch-icon.png — сам источник, его не перезаписываем.
    if (file === source) {
        continue;
    }

    await sharp(source).resize(size, size).png({ compressionLevel: 9, palette: true }).toFile(file);
}

// Иконка с отступами для Android (maskable): логотип занимает ~80% холста,
// чтобы системная маска не обрезала края.
const maskableInner = 410;
const maskablePadding = Math.round((512 - maskableInner) / 2);

await sharp(source)
    .resize(maskableInner, maskableInner)
    .extend({
        top: maskablePadding,
        bottom: maskablePadding,
        left: maskablePadding,
        right: maskablePadding,
        background: MASKABLE_BACKGROUND,
    })
    .png({ compressionLevel: 9, palette: true })
    .toFile('public/icon-maskable-512.png');

console.log('icons: public/favicon.ico, public/icon-192.png, public/icon-512.png, public/icon-maskable-512.png');
