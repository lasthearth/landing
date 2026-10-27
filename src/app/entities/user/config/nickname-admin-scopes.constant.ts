/**
 * Скоупы (permissions) административных операций с ником игрока.
 */
export const NICKNAME_ADMIN_SCOPES = {
    /**
     * Принудительная смена ника: `PUT /admin/users/{user_id}/nickname`.
     */
    write: 'players:nickname:write',

    /**
     * Досрочное разрешение смены: `POST /admin/users/{user_id}/nickname:grant`.
     */
    grant: 'players:nickname:grant',
} as const;
