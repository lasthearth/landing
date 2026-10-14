import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n';
import { BreadcrumbItem } from '@shared/lib/breadcrumbs';

/**
 * Хлебные крошки: путь от главной до текущей страницы.
 *
 * Нужны и человеку (понять, где он), и поисковику: та же цепочка уходит
 * в разметку BreadcrumbList через {@link SeoService.setBreadcrumbs}, поэтому
 * список пунктов задаётся один раз на странице. Последний пункт — текущая
 * страница, ссылкой он не делается.
 */
@Component({
    selector: 'app-breadcrumbs',
    imports: [RouterLink, TranslatePipe],
    templateUrl: './breadcrumbs.component.html',
    styleUrl: './breadcrumbs.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbsComponent {
    /**
     * Пункты пути без главной: её компонент добавляет сам.
     */
    public readonly items = input.required<readonly BreadcrumbItem[]>();
}
