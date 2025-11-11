import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ServerInformationService } from '../../services/server-information.service';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Observable, startWith, Subject, switchMap } from 'rxjs';
import { IVerifyRequest } from '../../services/interface/i-verify-request';
import { SettlementService } from '../../services/settlement.service';
import { NotificationService } from '../../services/notification.service';
import { PlayerVerifyRequestComponent } from './player-verification/player-verify-request.component';
import { CreateQuestionFormComponent } from './player-verification/create-question-form/create-question-form.component';
import { SettlementVerificationRequestComponent } from './settlement-verification-request/settlement-verification-request.component';
import { TuiPulse, TuiTabs } from '@taiga-ui/kit';
import { NewsService } from '@app/services/news.service';
import { CreateNewsComponent } from './create-news/create-news.component';
/**
 * Компонент страницы администратора.
 */
@Component({
    standalone: true,
    selector: 'app-admin',
    imports: [
        PlayerVerifyRequestComponent,
        AsyncPipe,
        SettlementVerificationRequestComponent,
        TuiTabs,
        CommonModule,
        TuiPulse,
        CreateQuestionFormComponent,
        CreateNewsComponent,
    ],
    templateUrl: './admin.component.html',
    styleUrl: './admin.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent {
    /**
     * Сервис информации о сервере.
     */
    private readonly serverInfo: ServerInformationService = inject(ServerInformationService);

    /**
     * Сервис уведомлений.
     */
    private readonly notificationService = inject(NotificationService);

    /**
     * Сервис поселений.
     */
    private readonly settlementService: SettlementService = inject(SettlementService);

    /**
     * {@link Subject} Обновления списка запросов верификаций игроков.
     */
    private readonly verificationsUpdate$: Subject<void> = new Subject<void>();

    /**
     * {@link Observable} Списка запросов верификации.
     */
    protected readonly verificationRequests$: Observable<IVerifyRequest[]> = this.verificationsUpdate$
        .pipe(startWith(null))
        .pipe(switchMap(() => this.serverInfo.getVerifyRequests()));

    /**
     * {@link Observable} Списка запросов верификации.
     */
    protected readonly settlementsRequests$ = this.settlementService.getSettlementsRequests$();

    /**
     * Индекс открытой вкладки.
     */
    protected activeItemIndex: number = 0;

    /**
     * Обновляет данные анкет и уведомлений.
     */
    protected dataUpdate(): void {
        this.verificationsUpdate$.next();
        this.notificationService.updateAllNotification$.next();
    }
}
