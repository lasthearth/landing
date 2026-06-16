import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TuiAlertService, TuiDialogContext } from '@taiga-ui/core';
import { catchError, Observer, tap, throwError } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class RequestStatusService {
    /**
     * Сервис уведомлений.
     */
    private readonly alertService: TuiAlertService = inject(TuiAlertService);

    /**
     * Маппинг известных сообщений ошибок бэкенда на русский язык.
     */
    private readonly errorMap: Record<string, string> = {
        'insufficient funds': 'Недостаточно средств',
        'UNAUTHENTICATED': 'Требуется авторизация',
        'PERMISSION_DENIED': 'Недостаточно прав',
        'NOT_FOUND': 'Не найдено',
        'ALREADY_EXISTS': 'Уже существует',
        'INVALID_ARGUMENT': 'Неверные данные',
        'INTERNAL': 'Внутренняя ошибка сервера',
    };

    /**
     * Возвращает человекочитаемое сообщение об ошибке.
     *
     * @param error HTTP-ошибка.
     * @param fallback Сообщение по умолчанию.
     * @returns Локализованное сообщение.
     */
    private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
        const backendMessage = error.error?.message;

        if (backendMessage && this.errorMap[backendMessage]) {
            return this.errorMap[backendMessage];
        }

        if (backendMessage) {
            return backendMessage;
        }

        return fallback;
    }

    /**
     *  Обрабатывает ошибку запроса.
     *
     * @param errorMessage Сообщение ошибки по умолчанию.
     */
    public handleError(errorMessage: string = 'Произошла непредвиденная ошибка.') {
        return catchError((error: HttpErrorResponse) => {
            const message = this.getErrorMessage(error, errorMessage);
            this.alertService.open('', { label: message, appearance: 'negative' }).subscribe();
            return throwError(() => error);
        });
    }

    /**
     *  Обрабатывает успешный запрос.
     *
     * @param successMessage Сообщение успеха.
     * @param context Диалоговое окно, которое следует закрыть.
     */
    public handleSuccess(successMessage: string, implicit$?: Observer<void>) {
        return tap(() => {
            this.alertService.open('', { label: successMessage, appearance: 'positive' }).subscribe();
            if (implicit$) {
                implicit$.complete();
            }
        });
    }

    public showError(errorMessage: string = 'Произошла непредвиденная ошибка.') {
        this.alertService.open('', { label: errorMessage, appearance: 'negative' }).subscribe();
    }
}
