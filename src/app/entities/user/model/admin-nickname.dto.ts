/**
 * DTO запроса принудительной смены ника администратором.
 *
 * `PUT /v1/admin/users/{user_id}/nickname` — скоуп `players:nickname:write`.
 * Меняет ник сразу, минуя кулдаун; игроку уходит уведомление с причиной
 * и стартует новый 6-месячный кулдаун.
 */
export interface IAdminChangeNicknameRequest {
    /**
     * Идентификатор игрока, которому меняют ник.
     */
    user_id: string;

    /**
     * Новый ник: 1–15 символов, `a-z A-Z 0-9 _ -`.
     */
    new_nickname: string;

    /**
     * Причина для уведомления игроку; необязательно, до 500 символов.
     */
    reason?: string;
}

/**
 * DTO ответа на принудительную смену ника администратором.
 */
export interface IAdminChangeNicknameResponse {
    /**
     * Ник до смены.
     */
    old_nickname: string;

    /**
     * Ник после смены.
     */
    new_nickname: string;

    /**
     * Дата (ISO 8601), начиная с которой игрок снова может менять ник:
     * момент смены + 6 месяцев.
     */
    next_change_allowed_at: string;
}

/**
 * DTO запроса досрочного разрешения смены ника.
 *
 * `POST /v1/admin/users/{user_id}/nickname:grant` — скоуп
 * `players:nickname:grant`. Ник не меняет: снимает кулдаун, чтобы игрок
 * сменил ник сам обычной кнопкой в профиле.
 */
export interface IAdminGrantNicknameChangeRequest {
    /**
     * Идентификатор игрока, которому снимают кулдаун.
     */
    user_id: string;

    /**
     * Причина для уведомления игроку; необязательно, до 500 символов.
     */
    reason?: string;
}
