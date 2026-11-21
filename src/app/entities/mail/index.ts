/**
 * Публичный API сущности «Почта игрока».
 *
 * Другие слайсы импортируют только отсюда: `@entities/mail`.
 * Внутренние файлы снаружи не читаются — проверяет scripts/check-architecture.mjs.
 */

export type {
    ComposeMailRequest,
    ComposeMailResponse,
    Mail,
    MailAttachment,
    MailAttachmentDto,
    MailAttachmentKind,
    MailCoinsDto,
    MailDto,
    MailItemDto,
    MailItemType,
    MailListDto,
    MailPage,
    MailState,
} from './model/mail.types';
export type { ComposeMailDraft } from './model/compose-mail-draft.interface';
export { mapAttachmentDto, mapMailDto, mapMailListDto } from './model/mail.mapper';
export { buildComposeMailRequest } from './lib/build-compose-mail-request.function';
export { MAIL_SCOPES } from './config/mail-scopes.constant';
export { MAIL_PAGE_SIZE } from './config/mail-page-size.constant';
export { MailApiService } from './api/mail.api';