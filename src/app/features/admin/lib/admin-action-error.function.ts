import { HttpErrorResponse } from '@angular/common/http';

/**
 * Формирует текст ошибки административной операции для показа пользователю.
 *
 * На `403` показывает переданный текст «Нет прав»: сообщение сервера о
 * недостатке прав не предназначено для экрана. Остальные ошибки выводятся
 * текстом сервера (`google.rpc.Status.message`) — для `FAILED_PRECONDITION`
 * и валидации бэкенд присылает готовое сообщение на русском.
 *
 * @param error Ошибка запроса.
 * @param noPermissionText Текст для `403`.
 * @param fallbackText Текст, если сервер не прислал сообщение.
 * @returns Строка для уведомления.
 */
export function getAdminActionErrorMessage(
    error: unknown,
    noPermissionText: string,
    fallbackText: string
): string {
    if (!(error instanceof HttpErrorResponse)) {
        return fallbackText;
    }

    if (error.status === 403) {
        return noPermissionText;
    }

    const serverMessage = error.error?.message;

    return typeof serverMessage === 'string' && serverMessage.length > 0 ? serverMessage : fallbackText;
}
