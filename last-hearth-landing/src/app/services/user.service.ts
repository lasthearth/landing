import { ChangeDetectorRef, inject, Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { IUser } from './interface/i-user';
import { jwtDecode } from 'jwt-decode';
import { IJwtTokenLh } from './interface/i-jwt-token-lh';
import { BehaviorSubject, catchError, combineLatest, filter, first, Observable, of, switchMap, tap } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ICreateSettlement } from '../settlements/interfaces/i-create-settlement';
import { ServerInformationService } from './server-information.service';
import { LocalStorageService } from './local-storage.service';

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
                        return of(null);
                    }

                    this.authStateChange$.next(true);
                    this.userImage = authResult.userData?.picture;
                    this.userName = authResult.userData?.username;

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
                            } catch (decodeError) {
                                console.error('[Auth] Ошибка декодирования ID токена:', decodeError);
                            }
                        }),
                        catchError((tokenError) => {
                            console.error('[Auth] Ошибка при получении токенов:', tokenError);
                            return of(null);
                        })
                    );
                }),
                catchError((authError) => {
                    return of(null);
                }),
                first()
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
                invitations: { id: string; user_id: string; settlement_id: string }[];
            }>(`${this.baseUrl}/users/${this.userId}/settlements/invitations`, { headers })
            .pipe();
    }

    public getPlayer$(userId: string) {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
        });
        return this.http
            .get<{
                user_id: string;
                user_game_name: string;
                avatar: {
                    original: string;
                    x96: string;
                    x48: string;
                };
            }>(`${this.baseUrl}/users/${userId}`, { headers })
            .pipe();
    }
}
