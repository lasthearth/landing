import { catchError, EMPTY, MonoTypeOperatorFunction } from 'rxjs';
import { RequestStatusService } from '@core/services/request-status.service';
import { getAdminActionErrorMessage } from './admin-action-error.function';

/**
 * Оператор показа ошибки административной операции.
 *
 * Показывает текст сервера (`google.rpc.Status.message`), на 403 — текст
 * «Нет прав», и гасит поток (`EMPTY`): подписчик не получает ошибку,
 * диалог или форма остаются открытыми для повторной попытки.
 *
 * @param requestStatus Сервис уведомлений.
 * @param noPermissionText Текст для `403`.
 * @param fallbackText Текст, если сервер не прислал сообщение.
 * @returns Оператор для `pipe` запроса.
 */
export function catchAdminActionError(
    requestStatus: RequestStatusService,
    noPermissionText: string,
    fallbackText: string
): MonoTypeOperatorFunction<unknown> {
    return catchError((error: unknown) => {
        requestStatus.showError(getAdminActionErrorMessage(error, noPermissionText, fallbackText));

        return EMPTY;
    });
}
