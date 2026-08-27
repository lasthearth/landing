import { ISettlement } from '@entities/settlement';
import { IPlayer } from '@entities/user';

/**
 * Входные данные диалога передачи владения поселением.
 */
export interface TransferOwnershipDialogData {
    /**
     * Поселение, чьё владение передаётся.
     */
    settlement: ISettlement;

    /**
     * Профили участников поселения, загруженные одним батчем.
     */
    players: IPlayer[];
}
