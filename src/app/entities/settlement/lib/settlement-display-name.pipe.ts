import { Pipe, PipeTransform } from '@angular/core';
import { ISettlement } from '../model/i-settlement';
import { getSettlementDisplayName } from './get-settlement-display-name.function';

/**
 * Пайп для отображения названия надела без скрытого маркера гильдии.
 */
@Pipe({
    name: 'settlementDisplayName',
    standalone: true,
    pure: true,
})
export class SettlementDisplayNamePipe implements PipeTransform {
    /**
     * Возвращает очищенное от маркера гильдии название надела.
     *
     * @param value Надел или сырое название.
     * @returns Отображаемое название.
     */
    public transform(value: ISettlement | string | null | undefined): string {
        if (!value) {
            return '';
        }

        return getSettlementDisplayName(value);
    }
}
