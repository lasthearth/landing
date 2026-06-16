import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { EventTypes, OidcSecurityService, PublicEventsService } from 'angular-auth-oidc-client';
import { jwtDecode } from 'jwt-decode';
import {
    BehaviorSubject,
    catchError,
    combineLatest,
    finalize,
    first,
    map,
    Observable,
    of,
    Subject,
    switchMap,
    tap,
} from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { convertTuiFileLikeToBase64 } from '@shared/lib/convert-file-to-base64.function';
import { LocalStorageService } from '@core/services/local-storage.service';
import { environment } from '@core/config/environments/environment';
import { IJwtTokenLh } from '../model/i-jwt-token-lh';
import { IUser } from '../model/i-user';
import { IPlayer } from '../model/i-player';
import { ISettlementInvitation } from '@entities/settlement';

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
     * Поток изменения состояния авторизации.
     */
    private readonly authStateChange$: BehaviorSubject<boolean> = new BehaviorSubject(false);

    /**
     * Публичный поток состояния авторизации.
     */
    public readonly authState$: Observable<boolean> = this.authStateChange$;

    /**
     * Признак завершения первоначальной проверки авторизации.
     */
    private readonly authChecked$ = new BehaviorSubject(false);

    /**
     * Публичный поток признака завершения проверки авторизации.
     */
    public readonly isAuthChecked$: Observable<boolean> = this.authChecked$.asObservable();

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
     * При срабатывании триггера выполняет проверку или принудительное обновление сессии.
     * В режиме обычной проверки сначала вызывает {@link OidcSecurityService.checkAuth},
     * а при отсутствии действующего access token пытается обновить его через refresh token,
     * чтобы стражи маршрутов получили финальное состояние без промежуточного редиректа.
     */
    public initAuthStream() {
        this.checkAuthTrigger$
            .pipe(
                switchMap((forceRefresh) => {
                    if (isPlatformBrowser(this.platformId)) {
                        console.debug('[Auth] URL:', window.location.href);
                        console.debug('[Auth] redirectUri:', environment.redirectUri);
                    }

                    const authRequest$ = forceRefresh
                        ? this.oidcSecurityService.forceRefreshSession()
                        : this.oidcSecurityService.checkAuth();

                    return authRequest$.pipe(
                        tap((authResult) => {
                            console.debug('[Auth] checkAuth result:', authResult.isAuthenticated, authResult.errorMessage);
                        }),
                        switchMap((authResult) => {
                            if (!authResult.isAuthenticated) {
                                console.warn('[Auth] Не аутентифицирован');
                                this.authStateChange$.next(false);
                                return of(null);
                            }

                            // Очищаем query-параметры авторизации из URL
                            if (window.location.search.includes('code=')) {
                                window.history.replaceState(
                                    {},
                                    document.title,
                                    window.location.pathname + window.location.hash
                                );
                            }

                            return combineLatest([
                                this.oidcSecurityService.getIdToken(),
                                this.oidcSecurityService.getAccessToken(),
                                this.oidcSecurityService.getRefreshToken(),
                            ]).pipe(
                                first(),
                                tap(([idToken, accessToken, refreshToken]) => {
                                    console.debug('[Auth] Refresh token present:', !!refreshToken);
                                    this.accessToken = accessToken;
                                    try {
                                        if (idToken) {
                                            const decoded = jwtDecode<IJwtTokenLh>(idToken);
                                            this.userId = decoded.sub ?? '';
                                            this.roles = decoded.roles ?? [];

                                            if (authResult.userData) {
                                                this.userImage = authResult.userData.picture;
                                                this.userName = authResult.userData.username;
                                            }

                                            this.authStateChange$.next(true);
                                            console.debug('[Auth] Данные успешно обновлены');
                                        }
                                    } catch (decodeError) {
                                        console.error('[Auth] Ошибка декодирования:', decodeError);
                                        this.authStateChange$.next(false);
                                    }
                                }),
                                catchError((err) => {
                                    console.error('[Auth] Ошибка получения токенов:', err);
                                    this.authStateChange$.next(false);
                                    return of(null);
                                })
                            );
                        }),
                        catchError((authError) => {
                            console.error('[Auth] Ошибка авторизации/обновления:', authError);
                            this.authStateChange$.next(false);
                            return of(null);
                        }),
                        finalize(() => {
                            this.authChecked$.next(true);
                        })
                    );
                })
            )
            .subscribe();
    }

    /**
     * Подписывается на публичные события OIDC.
     * Обновляет локальные поля при silent renew и сбрасывает авторизацию при ошибках.
     */
    private listenToAuthEvents(): void {
        this.publicEventsService
            .registerForEvents()
            .subscribe((notification) => {
                switch (notification.type) {
                    case EventTypes.NewAuthenticationResult:
                        if (notification.value?.isAuthenticated) {
                            this.updateUserDataFromTokens();
                        }
                        break;
                    case EventTypes.SilentRenewFailed:
                        console.error('[Auth] Silent renew не удался:', notification.value);
                        this.authStateChange$.next(false);
                        break;
                }
            });
    }

    /**
     * Обновляет локальные данные пользователя из актуальных токенов.
     * Используется после успешного silent renew.
     */
    private updateUserDataFromTokens(): void {
        combineLatest([this.oidcSecurityService.getIdToken(), this.oidcSecurityService.getAccessToken()])
            .pipe(first())
            .subscribe(([idToken, accessToken]) => {
                this.accessToken = accessToken;
                try {
                    if (idToken) {
                        const decoded = jwtDecode<IJwtTokenLh>(idToken);
                        this.userId = decoded.sub ?? '';
                        this.roles = decoded.roles ?? [];
                        this.authStateChange$.next(true);
                        console.debug('[Auth] Данные обновлены после silent renew');
                    }
                } catch (decodeError) {
                    console.error('[Auth] Ошибка декодирования токена после renew:', decodeError);
                    this.authStateChange$.next(false);
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
