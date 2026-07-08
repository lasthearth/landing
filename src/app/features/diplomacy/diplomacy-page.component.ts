import { DatePipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    inject,
    PLATFORM_ID,
    signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TuiIcon } from '@taiga-ui/core';
import { GameChatMessage } from '@features/game-chat/model/game-chat-message';
import { GameChatService } from '@features/game-chat/services/game-chat.service';
import { environment } from '@core/config/environments/environment';
import { TranslatePipe } from '@core/i18n';

/**
 * Максимальное количество отображаемых заявлений.
 */
const MAX_STATEMENTS = 100;

/**
 * Сортирует сообщения по времени от новых к старым.
 *
 * @param messages Список сообщений.
 * @returns Отсортированный список.
 */
function sortMessagesByTimeDesc(messages: GameChatMessage[]): GameChatMessage[] {
    return [...messages].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

/**
 * Страница дипломатии.
 *
 * Отображает заявления глав селений из Discord-канала дипломатии
 * в виде крупных стилизованных карточек.
 */
@Component({
    selector: 'app-diplomacy-page',
    standalone: true,
    imports: [DatePipe, TuiIcon, TranslatePipe],
    templateUrl: './diplomacy-page.component.html',
    styleUrl: './diplomacy-page.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiplomacyPageComponent {
    /**
     * Идентификатор Discord-канала дипломатии.
     */
    protected readonly channelId: string = environment.discordDiplomacyChannelId;

    /**
     * Сервис игрового чата.
     */
    private readonly chatService = inject(GameChatService);

    /**
     * Идентификатор платформы.
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Ссылка уничтожения компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Список заявлений.
     */
    protected readonly statements = signal<GameChatMessage[]>([]);

    /**
     * Признак загрузки.
     */
    protected readonly isLoading = signal(true);

    /**
     * Текст ошибки загрузки.
     */
    protected readonly error = signal<string | null>(null);

    /**
     * Отсортированные заявления для отображения.
     */
    protected readonly visibleStatements = computed(() =>
        sortMessagesByTimeDesc(this.statements()).slice(0, MAX_STATEMENTS)
    );

    public constructor() {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const cached = this.chatService.getCachedMessages(this.channelId);

        if (cached) {
            this.statements.set(sortMessagesByTimeDesc(cached));
            this.isLoading.set(false);
        }

        this.chatService
            .watchChat$(this.channelId, 50)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (freshMessages) => {
                    this.updateStatements(freshMessages);
                    this.isLoading.set(false);
                },
                error: () => {
                    this.error.set('Не удалось загрузить заявления.');
                    this.isLoading.set(false);
                },
            });
    }

    /**
     * Обновляет список заявлений, избегая дубликатов.
     *
     * @param freshMessages Свежие сообщения из Discord.
     */
    private updateStatements(freshMessages: GameChatMessage[]): void {
        if (freshMessages.length === 0) {
            return;
        }

        this.statements.update((current) => {
            const merged = [...freshMessages, ...current];
            const unique = Array.from(new Map(merged.map((m) => [m.id, m])).values());

            return sortMessagesByTimeDesc(unique).slice(0, MAX_STATEMENTS);
        });
    }
}
