import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService, TranslatePipe } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';
import { Ticket, TICKET_CATEGORIES, TICKET_LIMITS, TicketApiService, TicketCategory } from '@entities/ticket';
import { TuiIcon } from '@taiga-ui/core';
import { ticketErrorKey } from '../../lib/ticket-error-key.function';

/**
 * Форма нового обращения: категория, тема и первое сообщение.
 */
@Component({
    selector: 'app-ticket-form',
    templateUrl: './ticket-form.component.html',
    styleUrl: './ticket-form.component.less',
    imports: [FormsModule, TranslatePipe, TuiIcon],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketFormComponent {
    private readonly api = inject(TicketApiService);
    private readonly status = inject(RequestStatusService);
    private readonly i18n = inject(I18nService);

    /**
     * Обращение отправлено.
     */
    public readonly created = output<Ticket>();

    /**
     * Игрок передумал.
     */
    public readonly cancelled = output<void>();

    protected readonly categories = TICKET_CATEGORIES;
    protected readonly limits = TICKET_LIMITS;

    /**
     * Выбранная категория.
     */
    protected readonly category = signal<TicketCategory | null>(null);

    /**
     * Тема.
     */
    protected readonly subject = signal('');

    /**
     * Сообщение.
     */
    protected readonly text = signal('');

    /**
     * Пытались отправить — показываем ошибки полей.
     */
    protected readonly touched = signal(false);

    /**
     * Идёт отправка.
     */
    protected readonly sending = signal(false);

    /**
     * Форма заполнена так, как примет сервер.
     */
    protected readonly valid = computed(
        () =>
            !!this.category() &&
            this.subject().trim().length >= TICKET_LIMITS.subjectMin &&
            this.text().trim().length > 0
    );

    /**
     * Отправляет обращение.
     */
    protected submit(): void {
        this.touched.set(true);
        const category = this.category();
        if (!this.valid() || !category || this.sending()) {
            return;
        }

        this.sending.set(true);
        this.api.create({ category, subject: this.subject().trim(), text: this.text().trim() }).subscribe({
            next: (ticket) => {
                this.sending.set(false);
                this.status.showSuccess(this.i18n.translate('tickets.player.toast.created'));
                this.created.emit(ticket);
            },
            error: (error: unknown) => {
                this.sending.set(false);
                this.status.showError(this.i18n.translate(ticketErrorKey(error)));
            },
        });
    }
}
