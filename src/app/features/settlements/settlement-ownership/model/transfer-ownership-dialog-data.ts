import { ISettlement } from '@entities/settlement';
import { IPlayer } from '@entities/user';

/**
 * Входные данные диалога передачи владения наделом.
 */
export interface TransferOwnershipDialogData {
    /**
     * Надел, чьё владение передаётся.
     */
    settlement: ISettlement;

    /**
     * Профили участников надела, загруженные одним батчем.
     */
    players: IPlayer[];
}
