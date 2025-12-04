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
import { TuiDialogService } from '@taiga-ui/core';
import { CommonModule } from '@angular/common';
import { UserService } from '@app/services/user.service';
import { tap } from 'rxjs';
import { TuiPulse } from '@taiga-ui/kit';
import { IPlayer } from '@app/services/interface/i-player';
import { getSettlementTypeByKey } from '@app/functions/get-settlement-type-by-key.function';

@Component({
    standalone: true,
    selector: 'app-settlement-card',
    templateUrl: './settlement-card.component.html',
    imports: [CommonModule, TuiPulse],
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
}
