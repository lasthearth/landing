import { ChangeDetectionStrategy, inject, input, InputSignal, TemplateRef, ViewChild } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { IVerifyRequest } from '../../services/interface/i-verify-request';
import { IRequestSettlement } from '../../settlements/interfaces/i-request-settlement';
import { TuiAlertService, TuiButton, TuiDialogContext, TuiDialogService } from '@taiga-ui/core';
import {
    PolymorpheusComponent,
    PolymorpheusContent,
    PolymorpheusOutlet,
    PolymorpheusTemplate,
} from '@taiga-ui/polymorpheus';
import { ConfirmApproveComponent } from '../confirm-approve/confirm-approve.component';
import { ConfirmRejectComponent } from '../confirm-reject/confirm-reject.component';
import { TuiSwipe } from '@taiga-ui/cdk/directives/swipe';
import { TuiPreview, TuiPreviewDialogService } from '@taiga-ui/kit';

@Component({
    standalone: true,
    selector: 'app-settlement-request',
    imports: [PolymorpheusOutlet, PolymorpheusTemplate, TuiButton, TuiPreview, TuiSwipe],
    templateUrl: './settlement-request.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementRequestComponent {
    public data: InputSignal<IRequestSettlement> = input.required<IRequestSettlement>();

    public previewDesc: string | null = null;

    private readonly dialogService = inject(TuiDialogService);

    protected approve() {
        this.dialogService
            .open(new PolymorpheusComponent(ConfirmApproveComponent), {
                size: 'auto',
                data: this.data().leader.user_id,
            })
            .subscribe();
    }

    protected reject() {
        this.dialogService
            .open(new PolymorpheusComponent(ConfirmRejectComponent), { size: 'l', data: this.data().leader.user_id })
            .subscribe();
    }

    private readonly previewService = inject(TuiPreviewDialogService);
    private readonly alerts = inject(TuiAlertService);

    @ViewChild('preview')
    protected readonly preview?: TemplateRef<TuiDialogContext>;

    protected previewContent: PolymorpheusContent;

    protected show(url: string, desc: string): void {
        this.previewContent = url;
        this.previewDesc = desc;
        this.previewService.open(this.preview || '').subscribe();
    }
}
