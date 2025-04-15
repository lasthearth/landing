import { Component, inject } from '@angular/core';
import { UserService } from '../services/user.service';
import { IUser } from '../services/interface/i-user';
import { ServerInformationService } from '../services/server-information.service';
import { AsyncPipe, NgFor } from '@angular/common';
import { TuiTable } from '@taiga-ui/addon-table';
import { ILeaderBoard } from '../services/interface/i-leader-board';
import { startWith, Subject, switchMap } from 'rxjs';
import { LeaderBoardType } from '../services/enums/leader-board-type';

@Component({
    standalone: true,
    imports: [AsyncPipe, TuiTable, NgFor],
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.less',
})
export class ProfileComponent {
    private readonly userService = inject(UserService);

    protected readonly userData: IUser = this.userService.getUserData();

    protected signOut(): void {
        this.userService.signOut();
    }

    private serverInfoService = inject(ServerInformationService);

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
    }

    protected getHoursPlayed() {
        this.filterSubject$.next(LeaderBoardType.hoursPlayed);
    }

    protected getKills() {
        this.filterSubject$.next(LeaderBoardType.kills);
    }
}
