import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { Component, inject, input, InputSignal } from '@angular/core';
import { ConfirmApproveComponent } from '../confirm-approve/confirm-approve.component';
import { ConfirmRejectComponent } from '../confirm-reject/confirm-reject.component';
import { IVerifyRequest } from '../../services/interface/i-verify-request';

@Component({
    selector: 'app-verify-request',
    imports: [TuiIcon],
    templateUrl: './verify-request.component.html',
})
export class VerifyRequestComponent {
    private readonly dialogService = inject(TuiDialogService);

    public data: InputSignal<IVerifyRequest> = input.required<IVerifyRequest>();

    protected approve() {
        this.dialogService.open(new PolymorpheusComponent(ConfirmApproveComponent), { size: 'auto', data: { userId: this.data().user_id } }).subscribe();
    }

    protected reject() {
        this.dialogService.open(new PolymorpheusComponent(ConfirmRejectComponent), { size: 'l', data: { userId: this.data().user_id } }).subscribe();
    }
}
