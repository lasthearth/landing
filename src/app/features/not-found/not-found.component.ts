import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n';

/**
 * Страница "Не найдено" (404).
 * Отображается при переходе по несуществующему маршруту.
 */
@Component({
    standalone: true,
    selector: 'app-not-found',
    imports: [RouterLink, TranslatePipe],
    templateUrl: './not-found.component.html',
    styleUrl: './not-found.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {}
