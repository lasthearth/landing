import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Страница "Не найдено" (404).
 * Отображается при переходе по несуществующему маршруту.
 */
@Component({
    standalone: true,
    selector: 'app-not-found',
    imports: [RouterLink],
    templateUrl: './not-found.component.html',
    styleUrl: './not-found.component.less',
})
export class NotFoundComponent {}
