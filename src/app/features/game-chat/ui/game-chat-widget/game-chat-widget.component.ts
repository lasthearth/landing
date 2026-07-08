import { DatePipe, NgClass } from '@angular/common';
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

/**
 * Максимальное количество сообщений в виджете.
 */
const MAX_MESSAGES = 100;

/**
 * Ключ для хранения настройки звука чата.
 */
const SOUND_ENABLED_KEY = 'lh_game_chat_sound_enabled';

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
    imports: [DatePipe, NgClass, TuiIcon],
    templateUrl: './game-chat-widget.component.html',
    styleUrl: './game-chat-widget.component.css',
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
     * Количество новых сообщений, полученных в свёрнутом состоянии.
     */
    protected readonly unreadCount = signal(0);

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
     * Признак того, что пользователь прокрутил вверх и не видит новые сообщения.
     */
    private readonly isScrolledUp = signal(false);

    /**
     * Аудио-контекст для звуковых уведомлений.
     */
    private readonly audioContext: AudioContext | null = null;

    /**
     * Отфильтрованные сообщения для отображения.
     */
    protected readonly visibleMessages = computed(() => {
        const list = this.messages();

        return sortMessagesByTime(list).slice(-MAX_MESSAGES);
    });

    public constructor() {
        this.isSoundEnabled.set(this.loadSoundSetting());

        if (isPlatformBrowser(this.platformId)) {
            this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
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
            this.scrollToBottomAfterRender();
        }

        this.chatService
            .watchChat$(channelId, 50)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((freshMessages) => {
                this.updateMessages(freshMessages);
            });

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

            this.unreadCount.set(0);
            this.isScrolledUp.set(false);
            this.scrollToBottomAfterRender();

            return true;
        });
    }

    /**
     * Переключает звуковые уведомления и сохраняет настройку.
     */
    protected toggleSound(): void {
        this.isSoundEnabled.update((value) => {
            const newValue = !value;

            if (isPlatformBrowser(this.platformId)) {
                localStorage.setItem(SOUND_ENABLED_KEY, JSON.stringify(newValue));
            }

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
        const currentIds = new Set(this.messages().map((message) => message.id));
        const newMessages = freshMessages.filter((message) => !currentIds.has(message.id));

        if (newMessages.length === 0) {
            return;
        }

        this.messages.update((current) => {
            const merged = [...newMessages, ...current];
            const unique = Array.from(new Map(merged.map((m) => [m.id, m])).values());

            return sortMessagesByTime(unique).slice(-MAX_MESSAGES);
        });

        if (!this.isExpanded()) {
            this.unreadCount.update((count) => count + newMessages.length);
        } else {
            this.isScrolledUp.set(false);
            this.scrollToBottomAfterRender();
        }

        if (this.isSoundEnabled() && this.soundEnabled()) {
            this.playNotificationSound();
        }
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
    }

    /**
     * Загружает настройку звука из localStorage.
     *
     * @returns `true`, если звук включён (по умолчанию).
     */
    private loadSoundSetting(): boolean {
        if (!isPlatformBrowser(this.platformId)) {
            return true;
        }

        const stored = localStorage.getItem(SOUND_ENABLED_KEY);

        return stored === null ? true : stored === 'true';
    }
}
