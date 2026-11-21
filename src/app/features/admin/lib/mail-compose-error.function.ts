import { HttpErrorResponse } from '@angular/common/http';
import { I18nService } from '@core/i18n';
import { ComposeMailErrorResult } from '../model/compose-mail-error-result.model';

/**
 * Поля тела `POST /v1/mail:compose` и ключи их подписей в словаре.
 *
 * Порядок задаёт приоритет: сообщение сервера часто называет и контейнер,
 * и поле (`attachments[0].item.game_code`), а подсветить надо лист, поэтому
 * частные поля стоят раньше общих.
 */
const FIELD_LABEL_KEYS: readonly (readonly [string, string])[] = [
    ['game_code', 'mail.compose.gameCodeLabel'],
    ['quantity', 'mail.compose.quantityLabel'],
    ['amount', 'mail.compose.amountLabel'],
    ['user_id', 'mail.compose.recipientLabel'],
    ['broadcast', 'mail.compose.recipientLabel'],
    ['title', 'mail.compose.titleLabel'],
    ['body', 'mail.compose.bodyLabel'],
    ['expires_at', 'mail.compose.expiresAtLabel'],
    ['idempotency_key', 'mail.compose.idempotencyLabel'],
    ['type', 'mail.compose.typeLabel'],
    ['item', 'mail.compose.attachmentsLabel'],
    ['coins', 'mail.compose.attachmentsLabel'],
    ['attachments', 'mail.compose.attachmentsLabel'],
];

/**
 * Разделители слов в сообщении сервера: точки, скобки, запятые и пробелы.
 *
 * По ним сообщение вида `attachments[0].item.game_code: invalid` режется
 * на имена полей, и поле находится точным совпадением слова, а не подстрокой.
 */
const WORD_SEPARATORS = /[^a-z0-9_]+/;

/**
 * Достаёт текст ошибки из тела `google.rpc.Status`.
 *
 * @param error Ответ с ошибкой.
 * @returns Сообщение сервера либо пустая строка, если его нет.
 */
function readServerMessage(error: HttpErrorResponse): string {
    const message = error.error?.message;

    return typeof message === 'string' ? message.trim() : '';
}

/**
 * Ищет в сообщении сервера имя поля запроса.
 *
 * @param message Сообщение `google.rpc.Status`.
 * @returns Ключ подписи поля либо `null`, если поле не названо.
 */
function findFieldLabelKey(message: string): string | null {
    const words = new Set(message.toLowerCase().split(WORD_SEPARATORS));

    for (const [field, labelKey] of FIELD_LABEL_KEYS) {
        if (words.has(field)) {
            return labelKey;
        }
    }

    return null;
}

/**
 * Объясняет ошибку отправки письма администратору.
 *
 * `400` называет поле, если сервер его упомянул: без этого «invalid argument»
 * не говорит, что править. `403` — отказ в скоупе `mail:compose`, и текст
 * отправляет к правам Logto, а не к повтору запроса. Остальные коды берут
 * сообщение сервера, а при его отсутствии — общий текст.
 *
 * @param error Ошибка запроса.
 * @param i18n Сервис переводов.
 * @returns Текст ошибки и признак отказа в праве.
 */
export function describeComposeMailError(error: unknown, i18n: I18nService): ComposeMailErrorResult {
    if (!(error instanceof HttpErrorResponse)) {
        return { text: i18n.translate('mail.compose.errorGeneric'), denied: false };
    }

    if (error.status === 403) {
        return { text: i18n.translate('mail.compose.noRights.hint'), denied: true };
    }

    const message = readServerMessage(error);

    if (error.status === 400) {
        const labelKey = findFieldLabelKey(message);

        if (labelKey) {
            return {
                text: i18n.translate('mail.compose.fieldError', {
                    field: i18n.translate(labelKey),
                    message,
                }),
                denied: false,
            };
        }

        return {
            text: message.length > 0 ? message : i18n.translate('mail.compose.badRequest'),
            denied: false,
        };
    }

    return {
        text: message.length > 0 ? message : i18n.translate('mail.compose.errorGeneric'),
        denied: false,
    };
}