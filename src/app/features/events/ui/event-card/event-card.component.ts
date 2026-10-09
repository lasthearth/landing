import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    inject,
    input,
    output,
    signal,
    untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService, TranslatePipe } from '@core/i18n';
import { CalendarEvent, EventApiService } from '@entities/event';
import { IPlayer, PlayerChipComponent, UserService } from '@entities/user';
import { ReactionsComponent } from '@features/reactions';
import { ClockService } from '@shared/lib/clock';
import { renderNewsMarkdown } from '@shared/lib/news-markdown';
import { formatCountdown } from '@shared/lib/relative-time';
import { ImageLoaderComponent } from '@shared/ui/image-loader/image-loader.component';
import { ShareButtonComponent } from '@shared/ui/share-button/share-button.component';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, of, switchMap } from 'rxjs';
import { eventStatus } from '../../lib/event-status.function';

/**
 * Карточка события в календаре.
 *
 * Дата крупным блоком слева, состояние («через 2 дня», «идёт сейчас»), время,
 * место, описание, кто идёт и кнопка «Пойду», реакции, «В календарь» и «Поделиться».
 * Администратору — «Изменить» и «Удалить».
 */
@Component({
    selector: 'app-event-card',
    templateUrl: './event-card.component.html',
    styleUrl: './event-card.component.less',
    imports: [
        TuiIcon,
        TranslatePipe,
        ImageLoaderComponent,
        ShareButtonComponent,
        ReactionsComponent,
        PlayerChipComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCardComponent {
    /**
     * Переводы и язык форматирования дат.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Текущее время (обновляется раз в минуту).
     */
    private readonly clock = inject(ClockService);

    private readonly api = inject(EventApiService);
    private readonly userService = inject(UserService);
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Событие.
     */
    public readonly event = input.required<CalendarEvent>();

    /**
     * Подсветить карточку (переход по ссылке на событие).
     */
    public readonly highlighted = input(false);

    /**
     * Показывать кнопки администратора.
     */
    public readonly canManage = input(false);

    /**
     * Вошёл ли пользователь.
     */
    public readonly authed = input(false);

    /**
     * Записан ли игрок на событие.
     */
    public readonly attending = input(false);

    /**
     * Идёт запрос записи.
     */
    public readonly busy = input(false);

    /**
     * Игроки по идентификатору (для аватаров записавшихся).
     */
    public readonly players = input<Record<string, IPlayer>>({});

    /**
     * Нажата «Пойду» или «Не пойду».
     */
    public readonly toggleAttendance = output<void>();

    /**
     * Гость нажал «Войти и записаться».
     */
    public readonly signIn = output<void>();

    /**
     * Все записавшиеся, когда список раскрыт (`null` — свёрнут).
     */
    protected readonly everyone = signal<IPlayer[] | null>(null);

    /**
     * Список всех записавшихся загружается.
     */
    protected readonly loadingEveryone = signal(false);

    /**
     * Записавшиеся сверх показанных аватарами.
     */
    protected readonly moreAttendees = computed(() =>
        Math.max(0, this.event().attendeeCount - this.event().attendeePreview.length)
    );

    public constructor() {
        // Записались или отписались — раскрытый список устарел, сворачиваем его.
        effect(() => {
            this.event().attendeeCount;
            untracked(() => this.everyone.set(null));
        });
    }

    /**
     * Нажата «В календарь».
     */
    public readonly addToCalendar = output<void>();

    /**
     * Нажата «Изменить».
     */
    public readonly edit = output<void>();

    /**
     * Нажата «Удалить».
     */
    public readonly remove = output<void>();

    /**
     * Состояние события.
     */
    protected readonly status = computed(() => eventStatus(this.event(), this.clock.now()));

    /**
     * Сколько осталось до начала («2 дня», «5 ч 12 мин»).
     */
    protected readonly countdown = computed(() =>
        formatCountdown(this.event().startsAt.getTime() - this.clock.now(), this.i18n.language())
    );

    /**
     * День месяца для блока даты.
     */
    protected readonly day = computed(() =>
        new Intl.DateTimeFormat(this.i18n.language(), { day: 'numeric' }).format(this.event().startsAt)
    );

    /**
     * Месяц для блока даты («окт.»).
     */
    protected readonly month = computed(() =>
        new Intl.DateTimeFormat(this.i18n.language(), { month: 'short' }).format(this.event().startsAt).replace('.', '')
    );

    /**
     * День недели для блока даты.
     */
    protected readonly weekday = computed(() =>
        new Intl.DateTimeFormat(this.i18n.language(), { weekday: 'short' }).format(this.event().startsAt)
    );

    /**
     * Время проведения: «сб, 10 октября, 18:00 – 20:00» или с датой окончания, если оно в другой день.
     */
    protected readonly timeRange = computed(() => {
        const { startsAt, endsAt } = this.event();
        const language = this.i18n.language();
        const start = new Intl.DateTimeFormat(language, {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
        }).format(startsAt);

        if (!endsAt) {
            return start;
        }

        const sameDay = endsAt.toDateString() === startsAt.toDateString();
        const end = new Intl.DateTimeFormat(
            language,
            sameDay
                ? { hour: '2-digit', minute: '2-digit' }
                : { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }
        ).format(endsAt);

        return `${start} – ${end}`;
    });

    /**
     * Описание в HTML.
     */
    protected readonly descriptionHtml = computed(() => renderNewsMarkdown(this.event().description));

    /**
     * Дата начала для атрибута `datetime`.
     */
    protected readonly startIso = computed(() => this.event().startsAt.toISOString());

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

    /**
     * Раскрывает или сворачивает список всех записавшихся.
     */
    protected toggleEveryone(): void {
        if (this.everyone()) {
            this.everyone.set(null);
            return;
        }
        if (this.loadingEveryone()) {
            return;
        }

        this.loadingEveryone.set(true);
        this.api
            .attendees(this.event().id)
            .pipe(
                switchMap(({ userIds }) => (userIds.length ? this.userService.getPlayersBatch$(userIds) : of([]))),
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((players) => {
                this.loadingEveryone.set(false);
                this.everyone.set(players ? players.filter(Boolean) : null);
            });
    }
}
