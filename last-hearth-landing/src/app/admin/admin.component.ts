import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { CreateQuestionComponent } from '../create-question/create-question.component';
import { ServerInformationService } from '../services/server-information.service';
import { VerifyRequestComponent } from '../verify-request/verify-request.component';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { IVerifyRequest } from '../services/interface/i-verify-request';

/**
 * Компонент страницы администратора.
 */
@Component({
    standalone: true,
    selector: 'app-admin',
    imports: [VerifyRequestComponent, AsyncPipe],
    templateUrl: './admin.component.html',
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
     * Открывает диалог создания вопроса.
     */
    protected openCreateQuestionDialog(): void {
        this.dialogs.open(new PolymorpheusComponent(CreateQuestionComponent)).subscribe();
    }
}
