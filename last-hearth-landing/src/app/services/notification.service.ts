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
    private readonly userService = inject(UserService);

    public updateAllNotification$ = new Subject<void>();

    private readonly serverInformationService = inject(ServerInformationService);

    public readonly invitations$: Observable<ISettlementInvitation[]> = this.updateAllNotification$.pipe(
        startWith(null),
        switchMap(() => this.userService.getInvitations$())
    );

    public readonly userVerifications$: Observable<IVerifyRequest[]> = this.updateAllNotification$.pipe(
        startWith(null),
        switchMap(() => this.serverInformationService.getVerifyRequests())
    );
}
