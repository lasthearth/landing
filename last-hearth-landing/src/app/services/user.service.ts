import { inject, Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { IUser } from './interface/i-user';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private oidcSecurityService: OidcSecurityService = inject(OidcSecurityService);

    private authState: boolean = false;

    public userImage!: string;

    public userName!: string;

    constructor() {
        this.oidcSecurityService
            .checkAuth()
            .subscribe((data) => {
                this.authState = data.isAuthenticated;
                this.userImage = data.userData.picture;
                this.userName = data.userData.username;
            });
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
