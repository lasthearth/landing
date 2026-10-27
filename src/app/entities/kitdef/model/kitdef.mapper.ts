import { formatDate, parseDate } from '@entities/donate';
import { KitCategory } from './kit-category.type';
import { IKitDef, IKitDefDto, IKitItem, IKitItemDto } from './kit-def.interface';

/**
 * Приводит значение категории набора к известному.
 *
 * Сервер раскрывает незаполненную категорию в `"kit"`, но до сайта поле
 * может дойти пустой строкой (protobuf-JSON опускает нулевые значения)
 * или неизвестным значением. Всё, что не `"privilege"` и не `"special"`,
 * считается `"kit"` — категория по умолчанию.
 *
 * @param raw Значение поля `category` из DTO: строка, `undefined` или `null`.
 * @returns Одна из трёх известных категорий.
 */
export function normalizeKitCategory(raw: string | undefined | null): KitCategory {
    return raw === 'privilege' || raw === 'special' ? raw : 'kit';
}

/**
 * Преобразует DTO позиции состава набора в UI-модель.
 *
 * Опущенные protobuf-полем значения подменяются безопасными fallback:
 * пустой строкой для кода, типа и иконки, нулём для количества.
 *
 * @param dto DTO позиции от API.
 * @returns UI-модель позиции набора.
 */
export function mapDtoToKitItem(dto: IKitItemDto): IKitItem {
    return {
        gameCode: dto.game_code ?? '',
        type: dto.type ?? '',
        quantity: dto.quantity ?? 0,
        imageUrl: dto.image_url ?? '',
    };
}

/**
 * Преобразует DTO захваченного набора в UI-модель.
 *
 * Порядок `items` сохраняется: индекс позиции в массиве — это индекс,
 * по которому `KitdefService.removeKitItem$` удаляет позицию. Даты
 * разбираются через `parseDate`, поэтому нулевое значение protobuf
 * ("0001-01-01T00:00:00Z") и невалидная строка дают `null` и "—".
 *
 * @param dto DTO набора от API.
 * @returns UI-модель набора.
 */
export function mapDtoToKitDef(dto: IKitDefDto): IKitDef {
    const createdAt = parseDate(dto.created_at);
    const updatedAt = parseDate(dto.updated_at);

    return {
        code: dto.code ?? '',
        title: dto.title ?? '',
        category: normalizeKitCategory(dto.category),
        items: (dto.items ?? []).map(mapDtoToKitItem),
        createdAt,
        formattedCreatedAt: createdAt ? formatDate(createdAt) : '—',
        updatedAt,
        formattedUpdatedAt: updatedAt ? formatDate(updatedAt) : '—',
    };
}
