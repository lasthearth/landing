import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    InputSignal,
    output,
    OutputEmitterRef,
    Signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { TuiPulse } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import {
    ISettlement,
    getSettlementTypeByKey,
    getSettlementDisplayName,
    getSettlementTypeTone,
    getDiplomacyTone,
    isGuildSettlement,
    SettlementBadgeComponent,
    SettlementBadgeTone,
    SettlementDisplayNamePipe,
} from '@entities/settlement';
import { IPlayer, UserService } from '@entities/user';
import { SettlementTagStore, SettlementTagComponent } from '@entities/settlement-tag';
import { environment } from '@core/config/environments/environment';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { I18nService, TranslatePipe } from '@core/i18n';
import { SetTagsComponent } from './set-tags/set-tags.component';
import { SettlementDetailedComponent } from '../settlement-detailed/settlement-detailed.component';

@Component({
    standalone: true,
    selector: 'app-settlement-card',
    templateUrl: './settlement-card.component.html',
    styleUrl: './settlement-card.component.less',
    imports: [
        CommonModule,
        TuiPulse,
        TuiIcon,
        ImageLoaderComponent,
        TranslatePipe,
        SettlementBadgeComponent,
        SettlementTagComponent,
        SettlementDisplayNamePipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementCardComponent {
    /**
     * Данные поселения.
     */
    public data: InputSignal<ISettlement> = input.required();

    /**
     * Профили лидера и участников селения.
     * Загружаются одним батчем на странице списка и передаются готовыми.
     */
    public players: InputSignal<IPlayer[]> = input<IPlayer[]>([]);

    /**
     * Режим управляющей карточки.
     */
    public isControlCard: InputSignal<boolean> = input(false);

    /**
     * Событие изменения тегов поселения.
     */
    public tagsChanged: OutputEmitterRef<void> = output();

    /**
     * Сервис данных о пользователе.
     */
    private readonly userService: UserService = inject(UserService);

    /**
     * Сервис диалогов.
     */
    private readonly dialogs: TuiDialogService = inject(TuiDialogService);

    /**
     * Хранилище тегов поселений.
     */
    protected readonly tagStore: SettlementTagStore = inject(SettlementTagStore);

    protected readonly environment = environment;

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Лидер поселения.
     */
    protected readonly leader: Signal<IPlayer | null> = computed(
        () => this.players().find((player) => player.user_id === this.data().leader.user_id) ?? null
    );

    /**
     * Список участников поселения без лидера.
     */
    protected readonly users: Signal<IPlayer[]> = computed(() =>
        this.players().filter((player) => player.user_id !== this.data().leader.user_id)
    );

    /**
     * Количество онлайн-участников селения.
     */
    protected readonly onlineCount: Signal<number> = computed(
        () => this.players().filter((player) => player.is_online).length
    );

    /**
     * Имя закреплённого селения.
     */
    protected readonly pinnedSettlementName = 'Поместье Эренхольд';

    /**
     * Проверяет, является ли селение закреплённым.
     *
     * @param settlement Селение.
     * @returns true, если селение — Поместье Эренхольд.
     */
    protected isPinned(settlement: ISettlement): boolean {
        return getSettlementDisplayName(settlement) === this.pinnedSettlementName;
    }

    /**
     * Возвращает отображаемый статус дипломатии.
     * Для гильдий миролюбивый статус отображается как "Торгово-миролюбивый".
     *
     * @param settlement Селение.
     * @returns Локализованное название дипломатии.
     */
    protected getDiplomacyLabel(settlement: ISettlement): string {
        if (isGuildSettlement(settlement) && settlement.diplomacy === 'Миролюбивый') {
            return this.i18n.translate('settlements.diplomacy.guild');
        }

        return settlement.diplomacy;
    }

    /**
     * Возвращает отображаемый тип селения.
     * Для закреплённого селения всегда возвращает "Поместье наместника".
     *
     * @param settlement Селение.
     * @returns Локализованное название типа.
     */
    protected getSettlementTypeLabel(settlement: ISettlement): string {
        if (this.isPinned(settlement)) {
            return 'Поместье наместника';
        }

        if (isGuildSettlement(settlement)) {
            return this.i18n.translate('settlements.types.guild');
        }

        return getSettlementTypeByKey(settlement.type);
    }

    /**
     * Возвращает тон бейджа типа селения.
     *
     * @param settlement Селение.
     * @returns Тон бейджа.
     */
    protected getSettlementTypeTone(settlement: ISettlement): SettlementBadgeTone {
        return getSettlementTypeTone(settlement);
    }

    /**
     * Возвращает тон бейджа дипломатии.
     *
     * @param diplomacy Статус дипломатии.
     * @returns Тон бейджа.
     */
    protected getDiplomacyTone(diplomacy: string | undefined): SettlementBadgeTone {
        return getDiplomacyTone(diplomacy);
    }

    /**
     * Получает тип поселения по ключу.
     *
     * @param key - уникальный идентификатор поселения (может быть undefined)
     * @returns Тип поселения в виде строки:
     * 'Лагерь' | 'Деревня' | 'Посёлок' | 'Город' | 'Региональная провинция'
     */
    protected getSettlementTypeByKey(
        key: string | number | undefined
    ): 'Лагерь' | 'Деревня' | 'Посёлок' | 'Город' | 'Региональная провинция' {
        return getSettlementTypeByKey(key);
    }

    protected openSetTagsDialog() {
        this.dialogs
            .open(new PolymorpheusComponent(SetTagsComponent), {
                size: 'auto',
                data: { settlementId: this.data().id, settlementName: this.data().name, tagsIds: this.data().tags },
            })
            .subscribe({
                complete: () => this.tagsChanged.emit(),
            });
    }

    protected openDetails() {
        this.dialogs
            .open(new PolymorpheusComponent(SettlementDetailedComponent), {
                size: 'auto',
                data: { settlement: this.data(), players: this.players() },
            })
            .subscribe();
    }

    protected getTag(tagId: string) {
        return this.tagStore.getTagById(tagId);
    }

    /**
     * Возвращает признак, является ли пользователь администратором.
     */
    protected isAdmin(): boolean {
        return this.userService.roles.includes('admin');
    }

    protected isEastSuzerain(settlement: ISettlement): boolean {
        return (
            this.tagStore.hasSpecialTag(settlement.tags, 'suzerain') &&
            this.tagStore.hasSpecialTag(settlement.tags, 'east')
        );
    }

    protected isWestSuzerain(settlement: ISettlement): boolean {
        return (
            this.tagStore.hasSpecialTag(settlement.tags, 'suzerain') &&
            this.tagStore.hasSpecialTag(settlement.tags, 'west')
        );
    }

    /**
     * Возвращает CSS-класс окантовки карточки в зависимости от типа селения.
     *
     * @param type Тип селения (строка или число из enum).
     * @returns Класс окантовки: settlement-card--camp | --village | --township | --city | --region.
     */
    protected getBorderClass(type: string | number | undefined): string {
        if (this.isPinned(this.data())) {
            return 'settlement-card--pinned';
        }

        if (isGuildSettlement(this.data())) {
            return 'settlement-card--guild';
        }

        switch (type) {
            case 'VILLAGE':
            case 1:
                return 'settlement-card--village';
            case 'TOWNSHIP':
            case 2:
                return 'settlement-card--township';
            case 'CITY':
            case 3:
                return 'settlement-card--city';
            case 'PROVINCE':
            case 4:
                return 'settlement-card--region';
            case 'CAMP':
            case 0:
            default:
                return 'settlement-card--camp';
        }
    }

    /**
     * Определяет, является ли селение лагерем (без окантовки).
     *
     * @param type Тип селения.
     * @returns true, если тип соответствует лагерю.
     */
    protected isCampType(type: string | number | undefined): boolean {
        return type === 'CAMP' || type === 0 || type === undefined;
    }
}
