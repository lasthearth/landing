import { inject, Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { IUser } from './interface/i-user';
import { jwtDecode } from 'jwt-decode';
import { IJwtTokenLh } from './interface/i-jwt-token-lh';
import { BehaviorSubject, catchError, combineLatest, finalize, first, map, Observable, of, switchMap, tap } from 'rxjs';
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

    constructor() {
        this.oidcSecurityService
            .checkAuth()
            .pipe(
                switchMap((authResult) => {
                    if (!authResult.isAuthenticated) {
                        console.warn('[Auth] Пользователь не аутентифицирован');
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
                                const decoded = jwtDecode<IJwtTokenLh>(idToken);
                                this.userId = decoded.sub ?? '';
                                this.roles = decoded.roles ?? [];
                                this.userImage = authResult.userData?.picture;
                                this.userName = authResult.userData?.username;
                                this.authStateChange$.next(true);
                            } catch (decodeError) {
                                console.error('[Auth] Ошибка декодирования ID токена:', decodeError);
                                this.authStateChange$.next(false);
                            }
                        }),
                        catchError((tokenError) => {
                            console.error('[Auth] Ошибка при получении токенов:', tokenError);
                            this.authStateChange$.next(false);
                            return of(null);
                        })
                    );
                }),
                catchError((authError) => {
                    console.error('[Auth] Ошибка при checkAuth:', authError);
                    this.authStateChange$.next(false);
                    return of(null);
                }),
                first(),
                finalize(() => {
                    // Например, убрать индикатор загрузки или логировать окончание процесса
                    console.debug('[Auth] Проверка аутентификации завершена');
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
