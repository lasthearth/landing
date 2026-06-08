import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { ChangeDetectionStrategy, Component, inject, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { IVerifyRequest } from '@services/interface/i-verify-request';
import { ConfirmApproveComponent } from '../confirm-approve/confirm-approve.component';
import { ConfirmRejectComponent } from '../confirm-reject/confirm-reject.component';

/**
 * Компонент отображения запроса на верификацию от игрока.
 */
@Component({
    standalone: true,
    selector: 'app-player-verify-request',
    imports: [TuiIcon],
    templateUrl: './player-verify-request.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerVerifyRequestComponent {
    /**
     * Сервис диалогов.
     */
    private readonly dialogService: TuiDialogService = inject(TuiDialogService);

    /**
     * Данные запроса верификации.
     */
    public readonly data: InputSignal<IVerifyRequest> = input.required<IVerifyRequest>();

    /**
     * Событие принятия/отклонения запроса.
     */
    public requestWasWatched: OutputEmitterRef<void> = output();

    /**
     * Открывает окно подтверждения принятия анкеты.
     */
    protected approve(): void {
        this.dialogService.open(new PolymorpheusComponent(ConfirmApproveComponent), { size: 'auto', data: { userId: this.data().user_id, type: 'user' } }).subscribe({
            complete: () => {
                this.requestWasWatched.emit();
            },
        });
    }

    /**
     * Открывает окно подтверждения отклонения анкеты.
     */
    protected reject(): void {
        this.dialogService.open(new PolymorpheusComponent(ConfirmRejectComponent), { size: 'l', data: { userId: this.data().user_id, type: 'user' } }).subscribe({
            complete: () => {
                this.requestWasWatched.emit();
            },
        });
    }
}
