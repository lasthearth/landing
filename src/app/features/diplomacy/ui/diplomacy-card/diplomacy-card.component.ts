import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    input,
    signal,
    viewChild,
} from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { ShareButtonComponent } from '@shared/ui/share-button';
import { DiplomacyStatement } from '../../model/diplomacy-statement';
import { ReactionsComponent } from '@features/reactions';

/**
 * Длительность анимации раскрытия, мс (совпадает с transition в стилях).
 */
const EXPAND_DURATION_MS = 320;

/**
 * Карточка дипломатического заявления.
 *
 * Длинный текст свёрнут с плавным затуханием; кнопка «Читать полностью»
 * появляется, только если текст не помещается, и раскрывает его на месте —
 * отдельной страницы у заявлений нет. У заявления есть ссылка `/diplomacy#<id>`.
 */
@Component({
    standalone: true,
    selector: 'app-diplomacy-card',
    imports: [TuiIcon, TranslatePipe, RelativeTimeComponent, ShareButtonComponent, ReactionsComponent],
    templateUrl: './diplomacy-card.component.html',
    styleUrl: './diplomacy-card.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiplomacyCardComponent {
    private readonly destroyRef = inject(DestroyRef);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    /**
     * Блок текста.
     */
    private readonly textRef = viewChild<ElementRef<HTMLElement>>('textEl');

    /**
     * Таймер снятия фиксированной высоты после анимации.
     */
    private expandTimer: ReturnType<typeof setTimeout> | undefined;

    /**
     * Заявление.
     */
    public readonly statement = input.required<DiplomacyStatement>();

    /**
     * Крупная карточка (самое свежее заявление).
     */
    public readonly featured = input<boolean>(false);

    /**
     * Раскрыть сразу (переход по ссылке на заявление).
     */
    public readonly initiallyExpanded = input<boolean>(false);

    /**
     * Подсветить карточку (переход по ссылке на заявление).
     */
    public readonly highlighted = input<boolean>(false);

    /**
     * Текст раскрыт.
     */
    protected readonly expanded = signal(false);

    /**
     * Текст не помещается — нужна кнопка раскрытия.
     */
    protected readonly canExpand = signal(false);

    /**
     * Высота на время анимации раскрытия.
     */
    protected readonly expandedHeight = signal<number | null>(null);

    public constructor() {
        afterNextRender(() => this.observeOverflow());

        effect(() => {
            if (this.initiallyExpanded()) {
                this.expanded.set(true);
            }
        });

        this.destroyRef.onDestroy(() => clearTimeout(this.expandTimer));
    }

    /**
     * Раскрывает или сворачивает текст.
     */
    protected toggle(): void {
        const text = this.textRef()?.nativeElement;

        if (!text) {
            return;
        }

        clearTimeout(this.expandTimer);

        if (!this.expanded()) {
            this.expandedHeight.set(text.scrollHeight);
            this.expanded.set(true);
            this.expandTimer = setTimeout(() => this.expandedHeight.set(null), EXPAND_DURATION_MS);
            return;
        }

        this.expanded.set(false);
        this.expandedHeight.set(null);

        const host = this.host.nativeElement;

        if (host.getBoundingClientRect().top < 0) {
            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            host.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
        }
    }

    /**
     * Следит, помещается ли текст в свёрнутую высоту.
     */
    private observeOverflow(): void {
        const text = this.textRef()?.nativeElement;

        if (!text) {
            return;
        }

        const check = (): void => {
            if (this.expanded()) {
                // В раскрытом виде кнопка «Свернуть» нужна, только если свёрнутый текст обрезался бы.
                this.canExpand.set(this.canExpand() || text.scrollHeight > this.collapsedHeight(text) + 2);
                return;
            }

            this.canExpand.set(text.scrollHeight - text.clientHeight > 2);
        };

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(check);
            observer.observe(text);
            this.destroyRef.onDestroy(() => observer.disconnect());
        }

        void document.fonts?.ready.then(check);
        check();
    }

    /**
     * Высота свёрнутого текста в пикселях (по max-height из стилей).
     *
     * @param text Блок текста.
     */
    private collapsedHeight(text: HTMLElement): number {
        const lines = Number(getComputedStyle(text).getPropertyValue('--diplomacy-lines')) || 6;
        const lineHeight = parseFloat(getComputedStyle(text).lineHeight) || 28;
        return lines * lineHeight;
    }
}
