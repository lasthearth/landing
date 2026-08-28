import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { catchError, EMPTY, Observable, of, tap } from 'rxjs';
import { SettlementService, isSettlementMember } from '@entities/settlement';
import { UserService } from '@entities/user';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { I18nService } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';

/**
 * Хранилище собственных заявок игрока на вступление в поселения.
 *
 * Список заявок и признак «уже состою в поселении» загружаются один раз на
 * страницу списка селений, а не на каждую карточку. Карточка и диалог
 * «Подробнее» читают одно и то же состояние, поэтому не расходятся после
 * отправки или отзыва заявки.
 */
@Injectable({
    providedIn: 'root',
})
export class MyJoinRequestsStore {
    /**
     * Сервис поселений.
     */
    private readonly settlementService = inject(SettlementService);

    /**
     * Сервис данных о пользователе.
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
     * Идентификаторы заявок по идентификатору поселения.
     * Идентификатор заявки нужен для отзыва: эндпоинт отмены работает по нему.
     */
    private readonly requestIdBySettlement: WritableSignal<Record<string, string>> = signal({});

    /**
     * Признак того, что игрок уже состоит в каком-либо поселении.
     * Пока значение не загружено — `null`, кнопка в этот момент не показывается.
     */
    private readonly hasSettlement: WritableSignal<boolean | null> = signal(null);

    /**
     * Поселения, по которым идёт запрос (подача или отзыв заявки).
     */
    private readonly pending: WritableSignal<Record<string, boolean>> = signal({});

    /**
     * Признак того, что состояние уже загружалось.
     * Защищает от повторной загрузки при каждом рендере списка.
     */
    private loaded = false;

    /**
     * Признак верифицированного игрока.
     * Верифицированными считаются пользователи с ролью `admin` или `player`.
     */
    private readonly verified: WritableSignal<boolean> = signal(false);

    /**
     * Признак авторизованного пользователя.
     */
    private readonly authorized: WritableSignal<boolean> = signal(false);

    /**
     * Можно ли в принципе подавать заявки: игрок авторизован, верифицирован
     * и не состоит ни в одном поселении.
     */
    public readonly canApply: Signal<boolean> = computed(
        () => this.authorized() && this.verified() && this.hasSettlement() === false
    );

    /**
     * Показывать ли подсказку о верификации вместо кнопки.
     */
    public readonly needsVerification: Signal<boolean> = computed(
        () => this.authorized() && !this.verified() && this.hasSettlement() === false
    );

    /**
     * Загружает состояние заявок и членства игрока.
     *
     * Оба запроса помечены `SKIP_ERROR_ALERT`: отсутствие поселения — штатный
     * 404, а не ошибка, и показывать по нему попап нельзя.
     */
    public load(): void {
        const userId = this.userService.userId;

        this.authorized.set(!!userId);
        this.verified.set(
            this.userService.roles.includes('admin') || this.userService.roles.includes('player')
        );

        if (!userId || this.loaded) {
            return;
        }

        this.loaded = true;
        const context = new HttpContext().set(SKIP_ERROR_ALERT, true);

        this.settlementService
            .getSettlementInfo(userId, context)
            .pipe(catchError(() => of(null)))
            .subscribe((settlement) => this.hasSettlement.set(isSettlementMember(settlement, userId)));

        this.settlementService
            .getMyJoinRequests$(userId, context)
            .pipe(catchError(() => of([])))
            .subscribe((requests) =>
                this.requestIdBySettlement.set(
                    Object.fromEntries(requests.map((request) => [request.settlement_id, request.id]))
                )
            );
    }

    /**
     * Проверяет, отправлена ли заявка в указанное поселение.
     *
     * @param settlementId Идентификатор поселения.
     * @returns true, если активная заявка уже есть.
     */
    public hasRequest(settlementId: string): boolean {
        return settlementId in this.requestIdBySettlement();
    }

    /**
     * Проверяет, выполняется ли сейчас запрос по указанному поселению.
     *
     * @param settlementId Идентификатор поселения.
     * @returns true, если запрос в процессе.
     */
    public isPending(settlementId: string): boolean {
        return this.pending()[settlementId] === true;
    }

    /**
     * Отправляет заявку на вступление в поселение.
     *
     * Ответ сервера пустой, поэтому идентификатор заявки перечитывается
     * из списка собственных заявок — без него нельзя отозвать заявку.
     *
     * @param settlementId Идентификатор поселения.
     */
    public apply(settlementId: string): void {
        if (this.isPending(settlementId)) {
            return;
        }

        this.setPending(settlementId, true);

        this.settlementService
            .createJoinRequest$(settlementId)
            .pipe(
                tap(() => {
                    this.requestStatus.showSuccess(this.i18n.translate('settlements.joinRequest.sent'));
                    this.refreshRequests();
                }),
                catchError((error: HttpErrorResponse) => this.reportApplyError(error))
            )
            .subscribe({
                complete: () => this.setPending(settlementId, false),
                error: () => this.setPending(settlementId, false),
            });
    }

    /**
     * Отзывает ранее отправленную заявку.
     *
     * @param settlementId Идентификатор поселения.
     */
    public cancel(settlementId: string): void {
        const requestId = this.requestIdBySettlement()[settlementId];

        if (!requestId || this.isPending(settlementId)) {
            return;
        }

        this.setPending(settlementId, true);

        this.settlementService
            .cancelJoinRequest$(requestId)
            .pipe(
                tap(() => {
                    this.requestStatus.showSuccess(
                        this.i18n.translate('settlements.joinRequest.canceled')
                    );
                    this.forget(settlementId);
                }),
                catchError((error: HttpErrorResponse) => {
                    this.requestStatus.showError(
                        this.i18n.translate('settlements.joinRequest.cancelError')
                    );

                    // 404 значит, что заявки уже нет — состояние синхронизируем.
                    if (error.status === 404) {
                        this.forget(settlementId);
                    }

                    return EMPTY;
                })
            )
            .subscribe({
                complete: () => this.setPending(settlementId, false),
                error: () => this.setPending(settlementId, false),
            });
    }

    /**
     * Перечитывает список собственных заявок после успешной подачи.
     */
    private refreshRequests(): void {
        const userId = this.userService.userId;

        if (!userId) {
            return;
        }

        this.settlementService
            .getMyJoinRequests$(userId, new HttpContext().set(SKIP_ERROR_ALERT, true))
            .pipe(catchError(() => of([])))
            .subscribe((requests) =>
                this.requestIdBySettlement.set(
                    Object.fromEntries(requests.map((request) => [request.settlement_id, request.id]))
                )
            );
    }

    /**
     * Показывает объяснение отказа при подаче заявки.
     *
     * Конкретный лимит активных заявок знает только бэкенд, поэтому в тексте
     * названо действие, а не число.
     *
     * @param error Ошибка HTTP.
     * @returns Пустой поток — ошибка уже объяснена пользователю.
     */
    private reportApplyError(error: HttpErrorResponse): Observable<never> {
        const key =
            error.status === 409
                ? 'settlements.joinRequest.errors.conflict'
                : error.status === 429
                  ? 'settlements.joinRequest.errors.tooMany'
                  : error.status === 404
                    ? 'settlements.joinRequest.errors.notFound'
                    : 'settlements.joinRequest.errors.unknown';

        this.requestStatus.showError(this.i18n.translate(key));

        return EMPTY;
    }

    /**
     * Убирает заявку из состояния.
     *
     * @param settlementId Идентификатор поселения.
     */
    private forget(settlementId: string): void {
        const next = { ...this.requestIdBySettlement() };
        delete next[settlementId];
        this.requestIdBySettlement.set(next);
    }

    /**
     * Помечает поселение как ожидающее ответа сервера.
     *
     * @param settlementId Идентификатор поселения.
     * @param value Признак ожидания.
     */
    private setPending(settlementId: string, value: boolean): void {
        this.pending.set({ ...this.pending(), [settlementId]: value });
    }
}
