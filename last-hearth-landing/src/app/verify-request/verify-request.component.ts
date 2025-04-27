import { ServerInformationService } from '../services/server-information.service';
import { IVerifyRequest } from './../services/interface/i-verify-request';
import { Component, inject, input, InputSignal } from '@angular/core';

@Component({
    selector: 'app-verify-request',
    templateUrl: './verify-request.component.html',
})
export class VerifyRequestComponent {
    public data: InputSignal<IVerifyRequest> = input.required<IVerifyRequest>();

    private readonly serverInfo = inject(ServerInformationService);

    protected approve() {
        this.serverInfo.postVerifySuccess(this.data().user_id).subscribe();
    }
}
