import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { TuiDialogContext } from '@taiga-ui/core';
import { ISettlement } from '@entities/settlement';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { UserService, IPlayer } from '@entities/user';
import { TuiPulse } from '@taiga-ui/kit';
import { tap } from 'rxjs';

@Component({
    selector: 'app-settlement-detailed',
    templateUrl: './settlement-detailed.component.html',
    styles: [':host { display: block; padding-top: 32px; }'],
    imports: [TuiPulse],
})
export class SettlementDetailedComponent implements OnInit {
    /**
     * Контекст открытого диалогового окна.
     */
    private readonly context: TuiDialogContext<void, { settlement: ISettlement }> =
        inject<TuiDialogContext<void, { settlement: ISettlement }>>(POLYMORPHEUS_CONTEXT);

    settlementData = this.context.data.settlement;

    private readonly userService: UserService = inject(UserService);
    private readonly cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

    protected leader: IPlayer | null = null;
    protected users: IPlayer[] = [];
    protected onlineCount: number = 0;

    public ngOnInit(): void {
        if (!this.userService.userId) {
            return;
        }

        this.userService
            .getPlayer$(this.settlementData.leader.user_id)
            .pipe(
                tap((u) => {
                    this.leader = u;
                    if (u?.is_online) {
                        this.onlineCount++;
                    }
                    this.cdr.detectChanges();
                })
            )
            .subscribe();

        this.settlementData.members.forEach((m) => {
            this.userService
                .getPlayer$(m.user_id)
                .pipe(
                    tap((u) => {
                        this.users.push(u);
                        if (u?.is_online) {
                            this.onlineCount++;
                        }
                        this.cdr.detectChanges();
                    })
                )
                .subscribe();
        });
    }
}
