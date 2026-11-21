/**
 * Категория обращения (значения enum `ticket.v1.TicketCategory`).
 */
export type TicketCategory =
    | 'TICKET_CATEGORY_BUG'
    | 'TICKET_CATEGORY_COMPLAINT'
    | 'TICKET_CATEGORY_DONATE'
    | 'TICKET_CATEGORY_SETTLEMENT'
    | 'TICKET_CATEGORY_QUESTION'
    | 'TICKET_CATEGORY_OTHER';

/**
 * Чего ждёт обращение: открыто — ответа администрации, отвечено — ответа игрока.
 */
export type TicketStatus = 'TICKET_STATUS_OPEN' | 'TICKET_STATUS_ANSWERED' | 'TICKET_STATUS_CLOSED';

/**
 * Отбор входящих по исполнителю.
 */
export type TicketAssigneeFilter = 'ASSIGNEE_FILTER_UNSPECIFIED' | 'ASSIGNEE_FILTER_MINE' | 'ASSIGNEE_FILTER_NOBODY';

/**
 * Сообщение обращения в ответе API.
 */
export interface TicketMessageDto {
    /**
     * Идентификатор сообщения.
     */
    id: string;

    /**
     * Автор (id пользователя Logto).
     */
    author_id: string;

    /**
     * Ответ администрации.
     */
    staff?: boolean;

    /**
     * Текст.
     */
    text: string;

    /**
     * Внутренняя заметка, видна только администрации.
     */
    internal?: boolean;

    /**
     * Время отправки.
     */
    created_at: string;
}

/**
 * Обращение в ответе API.
 */
export interface TicketDto {
    /**
     * Идентификатор.
     */
    id: string;

    /**
     * Игрок, открывший обращение.
     */
    author_id: string;

    /**
     * Тема.
     */
    subject: string;

    /**
     * Категория.
     */
    category?: TicketCategory;

    /**
     * Статус.
     */
    status?: TicketStatus;

    /**
     * Администратор, взявший обращение; пусто — ничьё.
     */
    assignee_id?: string;

    /**
     * Есть непрочитанное для того, кто смотрит.
     */
    unread?: boolean;

    /**
     * Сколько сообщений видит смотрящий.
     */
    message_count?: number;

    /**
     * Переписка (только в ответах на чтение одного обращения и на запись).
     */
    messages?: TicketMessageDto[];

    /**
     * Создано.
     */
    created_at: string;

    /**
     * Последнее видимое смотрящему сообщение.
     */
    last_message_at?: string;

    /**
     * Закрыто.
     */
    closed_at?: string;
}

/**
 * Страница списка обращений в ответе API.
 */
export interface TicketListDto {
    /**
     * Обращения без переписки.
     */
    tickets?: TicketDto[];

    /**
     * Токен следующей страницы; пусто на последней.
     */
    next_page_token?: string;
}

/**
 * Шаблон ответа в ответе API.
 */
export interface SavedReplyDto {
    /**
     * Идентификатор.
     */
    id: string;

    /**
     * Название.
     */
    title: string;

    /**
     * Текст с подстановкой `{nickname}`.
     */
    text: string;

    /**
     * Кто последним сохранил.
     */
    updated_by?: string;

    /**
     * Когда сохранён.
     */
    updated_at?: string;
}

/**
 * Сообщение обращения.
 */
export interface TicketMessage {
    /**
     * Идентификатор.
     */
    id: string;

    /**
     * Автор.
     */
    authorId: string;

    /**
     * Ответ администрации.
     */
    staff: boolean;

    /**
     * Текст (выводится только интерполяцией).
     */
    text: string;

    /**
     * Внутренняя заметка администрации.
     */
    internal: boolean;

    /**
     * Время отправки.
     */
    createdAt: Date;
}

/**
 * Обращение.
 */
export interface Ticket {
    /**
     * Идентификатор.
     */
    id: string;

    /**
     * Игрок, открывший обращение.
     */
    authorId: string;

    /**
     * Тема.
     */
    subject: string;

    /**
     * Категория.
     */
    category: TicketCategory;

    /**
     * Статус.
     */
    status: TicketStatus;

    /**
     * Исполнитель; пустая строка — ничьё.
     */
    assigneeId: string;

    /**
     * Есть непрочитанное.
     */
    unread: boolean;

    /**
     * Число сообщений.
     */
    messageCount: number;

    /**
     * Переписка; пустая в списках.
     */
    messages: TicketMessage[];

    /**
     * Создано.
     */
    createdAt: Date;

    /**
     * Последняя активность.
     */
    lastMessageAt: Date;

    /**
     * Закрыто (`null` — открыто).
     */
    closedAt: Date | null;
}

/**
 * Страница списка обращений.
 */
export interface TicketPage {
    /**
     * Обращения.
     */
    tickets: Ticket[];

    /**
     * Токен следующей страницы (`null` — страница последняя).
     */
    nextPageToken: string | null;
}

/**
 * Новое обращение.
 */
export interface CreateTicketRequest {
    /**
     * Тема, 3–120 символов.
     */
    subject: string;

    /**
     * Категория.
     */
    category: TicketCategory;

    /**
     * Первое сообщение, до 4000 символов.
     */
    text: string;
}

/**
 * Отбор входящих администрации.
 */
export interface AdminTicketQuery {
    /**
     * Только этот статус (`null` — любой).
     */
    status: TicketStatus | null;

    /**
     * Только эта категория (`null` — любая).
     */
    category: TicketCategory | null;

    /**
     * Отбор по исполнителю.
     */
    assignee: TicketAssigneeFilter;

    /**
     * Токен страницы.
     */
    pageToken?: string | null;
}

/**
 * Изменение обращения администрацией. Отсутствующее поле не меняется.
 */
export interface AdminTicketPatch {
    /**
     * Новая категория.
     */
    category?: TicketCategory;

    /**
     * Новый статус.
     */
    status?: TicketStatus;

    /**
     * Новый исполнитель; пустая строка снимает.
     */
    assignee_id?: string;
}

/**
 * Счётчики входящих администрации.
 */
export interface AdminTicketCounters {
    /**
     * Ждут ответа администрации.
     */
    open: number;

    /**
     * Из них ничьи.
     */
    openUnassigned: number;

    /**
     * Из них мои.
     */
    openMine: number;

    /**
     * С непрочитанным сообщением игрока.
     */
    unread: number;
}

/**
 * Шаблон ответа.
 */
export interface SavedReply {
    /**
     * Идентификатор.
     */
    id: string;

    /**
     * Название.
     */
    title: string;

    /**
     * Текст с подстановкой `{nickname}`.
     */
    text: string;
}
