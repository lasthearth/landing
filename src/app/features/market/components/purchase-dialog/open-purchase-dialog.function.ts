import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { PrivilegeCard } from '../../interfaces/privilege-card.interface';
import { PurchaseDialogComponent, PurchaseDialogData } from './purchase-dialog.component';

/**
 * Открывает диалог покупки товара витрины.
 *
 * Единая точка открытия: вкладки «Привилегии» и «Наборы» и результаты
 * поиска собирают одни и те же данные диалога из карточки.
 *
 * @param dialogs Сервис диалогов Taiga UI.
 * @param card Карточка товара витрины.
 * @param term Изначально выбранный срок подписки.
 * @returns true, если диалог открыт; false, если у карточки нет идентификатора товара.
 */
export function openPurchaseDialog(
    dialogs: TuiDialogService,
    card: PrivilegeCard,
    term: 'month' | 'season' = 'month'
): boolean {
    if (!card.id) {
        return false;
    }

    const data: PurchaseDialogData = {
        itemId: card.id,
        title: card.title,
        image: card.image,
        monthPrice: card.monthPrice,
        seasonPrice: card.seasonPrice,
        currency: card.currency ?? 'coins',
        initialTerm: term,
        description: card.description,
        kitItems: card.kitItems,
        dailyKitItems: card.dailyKitItems,
        privileges: card.privileges,
    };

    dialogs.open(new PolymorpheusComponent(PurchaseDialogComponent), { size: 'auto', data }).subscribe();

    return true;
}
