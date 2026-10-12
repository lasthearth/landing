import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { LocalStorageService } from '@core/services/local-storage.service';
import {
    WikiApiService,
    WikiArticle,
    WikiRevision,
    WikiSavePayload,
    WikiSuggestion,
    WikiSuggestionKind,
    WikiSuggestionStatus,
    WikiDraft,
    WikiStatus,
    mapRevisionFromDto,
} from '@entities/wiki';

/**
 * Ключ автосохранения редактора.
 *
 * Автосохранение осталось в браузере: это несохранённое состояние формы,
 * серверу оно не нужно, пока статью не сохранили.
 */
const AUTOSAVE_KEY = 'lh_wiki_autosave';

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
 * Читает статьи с сервера и держит их в сигнале, чтобы компоненты, которые
 * нарисованы под синхронную модель, продолжали работать: список, просмотр и
 * редактор читают снимок, а изменения уезжают на сервер асинхронно.
 *
 * Запись возвращает статью, как её сохранил сервер, поэтому вызывающий код
 * обязательно дожидается ответа — иначе он зафиксирует версию, которой ещё нет.
 */
@Injectable({ providedIn: 'root' })
export class WikiStoreService {
    private readonly api = inject(WikiApiService);
    private readonly storage = inject(LocalStorageService);

    /**
     * Загруженные статьи по идентификатору.
     */
    private readonly byId = signal<ReadonlyMap<string, WikiArticle>>(new Map());

    /**
     * История правок по идентификатору статьи.
     */
    private readonly revisions = signal<ReadonlyMap<string, readonly WikiRevision[]>>(new Map());

    /**
     * Идёт ли загрузка списка.
     */
    public readonly loading = signal(false);

    /**
     * Ошибка последней загрузки — показывается в интерфейсе.
     */
    public readonly error = signal<string | null>(null);

    /**
     * Все загруженные статьи, свежие правки — первыми.
     */
    public readonly articles = computed(() =>
        [...this.byId().values()].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    );

    /**
     * Статья по идентификатору из загруженного снимка.
     *
     * @param id Id статьи.
     */
    public get(id: string): WikiArticle | null {
        return this.byId().get(id) ?? null;
    }

    /**
     * Статья по адресу из загруженного снимка.
     *
     * @param slug Адрес статьи.
     */
    public bySlug(slug: string): WikiArticle | null {
        return this.articles().find((article) => article.slug === slug) ?? null;
    }

    /**
     * Загружает все статьи, которые видны текущему пользователю.
     *
     * Гостю сервер отдаёт только опубликованные, редактору — вместе с черновиками.
     *
     * @returns Промис завершения загрузки.
     */
    public async load(): Promise<void> {
        this.loading.set(true);
        this.error.set(null);

        try {
            const page = await firstValueFrom(this.api.list());
            const next = new Map<string, WikiArticle>();

            for (const article of page.articles) {
                next.set(article.id, article);
            }

            this.byId.set(next);
        } catch {
            this.error.set('wiki.admin.loadError');
        } finally {
            this.loading.set(false);
        }
    }

    /**
     * Загружает одну статью, если её ещё нет в снимке.
     *
     * @param slug Адрес статьи.
     * @returns Промис со статьёй или `null`, если её нет.
     */
    public async loadBySlug(slug: string): Promise<WikiArticle | null> {
        try {
            const article = await firstValueFrom(this.api.getBySlug(slug));
            this.put(article);

            return article;
        } catch {
            return null;
        }
    }

    /**
     * Загружает одну статью по идентификатору, если её ещё нет в снимке.
     *
     * Нужно редактору: он открывается по прямой ссылке `/wiki/edit/<id>`,
     * когда списка в браузере ещё нет.
     *
     * @param id Идентификатор статьи.
     * @returns Промис со статьёй или `null`, если её нет.
     */
    public async loadById(id: string): Promise<WikiArticle | null> {
        const cached = this.byId().get(id);

        if (cached) {
            return cached;
        }

        try {
            const article = await firstValueFrom(this.api.getById(id));
            this.put(article);

            return article;
        } catch {
            return null;
        }
    }

    /**
     * Загружает историю правок статьи.
     *
     * @param id Id статьи.
     * @returns Промис завершения загрузки.
     */
    public async loadHistory(id: string): Promise<void> {
        try {
            const revisions = await firstValueFrom(this.api.revisions(id));
            this.revisions.update((current) => new Map(current).set(id, revisions.map(mapRevisionFromDto)));
        } catch {
            this.revisions.update((current) => new Map(current).set(id, []));
        }
    }

    /**
     * История правок статьи из загруженного снимка.
     *
     * @param id Id статьи.
     */
    public history(id: string): readonly WikiRevision[] {
        return this.revisions().get(id) ?? [];
    }

    /**
     * Версия статьи, на которой основана правка.
     *
     * @param id Id статьи.
     * @returns Версия или `0` — если статью ещё не загружали.
     */
    public versionOf(id: string | null): number {
        return id ? (this.byId().get(id)?.version ?? 0) : 0;
    }

    /**
     * Сохраняет статью на сервере.
     *
     * @param id Id статьи (`null` — новая).
     * @param draft Поля статьи.
     * @param meta Статус, автор и комментарий к правке.
     * @returns Сохранённая статья с сервера.
     */
    public async save(
        id: string | null,
        draft: WikiDraft,
        meta: { status: WikiStatus; authorName: string; note: string }
    ): Promise<WikiArticle> {
        const payload: WikiSavePayload = {
            draft,
            status: meta.status,
            note: meta.note,
            // Версия, которую редактор открыл: сервер откажет, если статью
            // успел изменить кто-то другой, вместо тихой перезаписи.
            expectedVersion: this.versionOf(id),
        };

        const saved = id
            ? await firstValueFrom(this.api.update(id, payload))
            : await firstValueFrom(this.api.create(payload));

        this.put(saved);

        if (id) {
            await this.loadHistory(id);
        }

        return saved;
    }

    /**
     * Удаляет статью.
     *
     * @param id Id статьи.
     */
    public async remove(id: string): Promise<void> {
        await firstValueFrom(this.api.remove(id));
        this.byId.update((current) => {
            const next = new Map(current);
            next.delete(id);

            return next;
        });
        this.revisions.update((current) => {
            const next = new Map(current);
            next.delete(id);

            return next;
        });
        this.clearAutosave(id);
    }

    /**
     * Отправляет предложение игрока.
     *
     * @param proposal Предложенная статья.
     * @param articleId Адрес правимой статьи; пусто — новая статья.
     * @param note Пояснение автора.
     */
    public submitSuggestion(proposal: WikiDraft, articleId: string, note: string): Observable<WikiSuggestion> {
        return this.api.submitSuggestion({
            proposal: {
                id: '',
                slug: proposal.slug,
                title: proposal.title,
                section: proposal.sectionId ?? 'start',
                lead: proposal.lead,
                cover: proposal.cover ? { url: proposal.cover.url, focus: proposal.cover.focus } : null,
                tags: [...proposal.tags],
                game_version: proposal.gameVersion,
                quick_answer: proposal.quickAnswer
                    ? { question: proposal.quickAnswer.question, answer: proposal.quickAnswer.answer }
                    : null,
                related: [...proposal.related],
                body: proposal.body,
            },
            articleId,
            note,
        });
    }

    /**
     * Предложения: свои для игрока, всю очередь для редактора.
     *
     * @param status Фильтр по состоянию.
     */
    public suggestions(status?: WikiSuggestionStatus): Observable<readonly WikiSuggestion[]> {
        return this.api.suggestions(status);
    }

    /**
     * Одобряет предложение.
     *
     * @param id Id предложения.
     * @returns Промис с решением сервера.
     */
    public async approveSuggestion(id: string): Promise<WikiSuggestion> {
        const decided = await firstValueFrom(this.api.approveSuggestion(id));
        await this.load();

        return decided;
    }

    /**
     * Отклоняет предложение.
     *
     * @param id Id предложения.
     * @param reason Причина, её увидит автор.
     */
    public rejectSuggestion(id: string, reason: string): Observable<WikiSuggestion> {
        return this.api.rejectSuggestion(id, reason);
    }

    /**
     * Автосохранение редактора.
     *
     * @param key Id статьи или `new`.
     */
    public autosave(key: string): WikiAutosave | null {
        return this.storage.getItem<Record<string, WikiAutosave>>(AUTOSAVE_KEY)?.[key] ?? null;
    }

    /**
     * Запоминает несохранённое состояние редактора.
     *
     * @param key Id статьи или `new`.
     * @param draft Поля статьи.
     */
    public writeAutosave(key: string, draft: WikiDraft): void {
        const all = this.storage.getItem<Record<string, WikiAutosave>>(AUTOSAVE_KEY) ?? {};
        all[key] = { draft, savedAt: new Date().toISOString() };
        this.storage.setItem(AUTOSAVE_KEY, all);
    }

    /**
     * Забывает автосохранение.
     *
     * @param key Id статьи или `new`.
     */
    public clearAutosave(key: string): void {
        const all = this.storage.getItem<Record<string, WikiAutosave>>(AUTOSAVE_KEY);

        if (all && key in all) {
            delete all[key];
            this.storage.setItem(AUTOSAVE_KEY, all);
        }
    }

    /**
     * Кладёт статью в снимок.
     *
     * @param article Статья с сервера.
     */
    private put(article: WikiArticle): void {
        this.byId.update((current) => new Map(current).set(article.id, article));
    }
}

/**
 * Вид предложения из API.
 */
export type { WikiSuggestionKind, WikiSuggestionStatus };
