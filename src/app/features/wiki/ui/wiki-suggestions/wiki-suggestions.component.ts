import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { grpcStatusCode } from '@shared/lib/grpc-status-code.function';
import { GrpcCode } from '@shared/lib/grpc-code.constant';
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
    private readonly confirm = inject(ConfirmDialogService);

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
     * Показать, что статья изменилась после предложения.
     */
    protected readonly showSince = signal(false);

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

        return proposal
            ? renderWikiMarkdown(proposal.body, {
                  // Ссылка [[player:id]] показывает текущий ник: id не меняется при смене ника.
                  resolvePlayer: (id) => this.authorNames.name(id),
              })
            : null;
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
     * Статья, от которой считаются изменения предложения.
     *
     * Сервер хранит у правки снимок статьи на момент предложения (`base`).
     * Без него (старые предложения) сравниваем с текущей статьёй, как раньше:
     * иначе правки редактора, сделанные после предложения, выглядели бы как
     * удаления, которые сделал игрок.
     *
     * @param suggestion Предложение из списка.
     */
    protected base(suggestion: WikiSuggestion): WikiArticle | null {
        return suggestion.base ?? this.target(suggestion);
    }

    /**
     * Правка написана от версии, которая на сервере уже неактуальна.
     *
     * @param suggestion Предложение из списка.
     */
    protected isStale(suggestion: WikiSuggestion): boolean {
        const target = this.target(suggestion);

        return (
            suggestion.kind === 'edit' &&
            !!suggestion.proposal &&
            !!target &&
            (suggestion.baseVersion === 0 || target.version !== suggestion.baseVersion)
        );
    }

    /**
     * Устаревшее предложение без снимка: показать, что изменилось с тех пор, нельзя.
     *
     * @param suggestion Предложение из списка.
     */
    protected canShowSince(suggestion: WikiSuggestion): boolean {
        return suggestion.base !== null && !!this.target(suggestion);
    }

    /**
     * Второе сравнение: что изменилось в статье после предложения игрока.
     *
     * @param suggestion Предложение из списка.
     */
    protected sinceDiff(suggestion: WikiSuggestion): readonly ReviewDiffLine[] {
        const base = suggestion.base;
        const target = this.target(suggestion);

        if (!base || !target) {
            return [];
        }

        return lineDiff(base.body, target.body).map((line, index) => ({ ...line, number: index + 1 }));
    }

    /**
     * Поля, которые предложение меняет.
     *
     * Текст статьи сюда не входит: он сравнивается построчно ниже, а здесь —
     * всё остальное, чтобы редактор сразу видел, что затронуто.
     */
    protected readonly fieldChanges = computed<readonly WikiFieldChange[]>(() => {
        const current = this.current();

        return compareWikiArticles(current ? this.base(current) : null, current?.proposal ?? null);
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

        // От базы предложения, а не от текущей статьи: правки редактора после
        // предложения не должны выглядеть как удаления игрока.
        const before = current.articleId ? (this.base(current)?.body ?? '') : '';
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

        // Ники для ссылок [[player:id]] догружаем по мере появления в тексте.
        effect(() => {
            const ids = this.proposedRender()?.playerIds ?? [];

            untracked(() => void this.authorNames.resolve(ids));
        });
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
        this.showSince.set(false);
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
        const stale = this.isStale(suggestion);

        // Устаревшую правку сервер без разрешения не применит: спрашиваем.
        if (stale && !(await this.askStale())) {
            return;
        }

        this.busy.set(suggestion.id);
        this.error.set(null);

        try {
            await this.store.approveSuggestion(suggestion.id, stale);
            this.opened.set(null);
            await this.reload();
        } catch (error) {
            const code = grpcStatusCode(error);

            if (code === GrpcCode.aborted) {
                // Статью сохранили между загрузкой очереди и нажатием:
                // предложение не потеряно, но решать нужно по свежему тексту.
                this.error.set('wiki.review.staleNow');

                if (suggestion.articleId) {
                    await this.store.refresh(suggestion.articleId);
                }

                await this.reload();
            } else if (code === GrpcCode.failedPrecondition) {
                this.error.set('wiki.review.alreadyReviewed');
                await this.reload();
            } else {
                this.error.set('wiki.admin.review.approveFailed');
            }
        } finally {
            this.busy.set(null);
        }
    }

    /**
     * Спрашивает подтверждение перед одобрением устаревшей правки.
     */
    private askStale(): Promise<boolean> {
        return firstValueFrom(
            this.confirm.open({
                title: this.i18n.translate('wiki.review.staleConfirmTitle'),
                text: this.i18n.translate('wiki.review.staleConfirm'),
            })
        );
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
