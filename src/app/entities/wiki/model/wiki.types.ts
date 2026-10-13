/**
 * Типы данных сущности «Статья вики».
 *
 * DTO повторяют контракт `wiki.v1` из protobuf (snake_case, энумы строками),
 * UI-модель — то, чем пользуются компоненты (camelCase, энумы словами домена).
 */

/**
 * Обложка статьи и то, какая её часть попадает в полосу.
 */
export interface WikiCoverDto {
    url: string;
    focus: number;
}

/**
 * Короткий ответ для блока быстрых ответов.
 */
export interface WikiQuickAnswerDto {
    question: string;
    answer: string;
}

/**
 * Статья вики в том виде, в каком её отдаёт API.
 *
 * Энумы приходят строками: `ARTICLE_STATUS_PUBLISHED`, `ARTICLE_STATUS_DRAFT`.
 * Версия — та, на которой основана правка: сервер сверяет её и не даёт
 * затереть чужое изменение.
 */
export interface WikiArticleDto {
    id: string;
    slug: string;
    title: string;
    section: string;
    lead?: string;
    cover?: WikiCoverDto | null;
    tags?: string[];
    game_version?: string;
    quick_answer?: WikiQuickAnswerDto | null;
    related?: string[];
    body?: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
    author_name?: string;
    created_by?: string;
    version?: string;
}

/**
 * Снимок статьи в истории правок.
 */
export interface WikiRevisionDto {
    id: string;
    article_id?: string;
    article?: WikiArticleDto;
    note?: string;
    author_name?: string;
    saved_at?: string;
}

/**
 * Ответ на постраничный список статей.
 */
export interface WikiListDto {
    articles?: WikiArticleDto[];
    next_page_token?: string;
    total_size?: number;
}

/**
 * Ответ на список правок.
 */
export interface WikiRevisionsDto {
    revisions?: WikiRevisionDto[];
}

/**
 * Черновик статьи: то, что редактор отправляет на сохранение.
 */
export interface WikiDraftDto {
    id?: string;
    slug: string;
    title: string;
    section: string;
    lead: string;
    cover?: WikiCoverDto | null;
    tags: string[];
    game_version: string;
    quick_answer?: WikiQuickAnswerDto | null;
    related: string[];
    body: string;
    status: string;
}

/**
 * Состояние предложения игрока.
 */
export type WikiSuggestionStatus = 'pending' | 'approved' | 'rejected';

/**
 * Что предлагает игрок.
 */
export type WikiSuggestionKind = 'new' | 'edit';

/**
 * Предложение игрока в том виде, в каком его отдаёт API.
 */
export interface WikiSuggestionDto {
    id: string;
    kind?: string;
    article_id?: string;
    slug?: string;
    proposal?: WikiArticleDto | null;
    status?: string;
    note?: string;
    author_name?: string;
    reviewer_name?: string;
    reject_reason?: string;
    created_at?: string;
    reviewed_at?: string;
    applied_article_id?: string;
}

/**
 * Ответ на список предложений.
 */
export interface WikiSuggestionListDto {
    suggestions?: WikiSuggestionDto[];
    next_page_token?: string;
}
