export interface IMember {
    user_id: string;

    /**
     * Идентификаторы ролей члена поселения.
     * Член с ролью `"owner"` считается лидером (owner) — их может быть несколько.
     */
    role_ids?: string[];
}
