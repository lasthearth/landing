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
