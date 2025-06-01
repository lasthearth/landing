import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiProgress } from '@taiga-ui/kit';
import { map, Observable } from 'rxjs';
import { ServerInformationService } from '../../services/server-information.service';
import { AsyncPipe, NgClass } from '@angular/common';
import { UserService } from '../../services/user.service';
import { TuiIcon } from '@taiga-ui/core';

/**
 * Компонент заголовка.
 */
@Component({
    standalone: true,
    selector: 'app-header',
    imports: [TuiProgress, AsyncPipe, TuiIcon, NgClass],
    templateUrl: './header.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
    /**
     * Сервис информации о сервере.
     */
    private readonly serverInformationService: ServerInformationService = inject(
        ServerInformationService
    );

    /**
     * Сервис данных о пользователе.
     */
    protected readonly userService: UserService = inject(UserService);

    /**
     * {@link Observable} Количества онлайна.
     */
    protected readonly online$: Observable<{
        count: number;
        max: number;
    }> = this.serverInformationService
        .getOnlinePlayersCount$()
        .pipe(map((info) => info));

    /**
     * {@link Observable} Даты и времени сервера.
     */
    protected readonly time$: Observable<string> = this.serverInformationService
        .getTime$()
        .pipe(map((info) => info.formatted_time));
}