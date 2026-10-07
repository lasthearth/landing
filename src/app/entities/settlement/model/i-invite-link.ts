import { ISettlement } from './i-settlement';

/**
 * Состояние ссылки-приглашения (`settlement.v1.InviteLinkStatus`).
 */
export type InviteLinkStatus =
    | 'INVITE_LINK_STATUS_ACTIVE'
    | 'INVITE_LINK_STATUS_EXPIRED'
    | 'INVITE_LINK_STATUS_EXHAUSTED'
    | 'INVITE_LINK_STATUS_REVOKED';

/**
 * Ссылка-приглашение в поселение (`settlement.v1.InviteLink`). Даты — ISO 8601.
 */
export interface IInviteLink {
    id: string;
    settlement_id: string;
    /**
     * Код из ссылки `/join/<code>`.
     */
    code: string;
    created_by: string;
    /**
     * 0 — без ограничений (поле может не прийти).
     */
    max_uses?: number;
    uses?: number;
    /**
     * Нет — ссылка бессрочная.
     */
    expires_at?: string;
    revoked_at?: string;
    created_at: string;
    status: InviteLinkStatus;
}

/**
 * Что видит гость, открыв ссылку (`settlement.v1.InviteLinkPreview`).
 */
export interface IInviteLinkPreview {
    status: InviteLinkStatus;
    expires_at?: string;
    max_uses?: number;
    uses?: number;
    created_by: string;
    settlement: ISettlement;
}

/**
 * Параметры новой ссылки.
 */
export interface ICreateInviteLink {
    /**
     * Срок действия в часах; 0 — бессрочно (не больше 720).
     */
    ttl_hours: number;
    /**
     * Сколько игроков могут вступить; 0 — без ограничений (не больше 100).
     */
    max_uses: number;
}
