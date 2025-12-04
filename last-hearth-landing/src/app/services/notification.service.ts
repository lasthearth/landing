import { UserService } from './user.service';
import { inject, Injectable } from '@angular/core';
import { ServerInformationService } from './server-information.service';
import { Observable, Subject, merge, startWith, switchMap } from 'rxjs';
import { ISettlementInvitation } from './interface/i-settlement-invitation';
import { IVerifyRequest } from './interface/i-verify-request';

@Injectable({
    providedIn: 'root',
})
export class NotificationService {
    /**
     * Сервисные зависимости
     */
    private readonly userService = inject(UserService);
    private readonly serverInformationService = inject(ServerInformationService);

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
        switchMap(() => this.serverInformationService.getVerifyRequests())
    );
}
