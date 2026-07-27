import { IPurchase } from './purchase.interface';

/**
 * Страница истории покупок всех игроков (админка).
 *
 * Использует cursor-пагинацию: токен следующей страницы
 * приходит от сервера в поле `next_page_token`.
 */
export interface IPurchasesPage {
    /**
     * Список покупок текущей страницы (сначала новые).
     */
    purchases: IPurchase[];

    /**
     * Токен следующей страницы.
     *
     * Пустая строка означает, что страниц больше нет.
     */
    nextPageToken: string;
}
