import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    input,
    model,
    output,
    PLATFORM_ID,
    signal,
    viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { WikiHeading } from '@entities/wiki';
import {
    WIKI_CALLOUTS,
    WIKI_COMMANDS,
    WIKI_SLASH,
    WIKI_TOOLBAR,
    WikiCommand,
    WikiCommandId,
} from '../../lib/wiki-commands.constant';
import { caretCoordinates, lineOffsets } from '../../lib/textarea-geometry.function';
import { slugify } from '../../lib/slugify.function';

/**
 * Максимальный размер картинки, байт.
 */
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

/**
 * Префиксы строк, которые продолжаются по Enter.
 */
const CONTINUE = /^(\s*)(?:([-*•])\s+(\[[ xX]\]\s+)?|(\d+)([.)])\s+|(>)\s?)(.*)$/;

/**
 * Любой блочный префикс строки.
 */
const ANY_PREFIX = /^(#{1,4}\s+|\s*[-*•]\s+(\[[ xX]\]\s+)?|\s*\d+[.)]\s+|>\s?)/;

/**
 * Статья для подсказки ссылок.
 */
export interface WikiLinkTarget {
    readonly slug: string;
    readonly title: string;
}

/**
 * Пункт всплывающей подсказки.
 */
interface SuggestItem {
    readonly key: string;
    readonly icon: string;
    readonly label: string;
    readonly hint: string;
    readonly run: () => void;
}

/**
 * Открытая подсказка: меню «/» или ссылки `[[`.
 */
interface SuggestState {
    readonly kind: 'slash' | 'link';
    /**
     * Позиция, с которой начинается набранный запрос.
     */
    readonly from: number;
    readonly query: string;
    /**
     * Отступ сверху (подсказка под строкой) или снизу (над строкой, если внизу тесно).
     */
    readonly top: number | null;
    readonly bottom: number | null;
    readonly left: number;
    readonly maxHeight: number;
}

/**
 * Поле ввода текста статьи вики.
 *
 * Обычная textarea (быстрая, с родными Ctrl+Z, проверкой орфографии и IME),
 * вокруг которой собрано всё, что ждёшь от редактора:
 * - панель со всеми элементами разметки и выпадающими меню выносок и таблиц;
 * - сочетания клавиш, продолжение списков по Enter, Tab / Shift+Tab для отступов,
 *   Alt+↑/↓ — перенос строк, Ctrl+D — дублирование;
 * - меню «/» в начале строки и подсказка статей после `[[` (и разделов после `[[#`);
 * - вставка и перетаскивание картинок с загрузкой, вставка ссылки поверх выделения;
 * - поиск и замена, номера строк с отметками замечаний проверки, строка состояния.
 *
 * Все правки идут через `execCommand('insertText')`, поэтому отменяются Ctrl+Z.
 */
@Component({
    standalone: true,
    selector: 'app-wiki-markup-input',
    imports: [TuiIcon, TranslatePipe, FormsModule],
    templateUrl: './wiki-markup-input.component.html',
    styleUrl: './wiki-markup-input.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.wiki-input--focus]': 'focused()',
        '(document:mousedown)': 'onDocumentDown($event)',
    },
})
export class WikiMarkupInputComponent {
    private readonly i18n = inject(I18nService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    private readonly areaRef = viewChild.required<ElementRef<HTMLTextAreaElement>>('area');

    /**
     * То же поле, но без ошибки до создания шаблона — для эффекта синхронизации.
     */
    private readonly areaQuery = viewChild<ElementRef<HTMLTextAreaElement>>('area');
    private readonly fileRef = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
    private readonly findRef = viewChild<ElementRef<HTMLInputElement>>('findInput');

    /**
     * Текст статьи.
     */
    public readonly value = model('');

    /**
     * Загрузчик картинок: файл → публичный адрес.
     */
    public readonly uploadImage = input<((file: File) => Promise<string>) | null>(null);

    /**
     * Статьи для подсказки `[[`.
     */
    public readonly articles = input<readonly WikiLinkTarget[]>([]);

    /**
     * Разделы статьи для подсказки `[[#`.
     */
    public readonly headings = input<readonly WikiHeading[]>([]);

    /**
     * Строки с замечаниями проверки: отметки на полях.
     */
    public readonly marks = input<ReadonlyMap<number, 'error' | 'warning' | 'tip'>>(new Map());

    /**
     * Число слов (считает страница по разбору текста).
     */
    public readonly words = input(0);

    public readonly placeholder = input('');

    /**
     * Ctrl+S.
     */
    public readonly save = output<void>();

    /**
     * Строка (дробная) у верхнего края поля — для синхронной прокрутки просмотра.
     */
    public readonly topLine = output<number>();

    /**
     * Строка, где стоит курсор.
     */
    public readonly caretLine = output<number>();

    protected readonly commands = WIKI_COMMANDS;
    protected readonly toolbar = WIKI_TOOLBAR;
    protected readonly callouts = WIKI_CALLOUTS;

    protected readonly Math = Math;

    protected readonly focused = signal(false);

    /**
     * Моноширинный шрифт (таблицы и отступы ровнее) или обычный.
     */
    protected readonly mono = signal(true);
    protected readonly uploading = signal(0);
    protected readonly uploadError = signal<string | null>(null);
    protected readonly dragging = signal(false);

    /**
     * Открытое выпадающее меню панели.
     */
    protected readonly menu = signal<'callouts' | 'table' | null>(null);

    /**
     * Размер таблицы под курсором в выборе размера.
     */
    protected readonly tableHover = signal<[number, number]>([0, 0]);
    protected readonly tableGrid = Array.from({ length: 8 }, (_, index) => index + 1);

    protected readonly suggest = signal<SuggestState | null>(null);
    protected readonly suggestIndex = signal(0);

    /**
     * Строка и колонка курсора, длина выделения.
     */
    protected readonly caret = signal({ line: 1, column: 1, selected: 0 });

    /**
     * Позиции строк для номеров на полях.
     */
    protected readonly gutter = signal<{ tops: number[]; height: number }>({ tops: [], height: 0 });
    protected readonly scrollTop = signal(0);

    /**
     * Подсветка строки после перехода к ней.
     */
    protected readonly flash = signal<{ top: number; height: number; key: number } | null>(null);

    // Поиск и замена.
    protected readonly findOpen = signal(false);
    protected readonly replaceOpen = signal(false);
    protected readonly findText = signal('');
    protected readonly replaceText = signal('');
    protected readonly matchCase = signal(false);
    protected readonly findIndex = signal(-1);

    /**
     * Все вхождения искомого текста.
     */
    protected readonly matches = computed(() => {
        const needle = this.findText();

        if (!needle) {
            return [] as number[];
        }

        const haystack = this.matchCase() ? this.value() : this.value().toLowerCase();
        const target = this.matchCase() ? needle : needle.toLowerCase();
        const found: number[] = [];
        let from = haystack.indexOf(target);

        while (from !== -1 && found.length < 5000) {
            found.push(from);
            from = haystack.indexOf(target, from + target.length);
        }

        return found;
    });

    protected readonly chars = computed(() => this.value().length);

    /**
     * Минут чтения (200 слов в минуту).
     */
    protected readonly minutes = computed(() => Math.max(1, Math.round(this.words() / 200)));

    /**
     * Пункты открытой подсказки.
     */
    protected readonly suggestItems = computed<SuggestItem[]>(() => {
        const state = this.suggest();

        if (!state) {
            return [];
        }

        if (state.kind === 'slash') {
            const query = state.query.toLowerCase();
            return WIKI_SLASH.filter(
                (command) =>
                    !query ||
                    this.label(command.id).toLowerCase().includes(query) ||
                    (command.keywords ?? '').includes(query)
            )
                .slice(0, 12)
                .map((command) => ({
                    key: command.id,
                    icon: command.icon,
                    label: this.label(command.id),
                    hint: this.i18n.translate(`wiki.cmdHint.${command.id}`),
                    run: () => this.runSlash(state, command),
                }));
        }

        // Ссылки: [[# — разделы этой статьи, иначе — статьи.
        if (state.query.startsWith('#')) {
            const query = state.query.slice(1).toLowerCase();
            return this.headings()
                .filter((heading) => heading.text.toLowerCase().includes(query))
                .slice(0, 10)
                .map((heading) => ({
                    key: heading.id,
                    icon: heading.level === 2 ? '@tui.heading-2' : '@tui.heading-3',
                    label: heading.text,
                    hint: `#${heading.id}`,
                    run: () => this.completeLink(state, `#${heading.id}`),
                }));
        }

        const query = state.query.toLowerCase().trim();
        const found: SuggestItem[] = this.articles()
            .filter((article) => !query || article.title.toLowerCase().includes(query) || article.slug.includes(query))
            .slice(0, 8)
            .map((article) => ({
                key: article.slug,
                icon: '@tui.book-open',
                label: article.title,
                hint: `/wiki/${article.slug}`,
                run: () => this.completeLink(state, article.slug),
            }));

        if (query && !found.some((item) => item.label.toLowerCase() === query)) {
            const slug = slugify(state.query);
            found.push({
                key: `new:${slug}`,
                icon: '@tui.file-plus',
                label: this.i18n.translate('wiki.input.linkNew', { title: state.query.trim() }),
                hint: `/wiki/${slug}`,
                run: () => this.completeLink(state, state.query.trim()),
            });
        }

        return found;
    });

    /**
     * Номера строк на полях: только видимые, чтобы длинная статья не тормозила.
     */
    protected readonly gutterRows = computed(() => {
        const { tops } = this.gutter();
        const top = this.scrollTop();
        const bottom = top + (this.viewHeight() || 2000);
        const marks = this.marks();
        const current = this.caret().line - 1;
        const rows: { line: number; top: number; mark: string | null; current: boolean }[] = [];

        for (let line = 0; line < tops.length; line++) {
            if (tops[line] >= top - 40 && tops[line] <= bottom + 40) {
                rows.push({ line, top: tops[line] - top, mark: marks.get(line) ?? null, current: line === current });
            }
        }

        return rows;
    });

    private readonly viewHeight = signal(0);

    /**
     * Метка подписи к картинке, которую грузим (заменяется адресом по готовности).
     */
    private uploadSeq = 0;

    /**
     * Esc отпускает Tab: следующее нажатие уводит фокус из поля.
     */
    private tabReleased = false;

    /**
     * Текст для ссылки `[[адрес|текст]]` из выделения перед вызовом подсказки.
     */
    private pendingLabel = '';

    /**
     * Действие, которое вызывает выбор файла: картинка или галерея.
     */
    private fileMode: 'image' | 'gallery' = 'image';

    private measureTimer: ReturnType<typeof setTimeout> | null = null;

    public constructor() {
        // Значение снаружи (шаблон, восстановление) пишем в поле, не сбивая курсор при вводе.
        effect(() => {
            const text = this.value();
            this.mono();
            const area = this.areaQuery()?.nativeElement;

            if (!area) {
                return;
            }

            if (area.value !== text) {
                area.value = text;
            }

            this.scheduleMeasure();
        });

        afterNextRender(() => {
            const area = this.areaRef().nativeElement;
            const observer = new ResizeObserver(() => {
                this.viewHeight.set(area.clientHeight);
                this.scheduleMeasure();
            });

            observer.observe(area);
            this.destroyRef.onDestroy(() => {
                observer.disconnect();

                if (this.measureTimer) {
                    clearTimeout(this.measureTimer);
                }
            });
        });
    }

    /**
     * Переводит курсор на строку и показывает её.
     *
     * @param line Номер строки (с нуля).
     * @param select Выделить строку целиком.
     */
    public goToLine(line: number, select = false): void {
        const area = this.areaRef().nativeElement;
        const lines = area.value.split('\n');
        const target = Math.max(0, Math.min(line, lines.length - 1));
        const start = lines.slice(0, target).reduce((sum, item) => sum + item.length + 1, 0);

        area.focus({ preventScroll: true });
        area.setSelectionRange(start, select ? start + lines[target].length : start);

        const { tops } = lineOffsets(area);
        const top = tops[target] ?? 0;
        const next = tops[target + 1] ?? top + 24;

        area.scrollTop = Math.max(0, top - area.clientHeight / 3);
        this.onScroll();
        this.updateCaret();
        this.flash.set({ top, height: next - top, key: Date.now() });
        setTimeout(() => this.flash.set(null), 1200);
    }

    /**
     * Заменяет весь текст так, что замену можно отменить Ctrl+Z.
     *
     * @param text Новый текст.
     */
    public setText(text: string): void {
        const area = this.areaRef().nativeElement;
        const { scrollTop } = area;
        this.replaceRange(0, area.value.length, text);
        area.setSelectionRange(0, 0);
        area.scrollTop = Math.min(scrollTop, area.scrollHeight);
        this.onScroll();
    }

    /**
     * Фокус в поле.
     */
    public focus(): void {
        this.areaRef().nativeElement.focus();
    }

    /**
     * Выполняет действие (кнопки панели, меню, сочетания клавиш).
     *
     * @param id Действие.
     */
    public run(id: WikiCommandId): void {
        this.menu.set(null);
        const area = this.areaRef().nativeElement;

        switch (id) {
            case 'undo':
            case 'redo':
                area.focus();
                document.execCommand(id);
                this.emit();
                return;
            case 'h2':
                return this.toggleHeading('## ');
            case 'h3':
                return this.toggleHeading('### ');
            case 'bold':
                return this.wrap('**', '**', this.sample('bold'));
            case 'italic':
                return this.wrap('*', '*', this.sample('italic'));
            case 'underline':
                return this.wrap('__', '__', this.sample('underline'));
            case 'strike':
                return this.wrap('~~', '~~', this.sample('strike'));
            case 'highlight':
                return this.wrap('==', '==', this.sample('highlight'));
            case 'code':
                return this.wrap('`', '`', this.sample('code'));
            case 'spoiler':
                return this.wrap('||', '||', this.sample('spoiler'));
            case 'dash': {
                const { selectionStart: from, selectionEnd: to, value } = area;
                // Пробел перед тире не нужен: он уже есть в самой вставке.
                const at = from === to && from > 0 && value[from - 1] === ' ' ? from - 1 : from;

                this.replaceRange(at, to, '\u00A0— ');

                return;
            }
            case 'nbsp':
                this.replaceRange(area.selectionStart, area.selectionEnd, '\u00A0');

                return;
            case 'link':
                return this.insertLink();
            case 'wikiLink':
            case 'anchorLink':
                return this.startLink(id === 'anchorLink' ? '#' : '');
            case 'ruleLink':
                return this.insertRuleLink();
            case 'kbd':
                return this.wrap('[[kbd:', ']]', 'Ctrl+C');
            case 'footnote':
                return this.insertFootnote();
            case 'list':
                return this.prefixLines('list');
            case 'orderedList':
                return this.prefixLines('ordered');
            case 'checklist':
                return this.prefixLines('check');
            case 'quote':
                return this.prefixLines('quote');
            case 'tip':
            case 'info':
            case 'warn':
            case 'danger':
                return this.wrapBlock(`:::${id}`, this.sample('callout'));
            case 'details':
                return this.insertBlock(
                    `:::details ${this.sample('detailsTitle')}\n${this.sample('detailsBody')}\n:::`,
                    [11, 11 + this.sample('detailsTitle').length]
                );
            case 'steps': {
                const step = this.sample('step');
                const note = this.sample('stepNote');
                return this.insertBlock(`:::steps\n1. ${step} 1\n${note}\n\n2. ${step} 2\n${note}\n:::`, [
                    12,
                    12 + step.length + 2,
                ]);
            }
            case 'compare': {
                const bad = this.sample('compareBad');
                return this.insertBlock(`:::compare\n${bad}\n+++\n${this.sample('compareGood')}\n:::`, [
                    11,
                    11 + bad.length,
                ]);
            }
            case 'columns': {
                const col = this.sample('column');
                return this.insertBlock(`:::columns\n${col} 1\n+++\n${col} 2\n:::`, [11, 11 + col.length + 2]);
            }
            case 'table':
                return this.insertTable(3, 2);
            case 'codeBlock': {
                const { selectionStart, selectionEnd, value } = area;
                const selected = value.slice(selectionStart, selectionEnd);

                if (selected) {
                    return this.replaceSelectionBlock('```\n' + selected + '\n```');
                }

                const code = this.sample('code');
                return this.insertBlock('```\n' + code + '\n```', [4, 4 + code.length]);
            }
            case 'divider':
                return this.insertBlock('---');
            case 'image':
            case 'gallery':
                if (!this.uploadImage()) {
                    return this.run('imageUrl');
                }
                this.fileMode = id;
                this.uploadError.set(null);
                this.fileRef().nativeElement.multiple = id === 'gallery';
                this.fileRef().nativeElement.click();
                return;
            case 'imageUrl': {
                const caption = this.sample('caption');
                return this.insertBlock(`![${caption}](https://)`, [caption.length + 4, caption.length + 12]);
            }
            case 'youtube':
                return this.insertBlock('@youtube()', [9, 9]);
            case 'find':
                return this.openFind(false);
        }
    }

    /**
     * Вставляет таблицу заданного размера.
     *
     * @param cols Колонок.
     * @param rows Строк без шапки.
     */
    protected insertTable(cols: number, rows: number): void {
        this.menu.set(null);
        const head = this.sample('tableHead');
        const cell = this.sample('tableCell');
        const line = (text: string): string => `| ${Array.from({ length: cols }, () => text).join(' | ')} |`;
        const table = [line(head), `|${Array.from({ length: cols }, () => '---').join('|')}|`];

        for (let index = 0; index < rows; index++) {
            table.push(line(cell));
        }

        this.insertBlock(table.join('\n'), [2, 2 + head.length]);
    }

    protected toggleMenu(menu: 'callouts' | 'table'): void {
        this.menu.update((open) => (open === menu ? null : menu));
        this.tableHover.set([0, 0]);
    }

    /**
     * Клик мимо выпадающего меню закрывает его.
     */
    protected onDocumentDown(event: MouseEvent): void {
        if (this.menu() && !(event.target as HTMLElement | null)?.closest('.wi__menu-wrap')) {
            this.menu.set(null);
        }
    }

    protected label(id: WikiCommandId): string {
        return this.i18n.translate(`wiki.cmd.${id}`);
    }

    protected title(id: WikiCommandId): string {
        const hotkey = WIKI_COMMANDS[id].hotkey;
        return this.label(id) + (hotkey ? ` (${hotkey})` : '');
    }

    protected isGroup(group: readonly WikiCommandId[] | 'callouts'): group is readonly WikiCommandId[] {
        return group !== 'callouts';
    }

    // ———————————————————————————— События поля ————————————————————————————

    protected onInput(): void {
        this.emit();
        this.updateSuggest();
        this.updateCaret();
    }

    protected onScroll(): void {
        const area = this.areaRef().nativeElement;
        this.scrollTop.set(area.scrollTop);

        // Поле прокрутилось (например, курсор ушёл вниз) — подсказка едет вместе со строкой.
        if (this.suggest()) {
            this.updateSuggest();
        }

        const { tops } = this.gutter();

        if (!tops.length) {
            return;
        }

        // Дробная строка у верхнего края: целая часть — строка, дробная — доля её высоты.
        const y = area.scrollTop;
        let low = 0;
        let high = tops.length - 1;

        while (low < high) {
            const mid = (low + high + 1) >> 1;
            if (tops[mid] <= y) {
                low = mid;
            } else {
                high = mid - 1;
            }
        }

        const next = tops[low + 1] ?? this.gutter().height;
        const fraction = next > tops[low] ? (y - tops[low]) / (next - tops[low]) : 0;
        const atEnd = area.scrollTop + area.clientHeight >= area.scrollHeight - 2;

        this.topLine.emit(atEnd ? Number.POSITIVE_INFINITY : low + Math.min(1, Math.max(0, fraction)));
    }

    protected onSelect(): void {
        this.updateCaret();
    }

    protected onBlur(): void {
        this.focused.set(false);
        // Клик по пункту подсказки идёт через mousedown + preventDefault, поэтому blur её закрывает.
        setTimeout(() => {
            if (document.activeElement !== this.areaRef().nativeElement) {
                this.suggest.set(null);
            }
        }, 150);
    }

    protected onKeydown(event: KeyboardEvent): void {
        const suggest = this.suggest();
        const items = this.suggestItems();

        // Подсказка перехватывает стрелки, Enter, Tab и Esc.
        if (suggest && items.length) {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const step = event.key === 'ArrowDown' ? 1 : -1;
                this.suggestIndex.update((index) => (index + step + items.length) % items.length);
                return;
            }

            if (event.key === 'Enter' || event.key === 'Tab') {
                event.preventDefault();
                items[Math.min(this.suggestIndex(), items.length - 1)].run();
                return;
            }
        }

        if (event.key === 'Escape') {
            if (suggest) {
                event.preventDefault();
                this.suggest.set(null);
                return;
            }

            this.tabReleased = true;
            return;
        }

        const mod = event.ctrlKey || event.metaKey;
        // event.code не зависит от раскладки: Ctrl+B работает и на русской.
        const code = event.code;

        if (mod) {
            const id = this.hotkey(code, event.shiftKey, event.altKey);

            if (id === 'save') {
                event.preventDefault();
                this.save.emit();
                return;
            }

            if (id === 'replace') {
                event.preventDefault();
                this.openFind(true);
                return;
            }

            if (id === 'duplicate') {
                event.preventDefault();
                this.duplicateLines();
                return;
            }

            if (id) {
                event.preventDefault();
                this.run(id);
                return;
            }
        }

        if (event.altKey && !mod && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
            event.preventDefault();
            this.moveLines(event.key === 'ArrowUp' ? -1 : 1);
            return;
        }

        if (event.key === 'Tab' && !mod && !event.altKey) {
            if (this.tabReleased) {
                this.tabReleased = false;
                return;
            }

            event.preventDefault();
            this.indent(event.shiftKey ? -1 : 1);
            return;
        }

        this.tabReleased = false;

        if (event.key === 'Enter' && !event.shiftKey && !mod && !event.isComposing) {
            if (this.continueLine()) {
                event.preventDefault();
            }
        }

        if (event.key === 'Backspace' || event.key === 'Delete' || event.key.length === 1) {
            queueMicrotask(() => this.updateCaret());
        }
    }

    protected onPaste(event: ClipboardEvent): void {
        const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith('image/'));

        if (files.length && this.uploadImage()) {
            event.preventDefault();
            void this.uploadFiles(files, files.length > 1 ? 'gallery' : 'image');
            return;
        }

        const text = event.clipboardData?.getData('text/plain')?.trim() ?? '';
        const area = this.areaRef().nativeElement;
        const { selectionStart: start, selectionEnd: end, value } = area;

        // Ссылка поверх выделенного текста — оформляем ссылкой.
        if (start !== end && /^https?:\/\/\S+$/i.test(text) && !/\n/.test(value.slice(start, end))) {
            event.preventDefault();
            this.replaceRange(start, end, `[${value.slice(start, end)}](${text})`);
        }
    }

    protected onDragOver(event: DragEvent): void {
        if (this.uploadImage() && [...(event.dataTransfer?.items ?? [])].some((item) => item.kind === 'file')) {
            event.preventDefault();
            this.dragging.set(true);
        }
    }

    protected onDrop(event: DragEvent): void {
        this.dragging.set(false);
        const files = [...(event.dataTransfer?.files ?? [])].filter((file) => file.type.startsWith('image/'));

        if (files.length && this.uploadImage()) {
            event.preventDefault();
            void this.uploadFiles(files, files.length > 1 ? 'gallery' : 'image');
        }
    }

    protected onFiles(event: Event): void {
        const fileInput = event.target as HTMLInputElement;
        const files = [...(fileInput.files ?? [])];
        fileInput.value = '';

        if (files.length) {
            void this.uploadFiles(files, this.fileMode === 'gallery' || files.length > 1 ? 'gallery' : 'image');
        }
    }

    protected pickSuggest(item: SuggestItem, event: Event): void {
        event.preventDefault();
        item.run();
    }

    // ———————————————————————————— Поиск и замена ————————————————————————————

    protected openFind(withReplace: boolean): void {
        const area = this.areaRef().nativeElement;
        const selected = area.value.slice(area.selectionStart, area.selectionEnd);

        if (selected && !selected.includes('\n')) {
            this.findText.set(selected);
        }

        this.findOpen.set(true);
        this.replaceOpen.set(withReplace || this.replaceOpen());
        this.findIndex.set(-1);
        setTimeout(() => this.findRef()?.nativeElement.select());
    }

    protected closeFind(): void {
        this.findOpen.set(false);
        this.areaRef().nativeElement.focus();
    }

    protected onFindKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.findStep(event.shiftKey ? -1 : 1);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            this.closeFind();
        }
    }

    /**
     * Переходит к следующему (или предыдущему) вхождению.
     *
     * @param step 1 — вперёд, -1 — назад.
     */
    protected findStep(step: 1 | -1): void {
        const matches = this.matches();

        if (!matches.length) {
            this.findIndex.set(-1);
            return;
        }

        const area = this.areaRef().nativeElement;
        let index = this.findIndex();

        if (index === -1) {
            const caret = area.selectionEnd;
            index = matches.findIndex((position) => position >= caret);
            index = step === 1 ? (index === -1 ? 0 : index) : (index <= 0 ? matches.length : index) - 1;
        } else {
            index = (index + step + matches.length) % matches.length;
        }

        this.findIndex.set(index);
        this.selectRange(matches[index], matches[index] + this.findText().length);
    }

    protected replaceOne(): void {
        const matches = this.matches();
        const index = this.findIndex();

        if (index < 0 || index >= matches.length) {
            this.findStep(1);
            return;
        }

        const start = matches[index];
        this.replaceRange(start, start + this.findText().length, this.replaceText());
        this.findIndex.set(index - 1);
        this.findStep(1);
    }

    protected replaceAll(): void {
        const needle = this.findText();

        if (!needle || !this.matches().length) {
            return;
        }

        const pattern = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), this.matchCase() ? 'g' : 'gi');
        const area = this.areaRef().nativeElement;
        const next = area.value.replace(pattern, () => this.replaceText());
        this.replaceRange(0, area.value.length, next);
        this.findIndex.set(-1);
    }

    // ———————————————————————————— Правки текста ————————————————————————————

    /**
     * Сочетание клавиш → действие.
     */
    private hotkey(
        code: string,
        shift: boolean,
        alt: boolean
    ): WikiCommandId | 'save' | 'replace' | 'duplicate' | null {
        if (alt) {
            return code === 'Digit2' ? 'h2' : code === 'Digit3' ? 'h3' : null;
        }

        if (shift) {
            const map: Record<string, WikiCommandId> = {
                KeyK: 'wikiLink',
                KeyS: 'strike',
                KeyH: 'highlight',
                Digit7: 'orderedList',
                Digit8: 'list',
                Digit9: 'checklist',
            };
            return map[code] ?? null;
        }

        const map: Record<string, WikiCommandId | 'save' | 'replace' | 'duplicate'> = {
            KeyB: 'bold',
            KeyI: 'italic',
            KeyU: 'underline',
            KeyK: 'link',
            KeyE: 'code',
            KeyS: 'save',
            KeyF: 'find',
            KeyH: 'replace',
            KeyD: 'duplicate',
        };
        return map[code] ?? null;
    }

    /**
     * Оборачивает выделение маркерами; повторно — снимает их.
     */
    private wrap(before: string, after: string, placeholder: string): void {
        const area = this.areaRef().nativeElement;
        const { selectionStart: start, selectionEnd: end, value } = area;
        const selected = value.slice(start, end);

        if (
            start >= before.length &&
            value.slice(start - before.length, start) === before &&
            value.slice(end, end + after.length) === after
        ) {
            this.replaceRange(start - before.length, end + after.length, selected);
            area.setSelectionRange(start - before.length, end - before.length);
            return;
        }

        if (selected.length > before.length + after.length && selected.startsWith(before) && selected.endsWith(after)) {
            const inner = selected.slice(before.length, selected.length - after.length);
            this.replaceRange(start, end, inner);
            area.setSelectionRange(start, start + inner.length);
            return;
        }

        const text = selected || placeholder;
        this.replaceRange(start, end, `${before}${text}${after}`);
        area.setSelectionRange(start + before.length, start + before.length + text.length);
    }

    /**
     * Строки, на которых стоит выделение: начало, конец и текст.
     */
    private selectedLines(): { start: number; end: number; lines: string[] } {
        const area = this.areaRef().nativeElement;
        const { selectionStart, value } = area;
        let { selectionEnd } = area;

        if (selectionEnd > selectionStart && value[selectionEnd - 1] === '\n') {
            selectionEnd--;
        }

        const start = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const next = value.indexOf('\n', selectionEnd);
        const end = next === -1 ? value.length : next;

        return { start, end, lines: value.slice(start, end).split('\n') };
    }

    private toggleHeading(prefix: string): void {
        const area = this.areaRef().nativeElement;
        const { start, end, lines } = this.selectedLines();
        const all = lines.every((line) => line.startsWith(prefix));
        const result = lines
            .map((line) => (all ? line.slice(prefix.length) : prefix + line.replace(ANY_PREFIX, '')))
            .join('\n');
        const text = result.trim() ? result : prefix + this.sample('heading');

        this.replaceRange(start, end, text);

        if (!result.trim()) {
            area.setSelectionRange(start + prefix.length, start + text.length);
        }
    }

    private prefixLines(kind: 'list' | 'ordered' | 'check' | 'quote'): void {
        const area = this.areaRef().nativeElement;
        const { start, end, lines } = this.selectedLines();
        const patterns = {
            list: /^\s*[-*•]\s+(?!\[[ xX]\])/,
            ordered: /^\s*\d+[.)]\s+/,
            check: /^\s*[-*•]\s+\[[ xX]\]\s+/,
            quote: /^>\s?/,
        };
        const filled = lines.filter((line) => line.trim());
        const all = filled.length > 0 && filled.every((line) => patterns[kind].test(line));
        let counter = 0;

        const result = lines
            .map((line) => {
                if (!line.trim()) {
                    return line;
                }

                if (all) {
                    return line.replace(ANY_PREFIX, '');
                }

                counter++;
                const indent = /^\s*/.exec(line)![0];
                const prefix = { list: '- ', ordered: `${counter}. `, check: '- [ ] ', quote: '> ' }[kind];
                return (kind === 'quote' ? '' : indent) + prefix + line.trimStart().replace(ANY_PREFIX, '');
            })
            .join('\n');

        const text = result.trim() ? result : { list: '- ', ordered: '1. ', check: '- [ ] ', quote: '> ' }[kind];
        this.replaceRange(start, end, text);
        area.setSelectionRange(start + text.length, start + text.length);
    }

    /**
     * Оборачивает выделенные строки в блок `:::имя … :::` или вставляет пустой блок.
     */
    private wrapBlock(open: string, placeholder: string): void {
        const area = this.areaRef().nativeElement;

        if (area.selectionStart !== area.selectionEnd) {
            const { start, end, lines } = this.selectedLines();
            const block = `${open}\n${lines.join('\n')}\n:::`;
            this.replaceRange(start, end, block);
            area.setSelectionRange(start + block.length, start + block.length);
            return;
        }

        this.insertBlock(`${open}\n${placeholder}\n:::`, [open.length + 1, open.length + 1 + placeholder.length]);
    }

    private replaceSelectionBlock(block: string): void {
        const area = this.areaRef().nativeElement;
        const { start, end } = this.selectedLines();
        this.replaceRange(start, end, block);
        area.setSelectionRange(start + block.length, start + block.length);
    }

    private insertLink(): void {
        const area = this.areaRef().nativeElement;
        const { selectionStart: start, selectionEnd: end, value } = area;
        const selected = value.slice(start, end).trim();

        if (/^https?:\/\/\S+$/i.test(selected)) {
            const label = this.sample('linkText');
            this.replaceRange(start, end, `[${label}](${selected})`);
            area.setSelectionRange(start + 1, start + 1 + label.length);
            return;
        }

        const label = selected || this.sample('linkText');
        this.replaceRange(start, end, `[${label}](https://)`);
        const urlStart = start + label.length + 3;
        area.setSelectionRange(urlStart, urlStart + 8);
    }

    /**
     * Ставит `[[` (или `[[#`) и открывает подсказку статей.
     *
     * @param prefix `#` — ссылка на раздел этой статьи.
     */
    private startLink(prefix: string): void {
        const area = this.areaRef().nativeElement;
        const { selectionStart: start, selectionEnd: end, value } = area;
        this.pendingLabel = value.slice(start, end).replace(/\n/g, ' ').trim();
        this.replaceRange(start, end, `[[${prefix}`);
        area.setSelectionRange(start + 2 + prefix.length, start + 2 + prefix.length);
        this.updateSuggest(true);
    }

    /**
     * Дописывает выбранную ссылку `[[адрес|текст]]`.
     */
    private completeLink(state: SuggestState, target: string): void {
        const area = this.areaRef().nativeElement;
        const caret = area.selectionStart;
        const tail = area.value.slice(caret, caret + 2) === ']]' ? 2 : 0;
        const label = this.pendingLabel ? `|${this.pendingLabel}` : '';
        const text = `${target}${label}]]`;

        this.replaceRange(state.from, caret + tail, text);
        area.setSelectionRange(state.from + text.length, state.from + text.length);
        this.pendingLabel = '';
        this.suggest.set(null);
    }

    private insertRuleLink(): void {
        const area = this.areaRef().nativeElement;
        const { selectionStart: start, selectionEnd: end, value } = area;
        const selected = value.slice(start, end).trim();
        const number = /^§?\s*\d+(\.\d+)*$/.test(selected) ? selected.replace(/^§\s*/, '') : '';
        const label = number ? '' : selected;
        const text = `[[rule:${number || '1.1'}${label ? `|${label}` : ''}]]`;

        this.replaceRange(start, end, text);

        if (number) {
            area.setSelectionRange(start + text.length, start + text.length);
        } else {
            area.setSelectionRange(start + 7, start + 10);
        }
    }

    /**
     * Сноска: `[^n]` в тексте и пояснение `[^n]: …` в конце статьи.
     */
    private insertFootnote(): void {
        const area = this.areaRef().nativeElement;
        const used = [...area.value.matchAll(/\[\^(\d+)\]/g)].map((match) => Number(match[1]));
        const number = used.length ? Math.max(...used) + 1 : 1;
        const caret = area.selectionEnd;

        this.replaceRange(caret, caret, `[^${number}]`);

        const note = this.sample('footnote');
        const value = area.value;
        const tail = value.endsWith('\n\n') ? '' : value.endsWith('\n') ? '\n' : '\n\n';
        const def = `${tail}[^${number}]: ${note}`;
        this.replaceRange(value.length, value.length, def);

        const from = area.value.length - note.length;
        area.setSelectionRange(from, area.value.length);
        this.goToLine(area.value.split('\n').length - 1);
        area.setSelectionRange(from, area.value.length);
    }

    /**
     * Вставляет блок отдельными строками после выделения.
     *
     * @param block Текст блока.
     * @param select Что выделить внутри блока: [от, до].
     */
    private insertBlock(block: string, select?: [number, number]): void {
        const area = this.areaRef().nativeElement;
        const { selectionEnd: at, value } = area;
        const lineEnd = value.indexOf('\n', at) === -1 ? value.length : value.indexOf('\n', at);
        const currentLine = value.slice(value.lastIndexOf('\n', at - 1) + 1, lineEnd);
        let position = at;

        // На пустой строке блок встаёт прямо в неё, иначе — после текущего абзаца,
        // списка или таблицы (до пустой строки), чтобы не разрезать их.
        if (currentLine.trim()) {
            position = lineEnd;

            while (position < value.length) {
                const next = value.indexOf('\n', position + 1);
                const line = value.slice(position + 1, next === -1 ? value.length : next);

                if (!line.trim()) {
                    break;
                }

                position = next === -1 ? value.length : next;
            }
        }

        const before = value.slice(0, position);
        const after = value.slice(position);
        const lead = !before ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
        const tail = !after ? '\n' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';

        this.replaceRange(position, position, `${lead}${block}${tail}`);

        const blockStart = position + lead.length;

        if (select) {
            area.setSelectionRange(blockStart + select[0], blockStart + select[1]);
        } else {
            const caret = blockStart + block.length + tail.length;
            area.setSelectionRange(caret, caret);
        }

        this.updateCaret();
    }

    /**
     * Enter в пункте списка или цитаты: новый пункт; в пустом пункте — выход из списка.
     *
     * @returns Нажатие обработано.
     */
    private continueLine(): boolean {
        const area = this.areaRef().nativeElement;
        const { selectionStart: start, selectionEnd: end, value } = area;

        if (start !== end) {
            return false;
        }

        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const line = value.slice(lineStart, start);
        const match = CONTINUE.exec(line);

        if (!match) {
            return false;
        }

        const [, indent, bullet, check, number, delimiter, quote, rest] = match;

        if (!rest.trim()) {
            // Пустой пункт: убираем маркер (во вложенном — поднимаем уровень).
            if (indent.length >= 2) {
                this.replaceRange(lineStart, lineStart + 2, '');
                area.setSelectionRange(start - 2, start - 2);
                return true;
            }

            this.replaceRange(lineStart, start, '');
            return true;
        }

        const prefix = quote
            ? '> '
            : bullet
              ? `${indent}${bullet} ${check ? '[ ] ' : ''}`
              : `${indent}${Number(number) + 1}${delimiter} `;

        this.replaceRange(start, start, `\n${prefix}`);
        return true;
    }

    /**
     * Tab / Shift+Tab: отступ строк на два пробела.
     */
    private indent(direction: 1 | -1): void {
        const area = this.areaRef().nativeElement;
        const { selectionStart, selectionEnd } = area;

        // Без выделения Tab вне пункта списка просто вставляет два пробела.
        if (direction === 1 && selectionStart === selectionEnd) {
            const lineStart = area.value.lastIndexOf('\n', selectionStart - 1) + 1;
            const lineEnd = area.value.indexOf('\n', selectionStart);
            const line = area.value.slice(lineStart, lineEnd === -1 ? area.value.length : lineEnd);

            if (!/^\s*([-*•]|\d+[.)])\s/.test(line)) {
                this.replaceRange(selectionStart, selectionStart, '  ');
                return;
            }
        }

        const { start, end, lines } = this.selectedLines();
        const result = lines.map((line) => (direction === 1 ? `  ${line}` : line.replace(/^ {1,2}/, ''))).join('\n');
        const shift = result.length - (end - start);

        this.replaceRange(start, end, result);

        if (selectionStart === selectionEnd) {
            const caret = Math.max(start, selectionStart + (direction === 1 ? 2 : shift));
            area.setSelectionRange(caret, caret);
        } else {
            area.setSelectionRange(start, start + result.length);
        }
    }

    /**
     * Alt+↑/↓: переносит выделенные строки выше или ниже.
     */
    private moveLines(direction: 1 | -1): void {
        const area = this.areaRef().nativeElement;
        const { start, end } = this.selectedLines();
        const value = area.value;
        const offset = area.selectionStart - start;
        const length = area.selectionEnd - area.selectionStart;

        if (direction === -1) {
            if (start === 0) {
                return;
            }
            const prevStart = value.lastIndexOf('\n', start - 2) + 1;
            const prev = value.slice(prevStart, start - 1);
            const block = value.slice(start, end);
            this.replaceRange(prevStart, end, `${block}\n${prev}`);
            area.setSelectionRange(prevStart + offset, prevStart + offset + length);
        } else {
            if (end >= value.length) {
                return;
            }
            const nextEnd = value.indexOf('\n', end + 1) === -1 ? value.length : value.indexOf('\n', end + 1);
            const next = value.slice(end + 1, nextEnd);
            const block = value.slice(start, end);
            this.replaceRange(start, nextEnd, `${next}\n${block}`);
            const moved = start + next.length + 1;
            area.setSelectionRange(moved + offset, moved + offset + length);
        }

        this.updateCaret();
    }

    /**
     * Ctrl+D: дублирует строки с выделением.
     */
    private duplicateLines(): void {
        const area = this.areaRef().nativeElement;
        const { end, lines } = this.selectedLines();
        const block = lines.join('\n');
        const { selectionStart, selectionEnd } = area;

        this.replaceRange(end, end, `\n${block}`);
        area.setSelectionRange(selectionStart + block.length + 1, selectionEnd + block.length + 1);
    }

    /**
     * Загружает картинки; пока идёт загрузка, в тексте стоит строка-заглушка.
     *
     * @param files Картинки.
     * @param mode Одна картинка или галерея.
     */
    private async uploadFiles(files: File[], mode: 'image' | 'gallery'): Promise<void> {
        const upload = this.uploadImage();

        if (!upload) {
            return;
        }

        const valid = files.filter((file) => file.type.startsWith('image/') && file.size <= MAX_IMAGE_SIZE);

        if (valid.length < files.length) {
            this.uploadError.set('wiki.input.imageTooLarge');
        }

        if (!valid.length) {
            return;
        }

        const markers = valid.map(
            (file) => `⏳ ${this.i18n.translate('wiki.input.uploadingFile', { name: file.name })} #${++this.uploadSeq}`
        );
        const block = mode === 'gallery' ? `:::gallery\n${markers.join('\n')}\n:::` : markers.join('\n\n');

        this.insertBlock(block);
        this.uploading.update((count) => count + valid.length);

        await Promise.all(
            valid.map(async (file, index) => {
                const marker = markers[index];
                let replacement = '';

                try {
                    const url = await upload(file);
                    replacement = `![](${url})`;
                } catch {
                    this.uploadError.set('wiki.input.uploadError');
                }

                const area = this.areaRef().nativeElement;
                const at = area.value.indexOf(marker);

                if (at !== -1) {
                    const { selectionStart, selectionEnd } = area;
                    this.replaceRange(at, at + marker.length, replacement);
                    const shift = replacement.length - marker.length;
                    const fix = (position: number): number => (position > at ? position + shift : position);

                    // Курсор после одиночной картинки встаёт в подпись — её стоит написать.
                    if (mode === 'image' && replacement && valid.length === 1) {
                        area.setSelectionRange(at + 2, at + 2);
                    } else {
                        area.setSelectionRange(fix(selectionStart), fix(selectionEnd));
                    }
                }

                this.uploading.update((count) => count - 1);
            })
        );
    }

    /**
     * Обработка меню «/»: стираем набранное и выполняем действие.
     */
    private runSlash(state: SuggestState, command: WikiCommand): void {
        const area = this.areaRef().nativeElement;
        this.replaceRange(state.from - 1, area.selectionStart, '');
        this.suggest.set(null);
        this.run(command.id);
    }

    /**
     * Открывает, обновляет или закрывает подсказку по тексту перед курсором.
     *
     * @param force Открыть ссылочную подсказку, даже если запрос пуст.
     */
    private updateSuggest(force = false): void {
        const area = this.areaRef().nativeElement;
        const caret = area.selectionStart;

        if (caret !== area.selectionEnd) {
            this.suggest.set(null);
            return;
        }

        const lineStart = area.value.lastIndexOf('\n', caret - 1) + 1;
        const before = area.value.slice(lineStart, caret);
        const slash = /^\/([\p{L}\d]{0,20})$/u.exec(before);
        const link = /\[\[(#?[^\]|\n:]{0,40})$/.exec(before);
        let state: Pick<SuggestState, 'kind' | 'from' | 'query'> | null = null;

        if (slash) {
            state = { kind: 'slash', from: lineStart + 1, query: slash[1] };
        } else if (link && (force || link[1].length > 0 || before.endsWith('[['))) {
            state = { kind: 'link', from: caret - link[1].length, query: link[1] };
        }

        if (!state) {
            this.suggest.set(null);
            return;
        }

        const previous = this.suggest();

        if (!previous || previous.kind !== state.kind || previous.from !== state.from) {
            this.suggestIndex.set(0);
        }

        const point = caretCoordinates(area, state.from);
        const caretTop = point.top - area.scrollTop;
        const below = caretTop + point.height + 4;
        const spaceBelow = area.clientHeight - below;
        // Внизу поля тесно — открываем над строкой.
        const above = spaceBelow < 240 && caretTop > spaceBelow;
        const left = Math.max(8, Math.min(point.left, area.clientWidth - 312));

        this.suggest.set({
            ...state,
            top: above ? null : below,
            bottom: above ? area.clientHeight - caretTop + 4 : null,
            left,
            maxHeight: Math.min(352, (above ? caretTop : spaceBelow) - 8),
        });

        if (this.suggestIndex() >= this.suggestItems().length) {
            this.suggestIndex.set(0);
        }
    }

    private updateCaret(): void {
        const area = this.areaRef().nativeElement;
        const before = area.value.slice(0, area.selectionStart);
        const line = before.split('\n').length;
        const column = area.selectionStart - (before.lastIndexOf('\n') + 1) + 1;
        const previous = this.caret().line;

        this.caret.set({ line, column, selected: Math.abs(area.selectionEnd - area.selectionStart) });

        if (line !== previous) {
            this.caretLine.emit(line - 1);
        }
    }

    private selectRange(start: number, end: number): void {
        const area = this.areaRef().nativeElement;
        area.setSelectionRange(start, end);

        const point = caretCoordinates(area, start);

        if (point.top < area.scrollTop + 20 || point.top > area.scrollTop + area.clientHeight - 40) {
            area.scrollTop = Math.max(0, point.top - area.clientHeight / 3);
            this.onScroll();
        }

        this.updateCaret();
    }

    /**
     * Пересчёт позиций строк — после ввода и изменения размера, не чаще раза в 120 мс.
     */
    private scheduleMeasure(): void {
        if (!this.isBrowser) {
            return;
        }

        if (this.measureTimer) {
            clearTimeout(this.measureTimer);
        }

        this.measureTimer = setTimeout(() => {
            this.measureTimer = null;
            const area = this.areaRef().nativeElement;

            if (area.isConnected && area.clientWidth > 0) {
                this.gutter.set(lineOffsets(area));
                this.viewHeight.set(area.clientHeight);
            }
        }, 120);
    }

    /**
     * Заменяет диапазон текста с сохранением истории отмены.
     */
    private replaceRange(start: number, end: number, text: string): void {
        const area = this.areaRef().nativeElement;
        area.focus({ preventScroll: true });
        area.setSelectionRange(start, end);

        // execCommand устарел, но только он вставляет текст в textarea, не ломая Ctrl+Z.
        const inserted = typeof document.execCommand === 'function' && document.execCommand('insertText', false, text);

        if (!inserted || area.value.slice(start, start + text.length) !== text) {
            area.setRangeText(text, start, end, 'end');
        }

        // Курсор — сразу после вставки (Chrome при пустой вставке у конца строки ставит его раньше).
        area.setSelectionRange(start + text.length, start + text.length);
        this.emit();
    }

    private sample(key: string): string {
        return this.i18n.translate(`wiki.sample.${key}`);
    }

    private emit(): void {
        const text = this.areaRef().nativeElement.value;

        if (text !== this.value()) {
            this.value.set(text);
        }
    }
}
