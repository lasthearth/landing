import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';
import { LeaderBoardType } from '../../services/enums/leader-board-type';
import { ILeaderBoard } from '../../services/interface/i-leader-board';
import { ServerInformationService } from '../../services/server-information.service';
import { UserService } from '../../services/user.service';
import { AsyncPipe, NgIf } from '@angular/common';
import { TuiTable } from '@taiga-ui/addon-table';
import { TuiIcon, TuiLoader } from '@taiga-ui/core';
import { TuiTabs } from '@taiga-ui/kit';
import { LeaderCardComponent } from './leader-card/leader-card.component';

export type TypeLabel = 'Смертей' | 'Убийств' | 'Часов';

/**
 * Компонент страницы статистики игроков.
 */
@Component({
    standalone: true,
    selector: 'app-statistics',
    imports: [TuiTable, AsyncPipe, NgIf, TuiIcon, TuiLoader, TuiTabs, LeaderCardComponent],
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

    /**
     * {@link Subject} фильтрации таблицы.
     */
    private readonly filterSubject$: BehaviorSubject<LeaderBoardType> = new BehaviorSubject<LeaderBoardType>(0);

    /**
     * {@link Observable} лидеров.
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
                })
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
                return 'Убийств';
            case 'hours':
                return 'Часов';
            case 'deaths':
            default:
                return 'Смертей';
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

        const requests = uniqueUserIds.map((userId) =>
            this.userService.getPlayer$(userId).pipe(
                map((user) => ({ userId, avatar: user.avatar.original })),
                catchError(() => of({ userId, avatar: undefined }))
            )
        );

        forkJoin(requests).subscribe({
            next: (results) => {
                results.forEach(({ userId, avatar }) => {
                    if (avatar) {
                        this.avatarsCache.set(userId, avatar);
                    }
                });
                this.cdr.detectChanges();
            },
        });
    }

    /**
     * Возвращает аватар пользователя по user_id.
     *
     * @param userId Идентификатор пользователя
     * @returns URL аватара или undefined
     */
    protected getUserAvatar(userId: string | undefined): string | undefined {
        if (!userId) {
            return undefined;
        }
        return this.avatarsCache.get(userId);
    }
}
