import { CostUnit } from '../model/cost-unit.type';
import { UpgradeCost } from '../model/upgrade-cost.interface';

/**
 * Раскладывает стоимость на части для показа.
 *
 * Деньги (в серебряных) делятся на дукаты, серебряные и медные:
 * 1 дукат = 100 серебряных, 1 серебряная = 10 медных. Нулевые части пропускаются.
 * Остальные ресурсы возвращаются одной частью.
 *
 * @param cost Строка стоимости.
 * @returns Части в порядке от крупной к мелкой.
 */
export function splitCost(cost: UpgradeCost): readonly { amount: number; unit: CostUnit }[] {
    if (cost.resource !== 'money') {
        return [{ amount: cost.amount, unit: cost.resource }];
    }

    const copperTotal = Math.round(cost.amount * 10);
    const parts: { amount: number; unit: CostUnit }[] = [
        { amount: Math.floor(copperTotal / 1000), unit: 'ducats' },
        { amount: Math.floor((copperTotal % 1000) / 10), unit: 'silver' },
        { amount: copperTotal % 10, unit: 'copper' },
    ];
    const visible = parts.filter((part) => part.amount > 0);

    return visible.length ? visible : [{ amount: 0, unit: 'silver' }];
}
