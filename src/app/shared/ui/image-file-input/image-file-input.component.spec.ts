import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { filter, firstValueFrom } from 'rxjs';
import { maxFileSizeValidator } from '@shared/lib/file-max-size-validator.function';
import { IMAGE_MAX_SIZE_MB } from '@shared/lib/image-max-size.constant';
import { ImageFileInputComponent } from './image-file-input.component';

/**
 * Лимит формы в байтах.
 */
const LIMIT_BYTES = IMAGE_MAX_SIZE_MB * 1024 * 1024;

/**
 * Хост-форма: файловое поле с теми же валидаторами, что у заявки на поселение.
 */
@Component({
    standalone: true,
    imports: [ReactiveFormsModule, ImageFileInputComponent],
    template: '<app-image-file-input [formControl]="control" />',
})
class HostComponent {
    /**
     * Контрол картинки.
     */
    public readonly control = new FormControl<File | null>(null, [
        Validators.required,
        maxFileSizeValidator(IMAGE_MAX_SIZE_MB),
    ]);
}

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
 * Создаёт PNG с детерминированным шумом — stand-in скриншота игры из FullHD.
 *
 * Шум нужен, чтобы файл получился больше лимита формы, как настоящий скриншот;
 * детерминированный генератор делает размер одинаковым от запуска к запуску.
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
    name: string
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

/**
 * Выбирает файл в поле так, как это делает пользователь.
 *
 * @param fixture Фикстура хост-формы.
 * @param file Файл для выбора.
 * @returns Promise, который разрешается после прохождения события через шаблон.
 */
async function selectFile(fixture: ComponentFixture<HostComponent>, file: File): Promise<void> {
    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
}

/**
 * Ждёт указанное время, чтобы асинхронные сжатия успели завершиться.
 *
 * @param ms Миллисекунды.
 * @returns Promise без значения.
 */
function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('ImageFileInputComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();

        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('скриншот больше лимита формы доходит до неё сжатым и валидным', async () => {
        const source = await createNoisePng(2400, 1500, 48, 'screenshot.png');

        // Предусловие: без него проверка прошла бы и на старом поведении.
        expect(source.size).toBeGreaterThan(LIMIT_BYTES);

        const compressed = firstValueFrom(host.control.valueChanges.pipe(filter((value) => value !== null)));
        await selectFile(fixture, source);
        const value = await compressed;

        expect(value.type).toBe('image/webp');
        expect(value.size).toBeLessThan(source.size);
        expect(value.size).toBeLessThanOrEqual(LIMIT_BYTES);
        expect(host.control.valid).toBeTrue();
    }, 60000);

    it('размер кадра не превышает 1920 по большей стороне', async () => {
        const source = await createNoisePng(2400, 1500, 24, 'big.png');

        const compressed = firstValueFrom(host.control.valueChanges.pipe(filter((value) => value !== null)));
        await selectFile(fixture, source);
        const size = await readImageSize(await compressed);

        expect(size.width).toBe(1920);
        expect(size.height).toBe(1200);
    }, 60000);

    it('файл не-изображение уходит в форму без сжатия, её валидатор его отклоняет', async () => {
        const text = new File(['данные'], 'note.txt', { type: 'text/plain' });

        const emitted = firstValueFrom(host.control.valueChanges.pipe(filter((value) => value !== null)));
        await selectFile(fixture, text);
        const value = await emitted;

        expect(value).toBe(text);
        expect(host.control.invalid).toBeTrue();
        expect(host.control.errors).toEqual(jasmine.objectContaining({ fileFormat: true }));
    }, 30000);

    it('сжатое значение не запускает новое сжатие по кругу', async () => {
        const source = await createNoisePng(1600, 900, 24, 'frame.png');
        const emissions: Array<File | null> = [];
        host.control.valueChanges.subscribe((value) => emissions.push(value));

        await selectFile(fixture, source);
        await wait(1500);

        expect(emissions.length).toBe(1);
        expect(emissions[0]?.type).toBe('image/webp');
    }, 60000);

    it('результат устаревшего сжатия не перезаписывает выбранный позже файл', async () => {
        const big = await createNoisePng(2400, 1500, 48, 'big.png');
        const small = await createNoisePng(800, 600, 48, 'small.png');

        await selectFile(fixture, big);
        await selectFile(fixture, small);
        await wait(3000);

        const value = host.control.value;
        expect(value).not.toBeNull();

        const size = await readImageSize(value as File);
        expect(size.width).toBe(800);
        expect(size.height).toBe(600);
    }, 90000);

    it('очистка поля формы не оставляет файл внутри компонента', async () => {
        const source = await createNoisePng(1200, 800, 24, 'frame.png');

        const compressed = firstValueFrom(host.control.valueChanges.pipe(filter((value) => value !== null)));
        await selectFile(fixture, source);
        await compressed;

        host.control.setValue(null);
        fixture.detectChanges();

        const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
        expect(host.control.value).toBeNull();
        expect(input.files?.length ?? 0).toBe(0);
    }, 60000);
});
