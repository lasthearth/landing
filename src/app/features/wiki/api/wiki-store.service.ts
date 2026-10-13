import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpContext } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
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
 * Предохранитель постраничной загрузки.
 *
 * 40 страниц по 50 статей — 2000 статей. Если сервер отдаёт курсор дальше,
 * что-то не так с ним, а не с вики, и загрузку пора остановить.
 */
const MAX_PAGES = 40;

/**
 * Контекст запросов хранилища: свои пустые состояния вместо глобального алерта.
 *
 * 404 по адресу без статьи — штатный случай, страница показывает «не найдена»
 * сама; алерт «Ресурс не найден» поверх неё только мешает.
 */
const QUIET = new HttpContext().set(SKIP_ERROR_ALERT, true);

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
     * Снимок статей хоть раз загрузился.
     *
     * Пока это `false`, «статей нет» и «ещё не знаем» — разные состояния,
     * и страницы показывают скелетоны, а не пустое состояние.
     */
    public readonly loaded = signal(false);

    /**
     * Текущая постраничная загрузка снимка.
     *
     * Список, статья и админка зовут `load()` независимо; повторный вызов
     * должен ждать ту же загрузку, а не начинать вторую.
     */
    private inflight: Promise<void> | null = null;

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
     * Список читается целиком, по страницам: сервер отдаёт не больше 50 статей
     * за раз, а снимок нужен весь — из него подписываются ссылки [[адрес]], «См. также»
     * и очереди. Повторный вызов, пока идёт предыдущий, ждёт ту же загрузку.
     *
     * @returns Промис завершения загрузки.
     */
    public load(): Promise<void> {
        if (this.inflight) {
            return this.inflight;
        }

        this.loading.set(true);
        this.error.set(null);

        this.inflight = this.fetchAll().finally(() => {
            this.inflight = null;
            this.loading.set(false);
        });

        return this.inflight;
    }

    /**
     * Читает все страницы списка и заменяет снимок одним куском.
     *
     * Снимок заменяется только после последней страницы: иначе читатель увидел бы
     * половину статей. Статьи, которые положил `put()` и которых нет в ответе,
     * не сохраняются — сервер их удалил или снял с публикации.
     */
    private async fetchAll(): Promise<void> {
        const next = new Map<string, WikiArticle>();

        try {
            let pageToken = '';

            for (let page = 0; page < MAX_PAGES; page += 1) {
                const response = await firstValueFrom(this.api.list({ pageToken }));

                for (const article of response.articles) {
                    next.set(article.id, article);
                }

                pageToken = response.next;

                if (!pageToken) {
                    break;
                }
            }

            if (pageToken) {
                console.warn(`WikiStoreService: остановлен на ${MAX_PAGES} страницах, дальше есть ещё`);
            }

            this.byId.set(next);
            this.loaded.set(true);
        } catch {
            this.error.set('wiki.admin.loadError');
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
            const article = await firstValueFrom(this.api.getBySlug(slug, QUIET));
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
            const article = await firstValueFrom(this.api.getById(id, QUIET));
            this.put(article);

            return article;
        } catch {
            return null;
        }
    }

    /**
     * Перечитывает статью с сервера, не глядя на снимок.
     *
     * Нужно, когда сервер отказал из-за конфликта версий: в снимке лежит
     * та версия, на которой редактор основывался, а сравнить нужно со свежей.
     *
     * @param id Идентификатор статьи.
     * @returns Промис со статьёй с сервера или `null`, если её больше нет.
     */
    public async refresh(id: string): Promise<WikiArticle | null> {
        try {
            const article = await firstValueFrom(this.api.getById(id, QUIET));
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
