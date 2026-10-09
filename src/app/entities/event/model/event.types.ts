/**
 * Типы сущности «Событие» (календарь сервера).
 */

/**
 * Событие в ответе API (`event.v1.Event`).
 *
 * Даты приходят строками ISO 8601; необязательное окончание — `null`.
 */
export interface EventDto {
    /**
     * Идентификатор.
     */
    id: string;

    /**
     * Название.
     */
    title: string;

    /**
     * Описание в разметке редактора новостей (та же, что уходит в Discord).
     */
    description: string;

    /**
     * Обложка: URL из медиасервиса или пустая строка.
     */
    cover: string;

    /**
     * Место проведения (свободный текст).
     */
    location: string;

    /**
     * Начало.
     */
    starts_at: string | null;

    /**
     * Окончание, если задано.
     */
    ends_at: string | null;

    /**
     * Кто создал (идентификатор пользователя).
     */
    created_by: string;

    /**
     * Когда создано.
     */
    created_at: string | null;

    /**
     * Когда изменено.
     */
    updated_at: string | null;

    /**
     * Сколько игроков записалось («Пойду»); ноль API не присылает.
     */
    attendee_count?: number;

    /**
     * Первые записавшиеся (до пяти) — для аватаров на карточке.
     */
    attendee_preview?: string[];
}

/**
 * Ответ списка событий.
 */
export interface EventsPageDto {
    /**
     * События.
     */
    events?: EventDto[];
}

/**
 * Тело запроса на создание или изменение события.
 */
export interface SaveEventRequest {
    /**
     * Название.
     */
    title: string;

    /**
     * Описание (разметка редактора).
     */
    description: string;

    /**
     * Обложка или пустая строка.
     */
    cover: string;

    /**
     * Место проведения.
     */
    location: string;

    /**
     * Начало, ISO 8601.
     */
    starts_at: string;

    /**
     * Окончание, ISO 8601, или `null`, если не задано.
     */
    ends_at: string | null;
}

/**
 * Событие для интерфейса.
 */
export interface CalendarEvent {
    /**
     * Идентификатор.
     */
    id: string;

    /**
     * Название.
     */
    title: string;

    /**
     * Описание (разметка редактора; в HTML превращается при выводе).
     */
    description: string;

    /**
     * Обложка или пустая строка.
     */
    cover: string;

    /**
     * Место проведения.
     */
    location: string;

    /**
     * Начало.
     */
    startsAt: Date;

    /**
     * Окончание или `null`.
     */
    endsAt: Date | null;

    /**
     * Сколько игроков записалось.
     */
    attendeeCount: number;

    /**
     * Первые записавшиеся (до пяти), в порядке записи.
     */
    attendeePreview: string[];
}

/**
 * Итог записи на событие или отказа от неё.
 */
export interface EventAttendance {
    /**
     * Записан ли игрок после запроса.
     */
    attending: boolean;

    /**
     * Сколько всего записалось.
     */
    count: number;

    /**
     * Первые записавшиеся.
     */
    preview: string[];
}

/**
 * Все записавшиеся на событие.
 */
export interface EventAttendees {
    /**
     * Идентификаторы игроков в порядке записи.
     */
    userIds: string[];

    /**
     * Сколько всего.
     */
    total: number;
}
