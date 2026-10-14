import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '@core/config/environments/environment';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { TranslatePipe } from '@core/i18n';
import { FOOTER_NAV_LINKS } from './config/footer-nav-links.constant';

/**
 * Компонент подвала.
 */
@Component({
    standalone: true,
    selector: 'app-footer',
    imports: [RouterLink, ImageLoaderComponent, TranslatePipe],
    templateUrl: `./footer.component.html`,
    styleUrl: './footer.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
    protected readonly environment = environment;

    /**
     * Ссылки на публичные разделы сайта.
     */
    protected readonly navLinks = FOOTER_NAV_LINKS;
}
