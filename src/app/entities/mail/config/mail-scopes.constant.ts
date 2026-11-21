/**
 * Скоупы (permissions) почты, которые Logto выдаёт администратору.
 *
 * Письмо без нужного скоупа сервер отклоняет `403 PERMISSION_DENIED`,
 * поэтому право проверяется до подписки, а страница показывает
 * состояние «нет прав», а не общую ошибку.
 */
export const MAIL_SCOPES = {
    /**
     * Отправка письма: `POST /v1/mail:compose`.
     */
    compose: 'mail:compose',

    /**
     * Чтение отправленных писем: `GET /v1/admin/mail`.
     */
    read: 'mail:read',
} as const;