/**
 * Скрипт для конвертации изображений в формат WebP.
 * Ищет изображения в указанной директории и рекурсивно конвертирует их.
 */
import { readdir, stat, unlink } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import sharp from 'sharp';

const TARGET_DIR = 'public';
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff']);

/**
 * Рекурсивно собирает список файлов изображений.
 * @param {string} dir Путь к директории.
 * @returns {Promise<string[]>} Массив путей к файлам.
 */
async function collectImages(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectImages(fullPath)));
        } else if (EXTS.has(extname(entry.name).toLowerCase())) {
            files.push(fullPath);
        }
    }
    return files;
}

/**
 * Конвертирует файл в WebP и удаляет оригинал.
 * @param {string} inputPath Путь к исходному файлу.
 * @returns {Promise<{input: string, output: string, inputSize: number, outputSize: number}>}
 */
async function convertFile(inputPath) {
    const outputPath = inputPath.replace(/\.[^.]+$/, '.webp');
    const inputStats = await stat(inputPath);

    await sharp(inputPath)
        .webp({ quality: 85, effort: 6 })
        .toFile(outputPath);

    const outputStats = await stat(outputPath);
    await unlink(inputPath);

    return {
        input: inputPath,
        output: outputPath,
        inputSize: inputStats.size,
        outputSize: outputStats.size,
    };
}

async function main() {
    const images = await collectImages(TARGET_DIR);
    if (images.length === 0) {
        console.log('Изображения для конвертации не найдены.');
        return;
    }

    console.log(`Найдено изображений: ${images.length}\n`);

    let totalInput = 0;
    let totalOutput = 0;

    for (const img of images) {
        try {
            const result = await convertFile(img);
            const saved = result.inputSize - result.outputSize;
            const percent = ((saved / result.inputSize) * 100).toFixed(1);
            totalInput += result.inputSize;
            totalOutput += result.outputSize;
            console.log(
                `✅ ${result.input} → ${result.output} ` +
                `(${formatSize(result.inputSize)} → ${formatSize(result.outputSize)}, ` +
                `экономия ${percent}%)`
            );
        } catch (err) {
            console.error(`❌ Ошибка при обработке ${img}:`, err.message);
        }
    }

    const totalSaved = totalInput - totalOutput;
    const totalPercent = totalInput > 0 ? ((totalSaved / totalInput) * 100).toFixed(1) : 0;
    console.log(
        `\nИтого: ${formatSize(totalInput)} → ${formatSize(totalOutput)} ` +
        `(экономия ${formatSize(totalSaved)}, ${totalPercent}%)`
    );
}

/**
 * Форматирует байты в человекочитаемый вид.
 * @param {number} bytes Размер в байтах.
 * @returns {string} Отформатированная строка.
 */
function formatSize(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

main();
