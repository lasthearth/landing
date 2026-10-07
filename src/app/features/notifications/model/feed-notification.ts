/**
 * Категория уведомления — по ней игрок настраивает, что показывать в колокольчике.
 *
 * - `news` — новости и прочие общие объявления;
 * - `events` — события календаря;
 * - `personal` — личные уведомления.
 */
export type NotificationCategory = 'news' | 'events' | 'personal';

/**
 * Все категории в порядке вывода в настройках.
 */
export const NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = ['news', 'events', 'personal'];

/**
 * Какие категории показывать.
 */
export type NotificationPrefs = Record<NotificationCategory, boolean>;

/**
 * Уведомление для колокольчика.
 */
export interface FeedNotification {
    /**
     * Идентификатор.
     */
    id: string;

    /**
     * Заголовок.
     */
    title: string;

    /**
     * Текст.
     */
    message: string;

    /**
     * Когда создано.
     */
    createdAt: Date | null;

    /**
     * Общее уведомление (для всех игроков).
     */
    broadcast: boolean;

    /**
     * Категория.
     */
    category: NotificationCategory;

    /**
     * Прочитано.
     */
    read: boolean;

    /**
     * Куда ведёт клик, если уведомлению есть что показать.
     */
    link: string | null;
}
