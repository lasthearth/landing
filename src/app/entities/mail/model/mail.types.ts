/**
 * Вид вложения письма. Ровно одно из двух полей элемента `attachments`
 * заполнено в proto-JSON, поэтому вид здесь — дискриминатор UI-модели.
 */
export type MailAttachmentKind = 'item' | 'coins';

/**
 * Тип позиции письма (`item.type`).
 *
 * Пустое значение сервер раскрывает как `item`, поэтому UI-модель всегда
 * хранит одно из двух.
 */
export type MailItemType = 'item' | 'block';

/**
 * Состояние письма для бейджа в списке отправленных.
 */
export type MailState = 'active' | 'expired' | 'revoked';

/**
 * Позиция вложения `attachments[].item` в proto-JSON.
 *
 * `attr_snapshot` — base64-блоб .NET TreeAttribute, который браузер не умеет
 * собирать; сайт всегда отправляет пустую строку (плоский стек).
 */
export interface MailItemDto {
    /**
     * Полный namespaced-код `Collectible.Code`, например `game:bread`.
     *
     * Сервер код не проверяет: неизвестный код игра молча пропускает при выдаче.
     */
    game_code?: string;

    /**
     * Количество единиц.
     */
    quantity?: number;

    /**
     * Тип позиции: `"item"` либо `"block"`.
     */
    type?: string;

    /**
     * Снимок атрибутов позиции (base64). С сайта уходит пустым.
     */
    attr_snapshot?: string;
}

/**
 * Вложение `attachments[].coins` в proto-JSON.
 *
 * Сумма — 64-битное целое, поэтому в JSON это строка: `"amount": "3000"`.
 */
export interface MailCoinsDto {
    /**
     * Количество осколков (та же донат-валюта, что в магазине).
     */
    amount?: string;
}

/**
 * Вложение письма в proto-JSON: repeated oneof, ровно одно из полей.
 */
export interface MailAttachmentDto {
    /**
     * Позиция инвентаря.
     */
    item?: MailItemDto;

    /**
     * Осколки.
     */
    coins?: MailCoinsDto;
}

/**
 * Тело `POST /v1/mail:compose`.
 *
 * Адресат — либо `user_id`, либо `broadcast`; ровно одно из двух.
 */
export interface ComposeMailRequest {
    /**
     * Идентификатор получателя (subject из Logto).
     */
    user_id?: string;

    /**
     * Письмо всем игрокам, включая зарегистрировавшихся позже.
     */
    broadcast?: boolean;

    /**
     * Заголовок, минимум 1 символ.
     */
    title: string;

    /**
     * Текст письма, минимум 1 символ.
     */
    body: string;

    /**
     * Вложения: позиции и осколки.
     */
    attachments?: MailAttachmentDto[];

    /**
     * Срок жизни письма в формате ISO 8601; если задан, обязан быть в будущем.
     */
    expires_at?: string;

    /**
     * Ключ идемпотентности (uuid v4): повтор с тем же ключом возвращает то же письмо.
     */
    idempotency_key?: string;
}

/**
 * Ответ `POST /v1/mail:compose`.
 */
export interface ComposeMailResponse {
    /**
     * Идентификатор созданного письма.
     */
    mail_id: string;
}

/**
 * Письмо в ответе `GET /v1/admin/mail`.
 */
export interface MailDto {
    /**
     * Идентификатор письма.
     */
    id?: string;

    /**
     * Получатель: `user_id` либо пусто у broadcast-письма.
     */
    recipient?: string;

    /**
     * Письмо адресовано всем.
     */
    broadcast?: boolean;

    /**
     * Отправитель (`user_id` администратора).
     */
    sender?: string;

    /**
     * Заголовок.
     */
    title?: string;

    /**
     * Текст.
     */
    body?: string;

    /**
     * Вложения.
     */
    attachments?: MailAttachmentDto[];

    /**
     * Время создания, ISO 8601.
     */
    created_at?: string;

    /**
     * Срок жизни, ISO 8601.
     */
    expires_at?: string;

    /**
     * Письмо отозвано.
     */
    revoked?: boolean;

    /**
     * Сколько игроков уже получили письмо. Int64 в JSON — строка.
     */
    claimed_count?: string;
}

/**
 * Страница списка писем `GET /v1/admin/mail`.
 */
export interface MailListDto {
    /**
     * Письма, свежие первыми.
     */
    mails?: MailDto[];

    /**
     * Курсор следующей страницы; пустая строка — страниц больше нет.
     */
    next_page_token?: string;
}

/**
 * Вложение письма в UI-модели: вид выбирает, какие поля заполнены.
 */
export interface MailAttachment {
    /**
     * Вид вложения.
     */
    kind: MailAttachmentKind;

    /**
     * Код позиции `game:bread`; пусто у осколков.
     */
    gameCode: string;

    /**
     * Количество единиц позиции; пусто у осколков.
     *
     * Строка, а не число: значение приходит из поля ввода и уходит в proto-JSON
     * без приведения, чтобы не терять разряды.
     */
    quantity: string;

    /**
     * Тип позиции; у осколков не используется.
     */
    itemType: MailItemType;

    /**
     * Сумма осколков; пусто у позиции.
     */
    amount: string;
}

/**
 * Письмо в UI-модели.
 */
export interface Mail {
    /**
     * Идентификатор письма.
     */
    id: string;

    /**
     * Идентификатор получателя; пустая строка у broadcast-письма.
     */
    recipient: string;

    /**
     * Письмо адресовано всем.
     */
    broadcast: boolean;

    /**
     * Идентификатор отправителя.
     */
    sender: string;

    /**
     * Заголовок.
     */
    title: string;

    /**
     * Текст.
     */
    body: string;

    /**
     * Вложения письма.
     */
    attachments: MailAttachment[];

    /**
     * Время создания; `null`, если сервер не прислал дату.
     */
    createdAt: Date | null;

    /**
     * Срок жизни; `null`, если письмо бессрочное.
     */
    expiresAt: Date | null;

    /**
     * Письмо отозвано.
     */
    revoked: boolean;

    /**
     * Сколько игроков уже получили письмо. Int64 приходит строкой и строкой
     * остаётся: приведение к числу теряет разряды.
     */
    claimedCount: string;
}

/**
 * Страница списка писем в UI-модели.
 */
export interface MailPage {
    /**
     * Письма страницы, свежие первыми.
     */
    mails: Mail[];

    /**
     * Курсор следующей страницы; пустая строка — страниц больше нет.
     */
    nextPageToken: string;
}