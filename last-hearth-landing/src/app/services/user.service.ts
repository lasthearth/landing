import { ChangeDetectorRef, inject, Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { IUser } from './interface/i-user';
import { jwtDecode } from 'jwt-decode';
import { IJwtTokenLh } from './interface/i-jwt-token-lh';
import { BehaviorSubject, catchError, combineLatest, filter, first, Observable, of, switchMap, tap } from 'rxjs';
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
                        return of(null);
                    }

                    // НЕ устанавливаем состояние пока не убедимся в валидности токенов
                    return combineLatest([
                        this.oidcSecurityService.getIdToken(),
                        this.oidcSecurityService.getAccessToken(),
                    ]).pipe(
                        tap(([idToken, accessToken]) => {
                            // СНАЧАЛА проверяем что токены валидны
                            if (!idToken || !accessToken) {
                                throw new Error('Tokens are missing');
                            }

                            // ТОЛЬКО ПОСЛЕ проверки устанавливаем состояние
                            this.authStateChange$.next(true);
                            this.userImage = authResult.userData?.picture;
                            this.userName = authResult.userData?.username;
                            this.accessToken = accessToken;

                            try {
                                const decoded = jwtDecode<IJwtTokenLh>(idToken);
                                this.userId = decoded.sub ?? '';
                                this.roles = decoded.roles ?? [];
                            } catch (decodeError) {
                                console.error('[Auth] Ошибка декодирования ID токена:', decodeError);
                                // Если не можем декодировать - считаем неавторизованным
                                this.authStateChange$.next(false);
                            }
                        }),
                        catchError(tokenError => {
                            console.error('[Auth] Ошибка при получении токенов:', tokenError);
                            // При ошибке токенов - сбрасываем состояние
                            this.authStateChange$.next(false);
                            return of(null);
                        }),
                    );
                }),
                catchError(authError => {
                    console.error('[Auth] ОШИБКА:', authError);
                    this.authStateChange$.next(false);
                    return of(null);
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
