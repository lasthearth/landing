import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { Component, inject } from '@angular/core';
import { TuiAlertService, TuiDialogContext } from '@taiga-ui/core';
import { ServerInformationService } from '../services/server-information.service';

@Component({
    selector: 'app-approve',
    templateUrl: './approve.component.html'
})
export class ApproveComponent {
    protected readonly context: TuiDialogContext<void, string> = inject<TuiDialogContext<void, string>>(POLYMORPHEUS_CONTEXT);
    private readonly serverInfo = inject(ServerInformationService);
    private readonly alerts = inject(TuiAlertService);

    protected approve() {
        this.serverInfo.postVerifySuccess(this.context.data).subscribe();
        this.alerts
            .open('', { label: 'Анкета одобрена!', appearance: 'positive', })
            .subscribe();
    }
}
