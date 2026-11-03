import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    AbstractControl,
    ControlValueAccessor,
    FormControl,
    NG_VALIDATORS,
    NG_VALUE_ACCESSOR,
    ReactiveFormsModule,
    ValidationErrors,
    Validator,
} from '@angular/forms';
import { TuiLoader } from '@taiga-ui/core';
import { TuiFiles } from '@taiga-ui/kit';
import { TranslatePipe } from '@core/i18n';
import { compressImage } from '@shared/lib/compress-image.function';
import { CompressImageOptions } from '@shared/lib/compress-image-options';
import { fileFormatValidator } from '@shared/lib/file-format-validator.function';
import { IMAGE_MAX_SIZE_MB } from '@shared/lib/image-max-size.constant';

/**
 * Байт в одном мегабайте.
 */
const BYTES_IN_MB = 1024 * 1024;

/**
 * Поле выбора картинки, которое сжимает файл до того, как он попадёт в форму.
 *
 * Зачем: файловые поля форм проверяются валидатором `maxFileSizeValidator`, и
 * без сжатия на входе скриншот FullHD (3–8 МБ в PNG) отклоняется ещё до отправки,
 * хотя `compressImage` уменьшил бы его в разы. Здесь значение контрола — уже
 * сжатый файл, поэтому валидатор и хранилище видят реальный размер загрузки.
 *
 * Как устроен: внутри свой контрол на `input[tuiInputFiles]`, в него Taiga пишет
 * сырой файл; компонент сжимает его и отдаёт наружу через `ControlValueAccessor`.
 * Родительский контрол сырой файл не видит — ни ошибки валидации, ни гонки при
 * отправке формы во время сжатия.
 *
 * На время сжатия поле показывает индикатор. Если результат всё равно больше
 * лимита (шумный кадр, файл, который браузер не декодирует), наружу уходит
 * наименьший полученный вариант, а непригодность показывает валидатор формы.
 */
@Component({
    standalone: true,
    selector: 'app-image-file-input',
    imports: [ReactiveFormsModule, TuiFiles, TuiLoader, TranslatePipe],
    templateUrl: './image-file-input.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => ImageFileInputComponent),
            multi: true,
        },
        {
            provide: NG_VALIDATORS,
            useExisting: forwardRef(() => ImageFileInputComponent),
            multi: true,
        },
    ],
})
export class ImageFileInputComponent implements ControlValueAccessor, Validator {
    /**
     * Внутренний контрол поля выбора: сюда Taiga пишет сырой файл.
     */
    protected readonly inner = new FormControl<File | null>(null);

    /**
     * Идёт ли сейчас сжатие выбранного файла.
     */
    protected readonly compressing = signal(false);

    /**
     * Подпись в пустом поле. Пустая строка — подпись из словаря `shared`.
     */
    public readonly placeholder = input<string>('');

    /**
     * Допустимые типы файлов: атрибут поля выбора и список для валидатора формата.
     */
    public readonly accept = input<string>('image/*');

    /**
     * Лимит размера результата, МБ: под него сжатие подгоняет файл.
     */
    public readonly maxSizeMb = input<number>(IMAGE_MAX_SIZE_MB);

    /**
     * Дополнительные настройки сжатия (кадр, качество, формат).
     */
    public readonly compressOptions = input<CompressImageOptions>({});

    /**
     * Счётчик выбора файла: результат устаревшего сжатия не пишется в форму.
     */
    private requestToken = 0;

    /**
     * Обработчик изменения значения от формы.
     */
    private onChange: (value: File | null) => void = () => {};

    /**
     * Обработчик касания поля от формы.
     */
    private onTouched: () => void = () => {};

    public constructor() {
        this.inner.valueChanges.pipe(takeUntilDestroyed()).subscribe((file) => {
            void this.handleSelected(file);
        });
    }

    /**
     * Сжимает выбранный файл и отдаёт результат в форму.
     *
     * @param file Файл из поля выбора либо null, если поле очистили.
     */
    private async handleSelected(file: File | null): Promise<void> {
        const token = ++this.requestToken;

        if (!file) {
            this.compressing.set(false);
            this.onChange(null);

            return;
        }

        this.compressing.set(true);

        try {
            const compressed = await compressImage(file, {
                ...this.compressOptions(),
                maxSizeBytes: this.maxSizeMb() * BYTES_IN_MB,
            });

            // Файл выбрали ещё раз, пока шло сжатие: этот результат уже не нужен.
            if (token !== this.requestToken) {
                return;
            }

            this.onChange(compressed);
            this.onTouched();
        } finally {
            if (token === this.requestToken) {
                this.compressing.set(false);
            }
        }
    }

    /**
     * Пишет значение из формы в поле.
     *
     * `emitEvent: false` обязателен: иначе запись запускает новое сжатие
     * и значение ходит по кругу.
     *
     * @param value Значение родительского контрола.
     */
    public writeValue(value: File | null): void {
        this.inner.setValue(value, { emitEvent: false });
    }

    /**
     * Регистрирует обработчик изменения значения.
     *
     * @param fn Обработчик из формы.
     */
    public registerOnChange(fn: (value: File | null) => void): void {
        this.onChange = fn;
    }

    /**
     * Регистрирует обработчик касания поля.
     *
     * @param fn Обработчик из формы.
     */
    public registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    /**
     * Включает и выключает поле вместе с формой.
     *
     * @param isDisabled Признак недоступности.
     */
    public setDisabledState(isDisabled: boolean): void {
        if (isDisabled) {
            this.inner.disable({ emitEvent: false });
        } else {
            this.inner.enable({ emitEvent: false });
        }
    }

    /**
     * Проверяет значение контрола формы.
     *
     * Формат файла проверяет здесь, а не только внутри поля: валидатор Taiga
     * висит на внутреннем контроле, и без этой проверки форма пропустила бы
     * файл неверного типа при отправке.
     *
     * @param control Контрол формы, к которому привязан компонент.
     * @returns Ошибка `fileFormat` либо null.
     */
    public validate(control: AbstractControl): ValidationErrors | null {
        return fileFormatValidator(this.accept())(control);
    }
}
