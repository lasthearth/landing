import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    input,
    InputSignal,
    OnInit,
} from '@angular/core';
import { ISettlement } from '../interfaces/i-settlement';
import { SettlementService } from '../../services/settlement.service';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { CommonModule } from '@angular/common';
import { UserService } from '@app/services/user.service';
import { tap } from 'rxjs';
import { TuiPulse } from '@taiga-ui/kit';
import { IPlayer } from '@app/services/interface/i-player';
import { getSettlementTypeByKey } from '@app/functions/get-settlement-type-by-key.function';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { SetTagsComponent } from './set-tags/set-tags.component';
import { SettlementTagComponent } from '@app/profile/admin/moderate-settlement-request/settlement-tag/settlement-tag.component';
import { SettlementDetailedComponent } from '../settlement-detailed/settlement-detailed.component';

@Component({
    standalone: true,
    selector: 'app-settlement-card',
    templateUrl: './settlement-card.component.html',
    imports: [CommonModule, TuiPulse, TuiIcon, SettlementTagComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementCardComponent implements OnInit {
    /**
     * Данные поселения.
     */
    public data: InputSignal<ISettlement> = input.required();

    public isControlCard: InputSignal<boolean> = input(false);

    /**
     * Сервис данных о пользователе.
     */
    private readonly userService: UserService = inject(UserService);

    /**
     * Сервис диалогов.
     */
    private readonly dialogs: TuiDialogService = inject(TuiDialogService);

    /**
     * Сервис поселений.
     */
    protected readonly settlementService: SettlementService = inject(SettlementService);

    /**
     * Лидер поселения
     */
    protected leader!: IPlayer;

    cdr = inject(ChangeDetectorRef);

    /**
     * Список игроков
     */
    protected users: IPlayer[] = [];

    /**
     * @inheritdoc
     */
    public ngOnInit(): void {
        this.userService
            .getPlayer$(this.data().leader.user_id)
            .pipe(
                tap((u) => {
                    this.leader = u;
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
                        this.cdr.detectChanges();
                    })
                )
                .subscribe();
        });
    }

    /**
     * Получает тип поселения по ключу.
     *
     * @param key - уникальный идентификатор поселения (может быть undefined)
     * @returns Тип поселения в виде строки:
     * 'Лагерь' | 'Деревня' | 'Посёлок' | 'Город' | 'Региональная провинция'
     */
    protected getSettlementTypeByKey(
        key: string | undefined
    ): 'Лагерь' | 'Деревня' | 'Посёлок' | 'Город' | 'Региональная провинция' {
        return getSettlementTypeByKey(key);
    }

    protected openSetTagsDialog() {
        this.dialogs
            .open(new PolymorpheusComponent(SetTagsComponent), {
                size: 'm',
                data: { settlementId: this.data().id, settlementName: this.data().name, tagsIds: this.data().tags },
            })
            .subscribe();
    }

    protected openDetails() {
        this.dialogs
            .open(new PolymorpheusComponent(SettlementDetailedComponent), {
                size: 'l',
                data: { settlement: this.data() },
            })
            .subscribe();
    }

    protected getTag(tagId: string) {
        return this.settlementService.getTagById(tagId);
    }

    /**
     * Возвращает признак, является ли пользователь администратором.
     */
    protected isAdmin(): boolean {
        return this.userService.roles.includes('admin');
    }
}
