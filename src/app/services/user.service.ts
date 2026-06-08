import { inject, Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { IUser } from './interface/i-user';
import { jwtDecode } from 'jwt-decode';
import { IJwtTokenLh } from './interface/i-jwt-token-lh';
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
import { LocalStorageService } from './local-storage.service';
import { ISettlementInvitation } from './interface/i-settlement-invitation';
import { IPlayer } from './interface/i-player';

@Injectable({
    providedIn: 'root',
})
export class UserService {
    private oidcSecurityService: OidcSecurityService = inject(OidcSecurityService);

    public userImage!: string;

    public userName!: string;

    public userId!: string;

    public roles: string[] = [];

    public accessToken!: string;

    private baseUrl = 'https://apiprev.lasthearth.ru/v1';

    private readonly authStateChange$: BehaviorSubject<boolean> = new BehaviorSubject(false);

    public readonly authState$: Observable<boolean> = this.authStateChange$;

    private readonly http: HttpClient = inject(HttpClient);

    private readonly localStorageService = inject(LocalStorageService);

    public checkAuthTrigger$ = new Subject<boolean>();

    constructor() {
        this.initAuthStream();
        this.checkAuthTrigger$.next(false);
    }

    public initAuthStream() {
        this.checkAuthTrigger$
            .pipe(
                switchMap((forceRefresh) => {
                    // 2. Выбираем стратегию в зависимости от флага
                    const authRequest$ = forceRefresh
                        ? this.oidcSecurityService.forceRefreshSession() // Принудительно
                        : this.oidcSecurityService.checkAuth(); // Обычная проверка

                    return authRequest$.pipe(
                        switchMap((authResult) => {
                            // Обратите внимание: forceRefreshSession возвращает похожий результат,
                            // но иногда структура может отличаться в зависимости от версии.
                            // Обычно authResult содержит isAuthenticated и userData.

                            if (!authResult.isAuthenticated) {
                                console.warn('[Auth] Не аутентифицирован');
                                this.authStateChange$.next(false);
                                return of(null);
                            }

                            return combineLatest([
                                this.oidcSecurityService.getIdToken(),
                                this.oidcSecurityService.getAccessToken(),
                            ]).pipe(
                                first(),
                                tap(([idToken, accessToken]) => {
                                    this.accessToken = accessToken;
                                    try {
                                        if (idToken) {
                                            // Декодируем НОВЫЙ токен с НОВЫМИ ролями
                                            const decoded = jwtDecode<IJwtTokenLh>(idToken);
                                            this.userId = decoded.sub ?? '';
                                            this.roles = decoded.roles ?? []; // Тут будут актуальные роли

                                            // Обновляем данные профиля, если они пришли в authResult
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
                            // Ошибка может возникнуть при обновлении сессии (например, refresh token протух)
                            console.error('[Auth] Ошибка авторизации/обновления:', authError);
                            this.authStateChange$.next(false);
                            return of(null);
                        }),
                        finalize(() => {
                            // Логика завершения
                        })
                    );
                })
            )
            .subscribe();
    }

    public signIn(): void {
        this.oidcSecurityService.authorize();
    }

    public signOut(): void {
        this.localStorageService.removeItem('welcomeWasWatched');
        this.oidcSecurityService.logoffAndRevokeTokens().subscribe();
    }

    public getUserData(): IUser {
        return {
            name: this.userName,
            image: this.userImage,
        };
    }

    public setProfileImage$(base64Image: string): Observable<{ avatar: string }> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
        });

        return this.http.post<{ avatar: string }>(
            `${this.baseUrl}/users/${this.userId}/avatar`,
            { avatar: base64Image },
            { headers }
        );
    }

    public getInvitations$() {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
        });
        return this.http
            .get<{
                invitations: ISettlementInvitation[];
            }>(`${this.baseUrl}/users/${this.userId}/settlements/invitations`, { headers })
            .pipe(map((invitationObj) => invitationObj.invitations));
    }

    public getPlayer$(userId: string) {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
        });
        return this.http.get<IPlayer>(`${this.baseUrl}/users/${userId}`, { headers }).pipe();
    }

    /**
     * Создает запрос на изменение игрового никнейма пользователя.
     *
     * @param newNickname Новое имя пользователя.
     */
    public changeUsername$(newNickname: string) {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
        });
        return this.http.put<{
            old_nickname: string;
            new_nickname: string;
        }>(
            `${this.baseUrl}/users/${this.userId}/nickname`,
            { user_id: this.userId, new_nickname: newNickname },
            { headers }
        );
    }
}
