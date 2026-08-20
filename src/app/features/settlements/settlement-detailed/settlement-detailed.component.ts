import { Component, inject } from '@angular/core';
import { TuiDialogContext } from '@taiga-ui/core';
import { ISettlement, isGuildSettlement, SettlementDisplayNamePipe } from '@entities/settlement';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { IPlayer } from '@entities/user';
import { TuiPulse } from '@taiga-ui/kit';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { I18nService, TranslatePipe } from '@core/i18n';

@Component({
    selector: 'app-settlement-detailed',
    templateUrl: './settlement-detailed.component.html',
    styles: [':host { display: block; padding-top: 32px; }'],
    imports: [TuiPulse, ImageLoaderComponent, TranslatePipe, SettlementDisplayNamePipe],
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
     * Лидер селения из профилей, загруженных на странице списка.
     */
    protected readonly leader: IPlayer | null =
        this.context.data.players.find((player) => player.user_id === this.settlementData.leader.user_id) ?? null;

    /**
     * Участники селения без лидера.
     */
    protected readonly users: IPlayer[] = this.context.data.players.filter(
        (player) => player.user_id !== this.settlementData.leader.user_id
    );

    /**
     * Количество онлайн-участников селения.
     */
    protected readonly onlineCount: number = this.context.data.players.filter((player) => player.is_online).length;

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
