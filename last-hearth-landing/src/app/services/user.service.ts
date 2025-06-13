import { inject, Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { IUser } from './interface/i-user';
import { jwtDecode } from "jwt-decode";
import { IJwtTokenLh } from './interface/i-jwt-token-lh';
import { BehaviorSubject, catchError, combineLatest, filter, first, Observable, of, switchMap, tap } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private oidcSecurityService: OidcSecurityService = inject(OidcSecurityService);

    private authState: boolean = false;

    public userImage!: string;

    public userName!: string;

    public roles: string[] = [];

    public accessToken!: string;

    private baseUrl = "https://api.lasthearth.ru/v1";

    private readonly http: HttpClient = inject(HttpClient);

    constructor() {
        this.oidcSecurityService.checkAuth().pipe(
            switchMap(authResult => {
                if (!authResult.isAuthenticated) {
                    return of(null);
                }

                this.authState = true;
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
                            this.roles = decoded.roles ?? [];
                        } catch (decodeError) {
                            console.error('[Auth] Ошибка декодирования ID токена:', decodeError);
                        }
                    }),
                    catchError(tokenError => {
                        console.error('[Auth] Ошибка при получении токенов:', tokenError);
                        return of(null);
                    })
                );
            }),
            catchError(authError => {
                return of(null);
            }),
            first()
        ).subscribe();
    }

    public signIn(): void {
        this.oidcSecurityService.authorize();
    }

    public signOut(): void {
        this.oidcSecurityService.logoff().subscribe();
    }

    public isAuthorize(): boolean {
        return this.authState;
    }

    public getUserData(): IUser {
        return {
            name: this.userName,
            image: this.userImage
        }
    }

    public setProfileImage$(base64Image: string): Observable<{ avatar: string }> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
        });

        return this.http.post<{ avatar: string }>(
            `${this.baseUrl}/user/avatar`,
            { avatar: base64Image },
            { headers }
        );
    }
}
