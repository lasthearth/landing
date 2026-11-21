import { parseDateInput } from '@shared/lib/relative-time';
import {
    Mail,
    MailAttachment,
    MailAttachmentDto,
    MailDto,
    MailItemType,
    MailListDto,
    MailPage,
} from './mail.types';

/**
 * Приводит тип позиции из proto-JSON к UI-значению.
 *
 * Пустое поле protobuf опускает; сервер в этом случае считает позицию
 * предметом, поэтому и сайт показывает `item`.
 *
 * @param type Значение `item.type` из ответа.
 * @returns Тип позиции UI-модели.
 */
function mapItemType(type: string | undefined): MailItemType {
    return type === 'block' ? 'block' : 'item';
}

/**
 * Переводит одно вложение из proto-JSON в UI-модель.
 *
 * Элемент `attachments` — repeated oneof, поэтому незаполненное `coins`
 * означает позицию, и наоборот. Элемент без обоих полей сервер прислать
 * не может; такой элемент читается как осколки с пустой суммой, чтобы
 * список не терял выравнивание.
 *
 * @param dto Вложение из ответа.
 * @returns Вложение UI-модели.
 */
export function mapAttachmentDto(dto: MailAttachmentDto): MailAttachment {
    if (dto.coins && !dto.item) {
        return {
            kind: 'coins',
            gameCode: '',
            quantity: '',
            itemType: 'item',
            amount: dto.coins.amount ?? '',
        };
    }

    return {
        kind: 'item',
        gameCode: dto.item?.game_code ?? '',
        quantity: String(dto.item?.quantity ?? 0),
        itemType: mapItemType(dto.item?.type),
        amount: '',
    };
}

/**
 * Переводит письмо из proto-JSON в UI-модель.
 *
 * @param dto Письмо из ответа.
 * @returns Письмо UI-модели.
 */
export function mapMailDto(dto: MailDto): Mail {
    return {
        id: dto.id ?? '',
        recipient: dto.recipient ?? '',
        broadcast: dto.broadcast === true,
        sender: dto.sender ?? '',
        title: dto.title ?? '',
        body: dto.body ?? '',
        attachments: (dto.attachments ?? []).map(mapAttachmentDto),
        createdAt: parseDateInput(dto.created_at),
        expiresAt: parseDateInput(dto.expires_at),
        revoked: dto.revoked === true,
        claimedCount: dto.claimed_count ?? '0',
    };
}

/**
 * Переводит страницу списка писем из proto-JSON в UI-модель.
 *
 * @param dto Ответ `GET /v1/admin/mail`.
 * @returns Страница в UI-модели.
 */
export function mapMailListDto(dto: MailListDto): MailPage {
    return {
        mails: (dto.mails ?? []).map(mapMailDto),
        nextPageToken: dto.next_page_token ?? '',
    };
}