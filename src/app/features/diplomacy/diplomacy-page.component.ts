import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    PLATFORM_ID,
    signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, tap } from 'rxjs';
import { TuiIcon } from '@taiga-ui/core';
import { GameChatMessage } from '@features/game-chat/model/game-chat-message';
import { GameChatService } from '@features/game-chat/services/game-chat.service';
import { environment } from '@core/config/environments/environment';
import { TranslatePipe } from '@core/i18n';
import { renderNewsMarkdown } from '@shared/lib/news-markdown';
import { stripDiscordTokens } from '@shared/lib/discord-markup';
import { DiplomacyStatement } from './model/diplomacy-statement';
import { DiplomacyCardComponent } from './ui/diplomacy-card/diplomacy-card.component';

/**
 * Максимум заявлений, которые держим в памяти.
 */
const MAX_STATEMENTS = 100;

/**
 * Сколько заявлений сетки показывать сразу.
 */
const INITIAL_COUNT = 6;

/**
 * Сколько добавляет «Показать ещё».
 */
const STEP = 6;

/**
 * Сколько авторов показывать в фильтре.
 */
const MAX_AUTHORS = 8;

/**
 * Сортирует сообщения от новых к старым.
 *
 * @param messages Сообщения.
 * @returns Новый отсортированный массив.
 */
function sortMessagesByTimeDesc(messages: GameChatMessage[]): GameChatMessage[] {
    return [...messages].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Лента дипломатических заявлений из Discord-канала.
 *
 * Самое свежее заявление крупно, остальные — сеткой в две колонки с кнопкой
 * «Показать ещё». Фильтр по автору. Discord-разметка (жирный, спойлеры, списки)
 * сохраняется — тот же рендер, что у новостей. По ссылке `/diplomacy#statement-<id>`
 * страница находит заявление, раскрывает и подсвечивает его.
 */
@Component({
    selector: 'app-diplomacy-page',
    standalone: true,
    imports: [TuiIcon, TranslatePipe, DiplomacyCardComponent],
    templateUrl: './diplomacy-page.component.html',
    styleUrl: './diplomacy-page.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiplomacyPageComponent {
    protected readonly channelId: string = environment.discordDiplomacyChannelId;
    private readonly chatService = inject(GameChatService);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly destroyRef = inject(DestroyRef);
    private readonly route = inject(ActivatedRoute);

    /**
     * Сырые сообщения канала.
     */
    protected readonly statements = signal<GameChatMessage[]>([]);

    /**
     * Идёт загрузка.
     */
    protected readonly isLoading = signal(true);

    /**
     * Текст ошибки.
     */
    protected readonly error = signal<string | null>(null);

    /**
     * Выбранный автор или null — все.
     */
    protected readonly authorFilter = signal<string | null>(null);

    /**
     * Сколько заявлений сетки показано.
     */
    protected readonly visibleCount = signal(INITIAL_COUNT);

    /**
     * Идентификатор заявления из ссылки (раскрыть и подсветить).
     */
    protected readonly targetId = signal<string | null>(null);

    /**
     * Заявления в виде для ленты.
     */
    private readonly allStatements = computed<DiplomacyStatement[]>(() =>
        sortMessagesByTimeDesc(this.statements())
            .map((message) => ({ message, source: stripDiscordTokens(message.content) }))
            .filter(({ source }) => source.length > 0)
            .slice(0, MAX_STATEMENTS)
            .map(({ message, source }) => ({
                id: message.id,
                author: message.author,
                html: renderNewsMarkdown(source),
                timestamp: message.timestamp,
            }))
    );

    /**
     * Авторы для фильтра (самые активные), с количеством заявлений.
     */
    protected readonly authors = computed(() => {
        const counts = new Map<string, number>();

        for (const statement of this.allStatements()) {
            counts.set(statement.author, (counts.get(statement.author) ?? 0) + 1);
        }

        return [...counts.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, MAX_AUTHORS);
    });

    /**
     * Заявления после фильтра.
     */
    private readonly filtered = computed(() => {
        const author = this.authorFilter();
        return author ? this.allStatements().filter((statement) => statement.author === author) : this.allStatements();
    });

    /**
     * Самое свежее заявление.
     */
    protected readonly featured = computed(() => this.filtered()[0] ?? null);

    /**
     * Показанные заявления сетки.
     */
    protected readonly rest = computed(() => this.filtered().slice(1, 1 + this.visibleCount()));

    /**
     * Сколько заявлений ещё скрыто.
     */
    protected readonly hiddenCount = computed(() => Math.max(0, this.filtered().length - 1 - this.visibleCount()));

    /**
     * Есть ли что показать.
     */
    protected readonly hasStatements = computed(() => this.allStatements().length > 0);

    public constructor() {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const fragment = this.route.snapshot.fragment;
        this.targetId.set(fragment?.startsWith('statement-') ? fragment.slice('statement-'.length) : null);

        const cached = this.chatService.getCachedMessages(this.channelId);

        if (cached) {
            this.statements.set(sortMessagesByTimeDesc(cached));
            this.isLoading.set(false);
            this.revealTarget();
        }

        this.chatService
            .fetchAllMessages$(this.channelId)
            .pipe(
                tap((allMessages) => {
                    this.statements.set(sortMessagesByTimeDesc(allMessages));
                    this.isLoading.set(false);
                    this.revealTarget();
                }),
                switchMap(() => this.chatService.watchChat$(this.channelId, 50)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (freshMessages) => {
                    this.updateStatements(freshMessages);
                },
                error: () => {
                    this.error.set('Не удалось загрузить заявления.');
                    this.isLoading.set(false);
                },
            });
    }

    /**
     * Включает или снимает фильтр по автору.
     *
     * @param author Автор.
     */
    protected toggleAuthor(author: string | null): void {
        this.authorFilter.set(this.authorFilter() === author ? null : author);
        this.visibleCount.set(INITIAL_COUNT);
    }

    /**
     * Показывает следующую порцию заявлений.
     */
    protected showMore(): void {
        this.visibleCount.update((count) => count + STEP);
    }

    /**
     * Делает видимым заявление из ссылки и прокручивает к нему.
     */
    private revealTarget(): void {
        const id = this.targetId();

        if (!id) {
            return;
        }

        const index = this.allStatements().findIndex((statement) => statement.id === id);

        if (index < 0) {
            return;
        }

        if (index > this.visibleCount()) {
            this.visibleCount.set(index);
        }

        setTimeout(() => document.getElementById(`statement-${id}`)?.scrollIntoView({ block: 'center' }), 50);
    }

    /**
     * Добавляет свежие сообщения без дублей.
     *
     * @param freshMessages Новые сообщения.
     */
    private updateStatements(freshMessages: GameChatMessage[]): void {
        if (freshMessages.length === 0) {
            return;
        }

        this.statements.update((current) => {
            const merged = [...freshMessages, ...current];
            const unique = Array.from(new Map(merged.map((m) => [m.id || `${m.timestamp}:${m.author}`, m])).values());

            return sortMessagesByTimeDesc(unique).slice(0, MAX_STATEMENTS);
        });
    }
}
