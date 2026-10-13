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
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { WikiStoreService } from '../../api/wiki-store.service';
import { WikiArticle, WikiAuthorNameService, WikiSectionId, WikiStatus } from '@entities/wiki';
import { WIKI_SECTIONS } from '../../lib/wiki-sections.constant';
import { WikiSuggestionsComponent } from '../wiki-suggestions/wiki-suggestions.component';

/**
 * Вкладка «Вики» в админке: список статей, поиск, фильтры и переход в редактор.
 */
@Component({
    standalone: true,
    selector: 'app-wiki-admin-panel',
    imports: [TuiIcon, TranslatePipe, FormsModule, RouterLink, WikiSuggestionsComponent],
    templateUrl: './wiki-admin-panel.component.html',
    styleUrl: './wiki-admin-panel.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WikiAdminPanelComponent {
    private readonly store = inject(WikiStoreService);
    private readonly i18n = inject(I18nService);
    private readonly confirm = inject(ConfirmDialogService);
    private readonly authorNames = inject(WikiAuthorNameService);

    protected readonly sections = WIKI_SECTIONS;
    protected readonly query = signal('');
    /**
     * Что открыто: список статей или очередь предложений.
     */
    protected readonly tab = signal<'articles' | 'review'>('articles');

    /**
     * Удаление не удалось — показываем, а не молчим.
     */
    protected readonly deleteError = signal(false);

    protected readonly status = signal<WikiStatus | 'all'>('all');
    protected readonly section = signal<WikiSectionId | 'all'>('all');

    protected readonly all = this.store.articles;

    protected readonly counts = computed(() => ({
        all: this.all().length,
        published: this.all().filter((article) => article.status === 'published').length,
        draft: this.all().filter((article) => article.status === 'draft').length,
    }));

    /**
     * Есть несохранённая новая статья.
     */
    protected readonly pendingNew = computed(() => {
        this.all();
        return !!this.store.autosave('new');
    });

    protected readonly articles = computed(() => {
        const query = this.query().toLowerCase().trim();
        const status = this.status();
        const section = this.section();

        return this.all().filter(
            (article) =>
                (status === 'all' || article.status === status) &&
                (section === 'all' || article.sectionId === section) &&
                (!query ||
                    article.title.toLowerCase().includes(query) ||
                    article.slug.includes(query) ||
                    article.tags.some((tag) => tag.includes(query)))
        );
    });

    constructor() {
        // Список статей приезжает с сервера вместе с черновиками: сервер знает,
        // что мы редактор.
        afterNextRender(() => void this.store.load());

        // Сервер хранит id автора, а показываем имя.
        effect(() => {
            const ids = this.all().flatMap((article) => [article.createdBy, article.authorName]);

            untracked(() => void this.authorNames.resolve(ids));
        });
    }

    /**
     * Подпись автора и последнего редактора, если это другой человек.
     *
     * @param article Статья из списка.
     * @returns Имена через стрелку или пустая строка, пока имена не пришли.
     */
    protected authors(article: WikiArticle): string {
        const author = this.authorNames.label(article.createdBy);
        const editor = article.authorName !== article.createdBy ? this.authorNames.label(article.authorName) : '';

        return editor ? `${author} → ${editor}` : author;
    }

    protected words(article: WikiArticle): number {
        return article.body.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
    }

    protected hasAutosave(article: WikiArticle): boolean {
        return !!this.store.autosave(article.id);
    }

    protected sectionLabel(id: string): string {
        return this.i18n.translate(`wiki.sections.${id}`);
    }

    protected sectionIcon(id: string): string {
        return WIKI_SECTIONS.find((section) => section.id === id)?.icon ?? '@tui.file';
    }

    protected date(value: string): string {
        return new Intl.DateTimeFormat(this.i18n.language() === 'en' ? 'en-GB' : 'ru-RU', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value));
    }

    protected cover(article: WikiArticle): string | null {
        return article.cover ? `url(${JSON.stringify(article.cover.url)})` : null;
    }

    protected remove(article: WikiArticle): void {
        this.confirm
            .open({
                title: this.i18n.translate('wiki.confirm.delete.title'),
                text: this.i18n.translate('wiki.admin.deleteText', { title: article.title }),
            })
            .subscribe((ok) => {
                if (ok) {
                    void this.deleteArticle(article.id);
                }
            });
    }

    /**
     * Удаляет статью и обновляет список.
     *
     * Ждём ответ сервера: список, обновлённый до него, показывал бы статью
     * удалённой, хотя запрос ещё мог не дойти.
     *
     * @param id Идентификатор статьи.
     */
    private async deleteArticle(id: string): Promise<void> {
        this.deleteError.set(false);

        try {
            await this.store.remove(id);
            await this.store.load();
        } catch {
            this.deleteError.set(true);
        }
    }
}
