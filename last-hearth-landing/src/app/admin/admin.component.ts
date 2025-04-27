import { Component, inject } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { CreateQuestionComponent } from '../create-question/create-question.component';
import { ServerInformationService } from '../services/server-information.service';
import { VerifyRequestComponent } from '../verify-request/verify-request.component';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'app-admin',
    imports: [VerifyRequestComponent, AsyncPipe],
    templateUrl: './admin.component.html',
    styleUrl: './admin.component.less'
})
export class AdminComponent {
    private readonly dialogs = inject(TuiDialogService);

    private readonly serverInfo = inject(ServerInformationService);

    protected readonly verificationRequests$ = this.serverInfo.getVerifyRequests();

    protected openCreateQuestionDialog() {
        this.dialogs.open(new PolymorpheusComponent(CreateQuestionComponent)).subscribe();
    }
}
