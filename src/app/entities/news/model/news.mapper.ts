import { NewsDto, News, CreateNewsRequest } from './news.types';

/**
 * Преобразует DTO новости из API в UI-модель.
 *
 * @param dto DTO новости, полученное от API.
 * @returns UI-модель новости с отформатированными полями.
 */
export function mapDtoToNews(dto: NewsDto): News {
    const rawDate = dto.created_at ?? dto.createdAt;
    const date = parseDate(rawDate);

    return {
        id: dto.id,
        title: dto.title,
        content: dto.content,
        preview: dto.preview,
        viewCount: parseInt(dto.view_count, 10) || 0,
        createdAt: date,
        formattedDate: date ? formatDate(date) : '—',
        createdBy: dto.created_by ?? dto.createdBy ?? '',
    };
}

/**
 * Парсит строку даты из API в объект Date.
 *
 * Возвращает `null`, если дата отсутствует, невалидна
 * или равна protobuf-нулю (`0001-01-01T00:00:00Z`).
 *
 * @param rawDate Исходная строка даты в формате ISO 8601.
 * @returns Объект Date или `null`.
 */
function parseDate(rawDate: string | undefined): Date | null {
    if (!rawDate) {
        return null;
    }

    const isInvalidDate =
        rawDate.startsWith('0001-01-01') || rawDate === '0001-01-01T00:00:00Z';

    if (isInvalidDate) {
        return null;
    }

    const parsed = new Date(rawDate);

    return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Форматирует дату в человекочитаемый вид.
 *
 * Формат: "DD.MM.YY - HH:mm".
 *
 * @param date Дата для форматирования.
 * @returns Отформатированная строка.
 */
export function formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}.${month}.${year} - ${hours}:${minutes}`;
}

/**
 * Преобразует UI-запрос создания новости в DTO для API.
 *
 * @param request UI-модель запроса на создание.
 * @returns DTO для отправки в API.
 */
export function mapCreateRequestToDto(
    request: CreateNewsRequest
): Omit<NewsDto, 'id' | 'view_count' | 'created_at' | 'createdAt' | 'created_by' | 'createdBy'> {
    return {
        title: request.title,
        content: request.content,
        preview: request.preview,
    };
}
