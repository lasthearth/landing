import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    InputSignal,
    output,
    OutputEmitterRef,
    signal,
    Signal,
} from '@angular/core';
import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { TuiIcon } from '@taiga-ui/core';
import { IJoinRequest, ISettlement, SettlementService } from '@entities/settlement';
import { IPlayer, UserService } from '@entities/user';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { I18nService, TranslatePipe } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';
import { EmptyStateComponent } from '@shared/ui/empty-state';

/**
 * Панель заявок на вступление со стороны поселения.
 *
 * Ники заявителей грузятся одним батчем, а не запросом на заявку.
 * Загрузка списка помечена `SKIP_ERROR_ALERT`: гейт по праву может отстать
 * от смены владельца, и 403 не должен выливаться в попап.
 */
@Component({
    selector: 'app-join-requests-panel',
    standalone: true,
    imports: [TuiIcon, TranslatePipe, EmptyStateComponent],
    templateUrl: './join-requests-panel.component.html',
    styleUrl: './join-requests-panel.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinRequestsPanelComponent {
    /**
     * Сервис поселений.
     */
    private readonly settlementService = inject(SettlementService);

    /**
     * Сервис данных о пользователях — источник игровых имён заявителей.
     */
    private readonly userService = inject(UserService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Сервис уведомлений о результате запроса.
     */
    private readonly requestStatus = inject(RequestStatusService);

    /**
     * Поселение, чьи заявки показываются.
     */
    public readonly settlement: InputSignal<ISettlement> = input.required();

    /**
     * Сообщает, что состав поселения изменился и страницу нужно обновить.
     */
    public readonly membersChanged: OutputEmitterRef<void> = output();

    /**
     * Список заявок на вступление.
     */
    protected readonly requests = signal<IJoinRequest[]>([]);

    /**
     * Игровые имена заявителей по идентификатору пользователя.
     */
    private readonly names = signal<Record<string, string>>({});

    /**
     * Признак выполняющегося решения по заявке.
     */
    protected readonly busy = signal(false);

    /**
     * Признак загрузки списка заявок.
     */
    protected readonly loading = signal(true);

    /**
     * Признак пустого списка после загрузки.
     */
    protected readonly isEmpty: Signal<boolean> = computed(
        () => !this.loading() && this.requests().length === 0
    );

    constructor() {
        this.load();
    }

    /**
     * Возвращает игровое имя заявителя.
     *
     * @param userId Идентификатор пользователя.
     * @returns Игровое имя или подпись загрузки.
     */
    protected nameOf(userId: string): string {
        return this.names()[userId] ?? this.i18n.translate('settlements.joinRequests.loadingName');
    }

    /**
     * Одобряет заявку на вступление.
     *
     * @param request Заявка на вступление.
     */
    protected approve(request: IJoinRequest): void {
        if (this.busy()) {
            return;
        }

        this.busy.set(true);

        this.settlementService
            .approveJoinRequest$(this.settlement().id, request.id)
            .pipe(
                tap(() => {
                    this.requestStatus.showSuccess(
                        this.i18n.translate('settlements.joinRequests.approved')
                    );
                    this.forget(request.id);
                    this.membersChanged.emit();
                }),
                catchError((error: HttpErrorResponse) => {
                    this.requestStatus.showError(
                        this.i18n.translate(
                            error.status === 409
                                ? 'settlements.joinRequests.errors.alreadyJoined'
                                : 'settlements.joinRequests.errors.approve'
                        )
                    );

                    if (error.status === 409) {
                        this.forget(request.id);
                    }

                    return of(null);
                })
            )
            .subscribe({ complete: () => this.busy.set(false) });
    }

    /**
     * Отклоняет заявку на вступление.
     *
     * @param request Заявка на вступление.
     */
    protected reject(request: IJoinRequest): void {
        if (this.busy()) {
            return;
        }

        this.busy.set(true);

        this.settlementService
            .rejectJoinRequest$(this.settlement().id, request.id)
            .pipe(
                tap(() => {
                    this.requestStatus.showSuccess(
                        this.i18n.translate('settlements.joinRequests.rejected')
                    );
                    this.forget(request.id);
                }),
                catchError(() => {
                    this.requestStatus.showError(
                        this.i18n.translate('settlements.joinRequests.errors.reject')
                    );

                    return of(null);
                })
            )
            .subscribe({ complete: () => this.busy.set(false) });
    }

    /**
     * Загружает список заявок и игровые имена заявителей.
     */
    private load(): void {
        this.loading.set(true);

        this.settlementService
            .getJoinRequests$(this.settlement().id, new HttpContext().set(SKIP_ERROR_ALERT, true))
            .pipe(catchError(() => of([] as IJoinRequest[])))
            .subscribe((requests) => {
                this.requests.set(requests);
                this.loading.set(false);
                this.loadNames(requests);
            });
    }

    /**
     * Загружает игровые имена заявителей одним батчем.
     *
     * @param requests Список заявок.
     */
    private loadNames(requests: IJoinRequest[]): void {
        if (requests.length === 0) {
            return;
        }

        this.userService
            .getPlayersBatch$(requests.map((request) => request.user_id))
            .pipe(catchError(() => of([] as IPlayer[])))
            .subscribe((players) =>
                this.names.set(
                    Object.fromEntries(players.map((player) => [player.user_id, player.user_game_name]))
                )
            );
    }

    /**
     * Убирает решённую заявку из списка.
     *
     * @param requestId Идентификатор заявки.
     */
    private forget(requestId: string): void {
        this.requests.set(this.requests().filter((request) => request.id !== requestId));
    }
}
