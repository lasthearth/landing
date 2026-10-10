import {
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    forwardRef,
    inject,
    input,
    signal,
    viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TuiIcon } from '@taiga-ui/core';
import { renderNewsMarkdown } from '@shared/lib/news-markdown';
import { I18nService, TranslatePipe } from '@core/i18n';
import { MarkupEditorAction } from './markup-editor-action';
import { MARKUP_EDITOR_TOOLBAR } from './markup-editor-toolbar.constant';

/**
 * Максимальный размер картинки в тексте, байт.
 */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/**
 * Шаблоны строчных префиксов блоков.
 */
const LINE_PREFIX: Record<'heading' | 'list' | 'orderedList' | 'quote', RegExp> = {
    heading: /^#{1,3}\s+/,
    list: /^\s*[-*•]\s+/,
    orderedList: /^\s*\d+[.)]\s+/,
    quote: /^>\s?/,
};

/**
 * Любой блочный префикс — снимается перед установкой нового.
 */
const ANY_LINE_PREFIX = /^(#{1,3}\s+|\s*[-*•]\s+|\s*\d+[.)]\s+|>\s?)/;

/**
 * Редактор текста с разметкой: новости, события, описания поселений.
 *
 * Текст пишется в разметке, совместимой с Discord (`**жирный**`, `## заголовок`,
 * `- список`, `||спойлер||`…), а панель и сочетания клавиш расставляют её
 * за автора. Вставка идёт через `execCommand('insertText')`, поэтому Ctrl+Z
 * отменяет и действия панели.
 *
 * Картинки в текст доступны, только если передан загрузчик `uploadImage`
 * (у игроков нет прав на загрузку в медиасервис — им кнопка не показывается).
 * С `preview` рядом с полем появляется переключатель «Текст / Как увидят».
 *
 * Значение контрола — исходный текст; в HTML его превращает `renderNewsMarkdown`.
 */
@Component({
    standalone: true,
    selector: 'app-markup-editor',
    imports: [TuiIcon, TranslatePipe],
    templateUrl: './markup-editor.component.html',
    styleUrl: './markup-editor.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => MarkupEditorComponent),
            multi: true,
        },
    ],
})
export class MarkupEditorComponent implements ControlValueAccessor {
    /**
     * Переводы (тексты-заготовки при вставке разметки).
     */
    private readonly i18n = inject(I18nService);

    /**
     * Поле ввода текста.
     */
    private readonly areaRef = viewChild.required<ElementRef<HTMLTextAreaElement>>('area');

    /**
     * Скрытое поле выбора картинки.
     */
    private readonly fileRef = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

    /**
     * Обработчик изменения значения от формы.
     */
    private onChange: (value: string) => void = () => {};

    /**
     * Обработчик касания поля от формы.
     */
    protected onTouched: () => void = () => {};

    /**
     * Подсказка в пустом поле.
     */
    public readonly placeholder = input<string>('');

    /**
     * Доступное имя поля для скринридеров.
     * Если не задано — используется placeholder, чтобы поле не было безымянным.
     */
    public readonly ariaLabel = input<string>('');

    /**
     * Загрузчик картинок: получает файл, возвращает публичный URL.
     * Без него кнопки «Картинка» нет.
     */
    public readonly uploadImage = input<((file: File) => Promise<string>) | null>(null);

    /**
     * Высота поля в строках.
     */
    public readonly rows = input(12);

    /**
     * Показывать переключатель предпросмотра.
     */
    public readonly preview = input(false);

    /**
     * Ограничение длины (для счётчика), если есть.
     */
    public readonly maxLength = input<number | null>(null);

    /**
     * Открыт предпросмотр вместо поля.
     */
    protected readonly previewing = signal(false);

    /**
     * HTML предпросмотра.
     */
    protected readonly previewHtml = computed(() => (this.previewing() ? renderNewsMarkdown(this.value()) : ''));

    /**
     * Группы кнопок панели (без «Картинки», если загрузчика нет).
     */
    protected readonly toolbar = computed(() =>
        this.uploadImage()
            ? MARKUP_EDITOR_TOOLBAR
            : MARKUP_EDITOR_TOOLBAR.map((group) => group.filter((button) => button.action !== 'image'))
    );

    /**
     * Текущее значение (для счётчика символов).
     */
    protected readonly value = signal('');

    /**
     * Поле заблокировано формой.
     */
    protected readonly disabled = signal(false);

    /**
     * Идёт загрузка картинки.
     */
    protected readonly uploading = signal(false);

    /**
     * Ключ перевода ошибки загрузки картинки.
     */
    protected readonly uploadError = signal<string | null>(null);

    /**
     * @inheritdoc
     */
    public writeValue(value: string | null): void {
        const text = value ?? '';
        this.value.set(text);

        // Значение пишем напрямую: привязка [value] при каждом вводе сбрасывала бы курсор.
        queueMicrotask(() => {
            const area = this.areaRef().nativeElement;

            if (area.value !== text) {
                area.value = text;
            }
        });
    }

    /**
     * @inheritdoc
     */
    public registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    /**
     * @inheritdoc
     */
    public registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    /**
     * @inheritdoc
     */
    public setDisabledState(isDisabled: boolean): void {
        this.disabled.set(isDisabled);
    }

    /**
     * Ввод текста пользователем.
     */
    protected onInput(): void {
        this.emit();
    }

    /**
     * Сочетания клавиш: Ctrl/Cmd + B, I, U, K.
     *
     * @param event Событие клавиатуры.
     */
    protected onKeydown(event: KeyboardEvent): void {
        if (!(event.ctrlKey || event.metaKey) || event.altKey) {
            return;
        }

        const map: Record<string, MarkupEditorAction> = { b: 'bold', i: 'italic', u: 'underline', k: 'link' };
        // event.code не зависит от раскладки: Ctrl+B работает и на русской.
        const key = event.code.startsWith('Key') ? event.code.slice(3).toLowerCase() : event.key.toLowerCase();
        const action = map[key];

        if (action) {
            event.preventDefault();
            this.apply(action);
        }
    }

    /**
     * Выполняет действие панели.
     *
     * @param action Действие.
     */
    protected apply(action: MarkupEditorAction): void {
        if (this.disabled()) {
            return;
        }

        // Действие панели из предпросмотра возвращает к тексту.
        if (this.previewing()) {
            this.previewing.set(false);
            queueMicrotask(() => this.apply(action));
            return;
        }

        switch (action) {
            case 'bold':
                return this.wrap('**', '**', this.t('bold'));
            case 'italic':
                return this.wrap('*', '*', this.t('italic'));
            case 'underline':
                return this.wrap('__', '__', this.t('underline'));
            case 'strike':
                return this.wrap('~~', '~~', this.t('strike'));
            case 'spoiler':
                return this.wrap('||', '||', this.t('spoiler'));
            case 'heading':
            case 'list':
            case 'orderedList':
            case 'quote':
                return this.prefixLines(action);
            case 'link':
                return this.insertLink();
            case 'divider':
                return this.insertBlock('---');
            case 'image':
                if (!this.uploadImage()) {
                    return;
                }
                this.uploadError.set(null);
                this.fileRef().nativeElement.click();
                return;
        }
    }

    /**
     * Загружает выбранную картинку и вставляет её в текст отдельной строкой.
     *
     * @param event Событие выбора файла.
     */
    protected async onImageSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';

        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_SIZE) {
            this.uploadError.set('news.editor.imageTooLarge');
            return;
        }

        const upload = this.uploadImage();

        if (!upload) {
            return;
        }

        this.uploading.set(true);

        try {
            const url = await upload(file);
            this.insertBlock(`![](${url})`, 2);
        } catch {
            this.uploadError.set('news.editor.uploadError');
        } finally {
            this.uploading.set(false);
        }
    }

    /**
     * Оборачивает выделение маркерами; повторное нажатие снимает их.
     *
     * @param before Открывающий маркер.
     * @param after Закрывающий маркер.
     * @param placeholder Текст, если ничего не выделено.
     */
    private wrap(before: string, after: string, placeholder: string): void {
        const area = this.areaRef().nativeElement;
        const { selectionStart: start, selectionEnd: end, value } = area;
        const selected = value.slice(start, end);

        const isWrapped =
            start >= before.length &&
            value.slice(start - before.length, start) === before &&
            value.slice(end, end + after.length) === after;

        if (isWrapped) {
            this.replaceRange(start - before.length, end + after.length, selected);
            area.setSelectionRange(start - before.length, end - before.length);
            return;
        }

        const text = selected || placeholder;
        this.replaceRange(start, end, `${before}${text}${after}`);
        area.setSelectionRange(start + before.length, start + before.length + text.length);
    }

    /**
     * Ставит или снимает префикс блока у всех выделенных строк.
     *
     * @param kind Тип блока.
     */
    private prefixLines(kind: keyof typeof LINE_PREFIX): void {
        const area = this.areaRef().nativeElement;
        const { selectionStart, value } = area;
        let { selectionEnd } = area;

        // Выделение, заканчивающееся переводом строки, не захватывает следующую строку.
        if (selectionEnd > selectionStart && value[selectionEnd - 1] === '\n') {
            selectionEnd--;
        }

        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const nextBreak = value.indexOf('\n', selectionEnd);
        const lineEnd = nextBreak === -1 ? value.length : nextBreak;
        const lines = value.slice(lineStart, lineEnd).split('\n');

        const pattern = LINE_PREFIX[kind];
        const filled = lines.filter((line) => line.trim());
        const allPrefixed = filled.length > 0 && filled.every((line) => pattern.test(line));

        let counter = 0;
        const result = lines
            .map((line) => {
                if (!line.trim()) {
                    return line;
                }

                if (allPrefixed) {
                    return line.replace(pattern, '');
                }

                counter++;
                const prefix =
                    kind === 'heading' ? '## ' : kind === 'list' ? '- ' : kind === 'quote' ? '> ' : `${counter}. `;

                return prefix + line.replace(ANY_LINE_PREFIX, '');
            })
            .join('\n');

        const finalText =
            result ||
            (kind === 'heading' ? `## ${this.t('heading')}` : kind === 'quote' ? '> ' : kind === 'list' ? '- ' : '1. ');
        this.replaceRange(lineStart, lineEnd, finalText);
        area.setSelectionRange(lineStart + finalText.length, lineStart + finalText.length);
    }

    /**
     * Вставляет ссылку: выделенный адрес становится ссылкой с текстом,
     * выделенный текст — текстом ссылки с выделенным местом под адрес.
     */
    private insertLink(): void {
        const area = this.areaRef().nativeElement;
        const { selectionStart: start, selectionEnd: end, value } = area;
        const selected = value.slice(start, end).trim();

        if (/^https?:\/\/\S+$/i.test(selected)) {
            const label = this.t('linkText');
            this.replaceRange(start, end, `[${label}](${selected})`);
            area.setSelectionRange(start + 1, start + 1 + label.length);
            return;
        }

        const label = selected || this.t('linkText');
        const url = 'https://';
        this.replaceRange(start, end, `[${label}](${url})`);
        const urlStart = start + label.length + 3;
        area.setSelectionRange(urlStart, urlStart + url.length);
    }

    /**
     * Вставляет блок отдельной строкой (с пустыми строками вокруг) после курсора или выделения.
     *
     * @param block Текст блока.
     * @param selectFrom Смещение начала выделения внутри блока (для подписи картинки).
     */
    private insertBlock(block: string, selectFrom?: number): void {
        const area = this.areaRef().nativeElement;
        // Блок вставляется после выделения, не заменяя его.
        const { selectionEnd: end, value } = area;
        const start = end;
        const before = value.slice(0, start);
        const after = value.slice(end);
        const lead = !before ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
        const tail = !after ? '\n' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';

        this.replaceRange(start, end, `${lead}${block}${tail}`);

        const blockStart = start + lead.length;

        if (selectFrom !== undefined) {
            area.setSelectionRange(blockStart + selectFrom, blockStart + selectFrom);
        } else {
            const caret = blockStart + block.length + tail.length;
            area.setSelectionRange(caret, caret);
        }
    }

    /**
     * Заменяет диапазон текста с сохранением истории отмены (Ctrl+Z).
     *
     * @param start Начало диапазона.
     * @param end Конец диапазона.
     * @param text Новый текст.
     */
    private replaceRange(start: number, end: number, text: string): void {
        const area = this.areaRef().nativeElement;
        area.focus();
        area.setSelectionRange(start, end);

        // execCommand устарел, но это единственный способ вставить текст
        // в textarea, не ломая стек отмены; без него — обычная замена.
        const inserted = typeof document.execCommand === 'function' && document.execCommand('insertText', false, text);

        if (!inserted || area.value.slice(start, start + text.length) !== text) {
            area.setRangeText(text, start, end, 'end');
        }

        this.emit();
    }

    /**
     * Текст-заготовка для вставки.
     *
     * @param key Ключ в `news.editor.sample`.
     */
    private t(key: string): string {
        return this.i18n.translate(`news.editor.sample.${key}`);
    }

    /**
     * Передаёт текущее значение в форму.
     */
    private emit(): void {
        const text = this.areaRef().nativeElement.value;
        this.value.set(text);
        this.onChange(text);
    }
}
