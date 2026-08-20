import { TestBed } from '@angular/core/testing';
import { AuthenticatedResult, OidcSecurityService, PublicEventsService } from 'angular-auth-oidc-client';
import { BehaviorSubject, of, Subject, take, toArray } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { UserService } from './user.service';

/**
 * Формирует незашифрованный JWT с заданной полезной нагрузкой.
 *
 * @param payload Claims для тела токена.
 * @returns Строка вида `header.payload.signature`.
 */
function makeJwt(payload: Record<string, unknown>): string {
    const encode = (value: unknown) => {
        const bytes = new TextEncoder().encode(JSON.stringify(value));
        const binary = String.fromCharCode(...bytes);

        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    return `${encode({ alg: 'none' })}.${encode(payload)}.sig`;
}

describe('UserService', () => {
    const idToken = makeJwt({
        sub: 'user-1',
        name: 'Игрок',
        username: 'lisov',
        picture: 'https://cdn/avatar.png',
        roles: ['admin'],
        iat: 0,
    });

    let authenticated$: BehaviorSubject<AuthenticatedResult>;

    beforeEach(() => {
        authenticated$ = new BehaviorSubject<AuthenticatedResult>({
            isAuthenticated: false,
            allConfigsAuthenticated: [],
        });

        const oidc = {
            get isAuthenticated$() {
                return authenticated$.asObservable();
            },
            getIdToken: () => of(idToken),
            getAccessToken: () => of('access-token'),
            checkAuth: () =>
                of({ isAuthenticated: false, userData: null, accessToken: '', idToken: '', configId: '0' }),
            forceRefreshSession: () =>
                of({ isAuthenticated: false, userData: null, accessToken: '', idToken: '', configId: '0' }),
        };

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                UserService,
                { provide: OidcSecurityService, useValue: oidc },
                { provide: PublicEventsService, useValue: { registerForEvents: () => new Subject() } },
            ],
        });
    });

    it('заполняет данные пользователя до публикации authState$ = true', (done: DoneFn) => {
        const service = TestBed.inject(UserService);

        service.authState$.pipe(take(2), toArray()).subscribe((states) => {
            expect(states).toEqual([false, true]);
            expect(service.userId).toBe('user-1');
            expect(service.userName).toBe('lisov');
            expect(service.userImage).toBe('https://cdn/avatar.png');
            expect(service.roles).toEqual(['admin']);
            expect(service.accessToken).toBe('access-token');
            done();
        });

        authenticated$.next({ isAuthenticated: true, allConfigsAuthenticated: [] });
    });

    it('сообщает о завершении проверки только после checkAuth', (done: DoneFn) => {
        const service = TestBed.inject(UserService);

        service.isAuthChecked$.pipe(take(1)).subscribe((checked) => {
            expect(checked).toBeTrue();
            done();
        });

        service.checkAuthTrigger$.next(false);
    });
});
