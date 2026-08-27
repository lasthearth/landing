import { ChangeDetectionStrategy, Component, computed, inject, signal, Signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { ASSIGNABLE_PERMISSIONS, IRole, Permission, permissionLabelKey } from '@entities/settlement';
import { TranslatePipe } from '@core/i18n';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { RoleFormResult } from '../../model/role-form-result';
import { ROLE_NAME_MAX_LENGTH } from '../../config/role-name-max-length.constant';
import { isValidRoleName } from '../../lib/is-valid-role-name.function';

/**
 * Диалог создания и переименования роли поселения.
 *
 * Имя роли валидируется на клиенте: 1–64 символа, символы `<` и `>` запрещены —
 * сервер хранит имя как есть и не экранирует его при выдаче.
 */
@Component({
    selector: 'app-role-form-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, TranslatePipe, LHInputComponent],
    templateUrl: './role-form-dialog.component.html',
    styles: [':host { display: block; padding-top: 32px; }'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleFormDialogComponent {
    /**
     * Контекст диалога. Во входных данных — редактируемая роль либо `null`
     * при создании новой.
     */
    protected readonly context: TuiDialogContext<RoleFormResult | null, { role: IRole | null }> =
        inject<TuiDialogContext<RoleFormResult | null, { role: IRole | null }>>(POLYMORPHEUS_CONTEXT);

    /**
     * Максимальная длина имени роли.
     */
    protected readonly maxLength = ROLE_NAME_MAX_LENGTH;

    /**
     * Права, доступные для назначения в интерфейсе.
     */
    protected readonly permissions: readonly Permission[] = ASSIGNABLE_PERMISSIONS;

    /**
     * Ключ перевода названия права.
     */
    protected readonly permissionLabelKey = permissionLabelKey;

    /**
     * Признак режима редактирования существующей роли.
     */
    protected readonly isEdit: boolean = this.context.data.role !== null;

    /**
     * Поле ввода имени роли.
     */
    protected readonly nameControl = new FormControl<string>(this.context.data.role?.name ?? '', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(ROLE_NAME_MAX_LENGTH)],
    });

    /**
     * Выбранные права роли.
     */
    private readonly selected = signal<Permission[]>([...(this.context.data.role?.permissions ?? [])]);

    /**
     * Текст введённого имени для проверки на запрещённые символы.
     */
    private readonly nameValue = signal<string>(this.nameControl.value);

    /**
     * Признак корректного имени роли.
     */
    protected readonly nameValid: Signal<boolean> = computed(() => isValidRoleName(this.nameValue()));

    /**
     * Признак наличия в имени запрещённых символов `<` и `>`.
     */
    protected readonly hasForbiddenChars: Signal<boolean> = computed(() => /[<>]/.test(this.nameValue()));

    constructor() {
        this.nameControl.valueChanges.subscribe((value) => this.nameValue.set(value ?? ''));
    }

    /**
     * Проверяет, выбрано ли право.
     *
     * @param permission Право члена поселения.
     * @returns true, если право выбрано.
     */
    protected isSelected(permission: Permission): boolean {
        return this.selected().includes(permission);
    }

    /**
     * Переключает выбор права.
     *
     * @param permission Право члена поселения.
     */
    protected toggle(permission: Permission): void {
        this.selected.set(
            this.isSelected(permission)
                ? this.selected().filter((item) => item !== permission)
                : [...this.selected(), permission]
        );
    }

    /**
     * Закрывает диалог, возвращая имя и права роли.
     */
    protected save(): void {
        if (!this.nameValid()) {
            return;
        }

        this.context.completeWith({
            name: this.nameControl.value.trim(),
            permissions: this.selected(),
        });
    }

    /**
     * Закрывает диалог без изменений.
     */
    protected cancel(): void {
        this.context.completeWith(null);
    }
}
