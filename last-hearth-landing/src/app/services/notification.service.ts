import { UserService } from './user.service';
import { inject, Injectable } from '@angular/core';
import { SettlementService } from './settlement.service';
import { ServerInformationService } from './server-information.service';
import { Subject, merge, startWith, switchMap } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private readonly userService = inject(UserService);

    public updateAllNotification$ = new Subject<void>();

    private readonly serverInformationService = inject(ServerInformationService);

    public readonly invitations$ = merge(this.updateAllNotification$.pipe(startWith(null))).pipe(switchMap(() => this.userService.getInvitations$()));

    public readonly userVerifications$ = merge(this.updateAllNotification$.pipe(startWith(null))).pipe(switchMap(() => this.serverInformationService.getVerifyRequests()));

}
