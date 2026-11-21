import { ComposeMailDraft } from '../model/compose-mail-draft.interface';
import { ComposeMailRequest, MailAttachment, MailAttachmentDto } from '../model/mail.types';

/**
 * Переводит вложение UI-модели в элемент `attachments` запроса.
 *
 * Элемент — repeated oneof: заполняется ровно одно из полей `item` или `coins`,
 * второе отсутствует в объекте. `attr_snapshot` уходит пустой строкой: снимок
 * атрибутов собирает игра, браузер его не производит.
 *
 * @param attachment Вложение из формы.
 * @returns Вложение для тела запроса.
 */
function toAttachmentDto(attachment: MailAttachment): MailAttachmentDto {
    if (attachment.kind === 'coins') {
        return { coins: { amount: attachment.amount.trim() } };
    }

    return {
        item: {
            game_code: attachment.gameCode.trim(),
            quantity: Number(attachment.quantity),
            type: attachment.itemType,
            attr_snapshot: '',
        },
    };
}

/**
 * Собирает тело `POST /v1/mail:compose` из состояния формы.
 *
 * Значения обрезаются по краям: сервер считает `title` и `body` непустыми
 * по длине, а код позиции ищет точным совпадением с `Collectible.Code`,
 * поэтому пробел по краю кода превращает его в неизвестный.
 * Адресат попадает в тело ровно одним полем: `broadcast` сильнее выбранного
 * игрока на сервере, и держать оба значило бы отправлять письмо не туда,
 * куда показал диалог подтверждения.
 *
 * @param draft Состояние формы письма.
 * @returns Тело запроса отправки.
 */
export function buildComposeMailRequest(draft: ComposeMailDraft): ComposeMailRequest {
    const request: ComposeMailRequest = {
        title: draft.title.trim(),
        body: draft.body.trim(),
        attachments: draft.attachments.map(toAttachmentDto),
    };

    if (draft.broadcast) {
        request.broadcast = true;
    } else if (draft.userId) {
        request.user_id = draft.userId;
    }

    const expiresAt = draft.expiresAt.trim();

    if (expiresAt.length > 0) {
        request.expires_at = new Date(expiresAt).toISOString();
    }

    if (draft.idempotencyKey) {
        request.idempotency_key = draft.idempotencyKey;
    }

    return request;
}