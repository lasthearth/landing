export interface IMember {
    user_id: string;

    /**
     * Идентификаторы ролей члена надела.
     * Член с ролью `"owner"` считается лидером (owner) — их может быть несколько.
     */
    role_ids?: string[];
}
