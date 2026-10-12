import { computed, inject, Injectable, signal } from '@angular/core';
import { LocalStorageService } from '@core/services/local-storage.service';
import { WikiArticle, WikiDraft, WikiRevision, WikiStatus } from '../model/wiki-article';

/**
 * Ключи хранилища.
 */
const KEYS = {
    articles: 'lh_wiki_articles',
    history: 'lh_wiki_history',
    autosave: 'lh_wiki_autosave',
} as const;

/**
 * Сколько снимков истории хранить на статью.
 */
const HISTORY_LIMIT = 40;

/**
 * Автосохранённый черновик редактора.
 */
export interface WikiAutosave {
    readonly draft: WikiDraft;
    readonly savedAt: string;
}

/**
 * Хранилище статей вики.
 *
 * Пока у вики нет API, статьи, история правок и автосохранения лежат
 * в localStorage браузера редактора. Интерфейс сервиса повторяет будущие
 * запросы (список, получить, сохранить, удалить, история), поэтому при
 * появлении бэкенда меняется только эта реализация, а редактор — нет.
 */
@Injectable({ providedIn: 'root' })
export class WikiStoreService {
    private readonly storage = inject(LocalStorageService);

    private readonly items = signal<readonly WikiArticle[]>(this.storage.getItem<WikiArticle[]>(KEYS.articles) ?? []);

    /**
     * Все статьи, свежие правки — первыми.
     */
    public readonly articles = computed(() =>
        [...this.items()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    );

    /**
     * Статья по id.
     *
     * @param id Id статьи.
     */
    public get(id: string): WikiArticle | null {
        return this.items().find((article) => article.id === id) ?? null;
    }

    /**
     * Статья по адресу.
     *
     * @param slug Адрес.
     */
    public bySlug(slug: string): WikiArticle | null {
        return this.items().find((article) => article.slug === slug) ?? null;
    }

    /**
     * Сохраняет статью и кладёт снимок в историю.
     *
     * @param id Id статьи (`null` — новая).
     * @param draft Поля статьи.
     * @param meta Статус, автор и комментарий к правке.
     * @returns Сохранённая статья.
     */
    public save(
        id: string | null,
        draft: WikiDraft,
        meta: { status: WikiStatus; authorName: string; note: string }
    ): WikiArticle {
        const now = new Date().toISOString();
        const previous = id ? this.get(id) : null;
        const article: WikiArticle = {
            ...draft,
            sectionId: draft.sectionId ?? 'start',
            id: previous?.id ?? newId(),
            status: meta.status,
            createdAt: previous?.createdAt ?? now,
            updatedAt: now,
            authorName: meta.authorName,
        };

        this.items.update((list) => [article, ...list.filter((item) => item.id !== article.id)]);
        this.storage.setItem(KEYS.articles, this.items());

        const history = this.readHistory();
        const revision: WikiRevision = { savedAt: now, authorName: meta.authorName, note: meta.note, article };
        history[article.id] = [revision, ...(history[article.id] ?? [])].slice(0, HISTORY_LIMIT);
        this.storage.setItem(KEYS.history, history);

        return article;
    }

    /**
     * Удаляет статью вместе с историей.
     *
     * @param id Id статьи.
     */
    public remove(id: string): void {
        this.items.update((list) => list.filter((item) => item.id !== id));
        this.storage.setItem(KEYS.articles, this.items());

        const history = this.readHistory();
        delete history[id];
        this.storage.setItem(KEYS.history, history);
        this.clearAutosave(id);
    }

    /**
     * История правок статьи, свежие — первыми.
     *
     * @param id Id статьи.
     */
    public history(id: string): readonly WikiRevision[] {
        return this.readHistory()[id] ?? [];
    }

    /**
     * Автосохранение редактора.
     *
     * @param key Id статьи или `new`.
     */
    public autosave(key: string): WikiAutosave | null {
        return this.storage.getItem<Record<string, WikiAutosave>>(KEYS.autosave)?.[key] ?? null;
    }

    /**
     * Запоминает несохранённое состояние редактора.
     *
     * @param key Id статьи или `new`.
     * @param draft Поля статьи.
     */
    public writeAutosave(key: string, draft: WikiDraft): void {
        const all = this.storage.getItem<Record<string, WikiAutosave>>(KEYS.autosave) ?? {};
        all[key] = { draft, savedAt: new Date().toISOString() };
        this.storage.setItem(KEYS.autosave, all);
    }

    /**
     * Забывает автосохранение.
     *
     * @param key Id статьи или `new`.
     */
    public clearAutosave(key: string): void {
        const all = this.storage.getItem<Record<string, WikiAutosave>>(KEYS.autosave);

        if (all && key in all) {
            delete all[key];
            this.storage.setItem(KEYS.autosave, all);
        }
    }

    private readHistory(): Record<string, WikiRevision[]> {
        return this.storage.getItem<Record<string, WikiRevision[]>>(KEYS.history) ?? {};
    }
}

/**
 * Случайный id статьи.
 */
function newId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
