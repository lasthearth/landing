import { inject, Injectable } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { Observable } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

/**
 * Сервис для открытия диалога подтверждения.
 *
 * Предоставляет метод для отображения модального окна с заголовком и текстом,
 * возвращающего Observable с результатом пользователя (`true` или `false`).
 */
@Injectable({
    providedIn: 'root',
})
export class ConfirmDialogService {
    /**
     * Сервис диалогов Taiga UI.
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * Открывает диалог подтверждения.
     *
     * @param data Заголовок и текст диалогового окна.
     * @returns Observable, эмитящий `true` при подтверждении или `false` при отмене.
     */
    public open(data: ConfirmDialogData): Observable<boolean> {
        return this.dialogs.open(new PolymorpheusComponent(ConfirmDialogComponent), {
            size: 'auto',
            data,
        });
    }
}
