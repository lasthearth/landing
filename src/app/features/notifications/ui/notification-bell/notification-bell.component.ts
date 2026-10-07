import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { NotificationsFeedService } from '../../api/notifications-feed.service';
import { FeedNotification, NOTIFICATION_CATEGORIES } from '../../model/feed-notification';

/**
 * Колокольчик уведомлений в шапке: счётчик непрочитанных и выпадающий список.
 */
@Component({
    selector: 'app-notification-bell',
    standalone: true,
    imports: [TuiIcon, TranslatePipe, RelativeTimeComponent],
    templateUrl: './notification-bell.component.html',
    styleUrl: './notification-bell.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(document:click)': 'onDocumentClick($event)',
        '(document:keydown.escape)': 'close()',
    },
})
export class NotificationBellComponent {
    /**
     * Лента уведомлений.
     */
    protected readonly feed = inject(NotificationsFeedService);

    /**
     * Роутер.
     */
    private readonly router = inject(Router);

    /**
     * Хост-элемент — чтобы закрывать список кликом мимо.
     */
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    /**
     * Список открыт.
     */
    protected readonly open = signal(false);

    /**
     * Показаны настройки вместо списка.
     */
    protected readonly settings = signal(false);

    /**
     * Категории для настроек.
     */
    protected readonly categories = NOTIFICATION_CATEGORIES;

    /**
     * Иконки категорий.
     */
    protected readonly categoryIcons = {
        news: '@tui.newspaper',
        events: '@tui.calendar-clock',
        personal: '@tui.user-round',
    } as const;

    constructor() {
        this.feed.start();
    }

    /**
     * Открывает или закрывает список.
     */
    protected toggle(): void {
        this.open.update((value) => !value);
    }

    /**
     * Закрывает список.
     */
    protected close(): void {
        this.open.set(false);
        this.settings.set(false);
    }

    /**
     * Переключает список и настройки.
     */
    protected toggleSettings(): void {
        this.settings.update((value) => !value);
    }

    /**
     * Обрабатывает клик по уведомлению: отмечает прочитанным и, если есть, переходит по ссылке.
     *
     * @param item Уведомление.
     */
    protected select(item: FeedNotification): void {
        this.feed.markRead(item);

        if (item.link) {
            this.close();
            void this.router.navigateByUrl(item.link);
        }
    }

    /**
     * Закрывает список при клике вне колокольчика.
     *
     * @param event Клик.
     */
    protected onDocumentClick(event: MouseEvent): void {
        // composedPath, а не contains: кнопка, по которой кликнули, могла уже исчезнуть из DOM
        // (например, «Прочитать все» или переключение на настройки).
        if (this.open() && !event.composedPath().includes(this.host.nativeElement)) {
            this.close();
        }
    }
}
