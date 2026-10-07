import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    ReactionApiService,
    ReactionCounts,
    ReactionEmoji,
    ReactionTarget,
    REACTION_TARGETS_LIMIT,
} from '@entities/reaction';
import { UserService } from '@entities/user';
import { distinctUntilChanged } from 'rxjs';

/**
 * Реакции одной цели.
 */
export interface TargetReactions {
    /**
     * Ненулевые счётчики.
     */
    readonly counts: ReactionCounts;

    /**
     * Реакции, поставленные текущим игроком.
     */
    readonly mine: readonly ReactionEmoji[];
}

/**
 * Состояние цели, о которой ещё ничего не известно.
 */
const EMPTY: TargetReactions = { counts: {}, mine: [] };

/**
 * Через сколько миллисекунд после первого запроса отправлять пачку.
 *
 * Карточки ленты появляются почти одновременно: короткая пауза собирает их
 * в один запрос вместо десятков.
 */
const BATCH_DELAY = 50;

/**
 * Хранилище реакций для всех карточек на странице.
 *
 * Компоненты регистрируют свои цели через {@link watch}; хранилище собирает их
 * в пачки по 50 и запрашивает счётчики одним запросом, а для вошедшего игрока —
 * ещё и его собственные реакции. Переключение оптимистичное: интерфейс меняется
 * сразу, при ошибке откатывается.
 */
@Injectable({ providedIn: 'root' })
export class ReactionsStoreService {
    /**
     * API реакций.
     */
    private readonly api = inject(ReactionApiService);

    /**
     * Сервис пользователя (вход, состояние авторизации).
     */
    private readonly userService = inject(UserService);

    /**
     * Признак выполнения в браузере: при пререндере реакции не запрашиваются.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Реакции по целям.
     */
    private readonly state = signal<ReadonlyMap<string, TargetReactions>>(new Map());

    /**
     * Цели, о которых уже спрашивали (или спросят в ближайшей пачке).
     */
    private readonly known = new Set<string>();

    /**
     * Цели, ждущие отправки.
     */
    private pending = new Set<string>();

    /**
     * Таймер ближайшей пачки.
     */
    private flushTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * Вошёл ли игрок.
     */
    private authed = false;

    /**
     * Цели, по которым сейчас идёт переключение (защита от двойного клика).
     */
    private readonly busy = new Set<string>();

    public constructor() {
        this.userService.authState$
            .pipe(distinctUntilChanged(), takeUntilDestroyed(inject(DestroyRef)))
            .subscribe((authed) => {
                this.authed = authed;

                if (authed) {
                    // Вошёл — подтягиваем свои реакции для уже показанных карточек.
                    this.loadMine([...this.known]);
                } else {
                    this.state.update((map) => {
                        const next = new Map(map);
                        next.forEach((value, key) => next.set(key, { counts: value.counts, mine: [] }));
                        return next;
                    });
                }
            });
    }

    /**
     * Реакции цели (сигнал обновляется при любом изменении хранилища).
     *
     * @param target Цель.
     * @returns Реакции цели.
     */
    public get(target: string): TargetReactions {
        return this.state().get(target) ?? EMPTY;
    }

    /**
     * Регистрирует цель: её счётчики будут запрошены в ближайшей пачке.
     *
     * @param target Цель.
     */
    public watch(target: ReactionTarget): void {
        if (!this.isBrowser || this.known.has(target)) {
            return;
        }

        this.known.add(target);
        this.pending.add(target);

        this.flushTimer ??= setTimeout(() => this.flush(), BATCH_DELAY);
    }

    /**
     * Ставит или снимает реакцию. Гостю предлагает войти.
     *
     * @param target Цель.
     * @param emoji Реакция.
     */
    public toggle(target: ReactionTarget, emoji: ReactionEmoji): void {
        if (!this.authed) {
            this.userService.signIn();
            return;
        }

        const key = `${target}|${emoji}`;

        if (this.busy.has(key)) {
            return;
        }

        const before = this.get(target);
        const wasActive = before.mine.includes(emoji);
        const current = before.counts[emoji] ?? 0;
        const count = Math.max(0, current + (wasActive ? -1 : 1));

        this.set(target, {
            counts: { ...before.counts, [emoji]: count },
            mine: wasActive ? before.mine.filter((item) => item !== emoji) : [...before.mine, emoji],
        });

        this.busy.add(key);

        this.api.toggle(target, emoji).subscribe({
            next: (result) => {
                const latest = this.get(target);
                const mine = latest.mine.filter((item) => item !== emoji);

                this.set(target, { counts: result.counts, mine: result.active ? [...mine, emoji] : mine });
                this.busy.delete(key);
            },
            error: () => {
                this.set(target, before);
                this.busy.delete(key);
            },
        });
    }

    /**
     * Отправляет накопленную пачку целей.
     */
    private flush(): void {
        this.flushTimer = null;

        const targets = [...this.pending];
        this.pending = new Set();

        for (let index = 0; index < targets.length; index += REACTION_TARGETS_LIMIT) {
            const chunk = targets.slice(index, index + REACTION_TARGETS_LIMIT);

            this.api.counts(chunk).subscribe({
                next: (counts) =>
                    this.state.update((map) => {
                        const next = new Map(map);
                        chunk.forEach((target) =>
                            next.set(target, { counts: counts.get(target) ?? {}, mine: map.get(target)?.mine ?? [] })
                        );
                        return next;
                    }),
                // Не удалось — карточки просто останутся без счётчиков.
                error: () => undefined,
            });
        }

        if (this.authed) {
            this.loadMine(targets);
        }
    }

    /**
     * Запрашивает реакции текущего игрока.
     *
     * @param targets Цели.
     */
    private loadMine(targets: readonly string[]): void {
        for (let index = 0; index < targets.length; index += REACTION_TARGETS_LIMIT) {
            const chunk = targets.slice(index, index + REACTION_TARGETS_LIMIT);

            this.api.mine(chunk).subscribe({
                next: (mine) =>
                    this.state.update((map) => {
                        const next = new Map(map);
                        chunk.forEach((target) =>
                            next.set(target, { counts: map.get(target)?.counts ?? {}, mine: mine.get(target) ?? [] })
                        );
                        return next;
                    }),
                error: () => undefined,
            });
        }
    }

    /**
     * Записывает реакции цели.
     *
     * @param target Цель.
     * @param value Реакции.
     */
    private set(target: string, value: TargetReactions): void {
        this.state.update((map) => new Map(map).set(target, value));
    }
}
