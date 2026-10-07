/**
 * Типы сущности «Реакция».
 */

import type { ReactionEmoji } from './reaction-emojis.constant';

export type { ReactionEmoji };

/**
 * Вид контента, на который ставятся реакции.
 */
export type ReactionTargetKind = 'news' | 'diplomacy' | 'event';

/**
 * Цель реакции: `<вид>:<идентификатор>`, например `news:66f0...`.
 */
export type ReactionTarget = `${ReactionTargetKind}:${string}`;

/**
 * Число реакций каждого вида на одной цели (только ненулевые).
 */
export type ReactionCounts = Partial<Record<ReactionEmoji, number>>;

/**
 * Счётчик в ответе API. `count` — int64, поэтому приходит строкой.
 */
export interface ReactionCountDto {
    /**
     * Реакция.
     */
    emoji: string;

    /**
     * Сколько игроков её поставили.
     */
    count: string | number;
}

/**
 * Реакции одной цели в ответе API.
 */
export interface TargetReactionsDto {
    /**
     * Цель.
     */
    target: string;

    /**
     * Ненулевые счётчики.
     */
    counts?: ReactionCountDto[];
}

/**
 * Реакции текущего игрока на одной цели в ответе API.
 */
export interface MyReactionsDto {
    /**
     * Цель.
     */
    target: string;

    /**
     * Поставленные реакции.
     */
    emojis?: string[];
}

/**
 * Итог переключения реакции.
 */
export interface ToggleReactionResult {
    /**
     * Стоит ли реакция после переключения.
     */
    active: boolean;

    /**
     * Актуальные счётчики цели.
     */
    counts: ReactionCounts;
}
