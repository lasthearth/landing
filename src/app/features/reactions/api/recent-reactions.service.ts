import { inject, Injectable, signal } from '@angular/core';
import { LocalStorageService } from '@core/services/local-storage.service';
import { isReactionEmoji, ReactionEmoji } from '@entities/reaction';

/**
 * Ключ localStorage с недавними реакциями.
 */
const STORAGE_KEY = 'lh_reactions_recent';

/**
 * Сколько недавних реакций помнить (один ряд выбора).
 */
const LIMIT = 8;

/**
 * Недавно поставленные реакции этого браузера — первая вкладка выбора.
 */
@Injectable({ providedIn: 'root' })
export class RecentReactionsService {
    /**
     * Обёртка над localStorage.
     */
    private readonly storage = inject(LocalStorageService);

    /**
     * Недавние реакции, свежие первыми.
     */
    public readonly items = signal<readonly ReactionEmoji[]>(this.load());

    /**
     * Поднимает реакцию в начало недавних.
     *
     * @param emoji Поставленная реакция.
     */
    public remember(emoji: ReactionEmoji): void {
        const next = [emoji, ...this.items().filter((item) => item !== emoji)].slice(0, LIMIT);
        this.items.set(next);
        this.storage.setItem(STORAGE_KEY, next);
    }

    /**
     * Читает недавние реакции, отбрасывая неизвестные.
     *
     * @returns Недавние реакции.
     */
    private load(): ReactionEmoji[] {
        const stored = this.storage.getItem<unknown>(STORAGE_KEY);
        if (!Array.isArray(stored)) {
            return [];
        }
        return stored
            .filter((item): item is ReactionEmoji => typeof item === 'string' && isReactionEmoji(item))
            .slice(0, LIMIT);
    }
}
