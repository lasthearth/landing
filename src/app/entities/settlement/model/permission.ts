/**
 * Право члена поселения.
 * Соответствует enum `Permission` из REST-контракта (docs/v1/openapi.yaml).
 */
export enum Permission {
    /**
     * Значение-заглушка proto3 (нулевой элемент enum).
     * Приходит с сервера, но в редакторе ролей не показывается:
     * назначаемые в UI права перечислены в `ASSIGNABLE_PERMISSIONS`.
     */
    Unspecified = 'PERMISSION_UNSPECIFIED',

    /**
     * Право приглашать новых членов в поселение.
     */
    InviteMember = 'PERMISSION_INVITE_MEMBER',

    /**
     * Право рассматривать (одобрять/отклонять) заявки на вступление.
     */
    ReviewJoinRequest = 'PERMISSION_REVIEW_JOIN_REQUEST',
}
