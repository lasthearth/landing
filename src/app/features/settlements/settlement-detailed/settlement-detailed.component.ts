import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { TuiDialogContext } from '@taiga-ui/core';
import { ISettlement } from '@entities/settlement';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { UserService, IPlayer } from '@entities/user';
import { TuiPulse } from '@taiga-ui/kit';
import { catchError, of, tap } from 'rxjs';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { TranslatePipe } from '@core/i18n';

@Component({
    selector: 'app-settlement-detailed',
    templateUrl: './settlement-detailed.component.html',
    styles: [':host { display: block; padding-top: 32px; }'],
    imports: [TuiPulse, ImageLoaderComponent, TranslatePipe],
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
        const leaderId = this.settlementData.leader.user_id;

        this.userService
            .getPlayersBatch$([leaderId, ...this.settlementData.members.map((m) => m.user_id)])
            .pipe(
                tap((players) => {
                    this.leader = players.find((p) => p.user_id === leaderId) ?? null;
                    this.users = players.filter((p) => p.user_id !== leaderId);
                    this.onlineCount = players.filter((p) => p?.is_online).length;
                    this.cdr.detectChanges();
                }),
                catchError((error) => {
                    console.error('[SettlementDetailed] Ошибка загрузки участников:', error);
                    return of(null);
                })
            )
            .subscribe();
    }
}
