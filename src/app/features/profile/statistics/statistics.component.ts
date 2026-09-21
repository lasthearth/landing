import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { BehaviorSubject, catchError, defaultIfEmpty, Observable, of, switchMap, tap } from 'rxjs';
import { LeaderBoardType } from '@entities/user';
import { ILeaderBoard } from '@entities/user';
import { ServerInformationService } from '@core/services/server-information.service';
import { UserService } from '@entities/user';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { TuiTable } from '@taiga-ui/addon-table';

import { TuiTabs } from '@taiga-ui/kit';
import { TuiIcon } from '@taiga-ui/core';
import { LeaderCardComponent } from './leader-card/leader-card.component';
import { StatisticsSkeletonComponent } from '@shared/ui/skeletons';
import { TUI_IS_MOBILE } from '@taiga-ui/cdk';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { I18nService, TranslatePipe } from '@core/i18n';
import { DonateService, IPurchase } from '@entities/donate';

export type TypeLabel = string;

/**
 * Компонент страницы статистики игроков.
 */
@Component({
    standalone: true,
    selector: 'app-statistics',
    imports: [TuiTable, AsyncPipe, TuiTabs, LeaderCardComponent, StatisticsSkeletonComponent, ImageLoaderComponent, TranslatePipe, NgTemplateOutlet, TuiIcon],
    styleUrl: './statistics.component.less',
    templateUrl: './statistics.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsComponent {
    /**
     * Сервис информации о сервере.
     */
    private readonly serverInfoService: ServerInformationService = inject(ServerInformationService);

    /**
     * Сервис данных о пользователе.
     */
    private readonly userService: UserService = inject(UserService);

    /**
     * ChangeDetectorRef для обновления вида.
     */
    private readonly cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Сервис доната (история покупок текущего пользователя).
     */
    private readonly donateService = inject(DonateService);

    /**
     * Признак того, что текущий пользователь верифицирован (роль admin или player).
     */
    protected readonly isVerifiedUser: boolean =
        this.userService.roles.includes('admin') || this.userService.roles.includes('player');

    /**
     * Признак развёрнутого состояния истории покупок.
     */
    protected readonly isPurchasesExpanded = signal<boolean>(false);

    /**
     * Количество покупок, отображаемых в свёрнутом состоянии.
     */
    protected readonly purchasesCollapsedCount = 1;

    /**
     * История покупок текущего пользователя.
     * Показывается только верифицированным пользователям.
     */
    protected readonly purchases$ = this.userService.authState$.pipe(
        switchMap((isAuth) => {
            if (!isAuth || !this.isVerifiedUser) {
                return of([]);
            }
            return this.donateService.getMyPurchases$().pipe(
                catchError(() => of([])),
                defaultIfEmpty([])
            );
        })
    );

    /**
     * Кэш аватарок пользователей по user_id.
     */
    protected readonly avatarsCache: Map<string, string> = new Map<string, string>();

    /**
     * Индекс открытой вкладки.
     */
    protected activeItemIndex: number = 0;

    /**
     * Выбранный столбец.
     */
    protected selectedTh: 'deaths' | 'kills' | 'hours' = 'deaths';

    protected isMobile: boolean = inject(TUI_IS_MOBILE);

    /**
     * {@link Subject} фильтрации таблицы.
     */
    private readonly filterSubject$: BehaviorSubject<LeaderBoardType> = new BehaviorSubject<LeaderBoardType>(0);

    /**
     * {@link Observable} лидеров.
     *
     * При ошибке запроса (алерт подавлен через `SKIP_ERROR_ALERT`)
     * деградирует к пустой таблице.
     */
    protected readonly leaderBoard$: Observable<{
        entries: Array<ILeaderBoard>;
    }> = this.filterSubject$.pipe(
        switchMap((filter) =>
            this.serverInfoService.getLeaderBoard(filter).pipe(
                tap((data) => {
                    if (data?.entries) {
                        this.loadUserAvatars(data.entries);
                    }
                }),
                catchError(() => of({ entries: [] }))
            )
        )
    );

    /**
     * Возвращает список имен лидеров.
     *
     * @param boardData Данные таблицы.
     */
    protected getNames(boardData: Array<ILeaderBoard>): string[] {
        return Object.keys(boardData[2]);
    }

    /**
     * Возвращает количество смертей игроков.
     */
    protected getDeaths(): void {
        this.filterSubject$.next(LeaderBoardType.deaths);
        this.selectedTh = 'deaths';
    }

    /**
     * Возвращает количество игровых часов игроков.
     */
    protected getHoursPlayed(): void {
        this.filterSubject$.next(LeaderBoardType.hoursPlayed);
        this.selectedTh = 'hours';
    }

    /**
     * Возвращает количество убийств игроков.
     */
    protected getKills(): void {
        this.filterSubject$.next(LeaderBoardType.kills);
        this.selectedTh = 'kills';
    }

    /**
     * Возвращает локализованный тип выбранной метрики.
     */
    protected getTypeLabel(): TypeLabel {
        switch (this.selectedTh) {
            case 'kills':
                return this.i18n.translate('profile.statistics.typeLabels.kills');
            case 'hours':
                return this.i18n.translate('profile.statistics.typeLabels.hours');
            case 'deaths':
            default:
                return this.i18n.translate('profile.statistics.typeLabels.deaths');
        }
    }

    /**
     * Возвращает число для текущей метрики по записи лидера.
     *
     * @param entry Запись таблицы лидеров
     */
    protected getCount(entry: ILeaderBoard): number {
        if (!entry) {
            return 0;
        }

        switch (this.selectedTh) {
            case 'kills':
                return entry.kills;
            case 'hours':
                return entry.hours_played;
            case 'deaths':
            default:
                return entry.deaths;
        }
    }

    /**
     * Возвращает спокойную мета-информацию для отображения статуса покупки.
     * Если покупка выдана (есть issuedBy и issuedAt), отображается «Выдан».
     * Иначе используется перевод статуса.
     * @param purchase UI-модель покупки.
     * @returns Объект с метаданными статуса.
     */
    protected getPurchaseStatusMeta(purchase: IPurchase) {
        const isIssued = !!purchase.issuedBy || !!purchase.issuedAt;

        if (isIssued) {
            return {
                label: 'profile.purchases.status.issued',
                dotClass: 'bg-status-issued',
                textClass: 'text-status-issued',
            };
        }

        const normalizedStatus = purchase.status?.toUpperCase();

        switch (normalizedStatus) {
            case 'COMPLETED':
                return {
                    label: 'profile.purchases.status.completed',
                    dotClass: 'bg-status-done',
                    textClass: 'text-status-done',
                };
            case 'ISSUED':
            case 'DELIVERED':
                return {
                    label: 'profile.purchases.status.issued',
                    dotClass: 'bg-status-issued',
                    textClass: 'text-status-issued',
                };
            case 'REFUNDED':
                return {
                    label: 'profile.purchases.status.refunded',
                    dotClass: 'bg-status-refund',
                    textClass: 'text-status-refund',
                };
            case 'PENDING':
            case 'ACTIVE':
                return {
                    label: 'profile.purchases.status.pending',
                    dotClass: 'bg-status-wait',
                    textClass: 'text-status-wait',
                };
            default:
                return {
                    label: purchase.status || '-',
                    dotClass: 'bg-lh-primary-2/50',
                    textClass: 'text-ink-3',
                };
        }
    }

    /**
     * Загружает аватарки пользователей по их user_id.
     *
     * @param entries Записи лидерборда
     */
    private loadUserAvatars(entries: Array<ILeaderBoard>): void {
        if (!this.userService.accessToken) {
            return;
        }

        const uniqueUserIds = [
            ...new Set(entries.map((entry) => entry.user_id).filter((id) => id && !this.avatarsCache.has(id))),
        ];

        if (uniqueUserIds.length === 0) {
            return;
        }

        this.userService
            .getPlayersBatch$(uniqueUserIds)
            .pipe(catchError(() => of([])))
            .subscribe((players) => {
                players.forEach((player) => {
                    if (player.avatar?.original) {
                        this.avatarsCache.set(player.user_id, player.avatar.original);
                    }
                });
                this.cdr.detectChanges();
            });
    }

    /**
     * Возвращает аватар пользователя по user_id.
     *
     * @param userId Идентификатор пользователя
     * @returns URL аватара или undefined
     */
    protected getUserAvatar(userId: string | undefined): string {
        if (!userId) {
            return '/default-avatar.webp';
        }
        return this.avatarsCache.get(userId) ?? '/default-avatar.webp';
    }
}
