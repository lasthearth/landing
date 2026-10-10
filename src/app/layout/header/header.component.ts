import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    HostListener,
    PLATFORM_ID,
    computed,
    inject,
    signal,
} from '@angular/core';
import { TuiProgress, TuiPulse } from '@taiga-ui/kit';
import { catchError, filter, map, Observable, of, switchMap } from 'rxjs';
import { AsyncPipe, DOCUMENT, NgClass, isPlatformBrowser } from '@angular/common';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { RouterLink, RouterLinkActive, NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { HEADER_MAIN_LINKS } from './config/header-main-links.constant';
import { HEADER_COMMUNITY_LINKS } from './config/header-community-links.constant';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { NotificationService } from '@core/services/notification.service';
import { ServerInformationService } from '@core/services/server-information.service';
import { UserService } from '@entities/user';
import { PlayerAvatarComponent } from '@entities/player-style';
import { DonateService } from '@entities/donate';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { SignOutConfirmComponent } from '@features/auth/ui/sign-out-confirm/sign-out-confirm.component';
import { I18nService, Language, TranslatePipe, AmountPipe } from '@core/i18n';
import { ThemeService } from '@core/services/theme.service';
import { formatServerTime } from './lib/format-server-time.function';
import { NewContentService } from '@features/new-content';
import { NotificationBellComponent } from '@features/notifications';

/**
 * Компонент заголовка.
 */
@Component({
    standalone: true,
    selector: 'app-header',
    imports: [AmountPipe, 
        TuiProgress,
        AsyncPipe,
        TuiIcon,
        NgClass,
        RouterLink,
        RouterLinkActive,
        TuiPulse,
        ImageLoaderComponent,
        TranslatePipe,
        NotificationBellComponent,
        PlayerAvatarComponent,
    ],
    templateUrl: './header.component.html',
    styleUrl: './header.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Текущий язык интерфейса.
     */
    protected readonly language = this.i18n.language;

    /**
     * Сервис информации о сервере.
     */
    private readonly serverInformationService: ServerInformationService = inject(ServerInformationService);

    /**
     * Сервис данных о пользователе.
     */
    protected readonly userService: UserService = inject(UserService);

    /**
     * Сервис диалогов.
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * Сервис темы оформления.
     */
    protected readonly themeService = inject(ThemeService);

    /**
     * {@link Observable} Количества онлайна.
     *
     * При ошибке запроса (алерт подавлен через `SKIP_ERROR_ALERT`)
     * деградирует к `null` — шаблон показывает прочерк.
     */
    protected readonly online$: Observable<{
        online: number;
        max_online: number;
    } | null> = this.serverInformationService.getOnlinePlayersCount$().pipe(
        map((info) => info),
        catchError(() => of(null))
    );

    /**
     * {@link Observable} Даты и времени сервера.
     *
     * Локализует игровое время, которое бэкенд отдаёт в фиксированном
     * английском формате "DD. Month, Year Y, HH:mm".
     * При ошибке запроса деградирует к `null` — шаблон показывает прочерк.
     */
    protected readonly time$: Observable<string | null> = this.serverInformationService.getTime$().pipe(
        map((info) => formatServerTime(info.time, this.language())),
        catchError(() => of(null))
    );

    /**
     * Сервис навигации.
     */
    private readonly router: Router = inject(Router);

    /**
     * Текущий адрес страницы после редиректов.
     * Обновляется на каждом завершении навигации.
     */
    private readonly currentUrl = toSignal(
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            map((event) => event.urlAfterRedirects)
        ),
        { initialValue: this.router.url }
    );

    /**
     * Сервис уведомлений.
     */
    private readonly notificationService: NotificationService = inject(NotificationService);

    /**
     * «Новое с прошлого визита» — точки на пунктах меню.
     */
    protected readonly newContent = inject(NewContentService);

    /**
     * Сервис донат-валюты.
     */
    private readonly donateService: DonateService = inject(DonateService);

    /**
     * {@link Observable} Текущего баланса донат-валюты.
     *
     * Запрашивается только при авторизации пользователя.
     * При ошибке возвращает `null`.
     */
    protected readonly balance$: Observable<string | null> = this.userService.authState$.pipe(
        filter((isAuth): isAuth is true => isAuth === true),
        switchMap(() =>
            this.donateService.watchMyBalance$().pipe(
                map((response) => response.coins),
                catchError(() => of(null))
            )
        )
    );

    /**
     * {@link Observable} Списка приглашений в селения.
     */
    protected readonly invitations$ = this.notificationService.invitations$;

    /**
     * {@link Observable} Списка анкет на верификацию от пользователей.
     */
    protected readonly userVerifications$ = this.notificationService.userVerifications$;

    protected readonly settlementVerifications$ = this.notificationService.settlementVerifications$;

    /**
     * Запускает отслеживание нового контента. Если сохранённая сессия оказалась
     * недействительной (проверка входа завершилась гостем), возвращает гостевые
     * блоки, которые скрипт в index.html спрятал заранее (`lh-has-session`).
     * Шапка есть на каждой странице, поэтому флаг снимается везде, а не только на главной.
     */
    public constructor() {
        this.newContent.start();

        if (isPlatformBrowser(inject(PLATFORM_ID))) {
            const root = inject(DOCUMENT).documentElement;
            this.userService.authSettled$.pipe(takeUntilDestroyed()).subscribe((isAuth) => {
                if (!isAuth) {
                    root.classList.remove('lh-has-session');
                }
            });
        }
    }

    /**
     * Авторизует пользователя.
     */
    protected signIn(): void {
        this.userService.signIn();
    }

    /**
     * Открывает диалоговое окно подтверждения выхода из аккаунта.
     */
    protected signOut(): void {
        this.dialogs.open(new PolymorpheusComponent(SignOutConfirmComponent), { size: 'auto' }).subscribe();
    }

    /**
     * Хост-элемент шапки — чтобы отличать клик внутри меню от клика мимо.
     */
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    /**
     * Признак, что открыто хотя бы одно выпадающее меню шапки.
     */
    private get anyMenuOpen(): boolean {
        return this.showMediaMenu() || this.showLangMenu() || this.showMobileMenu();
    }

    /**
     * Закрывает все выпадающие меню шапки.
     */
    private closeMenus(): void {
        this.showMediaMenu.set(false);
        this.showLangMenu.set(false);
        this.showMobileMenu.set(false);
        this.showMobileMediaMenu.set(false);
    }

    /**
     * Клик мимо шапки закрывает открытые меню.
     *
     * @param event Событие клика по документу.
     */
    @HostListener('document:click', ['$event'])
    protected onDocumentClick(event: MouseEvent): void {
        if (this.anyMenuOpen && !this.host.nativeElement.contains(event.target as Node)) {
            this.closeMenus();
        }
    }

    /**
     * Escape закрывает открытые меню и возвращает фокус на кнопку, которая их открыла.
     */
    @HostListener('document:keydown.escape')
    protected onEscape(): void {
        if (!this.anyMenuOpen) {
            return;
        }

        const trigger = this.host.nativeElement.querySelector<HTMLElement>('[aria-expanded="true"]');

        this.closeMenus();
        trigger?.focus();
    }

    protected toggleMediaMenu(): void {
        this.showMediaMenu.update((value) => !value);
    }

    /**
     * Переключает видимость мобильного подменю раздела Медиа.
     */
    protected toggleMobileMediaMenu(): void {
        this.showMobileMediaMenu.update((value) => !value);
    }

    protected readonly showLangMenu = signal(false);

    /**
     * Признак открытого мобильного меню навигации.
     */
    protected readonly showMobileMenu = signal(false);

    /**
     * Признак открытого мобильного подменю раздела Медиа.
     */
    protected readonly showMobileMediaMenu = signal(false);

    /**
     * Признак открытого дропдауна раздела Медиа.
     */
    protected readonly showMediaMenu = signal(false);

    /**
     * Основные разделы меню.
     */
    protected readonly mainLinks = HEADER_MAIN_LINKS;

    /**
     * Разделы выпадающего пункта «Сообщество».
     */
    protected readonly communityLinks = HEADER_COMMUNITY_LINKS;

    /**
     * Признак, что открыт один из разделов «Сообщества».
     * Подсвечивает кнопку «Сообщество», пока её подменю закрыто.
     */
    protected readonly isCommunityActive = computed(() => {
        const url = this.currentUrl();

        return this.communityLinks.some((link) => url.startsWith(link.route));
    });

    /**
     * Есть ли новое в каком-либо разделе «Сообщества» (точка на кнопке).
     */
    protected readonly isCommunityFresh = computed(() =>
        this.communityLinks.some((link) => !!link.freshSection && this.newContent.isFresh(link.freshSection))
    );

    /**
     * Переключает язык интерфейса и закрывает дропдаун.
     *
     * @param language Целевой язык.
     */
    protected selectLanguage(language: Language): void {
        this.i18n.setLanguage(language);
        this.showLangMenu.set(false);
    }

    /**
     * Возвращает признак, является ли пользователь администратором.
     */
    protected isAdmin(): boolean {
        return this.userService.roles.includes('admin');
    }

    /**
     * Возвращает признак, верифицирован ли пользователь (игрок или админ).
     */
    protected isVerified(): boolean {
        return this.userService.roles.includes('player') || this.userService.roles.includes('admin');
    }
}
