/**
 * Уведомление в ответе `GET /v1/notifications`.
 *
 * `user_id` — адресат; для общих уведомлений (новая новость) это `"broadcast"`.
 * `state` grpc-gateway отдаёт именем enum (`UNREAD` / `READ`), но на всякий случай
 * принимаем и число.
 */
export interface NotificationDto {
    /**
     * Идентификатор.
     */
    id: string;

    /**
     * Адресат или `"broadcast"`.
     */
    user_id: string;

    /**
     * Заголовок.
     */
    title: string;

    /**
     * Текст.
     */
    message: string;

    /**
     * Состояние на сервере.
     */
    state?: 'STATE_UNSPECIFIED' | 'UNREAD' | 'READ' | number;

    /**
     * Когда создано (ISO 8601).
     */
    created_at?: string;
}

/**
 * Страница уведомлений.
 */
export interface NotificationsPageDto {
    /**
     * Уведомления, от новых к старым.
     */
    notifications?: NotificationDto[];

    /**
     * Токен следующей страницы.
     */
    next_page_token?: string;
}
