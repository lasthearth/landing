import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    OnDestroy,
    PLATFORM_ID,
    signal,
    viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { UserService } from '@entities/user';
import { catchError, filter, map, of, startWith, switchMap } from 'rxjs';
import { TranslatePipe } from '@core/i18n';
import { TuiPulse } from '@taiga-ui/kit';
import { NotificationService } from '@core/services/notification.service';
import { TicketApiService } from '@entities/ticket';
import { SheetDragDirective } from '@shared/lib/directives';

/**
 * Раздел навигации профиля: адрес, знак, ключ подписи и признак непрочитанного.
 */
interface ProfileNavItem {
    /** Маршрут раздела. */
    readonly route: string;

    /** Последний сегмент маршрута: по нему ищется активный раздел. */
    readonly segment: string;

    /** Ключ подписи в словаре `profile.nav.*`. */
    readonly labelKey: string;

    /** Знак раздела из набора Taiga. */
    readonly icon: string;

    /** Есть ли непрочитанное: точка на плашке. */
    readonly badge: boolean;
}

/**
 * Навигация профиля.
 *
 * До 1280px — пилюля у нижней кромки с текущим разделом: тап раскрывает
 * модалку снизу со всеми разделами сеткой в две колонки. Восемь подписей
 * не встают в строку без обрезки, а знаки без подписей не читаются,
 * поэтому список живёт в модалке, а на экране остаётся одна цель.
 *
 * От 1280px — прежняя вертикальная колонка знаков сбоку от колонки контента.
 *
 * Модалка закрывается кликом по scrim, по Escape и переходом в раздел.
 * Обработчик клика висит на документе, а не на scrim: элемент с `inert`
 * в момент гидратации не получает делегированный слушатель — см. docs/TRAPS.md.
 */
@Component({
    selector: 'app-profile-navigation',
    templateUrl: './profile-navigation.component.html',
    styleUrl: './profile-navigation.component.less',
    imports: [RouterLink, RouterLinkActive, TuiIcon, TuiPulse, TranslatePipe, SheetDragDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(document:click)': 'onDocumentClick($event)',
        '(document:keydown.escape)': 'onDocumentEscape()',
    },
})
export class ProfileNavigationComponent implements OnDestroy {
    /** Сервис пользователя: роли и признак входа. */
    protected readonly userService = inject(UserService);

    /** Сервис уведомлений: приглашения в наделы и заявки на верификацию. */
    private readonly notificationService = inject(NotificationService);

    /** Роутер: активный раздел и переходы. */
    private readonly router = inject(Router);

    /** API обращений: счётчик непрочитанных ответов администрации. */
    private readonly ticketApi = inject(TicketApiService);

    /** Хост-компонент: по нему проверяется попадание клика в оболочку. */
    private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

    /** Документ: класс блокировки прокрутки на body. */
    private readonly document = inject(DOCUMENT);

    /** Идентификатор платформы: класс на body трогаем только в браузере. */
    private readonly platformId = inject(PLATFORM_ID);

    /** Открыта ли модалка со списком разделов. */
    protected readonly sheetOpen = signal(false);

    /** Жест закрытия пластины: перед открытием сбрасывает инлайновые стили. */
    private readonly sheetDrag = viewChild(SheetDragDirective);

    /**
     * Сколько обращений ждут прочтения ответа администрации. Пересчитывается
     * при каждом переходе: прочитав ответ, игрок уходит со страницы — и точка гаснет.
     */
    private readonly supportUnread$ = this.userService.authState$.pipe(
        filter(Boolean),
        switchMap(() =>
            this.router.events.pipe(
                filter((event) => event instanceof NavigationEnd),
                startWith(null),
                switchMap(() => this.ticketApi.unreadCount().pipe(catchError(() => of(0))))
            )
        )
    );

    /** Признак входа: до ответа сервера считаем гостем. */
    private readonly isAuth = toSignal(this.userService.authState$, { initialValue: false });

    /** Непрочитанные обращения в поддержку. */
    private readonly supportUnread = toSignal(this.supportUnread$, { initialValue: 0 });

    /** Приглашения в наделы: точка на разделе «Надел». */
    private readonly invitations = toSignal(this.notificationService.invitations$, { initialValue: [] });

    /** Заявки игроков на верификацию: точка на разделе «Админ». */
    private readonly userVerifications = toSignal(this.notificationService.userVerifications$, {
        initialValue: [],
    });

    /** Заявки наделов на верификацию: точка на разделе «Админ». */
    private readonly settlementVerifications = toSignal(this.notificationService.settlementVerifications$, {
        initialValue: [],
    });

    /** Адрес текущей страницы: по нему вычисляется активный раздел. */
    private readonly currentUrl = toSignal(
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            map((event) => event.urlAfterRedirects),
            startWith(this.router.url)
        ),
        { initialValue: this.router.url }
    );

    /** Разделы, доступные текущему игроку. */
    protected readonly items = computed<ProfileNavItem[]>(() => {
        const items: ProfileNavItem[] = [
            {
                route: '/profile/how-play',
                segment: 'how-play',
                labelKey: 'profile.nav.howPlay',
                icon: '@tui.gamepad',
                badge: false,
            },
            {
                route: '/profile/stats',
                segment: 'stats',
                labelKey: 'profile.nav.stats',
                icon: '@tui.chart-no-axes-combined',
                badge: false,
            },
        ];

        if (!this.isAuth()) {
            return items;
        }

        items.push(
            {
                route: '/profile/settlement',
                segment: 'settlement',
                labelKey: 'profile.nav.settlement',
                icon: '@tui.castle',
                badge: this.invitations().length > 0,
            },
            {
                route: '/profile/style',
                segment: 'style',
                labelKey: 'profile.nav.style',
                icon: '@tui.palette',
                badge: false,
            },
            {
                route: '/profile/wiki',
                segment: 'wiki',
                labelKey: 'profile.nav.wiki',
                icon: '@tui.book-open',
                badge: false,
            },
            {
                route: '/profile/support',
                segment: 'support',
                labelKey: 'profile.nav.support',
                icon: '@tui.life-buoy',
                badge: this.supportUnread() > 0,
            },
            {
                route: '/profile/referral',
                segment: 'referral',
                labelKey: 'profile.nav.referral',
                icon: '@tui.user-plus',
                badge: false,
            }
        );

        if (this.isAdmin()) {
            items.push({
                route: '/profile/admin',
                segment: 'admin',
                labelKey: 'profile.nav.admin',
                icon: '@tui.shield',
                badge: this.userVerifications().length > 0 || this.settlementVerifications().length > 0,
            });
        }

        return items;
    });

    /**
     * Раздел для пилюли. На обзоре профиля ни один раздел не активен —
     * пилюля тогда показывает сам профиль, а не случайный первый пункт.
     */
    protected readonly active = computed<ProfileNavItem>(() => {
        const segment = this.currentUrl().split('?')[0].split('/')[2] ?? '';
        const items = this.items();
        const found = items.find((item) => item.segment === segment);

        if (found) {
            return found;
        }

        return {
            route: '/profile',
            segment: 'overview',
            labelKey: 'profile.nav.overview',
            icon: '@tui.user',
            badge: false,
        };
    });

    public constructor() {
        // Фон под модалкой не прокручивается, пока она открыта. Отдельный класс
        // `lh-profile-nav-open` поднимает панель профиля над плавающими виджетами:
        // scrim лежит в контексте наложения панели, а не документа.
        effect(() => {
            if (!isPlatformBrowser(this.platformId)) {
                return;
            }

            this.document.body.classList.toggle('lh-lock-scroll', this.sheetOpen());
            this.document.body.classList.toggle('lh-profile-nav-open', this.sheetOpen());
        });
    }

    /**
     * Снимает блокировку прокрутки при уходе со страницы профиля.
     */
    public ngOnDestroy(): void {
        this.document.body.classList.remove('lh-lock-scroll');
        this.document.body.classList.remove('lh-profile-nav-open');
    }

    /**
     * Открывает или закрывает модалку со списком разделов.
     */
    protected toggleSheet(): void {
        if (!this.sheetOpen()) {
            this.sheetDrag()?.reset();
        }

        this.sheetOpen.update((open) => !open);
    }

    /**
     * Закрывает модалку: переход в раздел, клик по scrim, Escape.
     */
    protected closeSheet(): void {
        this.sheetOpen.set(false);
    }

    /**
     * Закрытие по Escape.
     */
    protected onDocumentEscape(): void {
        if (this.sheetOpen()) {
            this.closeSheet();
        }
    }

    /**
     * Закрытие кликом по scrim мимо пластины.
     *
     * Клик внутри хоста разбирается отдельно: пилюля лежит вне scrim, и без
     * этой проверки она закрывала бы модалку тем же нажатием, которым открыла.
     *
     * @param event Событие клика, всплывшего до документа.
     */
    protected onDocumentClick(event: MouseEvent): void {
        if (!this.sheetOpen()) {
            return;
        }

        const target = event.target as Node;
        const scrim = this.host.nativeElement.querySelector('.pn-scrim');
        const sheet = this.host.nativeElement.querySelector('.pn-sheet');

        if (scrim && scrim.contains(target) && !(sheet && sheet.contains(target))) {
            this.closeSheet();
        }
    }

    /**
     * Возвращает признак, является ли пользователь администратором.
     */
    protected isAdmin(): boolean {
        return this.userService.roles.includes('admin');
    }
}