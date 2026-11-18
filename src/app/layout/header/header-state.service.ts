/**
 * Данные шапки-вензеля: телеметрия сервера, блок игрока, списки меню.
 *
 * Сервис отделяет plumbing данных от разметки: шаблон шапки читает только
 * сигналы и методы этого класса. Источник — настоящие сервисы; без ответа
 * сервера телеметрия остаётся `null`, и шаблон показывает прочерк, не меняя
 * размер зон.
 */
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { catchError, filter, map, Observable, of, switchMap } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { I18nService, Language } from '@core/i18n';
import { AnalyticsService } from '@core/services/analytics.service';
import { NotificationService } from '@core/services/notification.service';
import { ServerInformationService } from '@core/services/server-information.service';
import { ThemeService } from '@core/services/theme.service';
import { DonateService } from '@entities/donate';
import { UserService } from '@entities/user';
import { NewContentService } from '@features/new-content';
import { SignOutConfirmComponent } from '@features/auth';
import { HEADER_MAIN_LINKS } from './config/header-main-links.constant';
import { HEADER_COMMUNITY_LINKS } from './config/header-community-links.constant';
import { HeaderNavLink } from './model/header-nav-link.interface';
import { OnlineCount } from './model/online-count.interface';
import { formatServerTime } from './lib/format-server-time.function';

@Injectable()
export class HeaderState {
    /**
     * Сервис навигации: текущий адрес для подсветки активного раздела.
     */
    private readonly router = inject(Router);

    /**
     * Идентификатор платформы: DOM доступен только в браузере.
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Сервис темы оформления.
     */
    private readonly themeService = inject(ThemeService);

    /**
     * Сервис данных о пользователе.
     */
    private readonly userService = inject(UserService);

    /**
     * Сервис информации о сервере.
     */
    private readonly serverInformation = inject(ServerInformationService);

    /**
     * Сервис донат-валюты.
     */
    private readonly donateService = inject(DonateService);

    /**
     * Сервис уведомлений: приглашения и верификации.
     */
    private readonly notificationService = inject(NotificationService);

    /**
     * Сервис диалогов: подтверждение выхода.
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * «Новое с прошлого визита» — точки на пунктах меню.
     */
    private readonly newContent = inject(NewContentService);

    /**
     * Сервис аналитики: цель sign_up_click на входе.
     */
    private readonly analytics = inject(AnalyticsService);

    /**
     * {@link Observable} Состояния входа после завершения проверки.
     * `authState$` начинает с библиотечного `false` до первого ответа Logto,
     * а `authSettled$` молчит до итога проверки: поэтому по `null` можно
     * отличить неизвестность от настоящего гостя и не рисовать гостевые
     * разделы авторизованному пользователю.
     */
    private readonly auth$: Observable<boolean> = this.userService.authSettled$.pipe(catchError(() => of(false)));

    /**
     * {@link Observable} Баланса донат-валюты авторизованного пользователя.
     */
    private readonly balance$: Observable<string | null> = this.userService.authSettled$.pipe(
        filter((isAuth): isAuth is true => isAuth === true),
        switchMap(() =>
            this.donateService.watchMyBalance$().pipe(
                map((response) => response.coins),
                catchError(() => of(null))
            )
        ),
        catchError(() => of(null))
    );

    /**
     * Признак входа (`null` — состояние ещё не определилось).
     */
    private readonly auth = toSignal(this.auth$, { initialValue: null });

    /**
     * Баланс настоящего пользователя (`null` — ещё не пришёл или ошибка).
     */
    private readonly balance = toSignal(this.balance$, { initialValue: null });

    /**
     * Приглашения в селения.
     */
    private readonly invitations = toSignal(this.notificationService.invitations$, { initialValue: [] });

    /**
     * Анкеты на верификацию от пользователей.
     */
    private readonly userVerifications = toSignal(this.notificationService.userVerifications$, { initialValue: [] });

    /**
     * Заявки селений на верификацию.
     */
    private readonly settlementVerifications = toSignal(this.notificationService.settlementVerifications$, {
        initialValue: [],
    });

    /**
     * Данные онлайна сервера из общего SSE-потока (`null` — сервер не ответил).
     */
    public readonly online = toSignal<OnlineCount | null>(
        this.serverInformation.watchServerInfo$().pipe(
            map((info): OnlineCount => ({ online: info.online, max_online: info.max_online })),
            catchError(() => of(null))
        ),
        { initialValue: null }
    );

    /**
     * Игровое время сервера в локали интерфейса из общего SSE-потока
     * (`null` — сервер не ответил).
     */
    public readonly time = toSignal<string | null>(
        this.serverInformation.watchServerInfo$().pipe(
            map((info) => formatServerTime(info.time, this.i18n.language())),
            catchError(() => of(null))
        ),
        { initialValue: null }
    );

    /**
     * Признак, что пользователь авторизован.
     */
    public readonly isAuth = computed(() => this.auth() === true);

    /**
     * Состояние входа уже определено сервисом пользователя. До первого
     * ответа `isAuth` ложен и у гостя, и на сервере: гостевые пункты меню
     * нельзя рисовать по одному только `isAuth`, иначе авторизованный
     * видит их до гидратации и до ответа Logto.
     */
    public readonly authKnown = computed(() => this.auth() !== null);

    /**
     * Имя игрока.
     */
    public readonly userName = computed(() => this.userService.userName ?? '');

    /**
     * Адрес картинки аватара (пустая строка — картинки нет).
     */
    public readonly userImage = computed(() => this.userService.userImage ?? '');

    /**
     * Идентификатор игрока для рамки аватара (`null` — неизвестный игрок
     * получает вид по умолчанию без запроса к серверу).
     */
    public readonly userId = computed<string | null>(() => this.userService.userId ?? null);

    /**
     * Баланс донат-валюты строкой (decimal в проекте — строка).
     */
    public readonly coins = computed<string | null>(() => this.balance());

    /**
     * Признак, что на карточке игрока нужна точка внимания: приглашения или
     * заявки на верификацию для админа.
     */
    public readonly attention = computed(
        () =>
            (this.invitations()?.length ?? 0) > 0 ||
            (this.isAdmin() &&
                ((this.userVerifications()?.length ?? 0) > 0 || (this.settlementVerifications()?.length ?? 0) > 0))
    );

    /**
     * Признак администратора.
     */
    public readonly admin = computed(() => this.isAdmin());

    /**
     * Признак тёмной темы.
     */
    public readonly dark = computed(() => this.themeService.theme() === 'dark');

    /**
     * Текущий язык интерфейса.
     */
    public readonly language = computed<Language>(() => this.i18n.language());

    /**
     * Основные разделы меню.
     */
    public readonly mainLinks: readonly HeaderNavLink[] = HEADER_MAIN_LINKS;

    /**
     * Разделы выпадающего пункта «Сообщество».
     */
    public readonly communityLinks: readonly HeaderNavLink[] = HEADER_COMMUNITY_LINKS;

    /**
     * Текущий адрес после редиректов — для подсветки активного раздела.
     */
    private readonly url = signal(this.router.url);

    /**
     * Признак, что открыт один из разделов «Сообщества».
     */
    public readonly communityActive = computed(() => this.communityLinks.some((link) => this.url().startsWith(link.route)));

    /**
     * Признак, что в каком-либо разделе «Сообщества» есть новое.
     */
    public readonly communityFresh = computed(() =>
        this.communityLinks.some((link) => !!link.freshSection && this.newContent.isFresh(link.freshSection))
    );

    public constructor() {
        this.newContent.start();

        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed()
            )
            .subscribe((event) => this.url.set(event.urlAfterRedirects));

        // Шапка есть на каждой странице, поэтому флаг «гостевой сессии»
        // снимается здесь: скрипт в index.html спрятал гостевые блоки заранее,
        // а недействительная сохранённая сессия обязана их вернуть.
        if (isPlatformBrowser(this.platformId)) {
            const root = inject(DOCUMENT).documentElement;

            this.userService.authSettled$.pipe(takeUntilDestroyed()).subscribe((isAuth) => {
                if (!isAuth) {
                    root.classList.remove('lh-has-session');
                }
            });
        }
    }

    /**
     * Есть ли новое с прошлого визита в разделе.
     *
     * @param section Раздел ленты «нового».
     * @returns `true`, когда на пункте меню нужна точка.
     */
    public isFresh(section: Parameters<NewContentService['isFresh']>[0]): boolean {
        return this.newContent.isFresh(section);
    }

    /**
     * Переключает тему оформления.
     */
    public toggleTheme(): void {
        this.themeService.toggle();
    }

    /**
     * Переключает язык интерфейса.
     *
     * @param language Целевой язык.
     */
    public selectLanguage(language: Language): void {
        this.i18n.setLanguage(language);
    }

    /**
     * Запускает вход и отмечает цель аналитики.
     */
    public signIn(): void {
        this.analytics.goal('sign_up_click');
        this.userService.signIn();
    }

    /**
     * Открывает подтверждение выхода из аккаунта.
     */
    public signOut(): void {
        this.dialogs.open(new PolymorpheusComponent(SignOutConfirmComponent), { size: 'auto' }).subscribe();
    }

    /**
     * Признак администратора из ролей пользователя.
     *
     * @returns `true` для роли `admin`.
     */
    private isAdmin(): boolean {
        return this.userService.roles.includes('admin');
    }
}
