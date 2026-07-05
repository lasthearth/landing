import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    DestroyRef,
    inject,
    input,
    InputSignal,
    OnInit,
    output,
    OutputEmitterRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { TuiPulse } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { ISettlement, getSettlementTypeByKey } from '@entities/settlement';
import { IPlayer, UserService } from '@entities/user';
import { SettlementTagStore } from '@entities/settlement-tag';
import { environment } from '@core/config/environments/environment';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { TranslatePipe } from '@core/i18n';
import { SettlementTagComponent } from '@app/features/admin/moderate-settlement-request/settlement-tag/settlement-tag.component';
import { SetTagsComponent } from './set-tags/set-tags.component';
import { SettlementDetailedComponent } from '../settlement-detailed/settlement-detailed.component';

@Component({
    standalone: true,
    selector: 'app-settlement-card',
    templateUrl: './settlement-card.component.html',
    styleUrl: './settlement-card.component.less',
    imports: [CommonModule, TuiPulse, TuiIcon, ImageLoaderComponent, TranslatePipe, SettlementTagComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementCardComponent implements OnInit {
    /**
     * Данные поселения.
     */
    public data: InputSignal<ISettlement> = input.required();

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
     * Лидер поселения
     */
    protected leader: IPlayer | null = null;

    cdr = inject(ChangeDetectorRef);

    /**
     * Ссылка уничтожения компонента.
     */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    /**
     * Список игроков
     */
    protected users: IPlayer[] = [];

    /**
     * Количество онлайн-участников селения.
     */
    protected onlineCount: number = 0;

    /**
     * @inheritdoc
     */
    public ngOnInit(): void {
        this.tagStore.loadTags$().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();

        this.userService
            .getPlayer$(this.data().leader.user_id)
            .pipe(
                tap((u) => {
                    this.leader = u;
                    if (u?.is_online) {
                        this.onlineCount++;
                    }
                    this.cdr.detectChanges();
                })
            )
            .subscribe();

        this.data().members.forEach((m) => {
            this.userService
                .getPlayer$(m.user_id)
                .pipe(
                    tap((u) => {
                        this.users.push(u);
                        if (u?.is_online) {
                            this.onlineCount++;
                        }
                        this.cdr.detectChanges();
                    })
                )
                .subscribe();
        });
    }

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
        return settlement.name === this.pinnedSettlementName;
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

        return getSettlementTypeByKey(settlement.type);
    }

    /**
     * Возвращает CSS-классы бейджа типа селения.
     * Цвет бейджа соответствует tier селения, чтобы визуально отличать
     * Лагерь, Деревню, Посёлок, Город и Региональную провинцию.
     *
     * @param settlement Селение.
     * @returns Строка с Tailwind-классами фона и текста.
     */
    protected getSettlementTypeBadgeClasses(settlement: ISettlement): string {
        if (this.isPinned(settlement)) {
            return 'bg-[#ffd700]/15 text-[#8a6e2f] border border-[#d4af37]/40';
        }

        switch (settlement.type) {
            case 'VILLAGE':
            case 1:
                return 'bg-[#8b5a2b]/15 text-[#8b5a2b]';
            case 'TOWNSHIP':
            case 2:
                return 'bg-[#5a5a5a]/15 text-[#5a5a5a]';
            case 'CITY':
            case 3:
                return 'bg-[#6e7a8b]/15 text-[#6e7a8b]';
            case 'PROVINCE':
            case 4:
                return 'bg-[#b8860b]/15 text-[#b8860b]';
            case 'CAMP':
            case 0:
            default:
                return 'bg-[#3d5381]/15 text-[#3d5381]';
        }
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
                data: { settlement: this.data() },
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
