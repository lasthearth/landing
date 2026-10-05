import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AnnouncementService } from '../../api/announcement.service';
import { AnnouncementBarComponent } from '../announcement-bar/announcement-bar.component';

/**
 * Баннер объявления над шапкой: берёт текущее объявление из сервиса и показывает полосу.
 */
@Component({
    selector: 'app-site-announcement',
    standalone: true,
    imports: [AnnouncementBarComponent],
    template: `
        @if (service.current(); as announcement) {
            <app-announcement-bar
                class="site-announcement"
                [announcement]="announcement"
                (dismissed)="service.dismiss(announcement.id)"
            />
        }
    `,
    styles: `
        :host {
            display: block;
        }

        .site-announcement {
            margin-bottom: 0.75rem;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteAnnouncementComponent {
    /**
     * Сервис объявлений.
     */
    protected readonly service = inject(AnnouncementService);

    constructor() {
        this.service.load();
    }
}
