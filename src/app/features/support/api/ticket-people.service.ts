import { inject, Injectable, signal } from '@angular/core';
import { TicketPerson } from '@entities/ticket';
import { UserService } from '@entities/user';
import { resolveAvatarUrl } from '@shared/lib/resolve-avatar-url';
import { catchError, of } from 'rxjs';

/**
 * Ники и аватары участников обращений. Сервер хранит в обращении только id,
 * поэтому страницы подгружают людей пачкой и держат их здесь на всю сессию:
 * у администрации одни и те же игроки встречаются в списке и в переписке.
 */
@Injectable({ providedIn: 'root' })
export class TicketPeopleService {
    /**
     * Профили игроков.
     */
    private readonly userService = inject(UserService);

    /**
     * Известные участники по id.
     */
    public readonly people = signal<Record<string, TicketPerson>>({});

    /**
     * id, за которыми уже ходили (в том числе безуспешно), чтобы не спрашивать повторно.
     */
    private readonly requested = new Set<string>();

    /**
     * Догружает участников, которых ещё не видели.
     *
     * @param ids Пользователи.
     */
    public load(ids: readonly string[]): void {
        const missing = [...new Set(ids)].filter((id) => id && !this.requested.has(id));
        if (missing.length === 0) {
            return;
        }
        missing.forEach((id) => this.requested.add(id));

        this.userService
            .getPlayersBatch$(missing)
            .pipe(catchError(() => of([])))
            .subscribe((players) => {
                if (players.length === 0) {
                    return;
                }
                this.people.update((known) => {
                    const next = { ...known };
                    for (const player of players) {
                        next[player.user_id] = {
                            name: player.user_game_name,
                            avatar: resolveAvatarUrl(player.avatar?.x96 || player.avatar),
                        };
                    }
                    return next;
                });
            });
    }

    /**
     * Ник участника.
     *
     * @param id Пользователь.
     * @returns Ник или пустая строка, если ещё не загружен.
     */
    public name(id: string): string {
        return this.people()[id]?.name ?? '';
    }
}
