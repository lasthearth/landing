/**
 * Публичный API сущности "Медиа".
 *
 * Экспортирует типы, API-сервис для загрузки файлов через presigned URLs
 * и разбор ограничения размера файла из S3-политики.
 */

export * from './model/media.types';
export { MediaService } from './api/media.service';
export { getUploadSizeRange } from './lib/upload-size-range.function';
export type { UploadSizeRange } from './lib/upload-size-range.function';
