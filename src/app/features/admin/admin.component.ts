import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { VerificationService } from '@features/verification';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Observable, startWith, Subject, switchMap } from 'rxjs';
import { IVerifyRequest } from '@features/verification';
import { SettlementService } from '@entities/settlement';
import { NotificationService } from '@core/services/notification.service';
import { PlayerVerifyRequestComponent } from './player-verification/player-verify-request.component';
import { CreateQuestionFormComponent } from './components/create-question-form/create-question-form.component';
import { QuestionListComponent } from './components/question-list/question-list.component';
import { SettlementVerificationRequestComponent } from './settlement-verification-request/settlement-verification-request.component';
import { CreateNewsComponent } from '../news/components/create-news-form/create-news.component';
import { AdminCoinPanelComponent } from './ui/admin-coin-panel/admin-coin-panel.component';
import { HungerGamesPanelComponent } from './ui/hunger-games-panel/hunger-games-panel.component';
import { TuiPulse, TuiTabs } from '@taiga-ui/kit';

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
        QuestionListComponent,
        CreateNewsComponent,
        AdminCoinPanelComponent,
        HungerGamesPanelComponent,
    ],
    templateUrl: './admin.component.html',
    styleUrl: './admin.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent {
    /**
     * Сервис информации о сервере.
     */
    private readonly verificationService: VerificationService = inject(VerificationService);

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
     * {@link Subject} Обновления списка запросов верификаций селений.
     */
    private readonly settlementVerificationsUpdate$: Subject<void> = new Subject<void>();

    /**
     * {@link Subject} Обновления списка вопросов.
     */
    readonly questionsUpdate$: Subject<void> = new Subject<void>();

    /**
     * {@link Observable} Списка запросов верификации.
     */
    protected readonly verificationRequests$: Observable<IVerifyRequest[]> = this.verificationsUpdate$
        .pipe(startWith(null))
        .pipe(switchMap(() => this.verificationService.getVerifyRequests()));

    /**
     * {@link Observable} Списка запросов верификации.
     */
    protected readonly settlementsRequests$ = this.settlementVerificationsUpdate$
        .pipe(startWith(null))
        .pipe(switchMap(() => this.settlementService.getSettlementsRequests$()));

    /**
     * Индекс открытой вкладки.
     */
    protected activeItemIndex: number = 0;

    /**
     * Обновляет данные анкет и уведомлений.
     */
    protected dataUpdate(): void {
        this.verificationsUpdate$.next();
        this.settlementVerificationsUpdate$.next();
        this.notificationService.updateAllNotification$.next();
    }
}
