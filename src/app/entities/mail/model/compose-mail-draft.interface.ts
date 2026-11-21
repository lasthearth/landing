import { MailAttachment } from './mail.types';

/**
 * Черновик письма, собранный формой админки.
 *
 * Отличается от {@link ComposeMailRequest} тем, что описывает состояние формы,
 * а не тело запроса: адресат здесь либо выбранный игрок, либо признак
 * broadcast, а срок жизни — значение поля `datetime-local` в местном времени.
 */
export interface ComposeMailDraft {
    /**
     * Идентификатор выбранного получателя; `null`, если игрок не выбран.
     */
    userId: string | null;

    /**
     * Письмо адресовано всем игрокам.
     */
    broadcast: boolean;

    /**
     * Заголовок как его ввели.
     */
    title: string;

    /**
     * Текст как его ввели.
     */
    body: string;

    /**
     * Вложения в порядке строк формы.
     */
    attachments: MailAttachment[];

    /**
     * Срок жизни в формате `datetime-local` местного времени; пустая строка — бессрочно.
     */
    expiresAt: string;

    /**
     * Ключ идемпотентности текущей попытки отправки; `null` — попытки ещё не было.
     */
    idempotencyKey: string | null;
}