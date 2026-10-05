import { ISettlement } from '@entities/settlement';
import { IPlayer } from '@entities/user';

/**
 * Состояние страницы поселения.
 */
export type SettlementPageState =
    | { status: 'loading' }
    | { status: 'ready'; settlement: ISettlement; players: IPlayer[]; others: ISettlement[] }
    | { status: 'not-found' };
