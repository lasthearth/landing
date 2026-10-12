import { WikiArticleDto, WikiCoverDto, WikiQuickAnswerDto, WikiRevisionDto } from './wiki.types';
import {
    WikiArticle,
    WikiCover,
    WikiDraft,
    WikiQuickAnswer,
    WikiRevision,
    WikiSectionId,
    WikiStatus,
} from './wiki-article.model';

/**
 * Разделы вики: всё, что не пришло от сервера, считается первым разделом.
 */
const SECTIONS: readonly WikiSectionId[] = ['start', 'settlements', 'war', 'economy', 'world', 'help'];

/**
 * Переводит строку protobuf-энума в статус домена.
 *
 * @param value Значение из API.
 * @returns Статус статьи; по умолчанию черновик — неопубликованное безопаснее.
 */
export function mapStatusFromDto(value: string | undefined): WikiStatus {
    return value === 'ARTICLE_STATUS_PUBLISHED' ? 'published' : 'draft';
}

/**
 * Переводит статус домена в строку protobuf-энума.
 *
 * @param status Статус статьи.
 * @returns Значение для API.
 */
export function mapStatusToDto(status: WikiStatus): string {
    return status === 'published' ? 'ARTICLE_STATUS_PUBLISHED' : 'ARTICLE_STATUS_DRAFT';
}

/**
 * Проверяет, что строка — известный раздел вики.
 *
 * @param value Значение из API.
 * @returns Идентификатор раздела.
 */
export function mapSectionFromDto(value: string | undefined): WikiSectionId {
    return SECTIONS.includes(value as WikiSectionId) ? (value as WikiSectionId) : 'start';
}

/**
 * Преобразует обложку из DTO в модель.
 *
 * @param dto Обложка из API.
 * @returns Обложка или `null`.
 */
function mapCoverFromDto(dto: WikiCoverDto | null | undefined): WikiCover | null {
    return dto && dto.url ? { url: dto.url, focus: Number(dto.focus) || 0 } : null;
}

/**
 * Преобразует короткий ответ из DTO в модель.
 *
 * @param dto Короткий ответ из API.
 * @returns Короткий ответ или `null`.
 */
function mapQuickAnswerFromDto(dto: WikiQuickAnswerDto | null | undefined): WikiQuickAnswer | null {
    return dto ? { question: dto.question ?? '', answer: dto.answer ?? '' } : null;
}

/**
 * Преобразует статью из DTO в модель.
 *
 * @param dto Статья из API.
 * @returns Статья для компонентов.
 */
export function mapArticleFromDto(dto: WikiArticleDto): WikiArticle {
    return {
        id: dto.id,
        slug: dto.slug,
        title: dto.title,
        sectionId: mapSectionFromDto(dto.section),
        lead: dto.lead ?? '',
        cover: mapCoverFromDto(dto.cover),
        tags: dto.tags ?? [],
        gameVersion: dto.game_version ?? '',
        quickAnswer: mapQuickAnswerFromDto(dto.quick_answer),
        related: dto.related ?? [],
        body: dto.body ?? '',
        status: mapStatusFromDto(dto.status),
        createdAt: dto.created_at ?? '',
        updatedAt: dto.updated_at ?? '',
        authorName: dto.author_name ?? '',
        // Версия приходит строкой (int64 в protobuf), а для сверки нужна числом.
        version: Number(dto.version ?? 0),
    };
}

/**
 * Преобразует снимок из DTO в модель.
 *
 * @param dto Снимок из API.
 * @returns Снимок для компонентов.
 */
export function mapRevisionFromDto(dto: WikiRevisionDto): WikiRevision {
    return {
        id: dto.id,
        savedAt: dto.saved_at ?? '',
        authorName: dto.author_name ?? '',
        note: dto.note ?? '',
        // Снимок без статьи бесполезен для сравнения — отдаём состояние, а не падение.
        article: dto.article
            ? mapArticleFromDto(dto.article)
            : mapArticleFromDto({ id: '', slug: '', title: '', section: 'start' }),
    };
}

/**
 * Преобразует черновик редактора в тело запроса на сохранение.
 *
 * @param draft Поля статьи из редактора.
 * @returns Тело запроса для API.
 */
export function mapDraftToDto(
    draft: WikiDraft,
    id: string | null,
    status: WikiStatus
): {
    article: Record<string, unknown>;
    expected_version: number;
    note: string;
} {
    return {
        article: {
            id: id ?? '',
            slug: draft.slug,
            title: draft.title,
            section: draft.sectionId ?? 'start',
            lead: draft.lead,
            cover: draft.cover ? { url: draft.cover.url, focus: draft.cover.focus } : null,
            tags: [...draft.tags],
            game_version: draft.gameVersion,
            quick_answer: draft.quickAnswer
                ? { question: draft.quickAnswer.question, answer: draft.quickAnswer.answer }
                : null,
            related: [...draft.related],
            body: draft.body,
            status: mapStatusToDto(status),
        },
        expected_version: 0,
        note: '',
    };
}
