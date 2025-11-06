import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, Subject, startWith, switchMap } from 'rxjs';
import { LeaderBoardType } from '../../services/enums/leader-board-type';
import { ILeaderBoard } from '../../services/interface/i-leader-board';
import { ServerInformationService } from '../../services/server-information.service';
import { AsyncPipe, NgFor, NgIf, NgClass } from '@angular/common';
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
    imports: [TuiTable, AsyncPipe, NgIf, TuiIcon, NgFor, TuiLoader, TuiTabs, NgClass, LeaderCardComponent],
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
    }> = this.filterSubject$.pipe(switchMap((filter) => this.serverInfoService.getLeaderBoard(filter)));

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
}
