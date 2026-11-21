/**
 * Как показывать участника переписки: ник и аватар. Страница собирает их по
 * id из `users:batchGet` и передаёт в ленту сообщений.
 */
export interface TicketPerson {
    /**
     * Игровой ник.
     */
    name: string;

    /**
     * Адрес аватара.
     */
    avatar: string;
}
