import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, signal } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { REACTION_EMOJIS, ReactionEmoji, ReactionTarget, ReactionTargetKind } from '@entities/reaction';
import { TuiIcon } from '@taiga-ui/core';
import { ReactionsStoreService } from '../../api/reactions-store.service';

/**
 * Реакции под контентом: поставленные реакции со счётчиками и кнопка выбора новой.
 *
 * `<app-reactions kind="news" [contentId]="id" />`. Счётчики запрашиваются пачкой
 * для всех карточек страницы (см. {@link ReactionsStoreService}). Гостю клик по
 * реакции предлагает войти.
 */
@Component({
    selector: 'app-reactions',
    templateUrl: './reactions.component.html',
    styleUrl: './reactions.component.less',
    imports: [TuiIcon, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'app-reactions',
        '[class.app-reactions--surface]': "tone() === 'surface'",
        '(document:click)': 'onDocumentClick($event)',
        '(document:keydown.escape)': 'pickerOpen.set(false)',
    },
})
export class ReactionsComponent {
    /**
     * Хранилище реакций.
     */
    private readonly store = inject(ReactionsStoreService);

    /**
     * Корневой элемент (для закрытия выбора по клику снаружи).
     */
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    /**
     * Вид контента.
     */
    public readonly kind = input.required<ReactionTargetKind>();

    /**
     * Идентификатор новости, заявления или события.
     */
    public readonly contentId = input.required<string>();

    /**
     * Цель: `news:<id>`, `diplomacy:<id>` или `event:<id>`.
     */
    protected readonly target = computed((): ReactionTarget => `${this.kind()}:${this.contentId()}`);

    /**
     * Оформление: `overlay` — поверх тёмной обложки карточки, `surface` — на панели страницы.
     */
    public readonly tone = input<'overlay' | 'surface'>('overlay');

    /**
     * Открыт ли выбор реакции.
     */
    protected readonly pickerOpen = signal(false);

    /**
     * Все реакции (для выбора).
     */
    protected readonly emojis = REACTION_EMOJIS;

    /**
     * Реакции цели.
     */
    private readonly reactions = computed(() => this.store.get(this.target()));

    /**
     * Поставленные реакции: ненулевые или свои, в фиксированном порядке.
     */
    protected readonly shown = computed(() => {
        const { counts, mine } = this.reactions();

        return REACTION_EMOJIS.map((emoji) => ({
            ...emoji,
            count: counts[emoji.key] ?? 0,
            mine: mine.includes(emoji.key),
        })).filter((emoji) => emoji.count > 0 || emoji.mine);
    });

    /**
     * Свои реакции (для подсветки в выборе).
     */
    protected readonly mine = computed(() => this.reactions().mine);

    public constructor() {
        effect(() => this.store.watch(this.target()));
    }

    /**
     * Ставит или снимает реакцию.
     *
     * @param emoji Реакция.
     * @param event Клик (не даём ему дойти до ссылки карточки).
     */
    protected toggle(emoji: ReactionEmoji, event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.pickerOpen.set(false);
        this.store.toggle(this.target(), emoji);
    }

    /**
     * Открывает или закрывает выбор реакции.
     *
     * @param event Клик.
     */
    protected togglePicker(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.pickerOpen.update((open) => !open);
    }

    /**
     * Закрывает выбор по клику вне компонента.
     *
     * @param event Клик в документе.
     */
    protected onDocumentClick(event: MouseEvent): void {
        if (this.pickerOpen() && !this.host.nativeElement.contains(event.target as Node)) {
            this.pickerOpen.set(false);
        }
    }
}
