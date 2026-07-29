import { Pipe, PipeTransform } from '@angular/core';
import { ISettlement } from '../model/i-settlement';
import { getSettlementDisplayName } from './get-settlement-display-name.function';

/**
 * Пайп для отображения названия поселения без скрытого маркера гильдии.
 */
@Pipe({
    name: 'settlementDisplayName',
    standalone: true,
    pure: true,
})
export class SettlementDisplayNamePipe implements PipeTransform {
    /**
     * Возвращает очищенное от маркера гильдии название поселения.
     *
     * @param value Поселение или сырое название.
     * @returns Отображаемое название.
     */
    public transform(value: ISettlement | string | null | undefined): string {
        if (!value) {
            return '';
        }

        return getSettlementDisplayName(value);
    }
}
