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
import { RouterLink } from '@angular/router';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import {
    DEFAULT_SETTLEMENT_COVER,
    ISettlement,
    getSettlementTypeByKey,
    getSettlementDisplayName,
    getSettlementTypeTone,
    getSettlementTypeIcon,
    getSettlementTier,
    getDiplomacyTone,
    getOwnerIds,
    isGuildSettlement,
    SettlementBadgeComponent,
    SettlementBadgeTone,
    SettlementDisplayNamePipe,
} from '@entities/settlement';
import { IPlayer, UserService, PlayerChipComponent } from '@entities/user';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { I18nService, TranslatePipe } from '@core/i18n';
import { JoinRequestButtonComponent } from '../join-request';
import { SetTagsComponent } from './set-tags/set-tags.component';
import { MarkupPipe } from '@shared/lib/news-markdown';

@Component({
    standalone: true,
    selector: 'app-settlement-card',
    templateUrl: './settlement-card.component.html',
    styleUrl: './settlement-card.component.less',
    imports: [MarkupPipe, 
        CommonModule,
        TuiIcon,
        ImageLoaderComponent,
        TranslatePipe,
        SettlementBadgeComponent,
        SettlementDisplayNamePipe,
        PlayerChipComponent,
        JoinRequestButtonComponent,
        RouterLink,
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
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Идентификаторы владельцев (owner) поселения.
     */
    protected readonly ownerIds: Signal<string[]> = computed(() => getOwnerIds(this.data()));

    /**
     * Лидеры поселения (владельцы). Может быть несколько.
     */
    protected readonly leaders: Signal<IPlayer[]> = computed(() => {
        const owners = this.ownerIds();
        return this.players().filter((player) => owners.includes(player.user_id));
    });

    /**
     * Список участников поселения без владельцев.
     */
    protected readonly users: Signal<IPlayer[]> = computed(() => {
        const owners = this.ownerIds();
        return this.players().filter((player) => !owners.includes(player.user_id));
    });

    /**
     * Максимум чипов жителей в сети, показываемых в карточке (без главы).
     */
    private readonly MAX_ONLINE_CHIPS = 3;

    /**
     * Жители (не владельцы), которые сейчас в сети.
     */
    protected readonly onlineUsers: Signal<IPlayer[]> = computed(() =>
        this.users().filter((player) => player.is_online)
    );

    /**
     * Жители в сети, влезающие в карточку. Остаток сворачивается в «+N».
     */
    protected readonly visibleOnlineUsers: Signal<IPlayer[]> = computed(() =>
        this.onlineUsers().slice(0, this.MAX_ONLINE_CHIPS)
    );

    /**
     * Число жителей в сети, не поместившихся в карточку.
     */
    protected readonly hiddenOnlineCount: Signal<number> = computed(() =>
        Math.max(0, this.onlineUsers().length - this.visibleOnlineUsers().length)
    );

    /**
     * Ссылка на изображение селения с заглушкой.
     * Обращение к `attachments[0]` через optional chaining: у части селений
     * массив вложений приходит пустым, и шаблон падал на чтении `.url`.
     */
    protected readonly imageUrl: Signal<string> = computed(
        () => this.data().attachments[0]?.url || DEFAULT_SETTLEMENT_COVER
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
     * Уровень селения от 1 до 5; 0 — шкала не применима.
     *
     * Закреплённое селение исключено из шкалы наравне с гильдией: его тип на
     * бэкенде — лагерь, и честная шкала показала бы «1/5» у поместья
     * наместника, что противоречит и подписи типа, и золотой оправе.
     */
    protected readonly tier: Signal<number> = computed(() =>
        this.isPinned(this.data()) ? 0 : getSettlementTier(this.data())
    );

    /**
     * Позиции засечек шкалы уровня. Пять — максимальный уровень селения.
     */
    protected readonly tierScale: readonly number[] = [1, 2, 3, 4, 5];

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
     * Возвращает иконку типа селения.
     * Закреплённое селение получает иконку максимального тира (замок),
     * несмотря на то что его тип на бэкенде — лагерь.
     *
     * @param settlement Селение.
     * @returns Имя иконки Taiga UI.
     */
    protected getSettlementTypeIcon(settlement: ISettlement): string {
        if (this.isPinned(settlement)) {
            return '@tui.castle';
        }

        return getSettlementTypeIcon(settlement);
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


    /**
     * Возвращает признак, является ли пользователь администратором.
     */
    protected isAdmin(): boolean {
        return this.userService.roles.includes('admin');
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
