import { Component, inject } from '@angular/core';
import { TuiProgress } from '@taiga-ui/kit';
import { map } from 'rxjs';
import { ServerInformationService } from '../../services/server-information.service';
import { AsyncPipe } from '@angular/common';
import { UserService } from '../../services/user.service';
import { TuiIcon } from '@taiga-ui/core';

@Component({
    standalone: true,
    selector: 'app-header',
    imports: [TuiProgress, AsyncPipe, TuiIcon],
    templateUrl: './header.component.html',
})
export class HeaderComponent {
    private readonly serverInformationService = inject(
        ServerInformationService
    );

    protected readonly userService = inject(UserService);

    protected readonly online$ = this.serverInformationService
        .getOnlinePlayersCount$()
        .pipe(map((info) => info.count));

    protected readonly time$ = this.serverInformationService
        .getTime$()
        .pipe(map((info) => info.formatted_time));
    protected select = "home";
}
