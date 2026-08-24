/**
 * Право члена поселения.
 * Соответствует enum `Permission` из REST-контракта (docs/v1/openapi.yaml).
 */
export enum Permission {
    /**
     * Право приглашать новых членов в поселение.
     */
    InviteMember = 'PERMISSION_INVITE_MEMBER',

    /**
     * Право рассматривать (одобрять/отклонять) заявки на вступление.
     */
    ReviewJoinRequest = 'PERMISSION_REVIEW_JOIN_REQUEST',
}
