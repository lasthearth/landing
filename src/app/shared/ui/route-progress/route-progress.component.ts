import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouteLoadingService } from '@core/services/route-loading.service';

/**
 * Полоса загрузки при переходах между страницами.
 *
 * Показывается поверх всего: страницы вики открываются во весь экран и лежат на
 * своём слое выше остальных, поэтому индикатор перехода должен быть выше их.
 */
@Component({
    selector: 'app-route-progress',
    templateUrl: './route-progress.component.html',
    styleUrl: './route-progress.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteProgressComponent {
    /**
     * Идёт переход.
     */
    protected readonly loading = inject(RouteLoadingService).loading;
}
