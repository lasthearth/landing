import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { LfgPost, lfgActivity } from '@entities/lfg';
import { IPlayer, PlayerChipComponent } from '@entities/user';
import { ClockService } from '@shared/lib/clock';
import { formatCountdown } from '@shared/lib/relative-time';
import { ShareButtonComponent } from '@shared/ui/share-button/share-button.component';
import { LfgContactComponent } from '../lfg-contact/lfg-contact.component';
import { TuiIcon } from '@taiga-ui/core';

/**
 * Кто смотрит на объявление.
 */
export interface LfgViewer {
    /**
     * Идентификатор вошедшего игрока или `null` для гостя.
     */
    userId: string | null;
    /**
     * Прошёл ли игрок проверку анкеты (только такие откликаются).
     */
    verified: boolean;
}

/**
 * Карточка разового похода: занятие, когда, кто собирает, кто уже идёт,
 * кнопка отклика и контакт автора, если он есть.
 */
@Component({
    selector: 'app-lfg-post-card',
    templateUrl: './lfg-post-card.component.html',
    styleUrl: './lfg-post-card.component.less',
    imports: [TuiIcon, TranslatePipe, PlayerChipComponent, ShareButtonComponent, LfgContactComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LfgPostCardComponent {
    private readonly clock = inject(ClockService);
    private readonly i18n = inject(I18nService);

    public readonly post = input.required<LfgPost>();
    public readonly viewer = input.required<LfgViewer>();
    /**
     * Игроки по идентификатору (ник, аватар, онлайн).
     */
    public readonly players = input<Record<string, IPlayer>>({});
    public readonly highlighted = input(false);
    public readonly busy = input(false);

    public readonly respond = output<void>();
    public readonly closePost = output<void>();
    public readonly signIn = output<void>();

    protected readonly activities = computed(() => this.post().activities.map(lfgActivity));

    /**
     * Начало похода (у похода оно всегда есть; запасной вариант — публикация).
     */
    private readonly start = computed(() => this.post().startsAt ?? this.post().createdAt);

    /**
     * Уже идёт ли сбор.
     */
    protected readonly live = computed(() => this.start().getTime() <= this.clock.now());

    /**
     * Обратный отсчёт до начала.
     */
    protected readonly countdown = computed(() =>
        formatCountdown(this.start().getTime() - this.clock.now(), this.i18n.language())
    );

    /**
     * Время начала: «сегодня, 19:30» или «сб, 10 октября, 19:30».
     */
    protected readonly when = computed(() => {
        const start = this.start();
        const sameDay = new Date(this.clock.now()).toDateString() === start.toDateString();
        return new Intl.DateTimeFormat(this.i18n.language(), {
            ...(sameDay ? {} : { weekday: 'short', day: 'numeric', month: 'long' }),
            hour: '2-digit',
            minute: '2-digit',
        }).format(start);
    });

    protected readonly isAuthor = computed(() => this.viewer().userId === this.post().authorId);
    protected readonly joined = computed(() => {
        const uid = this.viewer().userId;
        return !!uid && this.post().responders.includes(uid);
    });
    protected readonly full = computed(() => this.post().responders.length >= this.post().slots);

    /**
     * Пустые места для полосы мест.
     */
    protected readonly freeSlots = computed(() =>
        Array.from({ length: Math.max(0, this.post().slots - this.post().responders.length) })
    );

    /**
     * Игрок по идентификатору (пока ник не загружен — заглушка).
     *
     * @param userId Идентификатор.
     * @returns Игрок.
     */
    protected playerOf(userId: string): IPlayer {
        return (
            this.players()[userId] ?? {
                user_id: userId,
                user_game_name: '…',
                avatar: { original: '', x96: '', x48: '' },
                is_online: false,
            }
        );
    }
}
