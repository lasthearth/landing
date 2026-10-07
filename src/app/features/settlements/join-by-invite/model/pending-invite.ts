/**
 * Приглашение, которое игрок открыл, но ещё не принял.
 */
export interface PendingInvite {
    /**
     * Код ссылки.
     */
    code: string;
    /**
     * Название поселения — для плашки в профиле.
     */
    settlementName: string;
    /**
     * Когда сохранено (мс).
     */
    savedAt: number;
    /**
     * Вернуть ли игрока на страницу приглашения после входа (один раз).
     */
    redirectOnSignIn: boolean;
}
