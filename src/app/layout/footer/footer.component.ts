import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '@core/config/environments/environment';
import { ImageLoaderComponent } from '@shared/ui/image-loader';

/**
 * Компонент подвала.
 */
@Component({
    standalone: true,
    selector: 'app-footer',
    imports: [RouterLink, ImageLoaderComponent],
    templateUrl: `./footer.component.html`,
    styleUrl: './footer.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
    protected readonly environment = environment;
}
