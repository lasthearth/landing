import { ISettlementTag } from './i-settlement-tag';
import { ISettlementTagDto } from './i-settlement-tag-dto';

/**
 * Маппер тегов поселений между DTO и UI-моделью.
 */
export class SettlementTagMapper {
    /**
     * Преобразует DTO из API в UI-модель.
     *
     * @param dto DTO тега.
     * @returns UI-модель тега.
     */
    public static fromDto(dto: ISettlementTagDto): ISettlementTag {
        return {
            id: dto.id,
            name: dto.name,
            color: dto.color,
            description: dto.description,
        };
    }

    /**
     * Преобразует UI-модель в DTO для создания/обновления тега.
     *
     * @param tag UI-модель тега.
     * @returns DTO тега.
     */
    public static toDto(tag: Omit<ISettlementTag, 'id'> & { id?: string }): Omit<ISettlementTagDto, 'id'> & {
        id?: string;
    } {
        return {
            id: tag.id,
            name: tag.name,
            color: tag.color,
            description: tag.description,
        };
    }
}
