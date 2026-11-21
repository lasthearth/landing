import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { TicketStatus } from '../../model/ticket.types';

/**
 * Метка статуса обращения. Подпись зависит от того, кто смотрит: игроку
 * «Ждёт ответа администрации», администрации — «Ждёт нас».
 */
@Component({
    selector: 'app-ticket-status',
    template: `<span class="ticket-status" [attr.data-status]="key()">{{
        'tickets.status.' + viewer() + '.' + key() | translate
    }}</span>`,
    styleUrl: './ticket-status.component.less',
    imports: [TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketStatusComponent {
    /**
     * Статус.
     */
    public readonly status = input.required<TicketStatus>();

    /**
     * Кто смотрит.
     */
    public readonly viewer = input<'author' | 'staff'>('author');

    /**
     * Короткий ключ статуса: `open`, `answered`, `closed`.
     */
    protected readonly key = computed(() => this.status().replace('TICKET_STATUS_', '').toLowerCase());
}
