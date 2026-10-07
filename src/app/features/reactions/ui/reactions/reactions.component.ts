import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, signal } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import {
    REACTION_EMOJIS,
    REACTION_GROUPS,
    ReactionEmoji,
    ReactionEmojiDef,
    ReactionGroupKey,
    reactionGlyph,
    ReactionTarget,
    ReactionTargetKind,
} from '@entities/reaction';
import { TuiIcon } from '@taiga-ui/core';
import { ReactionsStoreService } from '../../api/reactions-store.service';
import { RecentReactionsService } from '../../api/recent-reactions.service';

/**
 * Вкладка выбора: недавние или группа.
 */
type PickerTab = 'recent' | ReactionGroupKey;

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
     * Недавние реакции этого браузера.
     */
    private readonly recent = inject(RecentReactionsService);

    /**
     * Группы для вкладок выбора.
     */
    protected readonly groups = REACTION_GROUPS;

    /**
     * Выбранная вкладка (`null` — по умолчанию: недавние, если они есть).
     */
    private readonly chosenTab = signal<PickerTab | null>(null);

    /**
     * Открытая вкладка выбора.
     */
    protected readonly tab = computed<PickerTab>(
        () => this.chosenTab() ?? (this.recent.items().length ? 'recent' : 'emotions')
    );

    /**
     * Есть ли недавние реакции (иначе вкладку не показываем).
     */
    protected readonly hasRecent = computed(() => this.recent.items().length > 0);

    /**
     * Реакции открытой вкладки.
     */
    protected readonly tabEmojis = computed((): readonly ReactionEmojiDef[] => {
        const tab = this.tab();
        if (tab === 'recent') {
            return this.recent.items().map((key) => ({ key, glyph: reactionGlyph(key) }));
        }
        return REACTION_GROUPS.find((group) => group.key === tab)?.emojis ?? [];
    });

    /**
     * Реакция под курсором или фокусом — её название в подвале выбора.
     */
    protected readonly hovered = signal<ReactionEmojiDef | null>(null);

    /**
     * Реакции цели.
     */
    private readonly reactions = computed(() => this.store.get(this.target()));

    /**
     * Поставленные реакции: ненулевые или свои. Популярные первыми,
     * при равенстве — в порядке каталога.
     */
    protected readonly shown = computed(() => {
        const { counts, mine } = this.reactions();

        return REACTION_EMOJIS.map((emoji, order) => ({
            ...emoji,
            order,
            count: counts[emoji.key] ?? 0,
            mine: mine.includes(emoji.key),
        }))
            .filter((emoji) => emoji.count > 0 || emoji.mine)
            .sort((a, b) => b.count - a.count || a.order - b.order);
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
        if (!this.reactions().mine.includes(emoji)) {
            this.recent.remember(emoji);
        }
        this.store.toggle(this.target(), emoji);
    }

    /**
     * Переключает вкладку выбора.
     *
     * @param tab Вкладка.
     * @param event Клик (не закрываем выбор и не идём по ссылке карточки).
     */
    protected selectTab(tab: PickerTab, event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.chosenTab.set(tab);
        this.hovered.set(null);
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
        this.chosenTab.set(null);
        this.hovered.set(null);
    }

    /**
     * Закрывает выбор по клику вне компонента.
     *
     * @param event Клик в документе.
     */
    protected onDocumentClick(event: MouseEvent): void {
        // composedPath: переключение вкладки убирает нажатую кнопку из DOM до этого обработчика.
        if (this.pickerOpen() && !event.composedPath().includes(this.host.nativeElement)) {
            this.pickerOpen.set(false);
        }
    }
}
