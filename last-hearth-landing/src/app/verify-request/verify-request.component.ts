import { TuiAlertService, TuiIcon } from '@taiga-ui/core';
import { ServerInformationService } from '../services/server-information.service';
import { IVerifyRequest } from './../services/interface/i-verify-request';
import { ChangeDetectorRef, Component, inject, input, InputSignal } from '@angular/core';

@Component({
    selector: 'app-verify-request',
    imports: [TuiIcon],
    templateUrl: './verify-request.component.html',
})
export class VerifyRequestComponent {
    private readonly alerts = inject(TuiAlertService);

    public data: InputSignal<IVerifyRequest> = input.required<IVerifyRequest>();

    private readonly serverInfo = inject(ServerInformationService);

    protected approve() {
        this.serverInfo.postVerifySuccess(this.data().user_id).subscribe();

        this.alerts
            .open('', { label: 'Анкета одобрена!', appearance: 'positive', })
            .subscribe();
    }
}
