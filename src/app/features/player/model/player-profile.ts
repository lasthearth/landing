import { ISettlement } from '@entities/settlement';
import { PlayerBadge } from './player-badge';

/**
 * Итоги игрока в «Голодных играх» за сезон.
 */
export interface PlayerHungerGames {
    /**
     * Номер сезона.
     */
    season: number;

    /**
     * Сезон ещё идёт.
     */
    active: boolean;

    /**
     * Рейтинг.
     */
    elo: number;

    /**
     * Победы.
     */
    wins: number;

    /**
     * Убийства.
     */
    kills: number;

    /**
     * Место в сезоне (0 — нет места).
     */
    rank: number;
}

/**
 * Публичный профиль игрока, собранный из открытых данных сайта.
 */
export interface PlayerProfile {
    /**
     * Игровой ник.
     */
    nickname: string;

    /**
     * Идентификатор пользователя.
     */
    userId: string;

    /**
     * Аватар.
     */
    avatarUrl: string;

    /**
     * Сейчас в игре.
     */
    isOnline: boolean;

    /**
     * Последний вход (ISO), если известен.
     */
    lastOnline: string | null;

    /**
     * Часы в игре.
     */
    hours: number;

    /**
     * Убийства игроков.
     */
    kills: number;

    /**
     * Смерти.
     */
    deaths: number;

    /**
     * Место по часам.
     */
    hoursRank: number;

    /**
     * Место по убийствам.
     */
    killsRank: number;

    /**
     * Всего игроков в таблице.
     */
    totalPlayers: number;

    /**
     * Поселение игрока.
     */
    settlement: ISettlement | null;

    /**
     * Роль в поселении.
     */
    settlementRole: 'leader' | 'resident' | null;

    /**
     * «Голодные игры» за текущий (или последний) сезон.
     */
    hungerGames: PlayerHungerGames | null;

    /**
     * Значки.
     */
    badges: PlayerBadge[];
}
