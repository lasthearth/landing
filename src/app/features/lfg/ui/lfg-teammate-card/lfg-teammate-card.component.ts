import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { LFG_EXPERIENCES, LFG_PLAY_TIMES, LFG_WEEKDAYS, LfgPost, lfgActivity } from '@entities/lfg';
import { IPlayer, PlayerChipComponent } from '@entities/user';
import { ClockService } from '@shared/lib/clock';
import { formatCountdown } from '@shared/lib/relative-time';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { ShareButtonComponent } from '@shared/ui/share-button/share-button.component';
import { TuiIcon } from '@taiga-ui/core';
import { LfgContactComponent } from '../lfg-contact/lfg-contact.component';
import { LfgViewer } from '../lfg-post-card/lfg-post-card.component';

/**
 * Сколько заинтересовавшихся показывать аватарами, остальные — числом.
 */
const INTERESTED_SHOWN = 6;

/**
 * Миллисекунд в сутках.
 */
const DAY_MS = 86_400_000;

/**
 * Понедельник, от которого считаются короткие названия дней.
 */
const A_MONDAY = new Date(2024, 0, 1);

/**
 * Карточка поиска постоянного напарника: чем любит заниматься автор, когда
 * играет, опыт, голос, контакт и кто уже заинтересовался.
 */
@Component({
    selector: 'app-lfg-teammate-card',
    templateUrl: './lfg-teammate-card.component.html',
    styleUrl: './lfg-teammate-card.component.less',
    imports: [
        TuiIcon,
        TranslatePipe,
        PlayerChipComponent,
        ShareButtonComponent,
        RelativeTimeComponent,
        LfgContactComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LfgTeammateCardComponent {
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
    public readonly renew = output<void>();
    public readonly signIn = output<void>();

    protected readonly activities = computed(() => this.post().activities.map(lfgActivity));

    /**
     * Все дни недели с короткими названиями и отметкой, играет ли автор.
     */
    protected readonly days = computed(() => {
        const format = new Intl.DateTimeFormat(this.i18n.language(), { weekday: 'short' });
        const chosen = this.post().playDays;
        return LFG_WEEKDAYS.map((day) => ({
            day,
            label: format.format(new Date(A_MONDAY.getTime() + (day - 1) * DAY_MS)),
            active: chosen.includes(day),
        }));
    });

    protected readonly times = computed(() => LFG_PLAY_TIMES.filter((t) => this.post().playTimes.includes(t.value)));
    protected readonly experience = computed(() => LFG_EXPERIENCES.find((e) => e.value === this.post().experience));

    protected readonly isAuthor = computed(() => this.viewer().userId === this.post().authorId);
    protected readonly interested = computed(() => {
        const uid = this.viewer().userId;
        return !!uid && this.post().responders.includes(uid);
    });

    protected readonly shownResponders = computed(() => this.post().responders.slice(0, INTERESTED_SHOWN));
    protected readonly moreResponders = computed(() => Math.max(0, this.post().responders.length - INTERESTED_SHOWN));

    /**
     * Сколько ещё провисит объявление.
     */
    protected readonly expiresIn = computed(() => {
        const left = this.post().expiresAt.getTime() - this.clock.now();
        // Срок в днях округляем: сразу после продления это «14 дней», а не «13».
        if (left >= DAY_MS) {
            return new Intl.NumberFormat(this.i18n.language(), {
                style: 'unit',
                unit: 'day',
                unitDisplay: 'long',
            }).format(Math.round(left / DAY_MS));
        }
        return formatCountdown(left, this.i18n.language());
    });

    /**
     * Через сколько можно продлить (пустая строка — уже можно).
     */
    protected readonly renewIn = computed(() =>
        formatCountdown(this.post().bumpedAt.getTime() + DAY_MS - this.clock.now(), this.i18n.language())
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
