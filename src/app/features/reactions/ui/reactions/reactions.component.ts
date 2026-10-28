import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, signal } from '@angular/core';
import { I18nService, TranslatePipe } from '@core/i18n';
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
 * Сколько пилюль реакций показывать в ряду до кнопки «+N».
 *
 * На живой новости стоит почти весь каталог (48 реакций): ряд из тридцати пилюль
 * на каждой карточке ленты давал сотни слоёв с `backdrop-filter` и тормозил прокрутку.
 */
const MAX_VISIBLE_PILLS = 5;

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
     * Сервис переводов: подписи пилюль считаем сигналом, а не нечистым пайпом.
     */
    private readonly i18n = inject(I18nService);

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

    /**
     * Показан весь ряд реакций (кнопка «+N» нажата).
     */
    protected readonly expanded = signal(false);

    /**
     * Пилюли в ряду: {@link MAX_VISIBLE_PILLS} популярных, свои — всегда.
     *
     * Своя реакция не обязана войти в пятёрку: игрок видит то, что поставил.
     * Подпись считаем здесь, а не пайпом в шаблоне: `translate` нечистый, и две
     * привязки на пилюле вызывали его дважды на каждый проход проверки изменений.
     */
    protected readonly visible = computed(() => {
        const all = this.shown();
        let kept = all;

        if (!this.expanded() && all.length > MAX_VISIBLE_PILLS) {
            kept = [
                ...all.slice(0, MAX_VISIBLE_PILLS),
                ...all.slice(MAX_VISIBLE_PILLS).filter((emoji) => emoji.mine),
            ];
        }

        return kept.map((emoji) => ({ ...emoji, label: this.i18n.translate(`shared.reactions.${emoji.key}`) }));
    });

    /**
     * Сколько реакций спрятано за кнопкой «+N» (ноль, когда ряд раскрыт).
     */
    protected readonly hiddenCount = computed(() => this.shown().length - this.visible().length);

    /**
     * Есть ли что сворачивать: ряд раскрыт и длиннее лимита.
     *
     * Без этой проверки стрелка оставалась бы после того, как реакций стало мало.
     */
    protected readonly canCollapse = computed(() => this.expanded() && this.shown().length > MAX_VISIBLE_PILLS);

    /**
     * Подпись кнопки «+N».
     */
    protected readonly moreLabel = computed(() => this.i18n.translate('shared.reactions.more'));

    /**
     * Подпись кнопки сворачивания ряда.
     */
    protected readonly lessLabel = computed(() => this.i18n.translate('shared.reactions.less'));

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
     * Раскрывает или сворачивает полный ряд реакций.
     *
     * @param event Клик (не даём ему дойти до ссылки карточки).
     */
    protected toggleExpanded(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.expanded.update((value) => !value);
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
