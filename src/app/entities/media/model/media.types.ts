/**
 * Типы данных для сервиса загрузки медиафайлов.
 *
 * Содержит DTO для получения presigned-ссылок и загрузки файлов в S3-совместимое хранилище.
 */

/**
 * Назначение загружаемых файлов.
 *
 * Определяет бакет/политику на стороне сервера.
 */
export type UploadPurpose =
    | 'UPLOAD_PURPOSE_UNSPECIFIED'
    | 'UPLOAD_PURPOSE_DONATE_SHOP'
    | 'UPLOAD_PURPOSE_SETTLEMENT'
    | 'UPLOAD_PURPOSE_NEWS';

/**
 * Запрос на получение presigned-целей для загрузки файлов.
 */
export interface CreateUploadUrlsRequest {
    /**
     * Назначение загружаемых файлов.
     */
    purpose: UploadPurpose;

    /**
     * Количество целей для загрузки.
     *
     * Допустимый диапазон: [1, 20].
     */
    count: number;

    /**
     * MIME-тип загружаемых файлов.
     *
     * Например, "image/webp". Если не указан, сервер разрешает любой image/*
     * и назначает расширение .webp.
     */
    content_type?: string;
}

/**
 * Presigned-цель для загрузки одного файла.
 */
export interface UploadTarget {
    /**
     * S3-presigned POST endpoint.
     *
     * На этот URL отправляется multipart/form-data с файлом.
     */
    post_url: string;

    /**
     * Поля формы, которые необходимо отправить вместе с файлом.
     *
     * Содержат policy, подпись, ключ, bucket и другие S3-параметры.
     */
    fields: Record<string, string>;

    /**
     * Публичный URL загруженного файла.
     *
     * Передаётся в соответствующий доменный запрос (image_url, preview, attachments[].url).
     */
    public_url: string;
}

/**
 * Ответ на запрос получения presigned-целей.
 */
export interface CreateUploadUrlsResponse {
    /**
     * Список целей для загрузки файлов.
     */
    targets: UploadTarget[];
}
