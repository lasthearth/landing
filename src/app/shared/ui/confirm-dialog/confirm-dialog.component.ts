import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

/**
 * Данные для диалога подтверждения.
 */
export interface ConfirmDialogData {
    /**
     * Заголовок диалогового окна.
     */
    title: string;

    /**
     * Текстовое содержание диалогового окна.
     */
    text: string;
}

/**
 * Компонент диалогового окна подтверждения.
 *
 * Отображает заголовок, текст и две кнопки: подтверждения и отмены.
 * Возвращает `true` при подтверждении и `false` при отмене.
 */
@Component({
    standalone: true,
    selector: 'app-confirm-dialog',
    templateUrl: './confirm-dialog.component.html',
    styles: [':host { display: block; padding-top: 32px; }'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
    /**
     * Контекст открытого диалогового окна.
     */
    protected readonly context: TuiDialogContext<boolean, ConfirmDialogData> =
        inject<TuiDialogContext<boolean, ConfirmDialogData>>(POLYMORPHEUS_CONTEXT);

    /**
     * Подтверждает действие и закрывает диалог с результатом `true`.
     */
    protected confirm(): void {
        this.context.completeWith(true);
    }

    /**
     * Отменяет действие и закрывает диалог с результатом `false`.
     */
    protected cancel(): void {
        this.context.completeWith(false);
    }
}
