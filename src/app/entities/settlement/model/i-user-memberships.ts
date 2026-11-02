import { ISettlement } from './i-settlement';

/**
 * Группы, в которых состоит игрок (`GetUserMemberships`).
 *
 * Игрок держит не больше одной группы каждого рода: основатель гильдии
 * состоит только в ней, поэтому пустой `settlement` — штатный ответ,
 * а отсутствующая группа не приходит вовсе.
 */
export interface IUserMemberships {
    /**
     * Надел игрока.
     */
    settlement?: ISettlement;

    /**
     * Гильдия игрока.
     */
    guild?: ISettlement;
}
