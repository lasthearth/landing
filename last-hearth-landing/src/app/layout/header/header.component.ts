import { Component, inject } from '@angular/core';
import { TuiProgress } from '@taiga-ui/kit';
import { map } from 'rxjs';
import { ServerInformationService } from '../../services/server-information.service';
import { AsyncPipe } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-header',
    imports: [TuiProgress, AsyncPipe],
    templateUrl: './header.component.html',
})
export class HeaderComponent {
    private readonly serverInformationService = inject(
        ServerInformationService
    );

    protected readonly online$ = this.serverInformationService
        .getOnlinePlayersCount$()
        .pipe(map((info) => info.count));

    protected readonly time$ = this.serverInformationService
        .getTime$()
        .pipe(map((info) => info.formatted_time));
    protected select = "home";
}
