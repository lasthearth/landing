import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, Observable, of } from 'rxjs';
import { TuiIcon } from '@taiga-ui/core';

import { Mail, MailApiService, MailState, MAIL_SCOPES } from '@entities/mail';
import { UserService } from '@entities/user';
import { I18nService, TranslatePipe } from '@core/i18n';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { MailRow } from '../../../model/mail-row.model';

/**
 * Подписи состояний письма.
 */
const STATE_LABEL_KEYS: Record<MailState, string> = {
    active: 'mail.list.stateActive',
    expired: 'mail.list.stateExpired',
    revoked: 'mail.list.stateRevoked',
};

/**
 * Классы бейджа состояния: цвет только токенами.
 */
const STATE_CLASSES: Record<MailState, string> = {
    active: 'bg-peace/15 text-peace',
    expired: 'bg-warning-ink/15 text-warning-ink',
    revoked: 'bg-lh-danger/15 text-lh-danger',
};

/**
 * Список отправленных писем в админке.
 *
 * Пагинация курсорная («Загрузить ещё»), свежие письма первыми. У каждого письма
 * видны получатель, `claimed_count` (сколько игроков уже получили), срок жизни
 * и состояние: истёкшее и отозванное письмо помечены бейджем, потому что
 * в почте игрока его уже нет.
 *
 * Ники получателей догружаются пачкой по идентификаторам: письмо адресовано
 * `user_id`, а читать список идентификаторов неудобно.
 */
@Component({
    selector: 'app-mail-sent-list',
    imports: [TranslatePipe, TuiIcon, EmptyStateComponent, ErrorStateComponent, RelativeTimeComponent],
    templateUrl: './mail-sent-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MailSentListComponent implements OnInit {
    /**
     * API почты.
     */
    private readonly mailApi = inject(MailApiService);

    /**
     * Сервис пользователя: скоупы администратора и ники по идентификаторам.
     */
    private readonly userService = inject(UserService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Ссылка на жизненный цикл компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Внешний триггер перечитывания списка: срабатывает после отправки письма.
     */
    public readonly refreshTrigger = input<Observable<void> | null>(null);

    /**
     * Есть ли право чтения (`mail:read`).
     */
    protected readonly canRead = computed(() => this.userService.hasScope(MAIL_SCOPES.read));

    /**
     * Показывать состояние «нет прав» вместо списка.
     */
    protected readonly noRights = computed(() => !this.canRead());

    /**
     * Загруженные письма, свежие первыми.
     */
    protected readonly mails = signal<Mail[]>([]);

    /**
     * Ники получателей по идентификаторам.
     */
    protected readonly names = signal<Record<string, string>>({});

    /**
     * Признак первоначальной загрузки.
     */
    protected readonly loading = signal(false);

    /**
     * Признак дозагрузки следующей страницы.
     */
    protected readonly loadingMore = signal(false);

    /**
     * Признак ошибки загрузки.
     */
    protected readonly error = signal(false);

    /**
     * Курсор следующей страницы; пустая строка — страниц больше нет.
     */
    protected readonly nextPageToken = signal('');

    /**
     * Показывать только письма всем игрокам.
     */
    protected readonly broadcastOnly = signal(false);

    /**
     * Строки списка, подготовленные к показу.
     */
    protected readonly rows = computed(() => this.mails().map((mail) => this.toRow(mail)));

    /**
     * Идентификаторы, для которых ники уже запрошены.
     */
    private readonly requestedNames = new Set<string>();

    /**
     * @inheritdoc
     */
    public ngOnInit(): void {
        // Вход приходит с привязкой шаблона, а она применяется после конструктора:
        // подписка в конструкторе увидела бы `null` и не сработала ни разу.
        this.refreshTrigger()
            ?.pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.load());

        this.load();
    }

    /**
     * Повторяет загрузку после ошибки.
     */
    protected retry(): void {
        this.load();
    }

    /**
     * Дозагружает следующую страницу.
     */
    protected loadMore(): void {
        this.load(this.nextPageToken());
    }

    /**
     * Переключает фильтр «только всем игрокам» и перечитывает список с начала.
     *
     * @param event Событие изменения флажка.
     */
    protected toggleBroadcastOnly(event: Event): void {
        const input = event.target;

        if (!(input instanceof HTMLInputElement)) {
            return;
        }

        this.broadcastOnly.set(input.checked);
        this.load();
    }

    /**
     * Загружает страницу писем.
     *
     * @param pageToken Курсор страницы; пусто — первая страница.
     */
    private load(pageToken = ''): void {
        if (!this.canRead()) {
            return;
        }

        const isInitial = pageToken.length === 0;

        if (isInitial) {
            this.loading.set(true);
        } else {
            this.loadingMore.set(true);
        }

        this.error.set(false);

        this.mailApi
            .listSent$(this.broadcastOnly(), pageToken)
            .pipe(
                catchError(() => {
                    this.error.set(true);

                    return of(null);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((page) => {
                if (page) {
                    this.mails.update((list) => (isInitial ? page.mails : [...list, ...page.mails]));
                    this.nextPageToken.set(page.nextPageToken);
                    this.resolveNames(page.mails);
                }

                this.loading.set(false);
                this.loadingMore.set(false);
            });
    }

    /**
     * Догружает ники получателей страницы.
     *
     * @param mails Письма загруженной страницы.
     */
    private resolveNames(mails: Mail[]): void {
        const missing = [
            ...new Set(
                mails
                    .map((mail) => mail.recipient)
                    .filter((id) => id.length > 0 && !this.names()[id] && !this.requestedNames.has(id))
            ),
        ];

        if (missing.length === 0) {
            return;
        }

        missing.forEach((id) => this.requestedNames.add(id));

        this.userService
            .getPlayersBatch$(missing)
            .pipe(
                catchError(() => of([])),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((players) => {
                this.names.update((names) => ({
                    ...names,
                    ...Object.fromEntries(players.map((player) => [player.user_id, player.user_game_name])),
                }));
            });
    }

    /**
     * Готовит письмо к показу: состояние, бейдж и подписи вложений.
     *
     * @param mail Письмо из ответа сервера.
     * @returns Строка списка.
     */
    private toRow(mail: Mail): MailRow {
        const state = this.stateOf(mail);

        return {
            id: mail.id,
            recipient: mail.broadcast
                ? this.i18n.translate('mail.list.broadcast')
                : (this.names()[mail.recipient] ?? mail.recipient),
            broadcast: mail.broadcast,
            title: mail.title,
            body: mail.body,
            createdAt: mail.createdAt,
            expiresAt: mail.expiresAt,
            state,
            stateKey: STATE_LABEL_KEYS[state],
            stateClass: STATE_CLASSES[state],
            claimedCount: mail.claimedCount,
            attachmentTexts: mail.attachments.map((attachment) =>
                attachment.kind === 'coins'
                    ? this.i18n.translate('mail.compose.coinsText', { amount: attachment.amount })
                    : this.i18n.translate('mail.compose.itemText', {
                          code: attachment.gameCode,
                          quantity: attachment.quantity,
                      })
            ),
        };
    }

    /**
     * Определяет состояние письма.
     *
     * Отзыв важнее срока: отозванное письмо недоступно независимо от даты.
     *
     * @param mail Письмо из ответа сервера.
     * @returns Состояние для бейджа.
     */
    private stateOf(mail: Mail): MailState {
        if (mail.revoked) {
            return 'revoked';
        }

        return mail.expiresAt !== null && mail.expiresAt.getTime() <= Date.now() ? 'expired' : 'active';
    }
}