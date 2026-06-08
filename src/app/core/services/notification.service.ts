import { UserService } from '@entities/user';
import { inject, Injectable } from '@angular/core';
import { VerificationService } from '@features/verification';
import { Observable, Subject, merge, startWith, switchMap } from 'rxjs';
import { ISettlementInvitation } from '@entities/settlement';
import { IVerifyRequest } from '@features/verification';
import { SettlementService } from '@entities/settlement';
import { IRequestSettlement } from '@entities/settlement';

@Injectable({
    providedIn: 'root',
})
export class NotificationService {
    /**
     * Сервисные зависимости
     */
    private readonly userService = inject(UserService);
    private readonly verificationService = inject(VerificationService);
    private readonly settlementService = inject(SettlementService);

    /**
     * Триггер для обновления данных (приглашений и запросов на верификацию).
     * Каждый next() по этому Subject инициирует повторную загрузку информации.
     */
    public updateAllNotification$ = new Subject<void>();

    /**
     * Поток приглашений поселений для текущего пользователя.
     * При первом подписании сразу делает запрос (startWith(null)),
     * затем обновляется каждый раз при вызове updateAllNotification$.
     */
    public readonly invitations$: Observable<ISettlementInvitation[]> = this.updateAllNotification$.pipe(
        startWith(null),
        switchMap(() => this.userService.getInvitations$())
    );

    /**
     * Поток запросов на верификацию пользователей.
     * Аналогично invitations$, загружается при подписке и обновляется по триггеру.
     */
    public readonly userVerifications$: Observable<IVerifyRequest[]> = this.updateAllNotification$.pipe(
        startWith(null),
        switchMap(() => this.verificationService.getVerifyRequests())
    );

    /**
     * Поток запросов на верификацию пользователей.
     * Аналогично invitations$, загружается при подписке и обновляется по триггеру.
     */
    public readonly settlementVerifications$: Observable<IRequestSettlement[]> = this.updateAllNotification$.pipe(
        startWith(null),
        switchMap(() => this.settlementService.getSettlementsRequests$())
    );
}
