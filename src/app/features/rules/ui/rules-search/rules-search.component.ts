import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { inject } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { ScrollService } from '../../services/scroll.service';
import { RulesSearchResult } from './rules-search-result';

/**
 * Минимальная длина запроса для поиска.
 */
const MIN_QUERY_LENGTH = 2;

/**
 * Сколько результатов показывать в выпадающем списке.
 */
const MAX_RESULTS = 8;

/**
 * Символов контекста до совпадения.
 */
const CONTEXT_BEFORE = 50;

/**
 * Символов контекста после совпадения.
 */
const CONTEXT_AFTER = 110;

/**
 * Номер пункта в начале текста параграфа.
 */
const LEADING_NUMBER_PATTERN = /^(\d+(?:\.\d+)+)\.?\s*/;

/**
 * Приводит текст к виду для сравнения: нижний регистр, «ё» → «е».
 *
 * Длина строки не меняется, поэтому индексы совпадают с исходным текстом.
 *
 * @param value Исходный текст.
 */
function normalize(value: string): string {
    return value.toLowerCase().replace(/ё/g, 'е');
}

/**
 * Поиск по пунктам правил.
 *
 * Ищет прямо по отрисованным параграфам (свёрнутые секции тоже есть в DOM),
 * поэтому всегда совпадает с текущим языком и текстом страницы.
 */
@Component({
    selector: 'app-rules-search',
    standalone: true,
    imports: [TuiIcon, TranslatePipe],
    templateUrl: './rules-search.component.html',
    styleUrl: './rules-search.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesSearchComponent {
    /**
     * Контейнер, внутри которого ищутся параграфы.
     */
    public readonly container = input.required<HTMLElement>();

    /**
     * Сервис прокрутки правил.
     */
    private readonly scrollService = inject(ScrollService);

    /**
     * Текст запроса.
     */
    protected readonly query = signal('');

    /**
     * Открыт ли список результатов.
     */
    protected readonly open = signal(false);

    /**
     * Индекс выделенного с клавиатуры результата.
     */
    protected readonly activeIndex = signal(0);

    /**
     * Все найденные параграфы.
     */
    protected readonly allResults = computed(() => this.search(this.query()));

    /**
     * Результаты, которые помещаются в список.
     */
    protected readonly results = computed(() => this.allResults().slice(0, MAX_RESULTS));

    /**
     * Запрос достаточно длинный, чтобы искать.
     */
    protected readonly hasQuery = computed(() => this.query().trim().length >= MIN_QUERY_LENGTH);

    /**
     * Обрабатывает ввод в поле поиска.
     *
     * @param event Событие ввода.
     */
    protected onInput(event: Event): void {
        this.query.set((event.target as HTMLInputElement).value);
        this.activeIndex.set(0);
        this.open.set(true);
    }

    /**
     * Обрабатывает клавиши навигации по списку.
     *
     * @param event Событие клавиатуры.
     */
    protected onKeydown(event: KeyboardEvent): void {
        const count = this.results().length;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.open.set(true);
                this.activeIndex.set(count ? (this.activeIndex() + 1) % count : 0);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.activeIndex.set(count ? (this.activeIndex() - 1 + count) % count : 0);
                break;
            case 'Enter': {
                const result = this.results()[this.activeIndex()];
                if (result) {
                    event.preventDefault();
                    this.select(result);
                }
                break;
            }
            case 'Escape':
                if (this.open()) {
                    event.preventDefault();
                    this.open.set(false);
                } else {
                    this.clear();
                }
                break;
        }
    }

    /**
     * Очищает запрос.
     */
    protected clear(): void {
        this.query.set('');
        this.activeIndex.set(0);
    }

    /**
     * Переходит к найденному пункту.
     *
     * @param result Выбранный результат.
     */
    protected select(result: RulesSearchResult): void {
        this.open.set(false);

        if (result.element.id) {
            const { pathname, search } = window.location;
            window.history.replaceState(
                window.history.state,
                '',
                `${pathname}${search}#${encodeURIComponent(result.element.id)}`
            );
        }

        this.scrollService.scrollToNode(result.element);
    }

    /**
     * Ищет параграфы, содержащие запрос.
     *
     * Если запрос — номер пункта («5.2»), сначала идут пункты с таким номером.
     *
     * @param rawQuery Текст запроса.
     */
    private search(rawQuery: string): RulesSearchResult[] {
        const query = rawQuery.trim();
        if (query.length < MIN_QUERY_LENGTH) {
            return [];
        }

        const needle = normalize(query);
        const numberQuery = /^\d+(\.\d+)*\.?$/.test(query) ? query.replace(/\.$/, '') : null;
        const paragraphs = Array.from(this.container().querySelectorAll<HTMLElement>('.rule-paragraph'));
        const byNumber: RulesSearchResult[] = [];
        const byText: RulesSearchResult[] = [];

        for (const element of paragraphs) {
            const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
            const numberMatch = LEADING_NUMBER_PATTERN.exec(text);
            const number = numberMatch?.[1] ?? null;
            const body = numberMatch ? text.slice(numberMatch[0].length) : text;

            if (numberQuery && number && (number === numberQuery || number.startsWith(`${numberQuery}.`))) {
                byNumber.push(this.toResult(element, number, body, 0, 0));
                continue;
            }

            const index = normalize(body).indexOf(needle);
            if (index !== -1) {
                byText.push(this.toResult(element, number, body, index, needle.length));
            }
        }

        return [...byNumber, ...byText];
    }

    /**
     * Собирает результат с фрагментом текста вокруг совпадения.
     *
     * @param element Параграф.
     * @param number Номер пункта.
     * @param body Текст параграфа без номера.
     * @param index Начало совпадения.
     * @param length Длина совпадения.
     */
    private toResult(
        element: HTMLElement,
        number: string | null,
        body: string,
        index: number,
        length: number
    ): RulesSearchResult {
        const start = Math.max(0, index - CONTEXT_BEFORE);
        const end = Math.min(body.length, index + length + CONTEXT_AFTER);

        const sectionTitle = element.closest('app-rule-section')?.querySelector('.rule-section-title');

        return {
            element,
            section: (sectionTitle?.textContent ?? '').replace(/\s+/g, ' ').trim(),
            number,
            before: (start > 0 ? '…' : '') + body.slice(start, index),
            match: body.slice(index, index + length),
            after: body.slice(index + length, end) + (end < body.length ? '…' : ''),
        };
    }
}
