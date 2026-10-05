/**
 * Подписи времени, которые зависят от языка.
 */
export interface ChatTimeLabels {
    /**
     * «сейчас» — сообщение моложе минуты.
     */
    now: string;
}

/**
 * Время сообщения в чате: «сейчас», «5 мин», а старше часа — «18:40».
 *
 * Относительное время только для свежих сообщений: на длинной ленте
 * «2 часа назад» у каждой строки читается хуже, чем часы и минуты.
 *
 * @param date Время сообщения.
 * @param now Текущее время (мс).
 * @param locale Локаль.
 * @param labels Подписи.
 */
export function formatChatTime(date: Date, now: number, locale: string, labels: ChatTimeLabels): string {
    const minutes = Math.floor((now - date.getTime()) / 60_000);

    if (minutes < 1) {
        return labels.now;
    }

    if (minutes < 60) {
        return new Intl.NumberFormat(locale, { style: 'unit', unit: 'minute', unitDisplay: 'short' }).format(minutes);
    }

    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
}
