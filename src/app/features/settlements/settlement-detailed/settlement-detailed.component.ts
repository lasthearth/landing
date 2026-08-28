import { Component, inject } from '@angular/core';
import { TuiDialogContext } from '@taiga-ui/core';
import { ISettlement, getOwnerIds, isGuildSettlement, SettlementBadgeComponent, SettlementDisplayNamePipe } from '@entities/settlement';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { IPlayer, PlayerChipComponent } from '@entities/user';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { I18nService, TranslatePipe } from '@core/i18n';
import { JoinRequestButtonComponent } from '../join-request';

@Component({
    selector: 'app-settlement-detailed',
    templateUrl: './settlement-detailed.component.html',
    styles: [':host { display: block; padding-top: 32px; }'],
    imports: [
        ImageLoaderComponent,
        TranslatePipe,
        SettlementBadgeComponent,
        SettlementDisplayNamePipe,
        PlayerChipComponent,
        JoinRequestButtonComponent,
    ],
})
export class SettlementDetailedComponent {
    /**
     * Контекст открытого диалогового окна.
     */
    private readonly context: TuiDialogContext<void, { settlement: ISettlement; players: IPlayer[] }> =
        inject<TuiDialogContext<void, { settlement: ISettlement; players: IPlayer[] }>>(POLYMORPHEUS_CONTEXT);

    settlementData = this.context.data.settlement;

    private readonly i18n = inject(I18nService);

    /**
     * Идентификаторы владельцев (owner) поселения.
     */
    private readonly ownerIds: string[] = getOwnerIds(this.settlementData);

    /**
     * Лидеры селения (владельцы) из профилей, загруженных на странице списка.
     */
    protected readonly leaders: IPlayer[] = this.context.data.players.filter((player) =>
        this.ownerIds.includes(player.user_id)
    );

    /**
     * Участники селения без владельцев.
     */
    protected readonly users: IPlayer[] = this.context.data.players.filter(
        (player) => !this.ownerIds.includes(player.user_id)
    );

    /**
     * Количество онлайн-участников селения.
     */
    protected readonly onlineCount: number = this.context.data.players.filter((player) => player.is_online).length;

    /**
     * Ссылка на изображение селения с заглушкой.
     * Обращение через optional chaining: у части селений массив вложений пуст,
     * и шаблон падал на чтении `.url`.
     */
    protected readonly imageUrl: string =
        this.settlementData.attachments?.[0]?.url || '/images/screenshots/screen_1.png';

    /**
     * Проверяет, является ли селение гильдией.
     */
    protected isGuild(): boolean {
        return isGuildSettlement(this.settlementData);
    }

    /**
     * Возвращает локализованную метку "Гильдия".
     */
    protected guildLabel(): string {
        return this.i18n.translate('settlements.types.guild');
    }
}
