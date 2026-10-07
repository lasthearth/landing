/**
 * Значок игрока: вычисляется из статистики и поселения, бэкенд не нужен.
 */
export interface PlayerBadge {
    /**
     * Ключ значка (подписи — `player.badges.<key>.title|text`).
     */
    key: PlayerBadgeKey;

    /**
     * Иконка Taiga UI.
     */
    icon: string;

    /**
     * Оформление: обычный, редкий (тёплый акцент), легендарный (золото).
     */
    tier: 'common' | 'rare' | 'legendary';
}

/**
 * Все значки.
 */
export type PlayerBadgeKey =
    | 'verified'
    | 'newcomer'
    | 'settler'
    | 'veteran'
    | 'oldTimer'
    | 'founder'
    | 'resident'
    | 'warrior'
    | 'slayer'
    | 'survivor'
    | 'topHours'
    | 'topKills'
    | 'gladiator';

/**
 * Данные, из которых считаются значки.
 */
export interface PlayerBadgeInput {
    /**
     * Игрок прошёл верификацию.
     */
    verified: boolean;

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
     * Место по часам (1 — первое), `null` — нет в таблице.
     */
    hoursRank: number | null;

    /**
     * Место по убийствам, `null` — нет в таблице.
     */
    killsRank: number | null;

    /**
     * Роль в поселении.
     */
    settlementRole: 'leader' | 'resident' | null;

    /**
     * Победы в «Голодных играх» за выбранный сезон.
     */
    hungerGamesWins: number;
}
