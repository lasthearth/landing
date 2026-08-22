import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { EventTypes, OidcSecurityService, PublicEventsService } from 'angular-auth-oidc-client';
import { jwtDecode } from 'jwt-decode';
import {
    BehaviorSubject,
    catchError,
    combineLatest,
    distinctUntilChanged,
    filter,
    finalize,
    first,
    forkJoin,
    map,
    Observable,
    of,
    shareReplay,
    Subject,
    switchMap,
    tap,
} from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { convertTuiFileLikeToBase64 } from '@shared/lib/convert-file-to-base64.function';
import { LocalStorageService } from '@core/services/local-storage.service';
import { environment } from '@core/config/environments/environment';
import { IJwtTokenLh } from '../model/i-jwt-token-lh';
import { IUser } from '../model/i-user';
import { IPlayer } from '../model/i-player';
import { ISettlementInvitation } from '@entities/settlement';

/**
 * Максимальное количество идентификаторов в одном запросе `users:batchGet`.
 */
const BATCH_GET_USERS_LIMIT = 100;

/**
 * Сервис пользователя.
 * Управляет аутентификацией через OIDC, данными профиля
 * и API-запросами, связанными с пользователем.
 */
@Injectable({
    providedIn: 'root',
})
export class UserService {
    /**
     * Сервис безопасности OIDC.
     */
    private oidcSecurityService: OidcSecurityService = inject(OidcSecurityService);

    /**
     * Сервис публичных событий OIDC.
     */
    private readonly publicEventsService: PublicEventsService = inject(PublicEventsService);

    /**
     * URL аватара пользователя.
     */
    public userImage!: string;

    /**
     * Имя пользователя.
     */
    public userName!: string;

    /**
     * Идентификатор пользователя.
     */
    public userId!: string;

    /**
     * Роли пользователя.
     */
    public roles: string[] = [];

    /**
     * Access-токен авторизации.
     */
    public accessToken!: string;

    /**
     * Базовый URL API.
     */
    private baseUrl = environment.apiUrl;

    /**
     * Публичный поток состояния авторизации.
     *
     * Источник истины — {@link OidcSecurityService.isAuthenticated$}: библиотека
     * переводит его в `true` сразу при обработке OIDC-callback и в `false` при
     * выходе либо неудачном обновлении токена. Перед выдачей `true` подписчикам
     * данные пользователя догружаются из токенов, чтобы `userId`, `roles`,
     * `userName` и `userImage` были заполнены к моменту рендера.
     */
    public readonly authState$: Observable<boolean> = this.oidcSecurityService.isAuthenticated$.pipe(
        map(({ isAuthenticated }) => isAuthenticated),
        distinctUntilChanged(),
        switchMap((isAuthenticated) => (isAuthenticated ? this.hydrateUserData$() : of(false))),
        distinctUntilChanged(),
        shareReplay({ bufferSize: 1, refCount: false })
    );

    /**
     * Признак завершения вызова {@link OidcSecurityService.checkAuth}.
     */
    private readonly checkCompleted$ = new BehaviorSubject(false);

    /**
     * Публичный поток признака завершения проверки авторизации.
     */
    public readonly isAuthChecked$: Observable<boolean> = this.checkCompleted$.asObservable();

    /**
     * Поток итогового состояния авторизации: начинает выдавать значения
     * только после завершения `checkAuth`.
     *
     * До этого момента {@link authState$} отдаёт `false` — начальное значение
     * библиотеки, а не результат проверки. Подписчики, которым важен именно
     * итог (стражи маршрутов, приветственный экран), должны ждать этот поток,
     * иначе авторизованный пользователь получит редирект на главную либо
     * увидит приветственный экран.
     *
     * К моменту завершения `checkAuth` библиотека уже выставила состояние
     * авторизации (это происходит на шаге валидации токенов внутри обработки
     * callback), поэтому промежуточного `false` здесь не будет.
     */
    public readonly authSettled$: Observable<boolean> = this.checkCompleted$.pipe(
        filter(Boolean),
        switchMap(() => this.authState$),
        shareReplay({ bufferSize: 1, refCount: false })
    );

    /**
     * HTTP-клиент Angular.
     */
    private readonly http: HttpClient = inject(HttpClient);

    /**
     * Идентификатор платформы.
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Сервис локального хранилища.
     */
    private readonly localStorageService = inject(LocalStorageService);

    /**
     * Триггер принудительной проверки авторизации.
     */
    public checkAuthTrigger$ = new Subject<boolean>();

    /**
     * Инициализирует поток авторизации.
     */
    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            this.initAuthStream();
            this.checkAuthTrigger$.next(false);
            this.listenToAuthEvents();
        }
    }

    /**
     * Инициализирует поток проверки авторизации.
     *
     * При срабатывании триггера выполняет {@link OidcSecurityService.checkAuth}
     * (обрабатывает OIDC-callback с `?code=`) либо принудительное обновление сессии.
     * Состояние авторизации сюда не пишется — его источником является
     * {@link authState$}, подписанный на состояние библиотеки.
     */
    public initAuthStream(): void {
        this.checkAuthTrigger$
            .pipe(
                switchMap((forceRefresh) => {
                    const authRequest$ = forceRefresh
                        ? this.oidcSecurityService.forceRefreshSession()
                        : this.oidcSecurityService.checkAuth();

                    return authRequest$.pipe(
                        tap((authResult) => {
                            if (!authResult.isAuthenticated && authResult.errorMessage) {
                                console.error('[Auth] Ошибка проверки авторизации:', authResult.errorMessage);
                            }
                        }),
                        catchError((authError) => {
                            console.error('[Auth] Ошибка авторизации/обновления:', authError);
                            return of(null);
                        }),
                        finalize(() => {
                            this.checkCompleted$.next(true);
                        })
                    );
                })
            )
            .subscribe();
    }

    /**
     * Подгружает данные пользователя из актуальных токенов.
     *
     * Вызывается перед публикацией `true` в {@link authState$}, чтобы к моменту
     * рендера шапки и профиля поля `userId`, `roles`, `userName` и `userImage`
     * были заполнены.
     *
     * Все поля читаются из `id_token`, а не из хранилища userData библиотеки:
     * при обработке OIDC-callback состояние авторизации выставляется на шаг
     * раньше, чем userData попадает в хранилище.
     *
     * @returns Observable с признаком успешного заполнения данных.
     */
    private hydrateUserData$(): Observable<boolean> {
        return combineLatest([
            this.oidcSecurityService.getIdToken(),
            this.oidcSecurityService.getAccessToken(),
        ]).pipe(
            first(),
            map(([idToken, accessToken]) => {
                if (!idToken) {
                    return false;
                }

                const decoded = jwtDecode<IJwtTokenLh>(idToken);

                this.accessToken = accessToken;
                this.userId = decoded.sub ?? '';
                this.roles = decoded.roles ?? [];
                this.userName = decoded.username ?? decoded.name ?? '';
                this.userImage = decoded.picture ?? '';

                return true;
            }),
            catchError((error) => {
                console.error('[Auth] Ошибка чтения данных пользователя:', error);
                return of(false);
            })
        );
    }

    /**
     * Подписывается на публичные события OIDC.
     * Перечитывает данные пользователя после успешного silent renew:
     * {@link authState$} при обновлении токена не переизлучается.
     */
    private listenToAuthEvents(): void {
        this.publicEventsService.registerForEvents().subscribe((notification) => {
            if (notification.type === EventTypes.NewAuthenticationResult && notification.value?.isAuthenticated) {
                this.hydrateUserData$().subscribe();
            }
        });
    }

    /**
     * Инициирует вход через OIDC-провайдер.
     */
    public signIn(): void {
        this.oidcSecurityService.authorize();
    }

    /**
     * Выполняет выход из аккаунта и отзывает токены.
     */
    public signOut(): void {
        this.localStorageService.removeItem('welcomeWasWatched');
        this.oidcSecurityService.logoff().subscribe();
    }

    /**
     * Формирует HTTP-заголовки с авторизационным токеном.
     *
     * @returns Заголовки с Content-Type и Authorization.
     */
    public getHeaders(): HttpHeaders {
        return new HttpHeaders({
            'Content-Type': 'application/json',
        });
    }

    /**
     * Возвращает объект с данными пользователя.
     *
     * @returns Интерфейс {@link IUser}.
     */
    public getUserData(): IUser {
        return {
            name: this.userName,
            image: this.userImage,
        };
    }

    /**
     * Обновляет аватар пользователя.
     *
     * ⚠️ В отличие от других медиа, аватар пока загружается через base64
     * в эндпоинт `/users/{user_id}/avatar`.
     *
     * @param file Файл изображения аватара.
     * @returns Observable с URL нового аватара.
     */
    public setProfileImage$(file: File): Observable<{ avatar: string }> {
        return convertTuiFileLikeToBase64(file).pipe(
            switchMap((base64Image) =>
                this.http.post<{ avatar: string }>(
                    `${this.baseUrl}/users/${this.userId}/avatar`,
                    { avatar: base64Image, user_id: this.userId },
                    { headers: this.getHeaders() }
                )
            )
        );
    }

    /**
     * Получает список приглашений в поселения текущего пользователя.
     *
     * @returns Observable с массивом приглашений.
     */
    public getInvitations$() {
        return this.http
            .get<{
                invitations: ISettlementInvitation[];
            }>(`${this.baseUrl}/users/${this.userId}/settlements/invitations`, { headers: this.getHeaders() })
            .pipe(map((invitationObj) => invitationObj.invitations));
    }

    /**
     * Получает данные игрока по идентификатору.
     *
     * @param userId Идентификатор пользователя.
     * @returns Observable с данными игрока {@link IPlayer}.
     */
    public getPlayer$(userId: string) {
        return this.http.get<IPlayer>(`${this.baseUrl}/users/${userId}`, { headers: this.getHeaders() });
    }

    /**
     * Получает данные нескольких игроков одним запросом.
     *
     * Обёртка над `GET /users:batchGet`. Дубликаты идентификаторов
     * удаляются; при количестве больше 100 (лимит API) список
     * разбивается на несколько параллельных запросов.
     * Отсутствующие на сервере ID молча пропускаются.
     *
     * @param userIds Идентификаторы пользователей.
     * @returns Observable с массивом данных игроков {@link IPlayer}.
     */
    public getPlayersBatch$(userIds: string[]): Observable<IPlayer[]> {
        const uniqueIds = [...new Set(userIds.filter(Boolean))];

        if (uniqueIds.length === 0) {
            return of([]);
        }

        const chunks: string[][] = [];

        for (let i = 0; i < uniqueIds.length; i += BATCH_GET_USERS_LIMIT) {
            chunks.push(uniqueIds.slice(i, i + BATCH_GET_USERS_LIMIT));
        }

        return forkJoin(
            chunks.map((chunk) => {
                let params = new HttpParams();
                chunk.forEach((id) => (params = params.append('user_ids', id)));

                return this.http
                    .get<{ users: IPlayer[] }>(`${this.baseUrl}/users:batchGet`, { params })
                    .pipe(map((response) => response.users ?? []));
            })
        ).pipe(map((results) => results.flat()));
    }

    /**
     * Создает запрос на изменение игрового никнейма пользователя.
     *
     * @param newNickname Новое имя пользователя.
     * @returns Observable с результатом смены ника.
     */
    public changeUsername$(newNickname: string) {
        return this.http.put<{
            old_nickname: string;
            new_nickname: string;
        }>(
            `${this.baseUrl}/users/${this.userId}/nickname`,
            { user_id: this.userId, new_nickname: newNickname },
            { headers: this.getHeaders() }
        );
    }
}
