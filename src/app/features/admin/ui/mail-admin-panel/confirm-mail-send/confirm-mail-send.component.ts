import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiDialogContext, TuiIcon } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TranslatePipe } from '@core/i18n';
import { IConfirmMailSendData } from '../../../model/confirm-mail-send-data.model';

/**
 * Шаг подтверждения отправки письма.
 *
 * Показывает адресата, заголовок, текст, подписи вложений и срок жизни —
 * то, что уйдёт на сервер. Коды позиций видны здесь дословно: игра не
 * проверяет `game_code` и молча пропускает неизвестный, поэтому опечатку
 * ловит человек, а не сервер.
 *
 * Запрос не выполняет: отправляет форма после подтверждения, чтобы ключ
 * идемпотентности и состояние формы жили в одном месте.
 */
@Component({
    selector: 'app-confirm-mail-send',
    imports: [TuiIcon, TranslatePipe],
    templateUrl: './confirm-mail-send.component.html',
    styles: [':host { display: block; padding-top: 32px; }'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmMailSendComponent {
    /**
     * Контекст открытого диалогового окна.
     */
    protected readonly context: TuiDialogContext<boolean, IConfirmMailSendData> =
        inject<TuiDialogContext<boolean, IConfirmMailSendData>>(POLYMORPHEUS_CONTEXT);

    /**
     * Закрывает диалог подтверждением отправки.
     */
    protected confirm(): void {
        this.context.completeWith(true);
    }

    /**
     * Закрывает диалог отказом от отправки.
     */
    protected cancel(): void {
        this.context.completeWith(false);
    }
}