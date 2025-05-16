import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { IVerifyRequest } from './../services/interface/i-verify-request';
import { Component, inject, input, InputSignal } from '@angular/core';
import { ApproveComponent } from '../approve/approve.component';
import { RejectComponent } from '../reject/reject.component';

@Component({
    selector: 'app-verify-request',
    imports: [TuiIcon],
    templateUrl: './verify-request.component.html',
})
export class VerifyRequestComponent {
    private readonly dialogService = inject(TuiDialogService);

    public data: InputSignal<IVerifyRequest> = input.required<IVerifyRequest>();

    protected approve() {
        this.dialogService.open(new PolymorpheusComponent(ApproveComponent), { size: 'auto', data: this.data().user_id }).subscribe();
    }

    protected reject() {
        this.dialogService.open(new PolymorpheusComponent(RejectComponent), { size: 'l', data: this.data().user_id }).subscribe();
    }
}
