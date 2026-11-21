/**
 * Публичный API сущности «Обращение в поддержку».
 */
export type {
    AdminTicketCounters,
    AdminTicketPatch,
    AdminTicketQuery,
    CreateTicketRequest,
    SavedReply,
    Ticket,
    TicketAssigneeFilter,
    TicketCategory,
    TicketMessage,
    TicketPage,
    TicketStatus,
} from './model/ticket.types';
export type { TicketPerson } from './model/ticket-person';
export { TICKET_CATEGORIES } from './model/ticket-categories.constant';
export { TICKET_LIMITS } from './model/ticket-limits.constant';
export { TicketApiService } from './api/ticket.api';
export { TicketThreadComponent } from './ui/ticket-thread/ticket-thread.component';
export { TicketStatusComponent } from './ui/ticket-status/ticket-status.component';
