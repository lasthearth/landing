import { ISettlement } from '../model/i-settlement';

/**
 * Проверяет, состоит ли пользователь в наделе.
 *
 * Владельцы входят в `members` наравне с остальными (их отличает роль `owner`),
 * поэтому отдельная проверка `leader` не нужна — поле помечено `@deprecated`.
 *
 * @param settlement Надел или `null`, если наделы у пользователя нет.
 * @param userId Идентификатор пользователя.
 * @returns true, если пользователь — член надела.
 */
export function isSettlementMember(settlement: ISettlement | null | undefined, userId: string): boolean {
    if (!settlement || !userId) {
        return false;
    }

    return (settlement.members ?? []).some((member) => member.user_id === userId);
}
