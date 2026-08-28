import { Permission } from '@entities/settlement';

/**
 * Результат диалога создания или переименования роли.
 */
export interface RoleFormResult {
    /**
     * Имя роли (1–64 символа, без `<` и `>`).
     */
    name: string;

    /**
     * Права, выданные роли.
     */
    permissions: Permission[];
}
