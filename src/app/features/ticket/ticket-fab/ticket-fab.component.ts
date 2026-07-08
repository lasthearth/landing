import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TicketFormComponent } from '../ticket-form/ticket-form.component';
import { TranslatePipe } from '@core/i18n';

/**
 * Плавающая кнопка для быстрого создания тикета.
 */
@Component({
    selector: 'app-ticket-fab',
    standalone: true,
    imports: [TuiIcon, TranslatePipe],
    templateUrl: './ticket-fab.component.html',
    styleUrl: './ticket-fab.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketFabComponent {
    /**
     * Сервис диалогов.
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * Открывает диалог создания тикета.
     */
    protected openTicketDialog(): void {
        this.dialogs.open(new PolymorpheusComponent(TicketFormComponent), { size: 'auto' }).subscribe();
    }
}
