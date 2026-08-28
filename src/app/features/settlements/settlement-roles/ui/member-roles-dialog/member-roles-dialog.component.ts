import { ChangeDetectionStrategy, Component, computed, inject, signal, Signal } from '@angular/core';
import { TuiDialogContext, TuiIcon } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { IRole, ISettlement, OWNER_ROLE_ID } from '@entities/settlement';
import { TranslatePipe } from '@core/i18n';
import { MemberRolesDialogData } from '../../model/member-roles-dialog-data';

/**
 * Диалог выдачи и снятия ролей участника поселения.
 *
 * Возвращает решения по одной роли за раз: каждая мутация — отдельный запрос,
 * который отдаёт обновлённое поселение, и вызывающая сторона перерисовывает
 * себя из ответа.
 */
@Component({
    selector: 'app-member-roles-dialog',
    standalone: true,
    imports: [TuiIcon, TranslatePipe],
    templateUrl: './member-roles-dialog.component.html',
    styles: [':host { display: block; padding-top: 32px; }'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberRolesDialogComponent {
    /**
     * Контекст диалога: поселение, участник и обработчик переключения роли.
     */
    protected readonly context: TuiDialogContext<void, MemberRolesDialogData> =
        inject<TuiDialogContext<void, MemberRolesDialogData>>(POLYMORPHEUS_CONTEXT);

    /**
     * Актуальное состояние поселения.
     * Обновляется из ответа сервера после каждой мутации.
     */
    protected readonly settlement = signal<ISettlement>(this.context.data.settlement);

    /**
     * Признак выполняющегося запроса.
     */
    protected readonly busy = signal(false);

    /**
     * Игровое имя участника для заголовка диалога.
     */
    protected readonly memberName: string = this.context.data.memberName;

    /**
     * Редактируемые роли поселения. Служебная роль владельца исключена:
     * владение передаётся отдельным действием, а не выдачей роли.
     */
    protected readonly roles: Signal<IRole[]> = computed(() =>
        (this.settlement().roles ?? []).filter((role) => role.id !== OWNER_ROLE_ID)
    );

    /**
     * Идентификаторы ролей участника.
     */
    private readonly memberRoleIds: Signal<string[]> = computed(() => {
        const member = (this.settlement().members ?? []).find(
            (item) => item.user_id === this.context.data.userId
        );

        return member?.role_ids ?? [];
    });

    /**
     * Проверяет, выдана ли роль участнику.
     *
     * @param role Роль поселения.
     * @returns true, если роль есть у участника.
     */
    protected hasRole(role: IRole): boolean {
        return this.memberRoleIds().includes(role.id);
    }

    /**
     * Переключает роль участника через обработчик из вызывающего компонента.
     *
     * @param role Роль поселения.
     */
    protected toggle(role: IRole): void {
        if (this.busy()) {
            return;
        }

        this.busy.set(true);

        this.context.data.toggle(role.id, !this.hasRole(role)).subscribe({
            next: (settlement) => this.settlement.set(settlement),
            error: () => this.busy.set(false),
            complete: () => this.busy.set(false),
        });
    }

    /**
     * Закрывает диалог.
     */
    protected close(): void {
        this.context.completeWith();
    }
}
