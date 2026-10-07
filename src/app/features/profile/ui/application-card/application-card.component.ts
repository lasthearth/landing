import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n';
import { VerificationSubmission } from '@features/verification';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { TuiIcon } from '@taiga-ui/core';

/**
 * Состояние анкеты для карточки.
 */
export type ApplicationState = 'none' | 'pending' | 'rejected' | 'approved';

/**
 * Карточка анкеты на сервер для профиля без верификации.
 *
 * Вместо трёх разрозненных надписей — одно место: ход проверки
 * («Отправлена → Проверка → Доступ»), что делать дальше и кнопка действия.
 */
@Component({
    selector: 'app-application-card',
    templateUrl: './application-card.component.html',
    styleUrl: './application-card.component.less',
    imports: [TuiIcon, TranslatePipe, RouterLink, RelativeTimeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationCardComponent {
    /**
     * Статус анкеты с сервера (`null` — анкеты нет).
     */
    public readonly status = input<string | null | undefined>(null);

    /**
     * Причина отказа.
     */
    public readonly rejectionReason = input<string | null | undefined>(null);

    /**
     * Анкета, отправленная с этого браузера (дата и ник).
     */
    public readonly submission = input<VerificationSubmission | null>(null);

    /**
     * Заполнить или исправить анкету.
     */
    public readonly fill = output<void>();

    /**
     * Перезапросить статус.
     */
    public readonly refresh = output<void>();

    /**
     * Войти заново, чтобы токен получил роль игрока.
     */
    public readonly relogin = output<void>();

    /**
     * Состояние для показа.
     */
    protected readonly state = computed<ApplicationState>(() => {
        switch (this.status()) {
            case 'pending':
                return 'pending';
            case 'rejected':
                return 'rejected';
            case 'approved':
            case 'verified':
                return 'approved';
            default:
                return 'none';
        }
    });

    /**
     * Шаги хода проверки с состоянием каждого.
     */
    protected readonly timeline = computed(() => {
        const state = this.state();
        return [
            { key: 'sent', state: state === 'none' ? 'todo' : 'done' },
            {
                key: 'review',
                state:
                    state === 'pending'
                        ? 'current'
                        : state === 'none'
                          ? 'todo'
                          : state === 'rejected'
                            ? 'failed'
                            : 'done',
            },
            { key: 'access', state: state === 'approved' ? 'done' : 'todo' },
        ] as const;
    });
}
