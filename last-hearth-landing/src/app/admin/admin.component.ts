import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { ServerInformationService } from '../services/server-information.service';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { IVerifyRequest } from '../services/interface/i-verify-request';
import { VerifyRequestComponent } from './verify-request/verify-request.component';
import { CreateQuestionComponent } from './create-question/create-question.component';
import { SettlementRequestComponent } from './settlement-request/settlement-request.component';

/**
 * Компонент страницы администратора.
 */
@Component({
    standalone: true,
    selector: 'app-admin',
    imports: [VerifyRequestComponent, AsyncPipe, SettlementRequestComponent],
    templateUrl: './admin.component.html',
    styleUrl: './admin.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent {
    /**
     * Сервис диалогов.
     */
    private readonly dialogs: TuiDialogService = inject(TuiDialogService);

    /**
     * Сервис информации о сервере.
     */
    private readonly serverInfo: ServerInformationService = inject(ServerInformationService);

    /**
     * {@link Observable} Списка запросов верификации.
     */
    protected readonly verificationRequests$: Observable<IVerifyRequest[]> = this.serverInfo.getVerifyRequests();

    /**
     * {@link Observable} Списка запросов верификации.
     */
    protected readonly settlementsRequests$ = this.serverInfo.getSettlementsRequests$();

    /**
     * Открывает диалог создания вопроса.
     */
    protected openCreateQuestionDialog(): void {
        this.dialogs.open(new PolymorpheusComponent(CreateQuestionComponent)).subscribe();
    }
}
