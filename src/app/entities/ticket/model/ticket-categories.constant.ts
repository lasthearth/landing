import { TicketCategory } from './ticket.types';

/**
 * Категории обращений в порядке показа: ключ перевода `tickets.category.<key>` и иконка.
 */
export const TICKET_CATEGORIES: readonly { value: TicketCategory; key: string; icon: string }[] = [
    { value: 'TICKET_CATEGORY_QUESTION', key: 'question', icon: '@tui.circle-help' },
    { value: 'TICKET_CATEGORY_BUG', key: 'bug', icon: '@tui.bug' },
    { value: 'TICKET_CATEGORY_COMPLAINT', key: 'complaint', icon: '@tui.shield-alert' },
    { value: 'TICKET_CATEGORY_DONATE', key: 'donate', icon: '@tui.gem' },
    { value: 'TICKET_CATEGORY_SETTLEMENT', key: 'settlement', icon: '@tui.castle' },
    { value: 'TICKET_CATEGORY_OTHER', key: 'other', icon: '@tui.message-square' },
];
