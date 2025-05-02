import { inject, Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { IUser } from './interface/i-user';
import { jwtDecode } from "jwt-decode";
import { IJwtTokenLh } from './interface/i-jwt-token-lh';
import { BehaviorSubject, catchError, combineLatest, filter, first, of, tap } from 'rxjs';
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
        this.oidcSecurityService.checkAuth().pipe(tap((authenticate) => {
            if (authenticate) {
                this.authState = authenticate.isAuthenticated;
                this.userImage = authenticate.userData?.picture;
                this.userName = authenticate.userData?.username;
                combineLatest([
                    this.oidcSecurityService.getIdToken(),
                    this.oidcSecurityService.getAccessToken(),
                ]).pipe(
                    tap(([idToken, accessToken]) => {
                        this.accessToken = accessToken;
                        const decoded = jwtDecode<IJwtTokenLh>(idToken);
                        this.roles = decoded.roles ?? [];
                    }), catchError((e) => {
                        console.error('Я упаль:', e);
                        return of(null);
                    }), first()
                ).subscribe();
            }
        })).subscribe();
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
