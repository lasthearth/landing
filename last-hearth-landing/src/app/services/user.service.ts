import { ChangeDetectorRef, inject, Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { IUser } from './interface/i-user';
import { jwtDecode } from 'jwt-decode';
import { IJwtTokenLh } from './interface/i-jwt-token-lh';
import { BehaviorSubject, catchError, combineLatest, filter, finalize, first, Observable, of, switchMap, tap } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ICreateSettlement } from '../settlements/interfaces/i-create-settlement';

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

    private baseUrl = 'https://api.lasthearth.ru/v1';

    private readonly authStateChange$: BehaviorSubject<boolean> = new BehaviorSubject(false);

    public readonly authState$: Observable<boolean> = this.authStateChange$;

    private readonly http: HttpClient = inject(HttpClient);

    constructor() {
        this.oidcSecurityService
            .checkAuth()
            .pipe(
                switchMap(authResult => {
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
                        catchError(tokenError => {
                            console.error('[Auth] Ошибка при получении токенов:', tokenError);
                            this.authStateChange$.next(false);
                            return of(null);
                        }),
                    );
                }),
                catchError(authError => {
                    console.error('[Auth] Ошибка при checkAuth:', authError);
                    this.authStateChange$.next(false);
                    return of(null);
                }),
                first(),
                finalize(() => {
                    // Например, убрать индикатор загрузки или логировать окончание процесса
                    console.debug('[Auth] Проверка аутентификации завершена');
                }),
            )
            .subscribe();
    }

    public signIn(): void {
        this.oidcSecurityService.authorize();
    }

    public signOut(): void {
        this.oidcSecurityService.logoff().subscribe();
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

        return this.http.post<{ avatar: string }>(`${this.baseUrl}/user/avatar`, { avatar: base64Image }, { headers });
    }
}
