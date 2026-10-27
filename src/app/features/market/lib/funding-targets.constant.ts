/**
 * Направление расходов, которое описывает раздел «Поддержка сервера».
 */
export interface FundingTarget {
    /**
     * Ключ перевода названия направления.
     */
    readonly titleKey: string;

    /**
     * Ключ перевода описания направления.
     */
    readonly descriptionKey: string;
}

/**
 * Четыре направления, на которые идут покупки в магазине.
 *
 * Список описывает существующий раздел страницы: порядок и состав совпадают
 * с ключами перевода `market.marketPage.funding*`.
 */
export const FUNDING_TARGETS: readonly FundingTarget[] = [
    {
        titleKey: 'market.marketPage.fundingHosting.title',
        descriptionKey: 'market.marketPage.fundingHosting.description',
    },
    {
        titleKey: 'market.marketPage.fundingMods.title',
        descriptionKey: 'market.marketPage.fundingMods.description',
    },
    {
        titleKey: 'market.marketPage.fundingEvents.title',
        descriptionKey: 'market.marketPage.fundingEvents.description',
    },
    {
        titleKey: 'market.marketPage.fundingFair.title',
        descriptionKey: 'market.marketPage.fundingFair.description',
    },
];
