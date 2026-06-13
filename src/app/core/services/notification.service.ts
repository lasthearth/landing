import { UserService } from '@entities/user';
import { inject, Injectable } from '@angular/core';
import { VerificationService } from '@features/verification';
import { Observable, of, Subject, startWith, switchMap } from 'rxjs';
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
     * Для неавторизованных пользователей возвращает пустой массив.
     */
    public readonly invitations$: Observable<ISettlementInvitation[]> = this.updateAllNotification$.pipe(
        startWith(null),
        switchMap(() =>
            this.userService.authState$.pipe(
                switchMap((isAuth) => (isAuth ? this.userService.getInvitations$() : of([])))
            )
        )
    );

    /**
     * Поток запросов на верификацию пользователей.
     * Аналогично invitations$, загружается при подписке и обновляется по триггеру.
     * Для неавторизованных пользователей возвращает пустой массив.
     */
    public readonly userVerifications$: Observable<IVerifyRequest[]> = this.updateAllNotification$.pipe(
        startWith(null),
        switchMap(() =>
            this.userService.authState$.pipe(
                switchMap((isAuth) => (isAuth ? this.verificationService.getVerifyRequests() : of([])))
            )
        )
    );

    /**
     * Поток запросов на верификацию поселений.
     * Аналогично invitations$, загружается при подписке и обновляется по триггеру.
     * Для неавторизованных пользователей возвращает пустой массив.
     */
    public readonly settlementVerifications$: Observable<IRequestSettlement[]> = this.updateAllNotification$.pipe(
        startWith(null),
        switchMap(() =>
            this.userService.authState$.pipe(
                switchMap((isAuth) => (isAuth ? this.settlementService.getSettlementsRequests$() : of([])))
            )
        )
    );
}
