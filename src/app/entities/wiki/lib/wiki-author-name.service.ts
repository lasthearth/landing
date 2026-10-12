import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { UserService } from '@entities/user';

/**
 * Переводит идентификатор автора в игровое имя.
 *
 * Сервер хранит в статьях subject из токена — непрозрачный идентификатор вида
 * `qh6u7ut3b6y6`, который ничего не говорит читателю. Имя берём у сервиса
 * пользователей и запоминаем: одна и та же подпись встречается на списке,
 * в статье и в очереди предложений.
 */
@Injectable({ providedIn: 'root' })
export class WikiAuthorNameService {
    private readonly users = inject(UserService);

    /**
     * Уже разрешённые идентификаторы.
     */
    private readonly names = signal<ReadonlyMap<string, string>>(new Map());

    /**
     * Идентификаторы, запрос по которым уже идёт.
     */
    private readonly asked = new Set<string>();

    /**
     * Имя автора по идентификатору.
     *
     * @param id Идентификатор из статьи; пусто — пустая строка.
     * @returns Игровое имя или `null`, пока оно не известно.
     */
    public name(id: string | null | undefined): string | null {
        if (!id) {
            return null;
        }

        return this.names().get(id) ?? null;
    }

    /**
     * Подпись для интерфейса: имя, если оно уже известно, иначе ничего.
     *
     * @param id Идентификатор автора.
     * @returns Готовое имя или пустая строка.
     */
    public label(id: string | null | undefined): string {
        return (id && this.names().get(id)) || '';
    }

    /**
     * Догружает имена для переданных идентификаторов.
     *
     * Запрос уходит один раз на идентификатор, ошибка не показывается: подпись
     * автора — украшение, а не то, ради чего стоит тревожить читателя.
     *
     * @param ids Идентификаторы авторов.
     * @returns Промис завершения загрузки.
     */
    public async resolve(ids: readonly (string | null | undefined)[]): Promise<void> {
        const pending = [
            ...new Set(ids.filter((id): id is string => !!id && !this.names().has(id) && !this.asked.has(id))),
        ];

        if (!pending.length) {
            return;
        }

        for (const id of pending) {
            this.asked.add(id);
        }

        try {
            const players = await firstValueFrom(this.users.getPlayersBatch$(pending));

            this.names.update((current) => {
                const next = new Map(current);

                for (const player of players) {
                    if (player.user_game_name) {
                        next.set(player.user_id, player.user_game_name);
                    }
                }

                return next;
            });
        } catch {
            // Подпись останется пустой: имя автора не то, ради чего стоит
            // показывать ошибку.
        } finally {
            for (const id of pending) {
                this.asked.delete(id);
            }
        }
    }

    /**
     * Сколько имён уже известно — для отладки и тестов.
     */
    public readonly resolved = computed(() => this.names().size);
}
