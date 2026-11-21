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

    /**
     * Адрес на сайте, куда ведёт уведомление (например `/profile/support/<id>`).
     * Пусто у старых уведомлений — тогда адрес угадывается по заголовку.
     */
    link?: string;
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
