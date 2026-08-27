import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    InputSignal,
    output,
    OutputEmitterRef,
    Signal,
} from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import {
    ASSIGNABLE_PERMISSIONS,
    IRole,
    ISettlement,
    OWNER_ROLE_ID,
    Permission,
    permissionLabelKey,
} from '@entities/settlement';
import { TranslatePipe } from '@core/i18n';
import { EmptyStateComponent } from '@shared/ui/empty-state';

/**
 * Матрица прав ролей поселения.
 *
 * Роли — строки, права — столбцы, на пересечении отметка. Форма честна
 * относительно данных: право роли — декартово произведение «роль × право»,
 * а не список, поэтому ведомость читается быстрее набора карточек.
 * Разделители — hairline: это таблица, а не набор поверхностей.
 *
 * Служебная роль владельца в матрице не участвует: она не редактируется
 * и даёт все права по определению.
 */
@Component({
    selector: 'app-roles-matrix',
    standalone: true,
    imports: [TuiIcon, TranslatePipe, EmptyStateComponent],
    templateUrl: './roles-matrix.component.html',
    styleUrl: './roles-matrix.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesMatrixComponent {
    /**
     * Поселение — источник справочника ролей и флага `roles_enabled`.
     */
    public readonly settlement: InputSignal<ISettlement> = input.required();

    /**
     * Признак выполняющегося запроса: на время мутации ячейки блокируются.
     */
    public readonly busy: InputSignal<boolean> = input(false);

    /**
     * Запрос на создание роли.
     */
    public readonly createRole: OutputEmitterRef<void> = output();

    /**
     * Запрос на переименование роли и правку её прав.
     */
    public readonly editRole: OutputEmitterRef<IRole> = output();

    /**
     * Запрос на удаление роли.
     */
    public readonly deleteRole: OutputEmitterRef<IRole> = output();

    /**
     * Переключение права у роли.
     * Эмитит роль, право и целевое состояние отметки.
     */
    public readonly togglePermission: OutputEmitterRef<{
        role: IRole;
        permission: Permission;
        granted: boolean;
    }> = output();

    /**
     * Права, доступные для назначения в интерфейсе — столбцы матрицы.
     */
    protected readonly permissions: readonly Permission[] = ASSIGNABLE_PERMISSIONS;

    /**
     * Ключ перевода названия права.
     */
    protected readonly permissionLabelKey = permissionLabelKey;

    /**
     * Редактируемые роли поселения — строки матрицы.
     * Служебная роль владельца исключена.
     */
    protected readonly roles: Signal<IRole[]> = computed(() =>
        (this.settlement().roles ?? []).filter((role) => role.id !== OWNER_ROLE_ID)
    );

    /**
     * Признак выключенной модерацией системы ролей.
     */
    protected readonly rolesDisabled: Signal<boolean> = computed(
        () => this.settlement().roles_enabled === false
    );

    /**
     * Проверяет, даёт ли роль указанное право.
     *
     * @param role Роль поселения.
     * @param permission Проверяемое право.
     * @returns true, если право есть у роли.
     */
    protected hasPermission(role: IRole, permission: Permission): boolean {
        return (role.permissions ?? []).includes(permission);
    }

    /**
     * Переключает право роли.
     *
     * @param role Роль поселения.
     * @param permission Переключаемое право.
     */
    protected onToggle(role: IRole, permission: Permission): void {
        this.togglePermission.emit({
            role,
            permission,
            granted: !this.hasPermission(role, permission),
        });
    }
}
