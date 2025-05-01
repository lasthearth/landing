import { Component, inject, OnInit } from '@angular/core';
import { Subject, startWith, switchMap } from 'rxjs';
import { LeaderBoardType } from '../../services/enums/leader-board-type';
import { ILeaderBoard } from '../../services/interface/i-leader-board';
import { ServerInformationService } from '../../services/server-information.service';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { TuiTable } from '@taiga-ui/addon-table';
import { TuiIcon, TuiLoader } from '@taiga-ui/core';

@Component({
    standalone: true,
    selector: 'app-statistics',
    imports: [TuiTable, AsyncPipe, NgIf, TuiIcon, NgFor, TuiLoader],
    styleUrl: './statistics.component.less',
    templateUrl: './statistics.component.html',
})
export class StatisticsComponent {

    private serverInfoService = inject(ServerInformationService);

    protected selectedTh: 'deaths' | 'kills' | 'hours' = 'deaths';

    private readonly filterSubject$ = new Subject<LeaderBoardType>();

    protected leaderBoard$ = this.filterSubject$.pipe(
        startWith(0),
        switchMap(filter =>
            this.serverInfoService.getLeaderBoard(filter)
        )
    );

    protected getNames(test: Array<ILeaderBoard>): string[] {
        return Object.keys(test[0])
    }

    protected getDeaths() {
        this.filterSubject$.next(LeaderBoardType.deaths);
        this.selectedTh = 'deaths';
    }

    protected getHoursPlayed() {
        this.filterSubject$.next(LeaderBoardType.hoursPlayed);
        this.selectedTh = 'hours';
    }

    protected getKills() {
        this.filterSubject$.next(LeaderBoardType.kills);
        this.selectedTh = 'kills';
    }

}
