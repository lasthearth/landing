import { NgClass } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    input,
    OnInit,
    PLATFORM_ID,
    signal,
    viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TuiIcon } from '@taiga-ui/core';
import { GameChatMessage } from '@features/game-chat/model/game-chat-message';
import { GameChatService } from '@features/game-chat/services/game-chat.service';
import { LocalStorageService } from '@core/services/local-storage.service';
import { I18nService, TranslatePipe } from '@core/i18n';
import { ClockService } from '@shared/lib/clock';
import { formatFullDate } from '@shared/lib/relative-time';
import { formatChatTime } from '@features/game-chat/lib/format-chat-time.function';
import { formatChatDay, startOfDay } from '@features/game-chat/lib/format-chat-day.function';
import { renderChatContent } from '@features/game-chat/lib/render-chat-content.function';
import { GameChatRow } from '@features/game-chat/model/game-chat-row';

/**
 * Максимальное количество сообщений в виджете.
 */
const MAX_MESSAGES = 100;

/**
 * Ключ для хранения настройки звука чата.
 */
const SOUND_ENABLED_KEY = 'lh_game_chat_sound_enabled';

/**
 * Ключ localStorage: время последнего прочитанного сообщения (мс).
 */
const LAST_READ_KEY = 'lh_game_chat_last_read';

/**
 * Допуск на расхождение часов игрока и Discord при решении «играть ли звук» (мс).
 */
const SOUND_CLOCK_SKEW = 5000;

/**
 * Сортирует сообщения по времени отправки от старых к новым.
 *
 * @param messages Список сообщений.
 * @returns Отсортированный список.
 */
function sortMessagesByTime(messages: GameChatMessage[]): GameChatMessage[] {
    return [...messages].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
}

/**
 * Проверяет, находится ли пользователь в самом низу списка сообщений.
 *
 * @param container Контейнер сообщений.
 * @returns `true`, если пользователь у нижнего края.
 */
function isScrolledToBottom(container: HTMLElement): boolean {
    const threshold = 80;
    const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;

    return distanceFromBottom <= threshold;
}

/**
 * Плавающий виджет Discord-канала.
 *
 * Отображает сообщения из выбранного Discord-канала (игровой чат, дипломатия и т.п.).
 * Поддерживает сворачивание, автоскролл, звуковые уведомления
 * и индикатор новых сообщений.
 */
@Component({
    selector: 'app-game-chat-widget',
    standalone: true,
    imports: [NgClass, TuiIcon, TranslatePipe],
    templateUrl: './game-chat-widget.component.html',
    styleUrl: './game-chat-widget.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameChatWidgetComponent implements OnInit {
    /**
     * Идентификатор канала Discord.
     */
    public readonly channelId = input.required<string>();

    /**
     * Заголовок виджета.
     */
    public readonly title = input.required<string>();

    /**
     * Иконка FAB-кнопки (Taiga UI).
     */
    public readonly icon = input<string>('@tui.message-square');

    /**
     * Признак включённых звуковых уведомлений.
     */
    public readonly soundEnabled = input<boolean>(true);

    /**
     * Сервис игрового чата.
     */
    private readonly chatService = inject(GameChatService);

    /**
     * Ссылка на контейнер сообщений для автоскролла.
     */
    private readonly messagesContainer = viewChild.required<ElementRef<HTMLElement>>('messagesContainer');

    /**
     * Идентификатор платформы.
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Сервис localStorage.
     * Обращения к хранилищу идут только через него: он сам защищён
     * от обращения в серверном окружении (SSR/prerender).
     */
    private readonly localStorage = inject(LocalStorageService);

    /**
     * Ссылка уничтожения компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Список сообщений чата.
     */
    protected readonly messages = signal<GameChatMessage[]>([]);

    /**
     * Признак развёрнутого состояния виджета.
     */
    protected readonly isExpanded = signal(false);


    /**
     * Признак загрузки старых сообщений.
     */
    protected readonly isLoadingMore = signal(false);

    /**
     * Признак того, что все сообщения загружены.
     */
    protected readonly allLoaded = signal(false);

    /**
     * Признак включённых звуковых уведомлений.
     */
    protected readonly isSoundEnabled = signal(true);

    /**
     * Признак того, что виджет прямо сейчас издал звук.
     * Используется для визуального индикатора источника звука.
     */
    protected readonly isSounding = signal(false);

    /**
     * Признак того, что пользователь прокрутил вверх и не видит новые сообщения.
     */
    private readonly isScrolledUp = signal(false);

    /**
     * Таймер сброса индикатора звука.
     */
    private soundIndicatorTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * Аудио-контекст для звуковых уведомлений.
     */
    private readonly audioContext: AudioContext | null = null;

    /**
     * Общие «часы» приложения — относительное время обновляется раз в минуту.
     */
    private readonly clock = inject(ClockService);

    /**
     * Сервис переводов.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Время последнего прочитанного сообщения (мс) или `null`, если чат ещё не открывали.
     */
    private readonly lastRead = signal<number | null>(null);

    /**
     * Когда открыта страница (мс) — сообщения старше считаются историей.
     */
    private readonly openedAt = Date.now();

    /**
     * Непрочитанные — сообщения новее последнего прочитанного, в том числе с прошлого визита.
     */
    protected readonly unreadCount = computed(() => {
        const lastRead = this.lastRead();

        if (this.isExpanded() || lastRead === null) {
            return 0;
        }

        return this.messages().filter((message) => new Date(message.timestamp).getTime() > lastRead).length;
    });

    /**
     * Отфильтрованные сообщения для отображения.
     */
    protected readonly visibleMessages = computed(() => {
        const list = this.messages();

        return sortMessagesByTime(list).slice(-MAX_MESSAGES);
    });

    /**
     * Строки чата: HTML текста, время и разделители дней.
     */
    protected readonly rows = computed<GameChatRow[]>(() => {
        const now = this.clock.now();
        const locale = this.i18n.language();
        const timeLabels = { now: this.i18n.translate('shared.gameChat.now') };
        const dayLabels = {
            today: this.i18n.translate('shared.gameChat.today'),
            yesterday: this.i18n.translate('shared.gameChat.yesterday'),
        };
        let previousDay: number | null = null;

        return this.visibleMessages().map((message) => {
            const date = new Date(message.timestamp);
            const valid = !Number.isNaN(date.getTime());
            const day = valid ? startOfDay(date) : null;
            const dayLabel = valid && day !== previousDay ? formatChatDay(date, now, locale, dayLabels) : null;
            previousDay = day;

            return {
                message,
                html: renderChatContent(message.content),
                time: valid ? formatChatTime(date, now, locale, timeLabels) : '',
                fullTime: valid ? formatFullDate(date, locale) : '',
                iso: valid ? date.toISOString() : null,
                dayLabel,
            };
        });
    });

    public constructor() {
        this.isSoundEnabled.set(this.localStorage.getItem<boolean>(SOUND_ENABLED_KEY) ?? true);

        const lastRead = Number(this.localStorage.getItem<number>(LAST_READ_KEY));
        this.lastRead.set(Number.isFinite(lastRead) && lastRead > 0 ? lastRead : null);

        if (isPlatformBrowser(this.platformId)) {
            this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }

        // Пока виджет раскрыт — частый опрос; свёрнутый виджет опрашивает раз в минуту
        // (только для счётчика непрочитанных).
        let releaseActivePolling: (() => void) | null = null;
        effect(() => {
            if (this.isExpanded()) {
                releaseActivePolling ??= this.chatService.requestActivePolling();
            } else {
                releaseActivePolling?.();
                releaseActivePolling = null;
            }
        });
        this.destroyRef.onDestroy(() => releaseActivePolling?.());

        // effect() требует контекст инъекции, поэтому создаётся здесь, а не в ngOnInit.
        effect(() => {
            const expanded = this.isExpanded();
            const list = this.messages();

            if (!expanded || list.length === 0) {
                return;
            }

            if (!this.isScrolledUp()) {
                this.scrollToBottomAfterRender();
            }
        });
    }

    /**
     * Инициализирует подписки после установки входных параметров.
     */
    public ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const channelId = this.channelId();

        if (!channelId) {
            return;
        }

        const cached = this.chatService.getCachedMessages(channelId);

        if (cached) {
            this.messages.set(sortMessagesByTime(cached));

            if (this.lastRead() === null) {
                this.markRead();
            }
            this.scrollToBottomAfterRender();
        }

        this.chatService
            .watchChat$(channelId, 50)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((freshMessages) => {
                this.updateMessages(freshMessages);
            });
    }

    /**
     * Обрабатывает прокрутку контейнера сообщений.
     *
     * @param event Событие прокрутки.
     */
    protected onScroll(event: Event): void {
        const element = event.target as HTMLElement;
        const isNearTop = element.scrollTop < 50;

        this.isScrolledUp.set(!isScrolledToBottom(element));

        if (isNearTop) {
            this.loadOlderMessages();
        }
    }

    /**
     * Переключает развёрнутое состояние виджета.
     */
    protected toggleExpanded(): void {
        this.isExpanded.update((value) => {
            if (value) {
                return false;
            }

            this.isScrolledUp.set(false);
            this.scrollToBottomAfterRender();
            this.markRead();

            return true;
        });
    }

    /**
     * Переключает звуковые уведомления и сохраняет настройку.
     */
    protected toggleSound(): void {
        this.isSoundEnabled.update((value) => {
            const newValue = !value;

            this.localStorage.setItem(SOUND_ENABLED_KEY, newValue);

            return newValue;
        });
    }

    /**
     * Подгружает старые сообщения при прокрутке вверх.
     */
    protected loadOlderMessages(): void {
        if (this.isLoadingMore() || this.allLoaded()) {
            return;
        }

        this.isLoadingMore.set(true);

        const firstMessage = this.messages()[0];
        const before = firstMessage?.id;

        this.chatService.fetchMessages$(this.channelId(), 50, before).subscribe({
            next: (page) => {
                if (page.messages.length === 0) {
                    this.allLoaded.set(true);
                } else {
                    this.messages.update((current) =>
                        sortMessagesByTime(page.messages.concat(current)).slice(-MAX_MESSAGES)
                    );
                    this.allLoaded.set(page.isLastPage);
                }

                this.isLoadingMore.set(false);
            },
            error: () => {
                this.isLoadingMore.set(false);
            },
        });
    }

    /**
     * Возвращает CSS-класс для типа сообщения.
     *
     * @param type Тип сообщения.
     * @returns CSS-класс.
     */
    protected getTypeClass(type: string): string {
        return `game-chat-message--${type}`;
    }

    /**
     * Обновляет список сообщений и счётчик непрочитанных.
     *
     * @param freshMessages Свежие сообщения из чата.
     */
    private updateMessages(freshMessages: GameChatMessage[]): void {
        const current = this.messages();
        const currentIds = new Set(current.map((message) => message.id));
        const newMessages = freshMessages.filter((message) => !currentIds.has(message.id));

        if (newMessages.length === 0) {
            return;
        }

        // Звук — только для сообщений, пришедших, пока страница открыта. История при загрузке
        // (в том числе догруженная поверх кэша) звучать не должна.
        const reallyNew = newMessages.some(
            (message) => new Date(message.timestamp).getTime() > this.openedAt - SOUND_CLOCK_SKEW
        );

        this.messages.update((current) => {
            const merged = [...newMessages, ...current];
            const unique = Array.from(new Map(merged.map((m) => [m.id, m])).values());

            return sortMessagesByTime(unique).slice(-MAX_MESSAGES);
        });

        if (this.isExpanded()) {
            this.isScrolledUp.set(false);
            this.scrollToBottomAfterRender();
            this.markRead();
        } else if (this.lastRead() === null) {
            // Чат ещё ни разу не открывали: не пугаем счётчиком на всю историю, считаем с этого момента.
            this.markRead();
        }

        if (reallyNew && this.isSoundEnabled() && this.soundEnabled()) {
            this.playNotificationSound();
        }
    }

    /**
     * Отмечает все загруженные сообщения прочитанными и запоминает это между визитами.
     */
    private markRead(): void {
        const newest = this.messages().reduce(
            (max, message) => Math.max(max, new Date(message.timestamp).getTime() || 0),
            this.lastRead() ?? 0
        );

        if (newest <= 0) {
            return;
        }

        this.lastRead.set(newest);
        this.localStorage.setItem(LAST_READ_KEY, newest);
    }

    /**
     * Прокручивает список сообщений к последнему после следующего рендера.
     */
    private scrollToBottomAfterRender(): void {
        requestAnimationFrame(() => {
            queueMicrotask(() => {
                this.scrollToBottom();
            });
        });
    }

    /**
     * Прокручивает список сообщений к последнему.
     */
    private scrollToBottom(): void {
        const container = this.messagesContainer()?.nativeElement;

        if (!container) {
            return;
        }

        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    }

    /**
     * Воспроизводит короткий звуковой сигнал при новом сообщении.
     */
    private playNotificationSound(): void {
        if (!this.audioContext) {
            return;
        }

        const context = this.audioContext;

        if (context.state === 'suspended') {
            context.resume().catch(() => {
                // Игнорируем ошибки автовоспроизведения.
            });
        }

        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(440, context.currentTime + 0.15);

        gainNode.gain.setValueAtTime(0.15, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.15);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start();
        oscillator.stop(context.currentTime + 0.15);

        this.flashSoundIndicator();
    }

    /**
     * Подсвечивает индикатор источника звука на несколько секунд.
     * Нужен, чтобы пользователь понимал, что сигнал издала эта вкладка.
     */
    private flashSoundIndicator(): void {
        this.isSounding.set(true);

        if (this.soundIndicatorTimer !== null) {
            clearTimeout(this.soundIndicatorTimer);
        }

        this.soundIndicatorTimer = setTimeout(() => {
            this.isSounding.set(false);
            this.soundIndicatorTimer = null;
        }, 2500);
    }
}
