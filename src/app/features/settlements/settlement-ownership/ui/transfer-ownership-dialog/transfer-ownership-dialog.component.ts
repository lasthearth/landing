import { ChangeDetectionStrategy, Component, computed, inject, signal, Signal } from '@angular/core';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { getOwnerIds, ISettlement } from '@entities/settlement';
import { IPlayer } from '@entities/user';
import { TranslatePipe } from '@core/i18n';
import { TransferOwnershipDialogData } from '../../model/transfer-ownership-dialog-data';

/**
 * Диалог передачи владения поселением.
 *
 * Владение передаётся, а не добавляется: число владельцев не растёт,
 * прежний владелец теряет статус. Поэтому выбор участника отделён от
 * подтверждения — подтверждение спрашивается вторым шагом снаружи.
 */
@Component({
    selector: 'app-transfer-ownership-dialog',
    standalone: true,
    imports: [TranslatePipe],
    templateUrl: './transfer-ownership-dialog.component.html',
    styles: [':host { display: block; padding-top: 32px; }'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferOwnershipDialogComponent {
    /**
     * Контекст диалога: поселение и профили участников.
     */
    protected readonly context: TuiDialogContext<string | null, TransferOwnershipDialogData> =
        inject<TuiDialogContext<string | null, TransferOwnershipDialogData>>(POLYMORPHEUS_CONTEXT);

    /**
     * Поселение, чьё владение передаётся.
     */
    private readonly settlement: ISettlement = this.context.data.settlement;

    /**
     * Выбранный получатель владения.
     */
    protected readonly selectedUserId = signal<string | null>(null);

    /**
     * Участники, которым можно передать владение.
     * Действующие владельцы исключены: передача им ничего не меняет.
     */
    protected readonly candidates: Signal<IPlayer[]> = computed(() => {
        const owners = getOwnerIds(this.settlement);

        return this.context.data.players.filter((player) => !owners.includes(player.user_id));
    });

    /**
     * Выбирает получателя владения.
     *
     * @param userId Идентификатор участника.
     */
    protected select(userId: string): void {
        this.selectedUserId.set(userId);
    }

    /**
     * Закрывает диалог, возвращая выбранного участника.
     */
    protected confirm(): void {
        const userId = this.selectedUserId();

        if (!userId) {
            return;
        }

        this.context.completeWith(userId);
    }

    /**
     * Закрывает диалог без передачи владения.
     */
    protected cancel(): void {
        this.context.completeWith(null);
    }
}
