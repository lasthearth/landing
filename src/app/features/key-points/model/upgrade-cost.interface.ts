import { UpgradeResource } from './upgrade-resource.type';

/**
 * Одна строка стоимости улучшения: ресурс и количество.
 */
export interface UpgradeCost {
    /**
     * Ресурс.
     */
    readonly resource: UpgradeResource;

    /**
     * Сколько нужно.
     */
    readonly amount: number;
}
