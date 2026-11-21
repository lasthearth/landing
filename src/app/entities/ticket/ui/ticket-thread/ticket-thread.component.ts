import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { TuiIcon } from '@taiga-ui/core';
import { TicketPerson } from '../../model/ticket-person';
import { TicketMessage } from '../../model/ticket.types';

/**
 * Лента сообщений обращения: игрок слева, администрация справа, внутренние
 * заметки — отдельной жёлтой плашкой (их видит только администрация).
 *
 * Текст сообщений приходит от игроков и выводится только интерполяцией.
 */
@Component({
    selector: 'app-ticket-thread',
    templateUrl: './ticket-thread.component.html',
    styleUrl: './ticket-thread.component.less',
    imports: [TranslatePipe, TuiIcon, RelativeTimeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketThreadComponent {
    /**
     * Сообщения, старые первыми.
     */
    public readonly messages = input.required<TicketMessage[]>();

    /**
     * Участники по id; неизвестный показывается заглушкой.
     */
    public readonly people = input<Record<string, TicketPerson>>({});

    /**
     * Чья это лента: игрок не видит имён администраторов, только «Администрация».
     */
    public readonly viewer = input<'author' | 'staff'>('author');

    /**
     * Участник по id.
     *
     * @param id Пользователь.
     * @returns Ник и аватар или `null`, если ещё не загружен.
     */
    protected person(id: string): TicketPerson | null {
        return this.people()[id] ?? null;
    }
}
