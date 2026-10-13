import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { WikiSuggestion, WikiSuggestionStatus } from '@entities/wiki';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { SkeletonComponent } from '@shared/ui/skeletons';
import { WikiStoreService } from '../../api/wiki-store.service';
import { renderWikiMarkdown } from '../../lib/render-wiki-markdown.function';

/**
 * Что показывает фильтр.
 */
type MineFilter = WikiSuggestionStatus | 'all';

/**
 * Сколько предложений игрок может держать на проверке.
 *
 * Совпадает с MaxPendingSuggestions в vsservice: при достижении лимита сервер
 * отвечает RESOURCE_EXHAUSTED, и кнопка «Предложить статью» гаснет сама.
 */
const PENDING_LIMIT = 5;

/**
 * Страница «Мои предложения» в профиле.
 *
 * Игрок видит, что у него на проверке, что одобрено и что отклонено — и почему.
 * Сервер отдаёт игроку только его предложения, поэтому фильтровать по автору не нужно.
 */
@Component({
    selector: 'app-my-suggestions',
    imports: [
        TranslatePipe,
        TuiIcon,
        RouterLink,
        EmptyStateComponent,
        ErrorStateComponent,
        PageHeaderComponent,
        RelativeTimeComponent,
        SkeletonComponent,
    ],
    templateUrl: './my-suggestions.component.html',
    styleUrl: './my-suggestions.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MySuggestionsComponent {
    private readonly store = inject(WikiStoreService);
    private readonly i18n = inject(I18nService);

    /**
     * Загруженные предложения игрока.
     */
    private readonly items = signal<readonly WikiSuggestion[]>([]);

    /**
     * Данные едут с сервера.
     */
    protected readonly loading = signal(true);

    /**
     * Загрузка не удалась — показываем состояние ошибки с повтором.
     */
    protected readonly failed = signal(false);

    /**
     * Выбранный фильтр.
     */
    protected readonly filter = signal<MineFilter>('all');

    /**
     * Ряд заглушек, пока список едет.
     */
    protected readonly skeletonRows: readonly number[] = [0, 1, 2];

    /**
     * Фильтры по состоянию проверки.
     */
    protected readonly filters: readonly MineFilter[] = ['all', 'pending', 'approved', 'rejected'];

    /**
     * Сколько предложений ждёт проверки.
     */
    protected readonly pending = computed(() => this.items().filter((item) => item.status === 'pending').length);

    /**
     * Лимит на проверке исчерпан: новое предложение отправить нельзя.
     */
    protected readonly limitReached = computed(() => this.pending() >= PENDING_LIMIT);

    /**
     * Сколько предложений в каждом состоянии.
     */
    protected readonly counts = computed(() => ({
        all: this.items().length,
        pending: this.pending(),
        approved: this.items().filter((item) => item.status === 'approved').length,
        rejected: this.items().filter((item) => item.status === 'rejected').length,
    }));

    /**
     * Предложения после фильтра, свежие — первыми.
     */
    protected readonly visible = computed(() => {
        const filter = this.filter();
        const list = filter === 'all' ? [...this.items()] : this.items().filter((item) => item.status === filter);

        return list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    });

    constructor() {
        void this.load();
    }

    /**
     * Читает предложения игрока и снимок статей.
     *
     * Снимок нужен для ссылок «Открыть статью»: по нему адрес статьи находится
     * без отдельного запроса.
     */
    protected async load(): Promise<void> {
        this.loading.set(true);
        this.failed.set(false);

        try {
            const [items] = await Promise.all([
                firstValueFrom(this.store.suggestions()),
                this.store.load(),
            ]);

            this.items.set(items);
        } catch {
            this.failed.set(true);
        } finally {
            this.loading.set(false);
        }
    }

    /**
     * Подпись фильтра.
     *
     * @param filter Фильтр по состоянию.
     */
    protected filterLabel(filter: MineFilter): string {
        return filter === 'all' ? this.i18n.translate('wiki.admin.review.all') : this.statusLabel(filter);
    }

    /**
     * Подпись состояния предложения — те же слова, что в очереди редактора.
     *
     * @param status Состояние проверки.
     */
    protected statusLabel(status: WikiSuggestionStatus): string {
        return this.i18n.translate(`wiki.admin.review.status${status.charAt(0).toUpperCase()}${status.slice(1)}`);
    }

    /**
     * Адрес статьи, к которой относится предложение.
     *
     * @param suggestion Предложение.
     */
    protected articleSlug(suggestion: WikiSuggestion): string {
        return this.store.get(suggestion.appliedArticleId)?.slug || suggestion.slug;
    }
}
