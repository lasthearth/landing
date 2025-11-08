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
     *  Обрабатывает ошибку запроса.
     *
     * @param errorMessage Сообщение ошибки.
     */
    public handleError(errorMessage: string = 'Произошла непредвиденная ошибка.') {
        return catchError((error: any) => {
            this.alertService.open('', { label: errorMessage, appearance: 'negative' }).subscribe();
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
