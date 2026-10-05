import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    input,
    signal,
} from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { ScrollAnchorDirective } from '../../directives/scroll-anchor.directive';

/**
 * Номер пункта в начале параграфа: «5.1.1» или «5.1.1.».
 */
const RULE_NUMBER_PATTERN = /^(\d+(?:\.\d+)+)\.?$/;

/**
 * Уже занятые автоматические якоря.
 *
 * Параграфы вычисляют якоря в одном проходе отрисовки, до обновления DOM,
 * поэтому проверка через `getElementById` не ловит повторяющиеся номера.
 */
const claimedAnchors = new Set<string>();

/**
 * Компонент параграфа правила.
 *
 * Если параграф начинается с номера пункта (`<b>5.1.1</b>`), получает якорь
 * `rule-5-1-1` и кнопку копирования ссылки на этот пункт.
 */
@Component({
    selector: 'app-rule-paragraph',
    standalone: true,
    imports: [ScrollAnchorDirective, TuiIcon, TranslatePipe],
    templateUrl: './rule-paragraph.component.html',
    styleUrl: '../../styles/rules.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuleParagraphComponent {
    /**
     * Идентификатор якоря для прокрутки.
     *
     * Если указан, на этот элемент можно выполнить прокрутку.
     */
    public readonly anchor = input<string>();

    /**
     * Дополнительные CSS классы.
     */
    public readonly customClass = input<string>('');

    /**
     * Уровень вложенности (для отступа).
     *
     * 0 - без отступа
     * 1 - 2rem
     * 2 - 4rem
     * 3 - 5rem
     * 4 - 6rem
     */
    public readonly level = input<number>(0);

    /**
     * Хост-элемент компонента.
     */
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    /**
     * Якорь, вычисленный из номера пункта.
     */
    private readonly autoAnchor = signal<string | null>(null);

    /**
     * Ссылка только что скопирована.
     */
    protected readonly copied = signal(false);

    /**
     * Итоговый id параграфа: явный якорь важнее автоматического.
     */
    protected readonly paragraphId = computed(() => this.anchor() || this.autoAnchor());

    /**
     * Возвращает CSS класс отступа по уровню вложенности.
     */
    protected readonly indentClass = computed(() => {
        const level = this.level();
        const classes = [
            '', // level 0 - без отступа
            'pl-6!', // level 1 - 1.5rem
            'pl-10!', // level 2 - 2.5rem
            'pl-14!', // level 3 - 3.5rem
            'pl-16!', // level 4 - 4rem
            'pl-20!', // level 5 - 5rem
        ];
        return classes[level] || '';
    });

    /**
     * Возвращает CSS классы параграфа.
     */
    protected readonly paragraphClasses = computed(() => {
        const classes = ['rule-paragraph'];

        const indent = this.indentClass();
        if (indent) {
            classes.push(indent);
        }

        const customClass = this.customClass();
        if (customClass) {
            classes.push(customClass);
        }

        return classes.join(' ');
    });

    constructor() {
        afterNextRender(() => this.detectNumber());

        inject(DestroyRef).onDestroy(() => {
            const id = this.autoAnchor();
            if (id) {
                claimedAnchors.delete(id);
            }
        });
    }

    /**
     * Копирует ссылку на пункт и подставляет якорь в адресную строку.
     *
     * @param event Клик по кнопке.
     */
    protected async copyLink(event: MouseEvent): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        const id = this.paragraphId();
        if (!id) {
            return;
        }

        // Путь указываем целиком: голый `#hash` разрешается относительно <base href="/">.
        const path = `${window.location.pathname}${window.location.search}#${encodeURIComponent(id)}`;
        const url = `${window.location.origin}${path}`;
        window.history.replaceState(window.history.state, '', path);

        try {
            await navigator.clipboard.writeText(url);
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 2000);
        } catch {
            this.copied.set(false);
        }
    }

    /**
     * Ищет номер пункта в первом `<b>` параграфа и строит из него якорь.
     */
    private detectNumber(): void {
        if (this.anchor()) {
            return;
        }

        const paragraph = this.host.nativeElement.querySelector('.rule-paragraph');
        const bold = paragraph?.querySelector('b');
        const number = bold?.textContent?.trim() ?? '';
        const match = RULE_NUMBER_PATTERN.exec(number);

        if (!paragraph || !match || !paragraph.textContent?.trim().startsWith(number)) {
            return;
        }

        const id = `rule-${match[1].replace(/\./g, '-')}`;
        if (claimedAnchors.has(id) || document.getElementById(id)) {
            return;
        }

        claimedAnchors.add(id);
        this.autoAnchor.set(id);
    }
}
