import {
    SavedReply,
    SavedReplyDto,
    Ticket,
    TicketDto,
    TicketListDto,
    TicketMessage,
    TicketMessageDto,
    TicketPage,
} from './ticket.types';

/**
 * Превращает сообщение из API в модель интерфейса.
 *
 * @param dto Сообщение из API.
 * @returns Сообщение.
 */
export function mapTicketMessageDto(dto: TicketMessageDto): TicketMessage {
    return {
        id: dto.id,
        authorId: dto.author_id,
        staff: !!dto.staff,
        text: dto.text ?? '',
        internal: !!dto.internal,
        createdAt: new Date(dto.created_at),
    };
}

/**
 * Превращает обращение из API в модель интерфейса.
 *
 * @param dto Обращение из API.
 * @returns Обращение.
 */
export function mapTicketDto(dto: TicketDto): Ticket {
    const createdAt = new Date(dto.created_at);
    return {
        id: dto.id,
        authorId: dto.author_id,
        subject: dto.subject ?? '',
        category: dto.category ?? 'TICKET_CATEGORY_OTHER',
        status: dto.status ?? 'TICKET_STATUS_OPEN',
        assigneeId: dto.assignee_id ?? '',
        unread: !!dto.unread,
        messageCount: dto.message_count ?? 0,
        messages: (dto.messages ?? []).map(mapTicketMessageDto),
        createdAt,
        lastMessageAt: dto.last_message_at ? new Date(dto.last_message_at) : createdAt,
        closedAt: dto.closed_at ? new Date(dto.closed_at) : null,
    };
}

/**
 * Превращает страницу списка из API в модель интерфейса.
 *
 * @param dto Страница из API.
 * @returns Страница.
 */
export function mapTicketListDto(dto: TicketListDto): TicketPage {
    return {
        tickets: (dto.tickets ?? []).map(mapTicketDto),
        nextPageToken: dto.next_page_token || null,
    };
}

/**
 * Превращает шаблон ответа из API в модель интерфейса.
 *
 * @param dto Шаблон из API.
 * @returns Шаблон.
 */
export function mapSavedReplyDto(dto: SavedReplyDto): SavedReply {
    return { id: dto.id, title: dto.title ?? '', text: dto.text ?? '' };
}
