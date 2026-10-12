import { afterNextRender, ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { WikiSuggestion, WikiSuggestionStatus, WikiAuthorNameService, WikiArticle, WikiDraft } from '@entities/wiki';
import { WikiStoreService } from '../../api/wiki-store.service';
import { lineDiff, DiffLine } from '../../lib/line-diff.function';
import { compareWikiArticles, WikiFieldChange } from '../../lib/compare-wiki-articles.function';
import { renderWikiMarkdown } from '../../lib/render-wiki-markdown.function';
import { WikiArticleViewComponent } from '../wiki-article-view/wiki-article-view.component';

/**
 * Что показывать в очереди.
 */
type ReviewFilter = WikiSuggestionStatus | 'all';

/**
 * Строка сравнения с подписью позиции.
 */
interface ReviewDiffLine extends DiffLine {
    readonly number: number;
}

/**
 * Очередь предложений игроков.
 *
 * Решение принимается не по заголовку: редактор открывает предложение и видит
 * статью целиком — так, как её написал игрок, — и построчное сравнение с тем,
 * что сейчас опубликовано. Одобрение применяет предложение на сервере, отказ
 * требует причину, которую увидит автор.
 */
@Component({
    selector: 'app-wiki-suggestions',
    imports: [EmptyStateComponent, TranslatePipe, TuiIcon, WikiArticleViewComponent],
    templateUrl: './wiki-suggestions.component.html',
    styleUrl: './wiki-suggestions.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WikiSuggestionsComponent {
    private readonly store = inject(WikiStoreService);
    private readonly i18n = inject(I18nService);
    private readonly authorNames = inject(WikiAuthorNameService);

    /**
     * Фильтры очереди.
     */
    protected readonly filters: readonly ReviewFilter[] = ['pending', 'all', 'approved', 'rejected'];

    /**
     * Загруженные предложения.
     */
    private readonly items = signal<readonly WikiSuggestion[]>([]);

    /**
     * Выбранный фильтр.
     */
    protected readonly filter = signal<ReviewFilter>('pending');

    /**
     * Идёт загрузка очереди.
     */
    protected readonly loading = signal(false);

    /**
     * Идёт решение по предложению.
     */
    protected readonly busy = signal<string | null>(null);

    /**
     * Ошибка последнего действия.
     */
    protected readonly error = signal<string | null>(null);

    /**
     * Открытое для просмотра предложение.
     */
    protected readonly opened = signal<string | null>(null);

    /**
     * Окно отклонения открыто для предложения с этим id.
     */
    protected readonly rejecting = signal<string | null>(null);

    /**
     * Причина отказа в окне.
     */
    protected readonly reason = signal('');

    /**
     * Сколько предложений в каждом состоянии.
     */
    protected readonly counts = computed(() => ({
        all: this.items().length,
        pending: this.items().filter((item) => item.status === 'pending').length,
        approved: this.items().filter((item) => item.status === 'approved').length,
        rejected: this.items().filter((item) => item.status === 'rejected').length,
    }));

    /**
     * Предложения выбранного состояния.
     */
    protected readonly visible = computed(() => {
        const filter = this.filter();

        return filter === 'all' ? this.items() : this.items().filter((item) => item.status === filter);
    });

    /**
     * Предложение, открытое в просмотре.
     */
    private readonly current = computed(() => this.items().find((item) => item.id === this.opened()) ?? null);

    /**
     * Предложенная статья в виде, который понимает просмотр.
     */
    protected readonly proposedDraft = computed<WikiDraft | null>(() => {
        const proposal = this.current()?.proposal;

        if (!proposal) {
            return null;
        }

        return {
            title: proposal.title,
            slug: proposal.slug,
            sectionId: proposal.sectionId,
            lead: proposal.lead,
            cover: proposal.cover,
            tags: proposal.tags,
            gameVersion: proposal.gameVersion,
            quickAnswer: proposal.quickAnswer,
            related: proposal.related,
            body: proposal.body,
        };
    });

    /**
     * Разобранный текст предложения — то, что увидит читатель после одобрения.
     */
    protected readonly proposedRender = computed(() => {
        const proposal = this.current()?.proposal;

        return proposal ? renderWikiMarkdown(proposal.body) : null;
    });

    /**
     * Статья, которую предложение меняет; для новой статьи — `null`.
     *
     * @param suggestion Предложение из списка.
     */
    protected target(suggestion: WikiSuggestion): WikiArticle | null {
        return suggestion.articleId ? this.store.get(suggestion.articleId) : null;
    }

    /**
     * Поля, которые предложение меняет.
     *
     * Текст статьи сюда не входит: он сравнивается построчно ниже, а здесь —
     * всё остальное, чтобы редактор сразу видел, что затронуто.
     */
    protected readonly fieldChanges = computed<readonly WikiFieldChange[]>(() => {
        const current = this.current();

        return compareWikiArticles(current ? this.target(current) : null, current?.proposal ?? null);
    });

    /**
     * Подпись поля для таблицы изменений.
     *
     * @param key Имя поля.
     */
    protected fieldLabel(key: string): string {
        return this.i18n.translate(`wiki.review.field.${key}`);
    }

    /**
     * Раздел в читаемом виде — идентификатор ничего не говорит редактору.
     *
     * @param value Идентификатор или текст.
     */
    protected fieldValue(key: string, value: string): string {
        if (key !== 'sectionId' || !value) {
            return value || '—';
        }

        return this.i18n.translate(`wiki.sections.${value}`);
    }

    /**
     * Сравнение «как было» и «как предложено».
     *
     * Для новой статьи сравнивать не с чем, поэтому строки идут как добавленные.
     */
    protected readonly diff = computed<readonly ReviewDiffLine[]>(() => {
        const current = this.current();

        if (!current?.proposal) {
            return [];
        }

        const before = this.current()?.articleId ? (this.store.get(this.current()!.articleId)?.body ?? '') : '';
        const lines = lineDiff(before, current.proposal.body);

        return lines.map((line, index) => ({ ...line, number: index + 1 }));
    });

    /**
     * Сколько строк добавлено и удалено.
     */
    protected readonly diffStats = computed(() => ({
        added: this.diff().filter((line) => line.kind === 'add').length,
        removed: this.diff().filter((line) => line.kind === 'del').length,
    }));

    constructor() {
        afterNextRender(() => void this.reload());
    }

    /**
     * Перезагружает очередь предложений.
     */
    public async reload(): Promise<void> {
        this.loading.set(true);
        this.error.set(null);

        try {
            this.items.set(await firstValueFrom(this.store.suggestions()));

            // Имена авторов — по тем, кто есть в очереди.
            await this.authorNames.resolve(this.items().map((item) => item.authorName));
        } catch {
            this.error.set('wiki.admin.review.approveFailed');
        } finally {
            this.loading.set(false);
        }
    }

    /**
     * Открывает или закрывает просмотр предложения.
     *
     * @param suggestion Предложение.
     */
    protected toggle(suggestion: WikiSuggestion): void {
        this.opened.update((current) => (current === suggestion.id ? null : suggestion.id));
        this.error.set(null);
    }

    /**
     * Игровое имя автора предложения.
     *
     * @param suggestion Предложение.
     */
    protected authorLabel(suggestion: WikiSuggestion): string {
        return this.authorNames.label(suggestion.authorName);
    }

    /**
     * Подпись состояния предложения.
     *
     * @param status Состояние.
     */
    protected statusLabel(status: WikiSuggestionStatus): string {
        return this.i18n.translate(`wiki.admin.review.status${status.charAt(0).toUpperCase()}${status.slice(1)}`);
    }

    /**
     * Подпись вида предложения.
     *
     * @param kind Вид.
     */
    protected kindLabel(kind: WikiSuggestion['kind']): string {
        return this.i18n.translate(kind === 'edit' ? 'wiki.admin.review.kindEdit' : 'wiki.admin.review.kindNew');
    }

    /**
     * Подпись фильтра.
     *
     * @param filter Фильтр.
     */
    protected filterLabel(filter: ReviewFilter): string {
        return filter === 'all' ? this.i18n.translate('wiki.admin.review.all') : this.statusLabel(filter);
    }

    /**
     * Дата предложения в читаемом виде.
     *
     * @param value Дата в ISO.
     */
    protected dateLabel(value: string): string {
        if (!value) {
            return '';
        }

        return new Intl.DateTimeFormat(this.i18n.language() === 'en' ? 'en-GB' : 'ru-RU', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value));
    }

    /**
     * Одобряет предложение.
     *
     * @param suggestion Предложение.
     */
    protected async approve(suggestion: WikiSuggestion): Promise<void> {
        this.busy.set(suggestion.id);
        this.error.set(null);

        try {
            await this.store.approveSuggestion(suggestion.id);
            this.opened.set(null);
            await this.reload();
        } catch {
            this.error.set('wiki.admin.review.approveFailed');
        } finally {
            this.busy.set(null);
        }
    }

    /**
     * Открывает окно отклонения.
     *
     * @param suggestion Предложение.
     */
    protected openReject(suggestion: WikiSuggestion): void {
        this.rejecting.set(suggestion.id);
        this.reason.set('');
        this.error.set(null);
    }

    /**
     * Закрывает окно отклонения.
     */
    protected closeReject(): void {
        this.rejecting.set(null);
        this.reason.set('');
    }

    /**
     * Отклоняет предложение с причиной.
     */
    protected async confirmReject(): Promise<void> {
        const id = this.rejecting();
        const reason = this.reason().trim();

        if (!id) {
            return;
        }

        if (!reason) {
            this.error.set('wiki.admin.review.reasonRequired');

            return;
        }

        this.busy.set(id);
        this.error.set(null);

        try {
            await firstValueFrom(this.store.rejectSuggestion(id, reason));
            this.closeReject();
            this.opened.set(null);
            await this.reload();
        } catch {
            this.error.set('wiki.admin.review.rejectFailed');
        } finally {
            this.busy.set(null);
        }
    }
}
