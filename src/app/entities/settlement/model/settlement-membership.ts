import { ISettlement } from './i-settlement';
import { SettlementRole } from './settlement-role';

/**
 * Поселение игрока и его роль в нём.
 */
export interface SettlementMembership {
    /**
     * Поселение.
     */
    settlement: ISettlement;

    /**
     * Роль игрока: глава или житель.
     */
    role: SettlementRole;
}
