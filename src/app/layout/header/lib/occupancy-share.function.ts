/**
 * Данные онлайна сервера.
 */
export interface OnlineCount {
    /**
     * Игроков сейчас на сервере.
     */
    online: number;

    /**
     * Предел мест на сервере.
     */
    max_online: number;
}

/**
 * Доля занятых мест на сервере — для линии занятости в шапке.
 *
 * Линия рисуется через `transform: scaleX()`, поэтому результат безразмерный.
 * Предел в 0 или отсутствующие данные дают 0: пустая дорожка честнее
 * прочерка, а полоса при этом не меняет высоту.
 *
 * @param online Данные онлайна или `null`, если сервер не ответил.
 * @returns Доля от 0 до 1 включительно.
 */
export function occupancyShare(online: OnlineCount | null): number {
    if (!online) {
        return 0;
    }

    const max = online.max_online;

    if (!Number.isFinite(max) || max <= 0) {
        return 0;
    }

    const current = Number.isFinite(online.online) ? online.online : 0;

    return Math.min(Math.max(current, 0), max) / max;
}
