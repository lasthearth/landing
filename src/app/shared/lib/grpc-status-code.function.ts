import { HttpErrorResponse } from '@angular/common/http';

/**
 * Числовой gRPC-код из тела ошибки бэкенда (`google.rpc.Status.code`).
 *
 * HTTP-статуса для этого мало: FAILED_PRECONDITION и INVALID_ARGUMENT
 * приезжают как 400, а решение «что показать человеку» разное.
 *
 * @param error Ошибка из HttpClient.
 * @returns Код или `null`, если это не ответ бэкенда.
 */
export function grpcStatusCode(error: unknown): number | null {
    if (!(error instanceof HttpErrorResponse)) {
        return null;
    }

    const body = error.error as { code?: unknown } | null | undefined;
    const code = body?.code;

    return typeof code === 'number' ? code : null;
}
