import { ContentSection } from '@features/new-content';

/**
 * Пункт главного меню шапки.
 * Один и тот же список рисуется в мобильном выпадающем меню и на десктопе,
 * поэтому состав меню меняется в одном месте.
 */
export interface HeaderNavLink {
    /**
     * Адрес раздела.
     */
    route: string;

    /**
     * Иконка Taiga UI.
     */
    icon: string;

    /**
     * Ключ перевода подписи.
     */
    labelKey: string;

    /**
     * Показывать только гостям (например, «Начать игру»).
     */
    guestOnly?: boolean;

    /**
     * Раздел ленты «нового», по которому рисуется точка-индикатор.
     */
    freshSection?: ContentSection;
}
