/**
 * Подписи дней, которые зависят от языка.
 */
export interface ChatDayLabels {
    /**
     * «Сегодня».
     */
    today: string;

    /**
     * «Вчера».
     */
    yesterday: string;
}

/**
 * Начало суток в локальном времени (мс).
 *
 * @param date Дата.
 */
export function startOfDay(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Подпись разделителя дней в чате: «Сегодня», «Вчера», «3 октября».
 *
 * @param date Дата сообщения.
 * @param now Текущее время (мс).
 * @param locale Локаль.
 * @param labels Подписи.
 */
export function formatChatDay(date: Date, now: number, locale: string, labels: ChatDayLabels): string {
    const days = Math.round((startOfDay(new Date(now)) - startOfDay(date)) / 86_400_000);

    if (days === 0) {
        return labels.today;
    }

    if (days === 1) {
        return labels.yesterday;
    }

    const sameYear = date.getFullYear() === new Date(now).getFullYear();
    return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        ...(sameYear ? {} : { year: 'numeric' }),
    }).format(date);
}
