import { inject, Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { IUser } from './interface/i-user';
import { jwtDecode } from "jwt-decode";
import { IJwtTokenLh } from './interface/i-jwt-token-lh';
import { BehaviorSubject, catchError, combineLatest, filter, first, of, switchMap, tap } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';

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

    constructor() {
        // this.oidcSecurityService.checkAuth().pipe(tap((authenticate) => {
        //     if (authenticate) {
        //         this.authState = authenticate.isAuthenticated;
        //         this.userImage = authenticate.userData?.picture;
        //         this.userName = authenticate.userData?.username;
        //         combineLatest([
        //             this.oidcSecurityService.getIdToken(),
        //             this.oidcSecurityService.getAccessToken(),
        //         ]).pipe(
        //             tap(([idToken, accessToken]) => {
        //                 this.accessToken = accessToken;
        //                 const decoded = jwtDecode<IJwtTokenLh>(idToken);
        //                 this.roles = decoded.roles ?? [];
        //             }), catchError((e) => {
        //                 console.error('Я упаль:', e);
        //                 return of(null);
        //             }), first()
        //         ).subscribe();
        //     }
        // })).subscribe();

        console.log('[Auth] Проверка авторизации началась');

        this.oidcSecurityService.checkAuth().pipe(
            tap(authResult => {
                console.log('[Auth] Результат авторизации:', authResult);
            }),
            switchMap(authResult => {
                if (!authResult.isAuthenticated) {
                    console.warn('[Auth] Пользователь не аутентифицирован');
                    return of(null);
                }

                this.authState = true;
                this.userImage = authResult.userData?.picture;
                this.userName = authResult.userData?.username;
                console.log('[Auth] Пользователь аутентифицирован');
                console.log('[Auth] Имя пользователя:', this.userName);
                console.log('[Auth] Аватар пользователя:', this.userImage);

                return combineLatest([
                    this.oidcSecurityService.getIdToken(),
                    this.oidcSecurityService.getAccessToken(),
                ]).pipe(
                    first(),
                    tap(([idToken, accessToken]) => {
                        console.log('[Auth] Получены токены');
                        console.log('[Auth] AccessToken:', accessToken);
                        console.log('[Auth] IdToken:', idToken);

                        this.accessToken = accessToken;

                        try {
                            const decoded = jwtDecode<IJwtTokenLh>(idToken);
                            this.roles = decoded.roles ?? [];
                            console.log('[Auth] Роли пользователя:', this.roles);
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
                console.error('[Auth] Ошибка при проверке авторизации:', authError);
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
}
