import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Subject } from 'rxjs';
import { MailComposeFormComponent } from './mail-compose-form/mail-compose-form.component';
import { MailSentListComponent } from './mail-sent-list/mail-sent-list.component';

/**
 * Панель почты в кабинете администратора.
 *
 * Собирает две части в один экран: отправка письма и список отправленного.
 * Форма сообщает об успехе через {@link MailAdminPanelComponent.onSent}, и список
 * перечитывается с первой страницы — новое письмо видно сразу, без перезагрузки.
 */
@Component({
    selector: 'app-mail-admin-panel',
    imports: [MailComposeFormComponent, MailSentListComponent],
    templateUrl: './mail-admin-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MailAdminPanelComponent {
    /**
     * Триггер перечитывания списка отправленных писем.
     */
    protected readonly sentRefresh$ = new Subject<void>();

    /**
     * Перечитывает список после успешной отправки.
     */
    protected onSent(): void {
        this.sentRefresh$.next();
    }
}